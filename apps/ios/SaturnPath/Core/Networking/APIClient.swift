import Foundation
import OSLog

enum HTTPMethod: String, Sendable {
    case delete = "DELETE"
    case get = "GET"
    case patch = "PATCH"
    case post = "POST"
}

struct APIEndpoint<Response: Decodable & Sendable>: Sendable {
    let operation: String
    let method: HTTPMethod
    let path: String
    let query: [String: String]
    let headers: [String: String]
    let body: Data?
    let requiresAuthentication: Bool

    init(
        operation: String,
        method: HTTPMethod = .get,
        path: String,
        query: [String: String] = [:],
        headers: [String: String] = [:],
        body: Data? = nil,
        requiresAuthentication: Bool = true
    ) {
        self.operation = operation
        self.method = method
        self.path = path
        self.query = query
        self.headers = headers
        self.body = body
        self.requiresAuthentication = requiresAuthentication
    }
}

struct APIProblem: Error, Equatable, Sendable {
    let statusCode: Int
    let code: String?
}

enum APIClientError: Error, Equatable, Sendable {
    case invalidRequest
    case authenticationRequired
    case sessionExpired
    case offline
    case timedOut
    case cancelled
    case invalidResponse
    case decodingFailed
    case server(APIProblem)
    case transport
}

protocol AccessTokenProviding: Sendable {
    func accessToken() async throws -> String?
}

struct AnonymousAccessTokenProvider: AccessTokenProviding {
    func accessToken() -> String? {
        nil
    }
}

protocol HTTPTransport: Sendable {
    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

struct URLSessionTransport: HTTPTransport {
    let session: URLSession

    init(configuration: URLSessionConfiguration = .ephemeral) {
        configuration.waitsForConnectivity = true
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        session = URLSession(configuration: configuration)
    }

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }
        return (data, httpResponse)
    }
}

enum APILogEvent: Equatable, Sendable {
    case started(operation: String)
    case finished(operation: String, statusCode: Int)
    case failed(operation: String, category: String)
}

protocol APIClientLogging: Sendable {
    func log(_ event: APILogEvent)
}

struct SafeAPIClientLogger: APIClientLogging {
    private let logger = Logger(subsystem: "app.saturnpath.ios", category: "API")

    func log(_ event: APILogEvent) {
        switch event {
        case let .started(operation):
            logger.debug("Started \(operation, privacy: .public)")
        case let .finished(operation, statusCode):
            logger.debug("Finished \(operation, privacy: .public) [\(statusCode, privacy: .public)]")
        case let .failed(operation, category):
            logger.error("Failed \(operation, privacy: .public) [\(category, privacy: .public)]")
        }
    }
}

struct NoopAPIClientLogger: APIClientLogging {
    func log(_ event: APILogEvent) {}
}

