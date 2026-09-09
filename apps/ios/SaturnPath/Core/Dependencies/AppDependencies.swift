import Foundation
import SwiftUI

struct AppDependencies: Sendable {
    let configuration: AppConfiguration
    let featureFlags: FeatureFlags
    let apiClient: APIClient?
    let sessionStore: any SessionStoring
    let recoveryStore: any PracticeRecoveryStoring
    let bootstrapRepository: any BootstrapRepository
    let accountRepository: any AccountRepository
    let onboardingRepository: any OnboardingRepository
    let homeRepository: any HomeRepository
    let practiceRepository: any PracticeRepository

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

        let mockRootState = ProcessInfo.processInfo.environment["SATURNPATH_MOCK_ROOT_STATE"]
        let bootstrapContent: AppBootstrapViewContent
        switch mockRootState {
        case "sign-in":
            bootstrapContent = AppBootstrapViewContent(
                isAuthenticated: false,
                hasCompletedOnboarding: false,
                displayName: nil
            )
        case "onboarding":
            bootstrapContent = AppBootstrapViewContent(
                isAuthenticated: true,
                hasCompletedOnboarding: false,
                displayName: "Explorer"
            )
        default:
            bootstrapContent = AppBootstrapViewContent(
                isAuthenticated: true,
                hasCompletedOnboarding: true,
                displayName: "Explorer"
            )
        }

        // Live repositories are added only after a tested contract milestone is READY.
        return Self(
            configuration: configuration,
            featureFlags: featureFlags,
            apiClient: apiClient,
            sessionStore: sessionStore,
            recoveryStore: recoveryStore,
            bootstrapRepository: MockBootstrapRepository(content: bootstrapContent),
            accountRepository: MockAccountRepository(),
            onboardingRepository: MockOnboardingRepository(),
            homeRepository: MockHomeRepository(),
            practiceRepository: MockPracticeRepository()
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
        accountRepository: MockAccountRepository(),
        onboardingRepository: MockOnboardingRepository(),
        homeRepository: MockHomeRepository(),
        practiceRepository: MockPracticeRepository()
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
