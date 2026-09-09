import Testing
@testable import SaturnPath

@MainActor
struct AuthAndOnboardingViewModelTests {
    @Test
    func emailValidationRejectsIncompleteAddress() async {
        let model = AuthViewModel()
        model.email = "student@"

        await model.sendEmailLink(using: MockAccountRepository())

        #expect(model.state == .failure("Enter a valid email address."))
    }

    @Test
    func appleMockRoutesIntoOnboarding() async throws {
        let model = AuthViewModel()

        let bootstrap = try #require(
            await model.signInWithApple(using: MockAccountRepository())
        )

        #expect(bootstrap.isAuthenticated)
        #expect(!bootstrap.hasCompletedOnboarding)
    }

    @Test
    func onboardingProgressesAndCompletes() async throws {
        let model = OnboardingViewModel()

        model.advance()
        #expect(model.step == .schedule)
        model.advance()
        #expect(model.step == .privacy)

        let bootstrap = try #require(
            await model.complete(using: MockOnboardingRepository())
        )

        #expect(bootstrap.hasCompletedOnboarding)
        #expect(model.submissionState == .idle)
    }
}
