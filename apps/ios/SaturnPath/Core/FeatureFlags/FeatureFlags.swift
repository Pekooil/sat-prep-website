struct FeatureFlags: Equatable, Sendable {
    let usesMockRepositories: Bool
    let liveAPIEnabled: Bool
    let scratchAnalysisEnabled: Bool
    let remoteNotificationsEnabled: Bool

    static func defaults(for environment: SaturnPathEnvironment) -> Self {
        // The web-to-iOS handoff is not READY yet, so every build stays on mocks.
        Self(
            usesMockRepositories: true,
            liveAPIEnabled: false,
            scratchAnalysisEnabled: false,
            remoteNotificationsEnabled: false
        )
    }
}
