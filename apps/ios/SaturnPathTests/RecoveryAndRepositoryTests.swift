import Foundation
import Testing
@testable import SaturnPath

struct RecoveryAndRepositoryTests {
    @Test
    func recoveryStoreRoundTripsPracticeState() async throws {
        let store = InMemoryPracticeRecoveryStore()
        let state = PracticeRecoveryState(
            sessionID: "session-1",
            questionID: "question-2",
            selectedResponse: "B",
            elapsedSeconds: 42,
            scratchNotes: "2x = 8",
            updatedAt: Date(timeIntervalSince1970: 1_000),
            questionStep: .mock,
            submissionIdempotencyKey: "submission-1"
        )

        try await store.save(state)
        #expect(try await store.load() == state)

        try await store.clear()
        #expect(try await store.load() == nil)
    }

    @Test
    func defaultDependenciesStayOnMocksUntilBackendHandoff() async throws {
        let configuration = AppConfiguration(
            environment: .staging,
            apiBaseURL: nil
        )
        let dependencies = AppDependencies.makeDefault(configuration: configuration)

        #expect(dependencies.featureFlags.usesMockRepositories)
        #expect(!dependencies.featureFlags.liveAPIEnabled)
        #expect(dependencies.apiClient == nil)

        let bootstrap = try await dependencies.bootstrapRepository.fetchBootstrap()
        let home = try #require(
            try await dependencies.homeRepository.fetchHome()
        )
        #expect(bootstrap.hasCompletedOnboarding)
        #expect(home.recommendedMinutes > 0)
    }
}
