import Foundation

enum SaturnPathEnvironment: String, Equatable, Sendable {
    case development
    case staging
    case production

    static var current: Self {
        #if STAGING
        .staging
        #elseif PRODUCTION
        .production
        #else
        .development
        #endif
    }

    var label: String {
        switch self {
        case .development:
            "Development shell"
        case .staging:
            "Staging shell"
        case .production:
            "Production shell"
        }
    }
}

struct AppConfiguration: Equatable, Sendable {
    static let apiBaseURLInfoKey = "SATURNPATH_API_BASE_URL"

    let environment: SaturnPathEnvironment
    let apiBaseURL: URL?
    let requestTimeout: TimeInterval

    init(
        environment: SaturnPathEnvironment,
        apiBaseURL: URL?,
        requestTimeout: TimeInterval = 20
    ) {
        self.environment = environment
        self.apiBaseURL = apiBaseURL
        self.requestTimeout = requestTimeout
    }

    static func current(
        bundle: Bundle = .main,
        processEnvironment: [String: String] = ProcessInfo.processInfo.environment
    ) -> Self {
        let configuredValue = processEnvironment[apiBaseURLInfoKey]
            ?? bundle.object(forInfoDictionaryKey: apiBaseURLInfoKey) as? String
        let configuredURL = configuredValue.flatMap { value in
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : URL(string: trimmed)
        }
        let developmentURL = URL(string: "http://127.0.0.1:3000/api/v2")
        let baseURL = configuredURL
            ?? (SaturnPathEnvironment.current == .development ? developmentURL : nil)

        return Self(
            environment: SaturnPathEnvironment.current,
            apiBaseURL: baseURL
        )
    }
}
