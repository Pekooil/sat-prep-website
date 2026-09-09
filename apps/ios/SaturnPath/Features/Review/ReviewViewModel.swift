import Foundation
import Observation

enum ReviewViewPhase: Equatable, Sendable {
    case idle
    case loading
    case content
    case empty
    case failure(ReviewViewFailure)
}

enum ReviewViewFailure: Equatable, Sendable {
    case offline
    case expiredSession
    case server
}

@MainActor
@Observable
final class ReviewViewModel {
    private(set) var phase: ReviewViewPhase = .idle
    private(set) var selectedCollection: ReviewCollection = .due
    private(set) var dashboard: ReviewDashboardContent?
    private(set) var activeItemID: String?
    private(set) var actionFailure: ReviewViewFailure?

    private var pendingActionItemID: String?
    private var pendingActionKind: ReviewItemAction?
    private var pendingActionIdempotencyKey: String?

    func load(
        using repository: any ReviewRepository,
        collection: ReviewCollection? = nil
    ) async {
        let requestedCollection = collection ?? selectedCollection
        selectedCollection = requestedCollection
        phase = .loading
        actionFailure = nil

        do {
            let dashboard = try await repository.fetchReview(collection: requestedCollection)
            self.dashboard = dashboard
            phase = dashboard.items.isEmpty ? .empty : .content
        } catch {
            phase = .failure(map(error))
        }
    }

    func select(
        _ collection: ReviewCollection,
        using repository: any ReviewRepository
    ) async {
        guard collection != selectedCollection || phase == .failure(.server) else {
            return
        }
        await load(using: repository, collection: collection)
    }

    @discardableResult
    func perform(
        _ action: ReviewItemAction,
        on item: ReviewItemContent,
        using repository: any ReviewRepository
    ) async -> Bool {
        guard activeItemID == nil, item.availableActions.contains(action) else {
            return false
        }

        activeItemID = item.id
        actionFailure = nil
        let idempotencyKey: String
        if pendingActionItemID == item.id,
           pendingActionKind == action,
           let pendingActionIdempotencyKey {
            idempotencyKey = pendingActionIdempotencyKey
        } else {
            idempotencyKey = UUID().uuidString
            pendingActionItemID = item.id
            pendingActionKind = action
            pendingActionIdempotencyKey = idempotencyKey
        }
        do {
            _ = try await repository.performAction(
                itemID: item.id,
                action: action,
                idempotencyKey: idempotencyKey
            )
            activeItemID = nil
            pendingActionItemID = nil
            pendingActionKind = nil
            pendingActionIdempotencyKey = nil
            await load(using: repository, collection: selectedCollection)
            return action == .practiceNow || action == .resume
        } catch {
            activeItemID = nil
            actionFailure = map(error)
            return false
        }
    }

    func isWorking(on item: ReviewItemContent) -> Bool {
        activeItemID == item.id
    }

    private func map(_ error: Error) -> ReviewViewFailure {
        switch error {
        case RepositoryError.offline:
            .offline
        case RepositoryError.expiredSession:
            .expiredSession
        default:
            .server
        }
    }
}
