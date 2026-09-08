import Foundation
import Testing
@testable import SaturnPath

struct APIClientTests {
    private struct Payload: Codable, Equatable, Sendable {
        let value: String
    }

    @Test
    func authenticatedRequestAddsBearerTokenAndDecodesResponse() async throws {
        let transport = StubTransport { request in
            #expect(request.httpMethod == "GET")
            #expect(request.url?.path == "/api/v2/bootstrap")
            #expect(request.value(forHTTPHeaderField: "Authorization") == "Bearer secret-token")

            let data = try JSONEncoder().encode(Payload(value: "ready"))
            return (data, Self.response(for: request, statusCode: 200))
        }
        let client = APIClient(
            baseURL: try #require(URL(string: "https://example.test/api/v2")),
            transport: transport,
            tokenProvider: FixedTokenProvider(token: "secret-token"),
            logger: NoopAPIClientLogger()
        )

        let payload = try await client.send(
            APIEndpoint<Payload>(operation: "bootstrap", path: "bootstrap")
        )

        #expect(payload == Payload(value: "ready"))
    }

    @Test
    func serverFailureReturnsOnlyNormalizedProblemDetails() async throws {
        let transport = StubTransport { request in
            let data = Data(#"{"code":"session_not_found","message":"sensitive detail"}"#.utf8)
            return (data, Self.response(for: request, statusCode: 404))
        }
        let client = APIClient(
            baseURL: try #require(URL(string: "https://example.test/api/v2")),
            transport: transport,
            tokenProvider: FixedTokenProvider(token: "token"),
            logger: NoopAPIClientLogger()
        )

        await #expect(throws: APIClientError.server(APIProblem(statusCode: 404, code: "session_not_found"))) {
            let _: Payload = try await client.send(
                APIEndpoint(operation: "next_question", path: "sessions/one/next")
            )
        }
    }

    @Test
    func unauthorizedResponseBecomesSessionExpired() async throws {
        let transport = StubTransport { request in
            (Data(), Self.response(for: request, statusCode: 401))
        }
        let client = APIClient(
            baseURL: try #require(URL(string: "https://example.test/api/v2")),
            transport: transport,
            tokenProvider: FixedTokenProvider(token: "expired-token"),
            logger: NoopAPIClientLogger()
        )

        await #expect(throws: APIClientError.sessionExpired) {
            let _: Payload = try await client.send(
                APIEndpoint(operation: "home", path: "home")
            )
        }
    }

    @Test
    func authenticatedRequestWithoutSessionStopsBeforeTransport() async throws {
        let transport = StubTransport { request in
            Issue.record("Transport should not receive an unauthenticated request: \(request)")
            return (Data(), Self.response(for: request, statusCode: 500))
        }
        let client = APIClient(
            baseURL: try #require(URL(string: "https://example.test/api/v2")),
            transport: transport,
            logger: NoopAPIClientLogger()
        )

        await #expect(throws: APIClientError.authenticationRequired) {
            let _: Payload = try await client.send(
                APIEndpoint(operation: "home", path: "home")
            )
        }
    }

    private static func response(for request: URLRequest, statusCode: Int) -> HTTPURLResponse {
        HTTPURLResponse(
            url: request.url!,
            statusCode: statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"]
        )!
    }
}

private struct FixedTokenProvider: AccessTokenProviding {
    let token: String?

    func accessToken() -> String? {
        token
    }
}

private struct StubTransport: HTTPTransport {
    let handler: @Sendable (URLRequest) async throws -> (Data, HTTPURLResponse)

    func data(for request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        try await handler(request)
    }
}
