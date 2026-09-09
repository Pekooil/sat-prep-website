import Foundation
import Testing
@testable import SaturnPath

@MainActor
struct PracticeViewModelTests {
    @Test
    func startPublishesServerOwnedQuestionContent() async {
        let model = PracticeViewModel()

        await model.start(using: MockPracticeRepository())

        #expect(model.phase == .question)
        #expect(model.questionStep == .mock)
        #expect(model.selectedResponse == nil)
        #expect(model.canSubmit == false)
    }

    @Test
    func submitRequiresAResponse() async {
        let repository = RecordingPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)

        await model.submit(using: repository)

        #expect(await repository.submissionCount == 0)
        #expect(model.phase == .question)
    }

    @Test
    func submitSendsOneIdempotentResponseAndPublishesFeedback() async throws {
        let repository = RecordingPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        let presentedAt = try #require(model.questionPresentedAt)
        model.selectResponse("B")

        await model.submit(
            using: repository,
            now: presentedAt.addingTimeInterval(12)
        )
        await model.submit(
            using: repository,
            now: presentedAt.addingTimeInterval(13)
        )

        let submission = try #require(await repository.lastSubmission)
        #expect(await repository.submissionCount == 1)
        #expect(submission.sessionID == PracticeQuestionStep.mock.sessionID)
        #expect(submission.questionID == PracticeQuestionStep.mock.question.id)
        #expect(submission.response == "B")
        #expect(submission.elapsedSeconds == 12)
        #expect(submission.idempotencyKey.isEmpty == false)
        #expect(model.feedback == .mock)
        #expect(model.phase == .feedback)
    }

    @Test
    func advancePublishesRepositorySummary() async {
        let repository = RecordingPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("B")
        await model.submit(using: repository)

        await model.advance(using: repository)

        #expect(model.summary == .mock)
        #expect(model.phase == .summary)
    }

    @Test(arguments: [
        (RepositoryError.offline, PracticeViewFailure.offline),
        (RepositoryError.expiredSession, PracticeViewFailure.expiredSession),
        (RepositoryError.unavailable, PracticeViewFailure.server),
    ])
    func repositoryErrorsBecomeUserFacingStates(
        error: RepositoryError,
        expectedFailure: PracticeViewFailure
    ) async {
        let model = PracticeViewModel()

        await model.start(using: FailingPracticeRepository(error: error))

        #expect(model.phase == .failure(expectedFailure))
    }
}

private actor RecordingPracticeRepository: PracticeRepository {
    struct Submission: Sendable {
        let sessionID: String
        let questionID: String
        let response: String
        let elapsedSeconds: Int
        let idempotencyKey: String
    }

    private(set) var submissionCount = 0
    private(set) var lastSubmission: Submission?

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
        submissionCount += 1
        lastSubmission = Submission(
            sessionID: sessionID,
            questionID: questionID,
            response: response,
            elapsedSeconds: elapsedSeconds,
            idempotencyKey: idempotencyKey
        )
        return .mock
    }

    func fetchNext(sessionID: String) -> PracticeNextContent {
        .summary(.mock)
    }
}

private struct FailingPracticeRepository: PracticeRepository {
    let error: RepositoryError

    func startOrResume() throws -> PracticeQuestionStep {
        throw error
    }

    func submitResponse(
        sessionID: String,
        questionID: String,
        response: String,
        elapsedSeconds: Int,
        idempotencyKey: String
    ) throws -> PracticeFeedbackContent {
        throw error
    }

    func fetchNext(sessionID: String) throws -> PracticeNextContent {
        throw error
    }
}
