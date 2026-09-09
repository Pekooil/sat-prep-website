import Foundation
import Observation

enum AppFlowFailure: Equatable, Sendable {
    case offline
    case expiredSession
    case server
}

enum AppFlowState: Equatable, Sendable {
    case loading
    case signedOut
    case onboarding
    case main
    case failure(AppFlowFailure)
}

@MainActor
@Observable
final class AppFlowViewModel {
    private(set) var state: AppFlowState = .loading

    func load(using repository: any BootstrapRepository) async {
        state = .loading

        do {
            route(try await repository.fetchBootstrap())
        } catch RepositoryError.offline {
            state = .failure(.offline)
        } catch RepositoryError.expiredSession {
            state = .signedOut
        } catch {
            state = .failure(.server)
        }
    }

    func didAuthenticate(_ bootstrap: AppBootstrapViewContent) {
        route(bootstrap)
    }

    func didCompleteOnboarding(_ bootstrap: AppBootstrapViewContent) {
        route(bootstrap)
    }

    private func route(_ bootstrap: AppBootstrapViewContent) {
        if !bootstrap.isAuthenticated {
            state = .signedOut
        } else if !bootstrap.hasCompletedOnboarding {
            state = .onboarding
        } else {
            state = .main
        }
    }
}
