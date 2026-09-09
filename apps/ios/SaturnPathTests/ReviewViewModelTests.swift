import Foundation
import Testing
@testable import SaturnPath

@MainActor
struct ReviewViewModelTests {
    @Test
    func loadPublishesRepositoryOwnedDueState() async {
        let model = ReviewViewModel()

        await model.load(using: MockReviewRepository())

        #expect(model.phase == .content)
        #expect(model.selectedCollection == .due)
        #expect(model.dashboard?.items.allSatisfy { $0.state == .due } == true)
        #expect(model.dashboard?.filters.count == ReviewCollection.allCases.count)
    }

    @Test
    func selectingCollectionLoadsThatRepositoryView() async {
        let model = ReviewViewModel()
        let repository = MockReviewRepository()
        await model.load(using: repository)

        await model.select(.retesting, using: repository)

        #expect(model.selectedCollection == .retesting)
        #expect(model.dashboard?.items.map(\.id) == ["review-words-context"])
    }

    @Test
    func actionReloadsServerStateWithoutClientSideTransition() async throws {
        let repository = RecordingReviewRepository()
        let model = ReviewViewModel()
        await model.load(using: repository)
        let item = try #require(model.dashboard?.items.first)

        let opensPractice = await model.perform(.save, on: item, using: repository)

        let action = try #require(await repository.lastAction)
        #expect(opensPractice == false)
        #expect(action.itemID == item.id)
        #expect(action.action == .save)
        #expect(action.idempotencyKey.isEmpty == false)
        #expect(await repository.fetchCount == 2)
        #expect(model.dashboard?.items.first?.isSaved == true)
    }

    @Test
    func ambiguousActionRetryReusesItsIdempotencyKey() async throws {
        let repository = FlakyReviewRepository()
        let model = ReviewViewModel()
        await model.load(using: repository)
        let item = try #require(model.dashboard?.items.first)

        _ = await model.perform(.save, on: item, using: repository)
        #expect(model.actionFailure == .offline)
        _ = await model.perform(.save, on: item, using: repository)

        let keys = await repository.actionKeys
        #expect(keys.count == 2)
        #expect(keys.first == keys.last)
        #expect(model.dashboard?.items.first?.isSaved == true)
    }

    @Test(arguments: [
        (RepositoryError.offline, ReviewViewFailure.offline),
        (RepositoryError.expiredSession, ReviewViewFailure.expiredSession),
        (RepositoryError.unavailable, ReviewViewFailure.server),
    ])
    func repositoryFailuresBecomeUserFacingStates(
        error: RepositoryError,
        expected: ReviewViewFailure
    ) async {
        let model = ReviewViewModel()

        await model.load(using: FailingReviewRepository(error: error))

        #expect(model.phase == .failure(expected))
    }
}

private actor RecordingReviewRepository: ReviewRepository {
    struct Action: Sendable {
        let itemID: String
        let action: ReviewItemAction
        let idempotencyKey: String
    }

    private var saved = false
    private(set) var fetchCount = 0
    private(set) var lastAction: Action?

    func fetchReview(collection: ReviewCollection) -> ReviewDashboardContent {
        fetchCount += 1
        let item = ReviewItemContent(
            id: "server-item",
            state: .due,
            title: "Server state",
            context: "Math",
            summary: "Returned by the repository.",
            scheduleLabel: "Due now",
            lapseCount: 0,
            isSaved: saved,
            availableActions: [.save]
        )
        return ReviewDashboardContent(
            headline: "Repository headline",
            filters: [ReviewFilterContent(id: .due, count: 1)],
            items: [item]
        )
    }

    func performAction(
        itemID: String,
        action: ReviewItemAction,
        idempotencyKey: String
    ) -> ReviewItemContent {
        lastAction = Action(itemID: itemID, action: action, idempotencyKey: idempotencyKey)
        saved = true
        return ReviewItemContent(
            id: itemID,
            state: .due,
            title: "Server state",
            context: "Math",
            summary: "Returned by the repository.",
            scheduleLabel: "Due now",
            lapseCount: 0,
            isSaved: true,
            availableActions: [.save]
        )
    }
}

private struct FailingReviewRepository: ReviewRepository {
    let error: RepositoryError

    func fetchReview(collection: ReviewCollection) throws -> ReviewDashboardContent {
        throw error
    }

    func performAction(
        itemID: String,
        action: ReviewItemAction,
        idempotencyKey: String
    ) throws -> ReviewItemContent {
        throw error
    }
}

private actor FlakyReviewRepository: ReviewRepository {
    private var saved = false
    private(set) var actionKeys: [String] = []

    func fetchReview(collection: ReviewCollection) -> ReviewDashboardContent {
        ReviewDashboardContent(
            headline: "Repository headline",
            filters: [ReviewFilterContent(id: .due, count: 1)],
            items: [item]
        )
    }

    func performAction(
        itemID: String,
        action: ReviewItemAction,
        idempotencyKey: String
    ) throws -> ReviewItemContent {
        actionKeys.append(idempotencyKey)
        if actionKeys.count == 1 {
            throw RepositoryError.offline
        }
        saved = true
        return item
    }

    private var item: ReviewItemContent {
        ReviewItemContent(
            id: "flaky-item",
            state: .due,
            title: "Retry item",
            context: "Math",
            summary: "Returned by the repository.",
            scheduleLabel: "Due now",
            lapseCount: 0,
            isSaved: saved,
            availableActions: [.save]
        )
    }
}
