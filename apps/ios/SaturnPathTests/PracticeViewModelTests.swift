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

    @Test
    func suspendedQuestionRestoresSelectionAndForegroundElapsedTime() async throws {
        let repository = RecordingPracticeRepository()
        let recoveryStore = InMemoryPracticeRecoveryStore()
        let startedAt = Date(timeIntervalSince1970: 2_000)
        let firstModel = PracticeViewModel()

        await firstModel.start(
            using: repository,
            recoveryStore: recoveryStore,
            now: startedAt
        )
        firstModel.selectResponse("C")
        await firstModel.suspend(
            using: recoveryStore,
            now: startedAt.addingTimeInterval(14)
        )

        #expect(firstModel.questionPresentedAt == nil)
        #expect(firstModel.elapsedSeconds(at: startedAt.addingTimeInterval(90)) == 14)

        let savedState = try #require(try await recoveryStore.load())
        #expect(savedState.questionStep == .mock)
        #expect(savedState.selectedResponse == "C")
        #expect(savedState.elapsedSeconds == 14)

        let restoredAt = startedAt.addingTimeInterval(120)
        let restoredModel = PracticeViewModel()
        await restoredModel.start(
            using: repository,
            recoveryStore: recoveryStore,
            now: restoredAt
        )

        #expect(restoredModel.phase == .question)
        #expect(restoredModel.questionStep == .mock)
        #expect(restoredModel.selectedResponse == "C")
        #expect(restoredModel.elapsedSeconds(at: restoredAt.addingTimeInterval(6)) == 20)
        #expect(await repository.startCount == 1)
    }

    @Test
    func ambiguousSubmissionRetryReusesItsIdempotencyKey() async throws {
        let repository = FlakyPracticeRepository()
        let recoveryStore = InMemoryPracticeRecoveryStore()
        let startedAt = Date(timeIntervalSince1970: 3_000)
        let model = PracticeViewModel()
        await model.start(
            using: repository,
            recoveryStore: recoveryStore,
            now: startedAt
        )
        model.selectResponse("B")

        await model.submit(
            using: repository,
            recoveryStore: recoveryStore,
            now: startedAt.addingTimeInterval(9)
        )
        #expect(model.phase == .failure(.offline))

        await model.start(
            using: repository,
            recoveryStore: recoveryStore,
            now: startedAt.addingTimeInterval(20)
        )
        await model.submit(
            using: repository,
            recoveryStore: recoveryStore,
            now: startedAt.addingTimeInterval(24)
        )

        let keys = await repository.submissionKeys
        #expect(keys.count == 2)
        #expect(keys.first == keys.last)
        #expect(model.phase == .feedback)
        #expect(try await recoveryStore.load() == nil)
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

    private(set) var startCount = 0
    private(set) var submissionCount = 0
    private(set) var lastSubmission: Submission?

    func startOrResume() -> PracticeQuestionStep {
        startCount += 1
        return .mock
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

private actor FlakyPracticeRepository: PracticeRepository {
    private(set) var submissionKeys: [String] = []

    func startOrResume() -> PracticeQuestionStep {
        .mock
    }

    func submitResponse(
        sessionID: String,
        questionID: String,
        response: String,
        elapsedSeconds: Int,
        idempotencyKey: String
    ) throws -> PracticeFeedbackContent {
        submissionKeys.append(idempotencyKey)
        if submissionKeys.count == 1 {
            throw RepositoryError.offline
        }
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
