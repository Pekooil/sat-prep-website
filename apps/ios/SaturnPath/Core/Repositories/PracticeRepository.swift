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
    case nextQuestion
    case finish
}

struct PracticeFeedbackContent: Codable, Equatable, Sendable {
    let correctness: PracticeCorrectness
    let headline: String
    let explanation: String
    let pacingMessage: String
    let pathDeltaMessage: String
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
        .mock
    }

    func fetchNext(sessionID: String) -> PracticeNextContent {
        .summary(.mock)
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
}

extension PracticeFeedbackContent {
    static let mock = Self(
        correctness: .correct,
        headline: "Nice work—that route is getting stronger.",
        explanation: "Slope is the change in y divided by the change in x: (19 − 7) ÷ (6 − 2) = 12 ÷ 4 = 3.",
        pacingMessage: "Answered within the target pace.",
        pathDeltaMessage: "Linear equations confidence moved up slightly.",
        nextAction: .nextQuestion
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
