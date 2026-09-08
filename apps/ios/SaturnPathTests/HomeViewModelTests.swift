import Testing
@testable import SaturnPath

@MainActor
struct HomeViewModelTests {
    @Test
    func loadPublishesRepositoryContent() async throws {
        let expected = try #require(MockHomeRepository().content)
        let model = HomeViewModel()

        await model.load(using: MockHomeRepository())

        #expect(model.state == .content(expected))
    }

    @Test
    func missingRecommendationPublishesEmptyState() async {
        let model = HomeViewModel()

        await model.load(using: MockHomeRepository(content: nil))

        #expect(model.state == .empty)
    }

    @Test(arguments: [
        (RepositoryError.offline, HomeViewFailure.offline),
        (RepositoryError.expiredSession, HomeViewFailure.expiredSession),
        (RepositoryError.unavailable, HomeViewFailure.server),
    ])
    func repositoryErrorsBecomeUserFacingStates(
        error: RepositoryError,
        expectedFailure: HomeViewFailure
    ) async {
        let model = HomeViewModel()

        await model.load(using: FailingHomeRepository(error: error))

        #expect(model.state == .failure(expectedFailure))
    }
}

private struct FailingHomeRepository: HomeRepository {
    let error: RepositoryError

    func fetchHome() throws -> HomeViewContent? {
        throw error
    }
}
