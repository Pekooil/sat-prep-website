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
    func recommendedStopIsPresentedBeforeTheSessionEnds() async {
        let repository = RecommendedStopPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("B")
        await model.submit(using: repository)

        await model.advance(using: repository)

        #expect(model.phase == .recommendedStop)
        #expect(await repository.nextCount == 0)
        #expect(await repository.endCount == 0)
    }

    @Test
    func recommendedStopCanFinishWithServerSummary() async {
        let repository = RecommendedStopPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("B")
        await model.submit(using: repository)
        await model.advance(using: repository)

        await model.finishRecommendedStop(using: repository)

        #expect(model.phase == .summary)
        #expect(model.summary == .mock)
        #expect(await repository.endCount == 1)
        #expect(await repository.lastEndReason == .recommendedStop)
        #expect(await repository.lastEndKey?.isEmpty == false)
    }

    @Test
    func recommendedStopCanContinueWithTheServerSelectedQuestion() async {
        let repository = RecommendedStopPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("B")
        await model.submit(using: repository)
        await model.advance(using: repository)

        await model.keepPracticing(using: repository)

        #expect(model.phase == .question)
        #expect(model.questionStep == .mockContinuation)
        #expect(await repository.nextCount == 1)
        #expect(await repository.endCount == 0)
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
    func scratchpadRestoresForTheActiveAttemptAndClearsAfterSubmission() async throws {
        let repository = RecordingPracticeRepository()
        let recoveryStore = InMemoryPracticeRecoveryStore()
        let drawingData = Data([0x53, 0x50, 0x01])
        let calculatorState = PracticeCalculatorState(
            inputs: [.seven, .multiply, .eight],
            lastAnswer: 56,
            showsResult: true,
            angleMode: .degrees
        )
        let firstModel = PracticeViewModel()
        await firstModel.start(using: repository, recoveryStore: recoveryStore)
        firstModel.updateScratchNotes("2x + 4 = 10")
        firstModel.updateScratchDrawing(drawingData)
        firstModel.updateCalculatorState(calculatorState)
        await firstModel.persist(using: recoveryStore)

        let restoredModel = PracticeViewModel()
        await restoredModel.start(using: repository, recoveryStore: recoveryStore)

        #expect(restoredModel.scratchNotes == "2x + 4 = 10")
        #expect(restoredModel.scratchDrawingData == drawingData)
        #expect(restoredModel.calculatorState == calculatorState)

        restoredModel.selectResponse("B")
        await restoredModel.submit(using: repository, recoveryStore: recoveryStore)

        #expect(restoredModel.scratchNotes.isEmpty)
        #expect(restoredModel.scratchDrawingData == nil)
        #expect(restoredModel.calculatorState == PracticeCalculatorState())
        #expect(try await recoveryStore.load() == nil)
    }

    @Test
    func typedScratchNotesAreConstrained() async {
        let model = PracticeViewModel()
        await model.start(using: MockPracticeRepository())

        model.updateScratchNotes(String(repeating: "x", count: 2_100))

        #expect(model.scratchNotes.count == 2_000)
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

    @Test
    func incorrectFeedbackCannotAdvanceBeforeClassification() async {
        let repository = ClassificationPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("A")
        await model.submit(using: repository)

        await model.advance(using: repository)

        #expect(model.phase == .feedback)
        #expect(model.needsClassification)
        #expect(await repository.nextCount == 0)
    }

    @Test
    func commonMistakeReasonSavesWithOneSelection() async throws {
        let repository = ClassificationPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("A")
        await model.submit(using: repository)
        let option = try #require(model.feedback?.classificationOptions.first { $0.kind == .careless })

        await model.selectClassification(option, using: repository)

        let classification = try #require(await repository.lastClassification)
        #expect(classification.attemptID == PracticeFeedbackContent.incorrectMock.attemptID)
        #expect(classification.kind == .careless)
        #expect(classification.otherText == nil)
        #expect(classification.idempotencyKey.isEmpty == false)
        #expect(model.classificationReceipt?.classification == .careless)
        #expect(model.canContinueFromFeedback)
    }

    @Test
    func otherReasonRequiresTextAndEnforcesCharacterLimit() async throws {
        let repository = ClassificationPracticeRepository()
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("A")
        await model.submit(using: repository)
        let option = try #require(model.feedback?.classificationOptions.first { $0.kind == .other })
        await model.selectClassification(option, using: repository)

        await model.saveOtherClassification(using: repository)
        #expect(await repository.classificationCount == 0)

        model.updateOtherClassificationText(String(repeating: "x", count: 100))
        #expect(model.otherClassificationText.count == PracticeViewModel.otherClassificationLimit)
        await model.saveOtherClassification(using: repository)

        #expect(await repository.classificationCount == 1)
        #expect(try #require(await repository.lastClassification).otherText?.count == PracticeViewModel.otherClassificationLimit)
        #expect(model.classificationReceipt?.classification == .other)
    }

    @Test
    func ambiguousClassificationRetryReusesItsIdempotencyKey() async throws {
        let repository = ClassificationPracticeRepository(classificationFailuresRemaining: 1)
        let model = PracticeViewModel()
        await model.start(using: repository)
        model.selectResponse("A")
        await model.submit(using: repository)
        let option = try #require(model.feedback?.classificationOptions.first { $0.kind == .strategy })

        await model.selectClassification(option, using: repository)
        #expect(model.classificationFailure == .offline)
        await model.selectClassification(option, using: repository)

        let keys = await repository.classificationKeys
        #expect(keys.count == 2)
        #expect(keys.first == keys.last)
        #expect(model.classificationReceipt?.classification == .strategy)
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

    func endSession(
        sessionID: String,
        reason: PracticeEndReason,
        idempotencyKey: String
    ) -> PracticeSummaryContent {
        .mock
    }
}

private actor RecommendedStopPracticeRepository: PracticeRepository {
    private(set) var nextCount = 0
    private(set) var endCount = 0
    private(set) var lastEndReason: PracticeEndReason?
    private(set) var lastEndKey: String?

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
        nextCount += 1
        return .question(.mockContinuation)
    }

    func endSession(
        sessionID: String,
        reason: PracticeEndReason,
        idempotencyKey: String
    ) -> PracticeSummaryContent {
        endCount += 1
        lastEndReason = reason
        lastEndKey = idempotencyKey
        return .mock
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

    func endSession(
        sessionID: String,
        reason: PracticeEndReason,
        idempotencyKey: String
    ) -> PracticeSummaryContent {
        .mock
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

    func endSession(
        sessionID: String,
        reason: PracticeEndReason,
        idempotencyKey: String
    ) throws -> PracticeSummaryContent {
        throw error
    }
}

private actor ClassificationPracticeRepository: PracticeRepository {
    struct Classification: Sendable {
        let attemptID: String
        let kind: MistakeClassificationKind
        let otherText: String?
        let idempotencyKey: String
    }

    private(set) var nextCount = 0
    private(set) var classificationCount = 0
    private(set) var lastClassification: Classification?
    private(set) var classificationKeys: [String] = []
    private var classificationFailuresRemaining: Int

    init(classificationFailuresRemaining: Int = 0) {
        self.classificationFailuresRemaining = classificationFailuresRemaining
    }

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
        .incorrectMock
    }

    func fetchNext(sessionID: String) -> PracticeNextContent {
        nextCount += 1
        return .question(.mockContinuation)
    }

    func classifyAttempt(
        attemptID: String,
        classification: MistakeClassificationKind,
        otherText: String?,
        idempotencyKey: String
    ) throws -> PracticeClassificationReceipt {
        classificationCount += 1
        classificationKeys.append(idempotencyKey)
        lastClassification = Classification(
            attemptID: attemptID,
            kind: classification,
            otherText: otherText,
            idempotencyKey: idempotencyKey
        )
        if classificationFailuresRemaining > 0 {
            classificationFailuresRemaining -= 1
            throw RepositoryError.offline
        }
        return PracticeClassificationReceipt(
            attemptID: attemptID,
            classification: classification,
            classifiedAt: .now
        )
    }

    func endSession(
        sessionID: String,
        reason: PracticeEndReason,
        idempotencyKey: String
    ) -> PracticeSummaryContent {
        .mock
    }
}
