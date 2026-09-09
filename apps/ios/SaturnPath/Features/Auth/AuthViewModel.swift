import Foundation
import Observation

enum AuthViewState: Equatable, Sendable {
    case idle
    case submitting
    case emailSent
    case failure(String)
}

@MainActor
@Observable
final class AuthViewModel {
    var email = ""
    private(set) var state: AuthViewState = .idle

    var normalizedEmail: String {
        email.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    var canSubmitEmail: Bool {
        let pieces = normalizedEmail.split(separator: "@", omittingEmptySubsequences: false)
        return pieces.count == 2 && pieces[0].isEmpty == false && pieces[1].contains(".")
    }

    func signInWithApple(using repository: any AccountRepository) async -> AppBootstrapViewContent? {
        state = .submitting
        do {
            let bootstrap = try await repository.signInWithApple()
            state = .idle
            return bootstrap
        } catch {
            state = .failure("Sign in isn’t available right now. Please try again.")
            return nil
        }
    }

    func sendEmailLink(using repository: any AccountRepository) async {
        guard canSubmitEmail else {
            state = .failure("Enter a valid email address.")
            return
        }

        state = .submitting
        do {
            _ = try await repository.sendEmailSignInLink(to: normalizedEmail)
            state = .emailSent
        } catch {
            state = .failure("We couldn’t send the sign-in link. Please try again.")
        }
    }
}