actor APIClient {
    private struct ErrorEnvelope: Decodable {
        let code: String?
    }

    private let baseURL: URL
    private let requestTimeout: TimeInterval
    private let transport: any HTTPTransport
    private let tokenProvider: any AccessTokenProviding
    private let logger: any APIClientLogging
    private let decoder: JSONDecoder

    init(
        baseURL: URL,
        requestTimeout: TimeInterval = 20,
        transport: any HTTPTransport = URLSessionTransport(),
        tokenProvider: any AccessTokenProviding = AnonymousAccessTokenProvider(),
        logger: any APIClientLogging = SafeAPIClientLogger(),
        decoder: JSONDecoder = JSONDecoder()
    ) {
        self.baseURL = baseURL
        self.requestTimeout = requestTimeout
        self.transport = transport
        self.tokenProvider = tokenProvider
        self.logger = logger
        self.decoder = decoder
    }

    func send<Response>(_ endpoint: APIEndpoint<Response>) async throws -> Response {
        let request: URLRequest
        do {
            request = try await makeRequest(for: endpoint)
        } catch let error as APIClientError {
            logger.log(.failed(operation: endpoint.operation, category: error.logCategory))
            throw error
        } catch is SessionAccessError {
            logger.log(.failed(operation: endpoint.operation, category: "session_expired"))
            throw APIClientError.sessionExpired
        } catch {
            logger.log(.failed(operation: endpoint.operation, category: "authentication"))
            throw APIClientError.authenticationRequired
        }

        logger.log(.started(operation: endpoint.operation))

        do {
            let (data, response) = try await transport.data(for: request)
            guard (200..<300).contains(response.statusCode) else {
                if response.statusCode == 401 {
                    logger.log(.failed(operation: endpoint.operation, category: "session_expired"))
                    throw APIClientError.sessionExpired
                }
                let problem = APIProblem(
                    statusCode: response.statusCode,
                    code: try? decoder.decode(ErrorEnvelope.self, from: data).code
                )
                let error = APIClientError.server(problem)
                logger.log(.failed(operation: endpoint.operation, category: error.logCategory))
                throw error
            }

            do {
                let value = try decoder.decode(Response.self, from: data)
                logger.log(.finished(operation: endpoint.operation, statusCode: response.statusCode))
                return value
            } catch {
                logger.log(.failed(operation: endpoint.operation, category: "decoding"))
                throw APIClientError.decodingFailed
            }
        } catch let error as APIClientError {
            throw error
        } catch is CancellationError {
            logger.log(.failed(operation: endpoint.operation, category: "cancelled"))
            throw APIClientError.cancelled
        } catch let error as URLError {
            let normalized = Self.normalize(error)
            logger.log(.failed(operation: endpoint.operation, category: normalized.logCategory))
            throw normalized
        } catch {
            logger.log(.failed(operation: endpoint.operation, category: "transport"))
            throw APIClientError.transport
        }
    }

    private func makeRequest<Response>(for endpoint: APIEndpoint<Response>) async throws -> URLRequest {
        let pathParts = endpoint.path.split(separator: "/", omittingEmptySubsequences: true)
        guard !pathParts.contains("..") else {
            throw APIClientError.invalidRequest
        }

        var url = baseURL
        for part in pathParts {
            url.appendPathComponent(String(part))
        }

        if !endpoint.query.isEmpty {
            guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
                throw APIClientError.invalidRequest
            }
            components.queryItems = endpoint.query
                .sorted { $0.key < $1.key }
                .map(URLQueryItem.init(name:value:))
            guard let queryURL = components.url else {
                throw APIClientError.invalidRequest
            }
            url = queryURL
        }

        var request = URLRequest(url: url, timeoutInterval: requestTimeout)
        request.httpMethod = endpoint.method.rawValue
        request.httpBody = endpoint.body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if endpoint.body != nil {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        endpoint.headers.forEach { request.setValue($0.value, forHTTPHeaderField: $0.key) }

        if endpoint.requiresAuthentication {
            guard let token = try await tokenProvider.accessToken(), !token.isEmpty else {
                throw APIClientError.authenticationRequired
            }
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return request
    }

    private static func normalize(_ error: URLError) -> APIClientError {
        switch error.code {
        case .notConnectedToInternet, .networkConnectionLost, .cannotFindHost, .cannotConnectToHost:
            .offline
        case .timedOut:
            .timedOut
        case .cancelled:
            .cancelled
        default:
            .transport
        }
    }
}

private extension APIClientError {
    var logCategory: String {
        switch self {
        case .invalidRequest: "invalid_request"
        case .authenticationRequired: "authentication_required"
        case .sessionExpired: "session_expired"
        case .offline: "offline"
        case .timedOut: "timeout"
        case .cancelled: "cancelled"
        case .invalidResponse: "invalid_response"
        case .decodingFailed: "decoding"
        case let .server(problem): "server_\(problem.statusCode)"
        case .transport: "transport"
        }
    }
}
