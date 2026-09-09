import Foundation

enum ReviewCollection: String, Codable, CaseIterable, Identifiable, Sendable {
    case due
    case learning
    case retesting
    case resolved
    case saved

    var id: String { rawValue }
}

enum ReviewItemState: String, Codable, Equatable, Sendable {
    case due
    case learning
    case retesting
    case resolved
}

enum ReviewItemAction: String, Codable, Equatable, Sendable {
    case resume
    case save
    case deferAction = "defer"
    case practiceNow = "practice_now"
}

struct ReviewFilterContent: Equatable, Identifiable, Sendable {
    let id: ReviewCollection
    let count: Int
}

struct ReviewItemContent: Equatable, Identifiable, Sendable {
    let id: String
    let state: ReviewItemState
    let title: String
    let context: String
    let summary: String
    let scheduleLabel: String
    let lapseCount: Int
    let isSaved: Bool
    let availableActions: [ReviewItemAction]
}

struct ReviewDashboardContent: Equatable, Sendable {
    let headline: String
    let filters: [ReviewFilterContent]
    let items: [ReviewItemContent]
}

protocol ReviewRepository: Sendable {
    func fetchReview(collection: ReviewCollection) async throws -> ReviewDashboardContent

    func performAction(
        itemID: String,
        action: ReviewItemAction,
        idempotencyKey: String
    ) async throws -> ReviewItemContent
}

actor MockReviewRepository: ReviewRepository {
    private var items: [ReviewItemContent]

    init(items: [ReviewItemContent] = .mock) {
        self.items = items
    }

    func fetchReview(collection: ReviewCollection) -> ReviewDashboardContent {
        ReviewDashboardContent(
            headline: "Four mistakes are ready to strengthen.",
            filters: ReviewCollection.allCases.map { collection in
                ReviewFilterContent(id: collection, count: matchingItems(for: collection).count)
            },
            items: matchingItems(for: collection)
        )
    }

    func performAction(
        itemID: String,
        action: ReviewItemAction,
        idempotencyKey: String
    ) throws -> ReviewItemContent {
        guard let index = items.firstIndex(where: { $0.id == itemID }) else {
            throw RepositoryError.unavailable
        }

        let current = items[index]
        let updated: ReviewItemContent
        switch action {
        case .save:
            updated = current.replacing(isSaved: true)
        case .deferAction:
            updated = current.replacing(scheduleLabel: "Tomorrow")
        case .resume, .practiceNow:
            updated = current
        }
        items[index] = updated
        return updated
    }

    private func matchingItems(for collection: ReviewCollection) -> [ReviewItemContent] {
        switch collection {
        case .saved:
            items.filter(\.isSaved)
        case .due:
            items.filter { $0.state == .due }
        case .learning:
            items.filter { $0.state == .learning }
        case .retesting:
            items.filter { $0.state == .retesting }
        case .resolved:
            items.filter { $0.state == .resolved }
        }
    }
}

private extension ReviewItemContent {
    func replacing(
        scheduleLabel: String? = nil,
        isSaved: Bool? = nil
    ) -> Self {
        Self(
            id: id,
            state: state,
            title: title,
            context: context,
            summary: summary,
            scheduleLabel: scheduleLabel ?? self.scheduleLabel,
            lapseCount: lapseCount,
            isSaved: isSaved ?? self.isSaved,
            availableActions: availableActions
        )
    }
}

extension Array where Element == ReviewItemContent {
    static let mock: Self = [
        ReviewItemContent(
            id: "review-linear-equations",
            state: .due,
            title: "Linear equations",
            context: "Math · Medium",
            summary: "Revisit isolating a variable after a sign change.",
            scheduleLabel: "Due now · missed 2 days ago",
            lapseCount: 1,
            isSaved: false,
            availableActions: [.practiceNow, .save, .deferAction]
        ),
        ReviewItemContent(
            id: "review-transitions",
            state: .due,
            title: "Transitions",
            context: "Reading & Writing · Hard",
            summary: "Choose the transition that matches the relationship between ideas.",
            scheduleLabel: "Due now · missed 4 days ago",
            lapseCount: 2,
            isSaved: false,
            availableActions: [.practiceNow, .save, .deferAction]
        ),
        ReviewItemContent(
            id: "review-percent-change",
            state: .learning,
            title: "Percent change",
            context: "Math · Medium",
            summary: "Original correction complete; a similar question comes next.",
            scheduleLabel: "Next step today",
            lapseCount: 1,
            isSaved: false,
            availableActions: [.resume, .save]
        ),
        ReviewItemContent(
            id: "review-words-context",
            state: .retesting,
            title: "Words in context",
            context: "Reading & Writing · Medium",
            summary: "Ready for a delayed retention check.",
            scheduleLabel: "Retest today",
            lapseCount: 0,
            isSaved: false,
            availableActions: [.resume, .save, .deferAction]
        ),
        ReviewItemContent(
            id: "review-quadratics",
            state: .resolved,
            title: "Quadratic equations",
            context: "Math · Hard",
            summary: "Correction, similar confirmation, and delayed retest complete.",
            scheduleLabel: "Resolved 3 days ago",
            lapseCount: 1,
            isSaved: true,
            availableActions: [.practiceNow]
        ),
    ]
}
