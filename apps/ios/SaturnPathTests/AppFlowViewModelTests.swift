import Testing
@testable import SaturnPath

@MainActor
struct AppFlowViewModelTests {
    @Test(arguments: [
        (AppBootstrapViewContent(isAuthenticated: false, hasCompletedOnboarding: false, displayName: nil), AppFlowState.signedOut),
        (AppBootstrapViewContent(isAuthenticated: true, hasCompletedOnboarding: false, displayName: "D"), AppFlowState.onboarding),
        (AppBootstrapViewContent(isAuthenticated: true, hasCompletedOnboarding: true, displayName: "D"), AppFlowState.main),
    ])
    func bootstrapRoutesToExpectedRoot(
        bootstrap: AppBootstrapViewContent,
        expectedState: AppFlowState
    ) async {
        let model = AppFlowViewModel()

        await model.load(using: MockBootstrapRepository(content: bootstrap))

        #expect(model.state == expectedState)
    }

    @Test
    func expiredSessionRoutesToSignIn() async {
        let model = AppFlowViewModel()

        await model.load(using: FailingBootstrapRepository(error: .expiredSession))

        #expect(model.state == .signedOut)
    }
}

private struct FailingBootstrapRepository: BootstrapRepository {
    let error: RepositoryError

    func fetchBootstrap() throws -> AppBootstrapViewContent {
        throw error
    }
}
