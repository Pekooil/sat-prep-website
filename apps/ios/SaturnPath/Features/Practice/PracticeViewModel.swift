import Foundation
import Observation

enum PracticeViewPhase: Equatable, Sendable {
    case idle
    case loading
    case question
    case feedback
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
    private(set) var isSubmitting = false

    var canSubmit: Bool {
        guard let selectedResponse else {
            return false
        }
        return !selectedResponse.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSubmitting
    }

    func start(using repository: any PracticeRepository) async {
        phase = .loading
        do {
            present(try await repository.startOrResume())
        } catch {
            phase = .failure(map(error))
        }
    }

    func selectResponse(_ response: String) {
        guard phase == .question, !isSubmitting else {
            return
        }
        selectedResponse = response
    }

    func submit(using repository: any PracticeRepository, now: Date = .now) async {
        guard
            phase == .question,
            let questionStep,
            let selectedResponse,
            canSubmit
        else {
            return
        }

        isSubmitting = true
        let idempotencyKey = UUID().uuidString
        let elapsedSeconds = max(1, Int(now.timeIntervalSince(questionPresentedAt ?? now)))

        do {
            feedback = try await repository.submitResponse(
                sessionID: questionStep.sessionID,
                questionID: questionStep.question.id,
                response: selectedResponse,
                elapsedSeconds: elapsedSeconds,
                idempotencyKey: idempotencyKey
            )
            isSubmitting = false
            phase = .feedback
        } catch {
            isSubmitting = false
            phase = .failure(map(error))
        }
    }

    func advance(using repository: any PracticeRepository) async {
        guard phase == .feedback, let sessionID = questionStep?.sessionID else {
            return
        }

        phase = .loading
        do {
            switch try await repository.fetchNext(sessionID: sessionID) {
            case let .question(step):
                present(step)
            case let .summary(summary):
                self.summary = summary
                phase = .summary
            }
        } catch {
            phase = .failure(map(error))
        }
    }

    private func present(_ step: PracticeQuestionStep) {
        questionStep = step
        feedback = nil
        summary = nil
        selectedResponse = nil
        questionPresentedAt = .now
        isSubmitting = false
        phase = .question
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
}
