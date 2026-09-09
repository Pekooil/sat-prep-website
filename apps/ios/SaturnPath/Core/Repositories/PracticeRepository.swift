import Foundation

enum PracticeResponseKind: String, Codable, Equatable, Sendable {
    case multipleChoice
    case studentProduced
}

struct PracticeChoiceContent: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let text: String
}

struct PracticeMetricContent: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let label: String
    let value: String
}

struct PracticeQuestionContent: Codable, Equatable, Identifiable, Sendable {
    let id: String
    let sectionLabel: String
    let skillLabel: String
    let prompt: String
    let responseKind: PracticeResponseKind
    let choices: [PracticeChoiceContent]
    let expectedSeconds: Int
    let whyTitle: String
    let whyMetrics: [PracticeMetricContent]
}

struct PracticeQuestionStep: Codable, Equatable, Sendable {
    let sessionID: String
    let position: Int
    let totalCount: Int
    let question: PracticeQuestionContent
}

enum PracticeCorrectness: String, Codable, Equatable, Sendable {
    case correct
    case incorrect
}

enum PracticeNextAction: String, Codable, Equatable, Sendable {
    case continuePractice = "continue"
    case microSetSummary = "micro_set_summary"
    case recommendedStop = "recommended_stop"
    case sessionComplete = "session_complete"
}

enum PracticePathChangeKind: String, Codable, Equatable, Sendable {
    case routeSwap = "route_swap"
    case timeDelta = "time_delta"
    case reviewAdded = "review_added"
    case workRemoved = "work_removed"
    case noChange = "no_change"
}

struct PracticePathChangeContent: Codable, Equatable, Sendable {
    let beforeLabel: String
    let afterLabel: String
    let impactLabel: String
    let kind: PracticePathChangeKind
}

struct PracticeAdaptationContent: Codable, Equatable, Sendable {
    let headline: String
    let detail: String
}

struct PracticeFeedbackContent: Codable, Equatable, Sendable {
    let correctness: PracticeCorrectness
    let headline: String
    let explanation: String
    let pacingMessage: String
    let pathChange: PracticePathChangeContent
    let adaptation: PracticeAdaptationContent?
    let nextAction: PracticeNextAction
}

struct PracticeSummaryContent: Codable, Equatable, Sendable {
    let completedCount: Int
    let correctCount: Int
    let elapsedMinutes: Int
    let minutesSaved: Int
    let headline: String
}

enum PracticeNextContent: Equatable, Sendable {
    case question(PracticeQuestionStep)
    case summary(PracticeSummaryContent)
}

enum PracticeEndReason: String, Codable, Equatable, Sendable {
    case recommendedStop = "recommended_stop"
    case completed
}

protocol PracticeRepository: Sendable {
    func startOrResume() async throws -> PracticeQuestionStep

    func submitResponse(
        sessionID: String,
        questionID: String,
        response: String,
        elapsedSeconds: Int,
        idempotencyKey: String
    ) async throws -> PracticeFeedbackContent

    func fetchNext(sessionID: String) async throws -> PracticeNextContent

    func endSession(
        sessionID: String,
        reason: PracticeEndReason,
        idempotencyKey: String
    ) async throws -> PracticeSummaryContent
}

struct MockPracticeRepository: PracticeRepository {
    func startOrResume() -> PracticeQuestionStep {
        .mock
    }

    func submitResponse(
        sessionID: String,
        questionID: String,
        response: String,
        elapsedSeconds: Int,
        idempotencyKey: String
    ) -> PracticeFeedbackContent {
        .recommendedStopMock
    }

    func fetchNext(sessionID: String) -> PracticeNextContent {
        .question(.mockContinuation)
    }

    func endSession(
        sessionID: String,
        reason: PracticeEndReason,
        idempotencyKey: String
    ) -> PracticeSummaryContent {
        .mock
    }
}

extension PracticeQuestionStep {
    static let mock = Self(
        sessionID: "mock-session",
        position: 1,
        totalCount: 3,
        question: PracticeQuestionContent(
            id: "mock-public-question",
            sectionLabel: "Math",
            skillLabel: "Linear equations",
            prompt: "A line passes through the points (2, 7) and (6, 19). What is the slope of the line?",
            responseKind: .multipleChoice,
            choices: [
                PracticeChoiceContent(id: "A", text: "2"),
                PracticeChoiceContent(id: "B", text: "3"),
                PracticeChoiceContent(id: "C", text: "4"),
                PracticeChoiceContent(id: "D", text: "6"),
            ],
            expectedSeconds: 75,
            whyTitle: "Why this question",
            whyMetrics: [
                PracticeMetricContent(id: "impact", label: "Score impact", value: "High"),
                PracticeMetricContent(id: "confidence", label: "Skill confidence", value: "Growing"),
            ]
        )
    )

    static let mockContinuation = Self(
        sessionID: "mock-session",
        position: 2,
        totalCount: 3,
        question: PracticeQuestionContent(
            id: "mock-public-question-2",
            sectionLabel: "Math",
            skillLabel: "Equivalent expressions",
            prompt: "If 3x + 7 = 22, what is the value of x?",
            responseKind: .studentProduced,
            choices: [],
            expectedSeconds: 60,
            whyTitle: "A useful next step",
            whyMetrics: [
                PracticeMetricContent(id: "impact", label: "Score impact", value: "High"),
                PracticeMetricContent(id: "difficulty", label: "Difficulty", value: "Unlocked"),
            ]
        )
    )
}

extension PracticeFeedbackContent {
    static let mock = Self(
        correctness: .correct,
        headline: "Nice work—that route is getting stronger.",
        explanation: "Slope is the change in y divided by the change in x: (19 − 7) ÷ (6 − 2) = 12 ÷ 4 = 3.",
        pacingMessage: "Answered within the target pace.",
        pathChange: PracticePathChangeContent(
            beforeLabel: "More linear equations",
            afterLabel: "Mixed math practice",
            impactLabel: "1 question reordered",
            kind: .routeSwap
        ),
        adaptation: PracticeAdaptationContent(
            headline: "Difficulty unlocked",
            detail: "Your next micro-set can include a more challenging linear-equations question."
        ),
        nextAction: .continuePractice
    )

    static let recommendedStopMock = Self(
        correctness: mock.correctness,
        headline: mock.headline,
        explanation: mock.explanation,
        pacingMessage: mock.pacingMessage,
        pathChange: mock.pathChange,
        adaptation: PracticeAdaptationContent(
            headline: "Today’s route is complete",
            detail: "The highest-value work is done. More practice is optional."
        ),
        nextAction: .recommendedStop
    )
}

extension PracticeSummaryContent {
    static let mock = Self(
        completedCount: 1,
        correctCount: 1,
        elapsedMinutes: 1,
        minutesSaved: 4,
        headline: "A focused step forward."
    )
}
