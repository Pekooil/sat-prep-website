import Foundation
import Observation

enum PracticeViewPhase: Equatable, Sendable {
    case idle
    case loading
    case question
    case feedback
    case recommendedStop
    case summary
    case failure(PracticeViewFailure)
}

enum PracticeViewFailure: Equatable, Sendable {
    case offline
    case expiredSession
    case server
}

@MainActor
@Observable
final class PracticeViewModel {
    private(set) var phase: PracticeViewPhase = .idle
    private(set) var questionStep: PracticeQuestionStep?
    private(set) var feedback: PracticeFeedbackContent?
    private(set) var summary: PracticeSummaryContent?
    private(set) var selectedResponse: String?
    private(set) var questionPresentedAt: Date?
    private(set) var accumulatedElapsedSeconds: TimeInterval = 0
    private(set) var isSubmitting = false
    private(set) var isResolvingStop = false
    private(set) var selectedClassificationID: String?
    private(set) var otherClassificationText = ""
    private(set) var classificationReceipt: PracticeClassificationReceipt?
    private(set) var classificationFailure: PracticeViewFailure?
    private(set) var isClassifying = false

    private var scratchNotes = ""
    private var submissionIdempotencyKey: String?
    private var classificationIdempotencyKey: String?

    static let otherClassificationLimit = 80

    var canSubmit: Bool {
        guard let selectedResponse else {
            return false
        }
        return !selectedResponse.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSubmitting
    }

    var needsClassification: Bool {
        feedback?.correctness == .incorrect
            && feedback?.classificationOptions.isEmpty == false
            && classificationReceipt == nil
    }

    var canContinueFromFeedback: Bool {
        !needsClassification && !isClassifying
    }

    var canSaveOtherClassification: Bool {
        selectedClassification?.kind == .other
            && !otherClassificationText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !isClassifying
    }

    var selectedClassification: MistakeClassificationOptionContent? {
        feedback?.classificationOptions.first { $0.id == selectedClassificationID }
    }

    func start(
        using repository: any PracticeRepository,
        recoveryStore: (any PracticeRecoveryStoring)? = nil,
        now: Date = .now
    ) async {
        phase = .loading
        let recovery = await loadRecovery(from: recoveryStore)

        if let recovery, let step = recovery.questionStep, recoveryMatches(recovery, step: step) {
            restore(recovery, step: step, now: now)
            return
        }

        do {
            let step = try await repository.startOrResume()
            if let recovery, recoveryMatches(recovery, step: step) {
                restore(recovery, step: step, now: now)
            } else {
                present(step, now: now)
            }
            await persist(using: recoveryStore, now: now)
        } catch {
            phase = .failure(map(error))
        }
    }

    func selectResponse(_ response: String) {
        guard phase == .question, !isSubmitting else {
            return
        }
        if selectedResponse != response {
            submissionIdempotencyKey = nil
        }
        selectedResponse = response
    }

    func submit(
        using repository: any PracticeRepository,
        recoveryStore: (any PracticeRecoveryStoring)? = nil,
        now: Date = .now
    ) async {
        guard
            phase == .question,
            let questionStep,
            let selectedResponse,
            canSubmit
        else {
            return
        }

        isSubmitting = true
        let idempotencyKey = submissionIdempotencyKey ?? UUID().uuidString
        submissionIdempotencyKey = idempotencyKey
        let elapsedSeconds = max(1, elapsedSeconds(at: now))
        await persist(using: recoveryStore, now: now)

        do {
            feedback = try await repository.submitResponse(
                sessionID: questionStep.sessionID,
                questionID: questionStep.question.id,
                response: selectedResponse,
                elapsedSeconds: elapsedSeconds,
                idempotencyKey: idempotencyKey
            )
            isSubmitting = false
            submissionIdempotencyKey = nil
            resetClassification()
            phase = .feedback
            await discardRecovery(using: recoveryStore)
        } catch {
            isSubmitting = false
            if case RepositoryError.expiredSession = error {
                await discardRecovery(using: recoveryStore)
            }
            phase = .failure(map(error))
        }
    }

