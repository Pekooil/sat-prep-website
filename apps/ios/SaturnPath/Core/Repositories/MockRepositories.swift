import Foundation

struct AppBootstrapViewContent: Equatable, Sendable {
    let isAuthenticated: Bool
    let hasCompletedOnboarding: Bool
    let displayName: String?
}

struct HomeViewContent: Equatable, Sendable {
    let scoreEstimate: Int
    let scoreRange: ClosedRange<Int>
    let targetScore: Int
    let satDateLabel: String
    let daysUntilSAT: Int
    let recommendedMinutes: Int
    let practiceMinutes: Int
    let reviewMinutes: Int
    let overallProgress: Double
    let mathProgress: Double
    let readingWritingProgress: Double
    let questionsRemoved: Int
    let minutesSaved: Int
    let statusMessage: String
}

enum RepositoryError: Error, Equatable, Sendable {
    case offline
    case expiredSession
    case unavailable
}

protocol BootstrapRepository: Sendable {
    func fetchBootstrap() async throws -> AppBootstrapViewContent
}

protocol HomeRepository: Sendable {
    func fetchHome() async throws -> HomeViewContent?
}

struct MockBootstrapRepository: BootstrapRepository {
    let content: AppBootstrapViewContent

    init(
        content: AppBootstrapViewContent = AppBootstrapViewContent(
            isAuthenticated: true,
            hasCompletedOnboarding: true,
            displayName: "Explorer"
        )
    ) {
        self.content = content
    }

    func fetchBootstrap() -> AppBootstrapViewContent {
        content
    }
}

struct MockHomeRepository: HomeRepository {
    let content: HomeViewContent?

    init(
        content: HomeViewContent? = .mock
    ) {
        self.content = content
    }

    func fetchHome() -> HomeViewContent? {
        content
    }
}

extension HomeViewContent {
    static let mock = Self(
        scoreEstimate: 1430,
        scoreRange: 1400...1460,
        targetScore: 1500,
        satDateLabel: "Oct 4",
        daysUntilSAT: 42,
        recommendedMinutes: 30,
        practiceMinutes: 20,
        reviewMinutes: 10,
        overallProgress: 0.36,
        mathProgress: 0.45,
        readingWritingProgress: 0.25,
        questionsRemoved: 12,
        minutesSaved: 6,
        statusMessage: "Ready when you are."
    )
}
