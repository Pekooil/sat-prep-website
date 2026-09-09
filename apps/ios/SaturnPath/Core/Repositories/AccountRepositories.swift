import Foundation

enum TimingAccommodation: Double, CaseIterable, Equatable, Sendable {
    case standard = 1
    case timeAndAHalf = 1.5
    case doubleTime = 2

    var title: String {
        switch self {
        case .standard: "Standard"
        case .timeAndAHalf: "1.5×"
        case .doubleTime: "2×"
        }
    }
}

struct OnboardingDraft: Equatable, Sendable {
    var currentScore: Int
    var targetScore: Int
    var testDate: Date
    var timingAccommodation: TimingAccommodation
    var scratchAnalysisEnabled: Bool

    static var initial: Self {
        Self(
            currentScore: 1200,
            targetScore: 1400,
            testDate: Calendar.current.date(byAdding: .day, value: 60, to: .now) ?? .now,
            timingAccommodation: .standard,
            scratchAnalysisEnabled: false
        )
    }
}

enum EmailSignInResult: Equatable, Sendable {
    case linkSent
}

protocol AccountRepository: Sendable {
    func signInWithApple() async throws -> AppBootstrapViewContent
    func sendEmailSignInLink(to email: String) async throws -> EmailSignInResult
}

protocol OnboardingRepository: Sendable {
    func completeOnboarding(_ draft: OnboardingDraft) async throws -> AppBootstrapViewContent
}

struct MockAccountRepository: AccountRepository {
    var appleResult = AppBootstrapViewContent(
        isAuthenticated: true,
        hasCompletedOnboarding: false,
        displayName: "Explorer"
    )

    func signInWithApple() -> AppBootstrapViewContent {
        appleResult
    }

    func sendEmailSignInLink(to email: String) -> EmailSignInResult {
        .linkSent
    }
}

struct MockOnboardingRepository: OnboardingRepository {
    var result = AppBootstrapViewContent(
        isAuthenticated: true,
        hasCompletedOnboarding: true,
        displayName: "Explorer"
    )

    func completeOnboarding(_ draft: OnboardingDraft) -> AppBootstrapViewContent {
        result
    }
}
