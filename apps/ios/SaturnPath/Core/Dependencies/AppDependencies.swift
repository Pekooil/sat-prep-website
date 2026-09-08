import Foundation
import SwiftUI

struct AppDependencies: Sendable {
    let configuration: AppConfiguration
    let featureFlags: FeatureFlags
    let apiClient: APIClient?
    let sessionStore: any SessionStoring
    let recoveryStore: any PracticeRecoveryStoring
    let bootstrapRepository: any BootstrapRepository
    let homeRepository: any HomeRepository

    static func makeDefault(
        configuration: AppConfiguration = .current()
    ) -> Self {
        let featureFlags = FeatureFlags.defaults(for: configuration.environment)
        let sessionStore = KeychainSessionStore()
        let recoveryStore = FilePracticeRecoveryStore(fileURL: recoveryFileURL())

        let apiClient = configuration.apiBaseURL.map { baseURL in
            APIClient(
                baseURL: baseURL,
                requestTimeout: configuration.requestTimeout,
                tokenProvider: SessionAccessTokenProvider(store: sessionStore)
            )
        }

        // Live repositories are added only after a tested contract milestone is READY.
        return Self(
            configuration: configuration,
            featureFlags: featureFlags,
            apiClient: apiClient,
            sessionStore: sessionStore,
            recoveryStore: recoveryStore,
            bootstrapRepository: MockBootstrapRepository(),
            homeRepository: MockHomeRepository()
        )
    }

    static let preview = Self(
        configuration: AppConfiguration(
            environment: .development,
            apiBaseURL: nil
        ),
        featureFlags: .defaults(for: .development),
        apiClient: nil,
        sessionStore: InMemorySessionStore(),
        recoveryStore: InMemoryPracticeRecoveryStore(),
        bootstrapRepository: MockBootstrapRepository(),
        homeRepository: MockHomeRepository()
    )

    private static func recoveryFileURL() -> URL {
        let baseURL = FileManager.default.urls(
            for: .applicationSupportDirectory,
            in: .userDomainMask
        ).first ?? FileManager.default.temporaryDirectory

        return baseURL
            .appendingPathComponent("SaturnPath", isDirectory: true)
            .appendingPathComponent("Recovery", isDirectory: true)
            .appendingPathComponent("practice-state.json", isDirectory: false)
    }
}

private struct AppDependenciesKey: EnvironmentKey {
    static let defaultValue = AppDependencies.preview
}

extension EnvironmentValues {
    var appDependencies: AppDependencies {
        get { self[AppDependenciesKey.self] }
        set { self[AppDependenciesKey.self] = newValue }
    }
}
