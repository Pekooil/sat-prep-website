import Foundation
import Observation

enum OnboardingStep: Int, CaseIterable, Equatable, Sendable {
    case scores
    case schedule
    case privacy

    var position: Int { rawValue + 1 }
}

enum OnboardingSubmissionState: Equatable, Sendable {
    case idle
    case submitting
    case failure(String)
}

@MainActor
@Observable
final class OnboardingViewModel {
    var step: OnboardingStep = .scores
    var draft: OnboardingDraft
    private(set) var submissionState: OnboardingSubmissionState = .idle

    init(draft: OnboardingDraft = .initial) {
        self.draft = draft
    }

    var canGoBack: Bool {
        step != .scores
    }

    var isFinalStep: Bool {
        step == .privacy
    }

    func advance() {
        guard let next = OnboardingStep(rawValue: step.rawValue + 1) else {
            return
        }
        step = next
    }

    func goBack() {
        guard let previous = OnboardingStep(rawValue: step.rawValue - 1) else {
            return
        }
        step = previous
    }

    func complete(using repository: any OnboardingRepository) async -> AppBootstrapViewContent? {
        submissionState = .submitting
        do {
            let bootstrap = try await repository.completeOnboarding(draft)
            submissionState = .idle
            return bootstrap
        } catch {
            submissionState = .failure("We couldn’t save your setup. Your answers are still here—please try again.")
            return nil
        }
    }
}