    func advance(
        using repository: any PracticeRepository,
        recoveryStore: (any PracticeRecoveryStoring)? = nil,
        now: Date = .now
    ) async {
        guard
            phase == .feedback,
            canContinueFromFeedback,
            let sessionID = questionStep?.sessionID
        else {
            return
        }

        if feedback?.nextAction == .recommendedStop {
            phase = .recommendedStop
            return
        }

        phase = .loading
        await loadNext(
            using: repository,
            recoveryStore: recoveryStore,
            sessionID: sessionID,
            now: now
        )
    }

    func selectClassification(
        _ option: MistakeClassificationOptionContent,
        using repository: any PracticeRepository
    ) async {
        guard
            phase == .feedback,
            feedback?.classificationOptions.contains(option) == true,
            classificationReceipt == nil,
            !isClassifying
        else {
            return
        }

        if selectedClassificationID != option.id {
            classificationIdempotencyKey = nil
            classificationFailure = nil
        }
        selectedClassificationID = option.id

        guard option.kind != .other else {
            return
        }

        otherClassificationText = ""
        await saveClassification(option, otherText: nil, using: repository)
    }

    func updateOtherClassificationText(_ text: String) {
        guard classificationReceipt == nil else {
            return
        }
        otherClassificationText = String(text.prefix(Self.otherClassificationLimit))
        classificationFailure = nil
    }

    func saveOtherClassification(using repository: any PracticeRepository) async {
        guard let selectedClassification, canSaveOtherClassification else {
            return
        }
        await saveClassification(
            selectedClassification,
            otherText: otherClassificationText.trimmingCharacters(in: .whitespacesAndNewlines),
            using: repository
        )
    }

    func keepPracticing(
        using repository: any PracticeRepository,
        recoveryStore: (any PracticeRecoveryStoring)? = nil,
        now: Date = .now
    ) async {
        guard phase == .recommendedStop, let sessionID = questionStep?.sessionID, !isResolvingStop else {
            return
        }

        isResolvingStop = true
        await loadNext(
            using: repository,
            recoveryStore: recoveryStore,
            sessionID: sessionID,
            now: now
        )
        isResolvingStop = false
    }

    func finishRecommendedStop(
        using repository: any PracticeRepository,
        recoveryStore: (any PracticeRecoveryStoring)? = nil
    ) async {
        guard phase == .recommendedStop, let sessionID = questionStep?.sessionID, !isResolvingStop else {
            return
        }

        isResolvingStop = true
        do {
            summary = try await repository.endSession(
                sessionID: sessionID,
                reason: .recommendedStop,
                idempotencyKey: UUID().uuidString
            )
            isResolvingStop = false
            phase = .summary
            await discardRecovery(using: recoveryStore)
        } catch {
            isResolvingStop = false
            phase = .failure(map(error))
        }
    }

    func persist(
        using recoveryStore: (any PracticeRecoveryStoring)?,
        now: Date = .now
    ) async {
        guard phase == .question, let questionStep, let recoveryStore else {
            return
        }

        let state = PracticeRecoveryState(
            sessionID: questionStep.sessionID,
            questionID: questionStep.question.id,
            selectedResponse: selectedResponse,
            elapsedSeconds: TimeInterval(elapsedSeconds(at: now)),
            scratchNotes: scratchNotes,
            updatedAt: now,
            questionStep: questionStep,
            submissionIdempotencyKey: submissionIdempotencyKey
        )
        try? await recoveryStore.save(state)
    }

    func suspend(
        using recoveryStore: (any PracticeRecoveryStoring)?,
        now: Date = .now
    ) async {
        guard phase == .question else {
            return
        }
        if let questionPresentedAt {
            accumulatedElapsedSeconds += max(0, now.timeIntervalSince(questionPresentedAt))
            self.questionPresentedAt = nil
        }
        await persist(using: recoveryStore, now: now)
    }

    func resume(now: Date = .now) {
        guard phase == .question, questionPresentedAt == nil else {
            return
        }
        questionPresentedAt = now
    }

    func discardRecovery(using recoveryStore: (any PracticeRecoveryStoring)?) async {
        guard let recoveryStore else {
            return
        }
        try? await recoveryStore.clear()
    }

    func elapsedSeconds(at now: Date = .now) -> Int {
        let currentInterval = questionPresentedAt.map { max(0, now.timeIntervalSince($0)) } ?? 0
        return max(0, Int(accumulatedElapsedSeconds + currentInterval))
    }

    private func present(_ step: PracticeQuestionStep, now: Date) {
        questionStep = step
        feedback = nil
        summary = nil
        selectedResponse = nil
        questionPresentedAt = now
        accumulatedElapsedSeconds = 0
        scratchNotes = ""
        submissionIdempotencyKey = nil
        isSubmitting = false
        isResolvingStop = false
        resetClassification()
        phase = .question
    }

    private func restore(_ recovery: PracticeRecoveryState, step: PracticeQuestionStep, now: Date) {
        questionStep = step
        feedback = nil
        summary = nil
        selectedResponse = recovery.selectedResponse
        questionPresentedAt = now
        accumulatedElapsedSeconds = max(0, recovery.elapsedSeconds)
        scratchNotes = recovery.scratchNotes
        submissionIdempotencyKey = recovery.submissionIdempotencyKey
        isSubmitting = false
        isResolvingStop = false
        resetClassification()
        phase = .question
    }

    private func loadNext(
        using repository: any PracticeRepository,
        recoveryStore: (any PracticeRecoveryStoring)?,
        sessionID: String,
        now: Date
    ) async {
        phase = .loading
        do {
            switch try await repository.fetchNext(sessionID: sessionID) {
            case let .question(step):
                present(step, now: now)
                await persist(using: recoveryStore, now: now)
            case let .summary(summary):
                self.summary = summary
                phase = .summary
                await discardRecovery(using: recoveryStore)
            }
        } catch {
            phase = .failure(map(error))
        }
    }

    private func recoveryMatches(_ recovery: PracticeRecoveryState, step: PracticeQuestionStep) -> Bool {
        recovery.sessionID == step.sessionID && recovery.questionID == step.question.id
    }

    private func loadRecovery(
        from recoveryStore: (any PracticeRecoveryStoring)?
    ) async -> PracticeRecoveryState? {
        guard let recoveryStore else {
            return nil
        }
        do {
            return try await recoveryStore.load()
        } catch {
            try? await recoveryStore.clear()
            return nil
        }
    }

    private func map(_ error: Error) -> PracticeViewFailure {
        switch error {
        case RepositoryError.offline:
            .offline
        case RepositoryError.expiredSession:
            .expiredSession
        default:
            .server
        }
    }

    private func saveClassification(
        _ option: MistakeClassificationOptionContent,
        otherText: String?,
        using repository: any PracticeRepository
    ) async {
        guard let attemptID = feedback?.attemptID else {
            return
        }

        isClassifying = true
        classificationFailure = nil
        let idempotencyKey = classificationIdempotencyKey ?? UUID().uuidString
        classificationIdempotencyKey = idempotencyKey

        do {
            classificationReceipt = try await repository.classifyAttempt(
                attemptID: attemptID,
                classification: option.kind,
                otherText: otherText,
                idempotencyKey: idempotencyKey
            )
            classificationIdempotencyKey = nil
        } catch {
            classificationFailure = map(error)
        }
        isClassifying = false
    }

    private func resetClassification() {
        selectedClassificationID = nil
        otherClassificationText = ""
        classificationReceipt = nil
        classificationFailure = nil
        classificationIdempotencyKey = nil
        isClassifying = false
    }
}
