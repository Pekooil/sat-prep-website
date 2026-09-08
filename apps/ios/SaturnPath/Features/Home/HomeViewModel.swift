import Foundation
import Observation

enum HomeViewFailure: Equatable, Sendable {
    case offline
    case expiredSession
    case server

    var title: String {
        switch self {
        case .offline:
            "You’re offline"
        case .expiredSession:
            "Sign in again"
        case .server:
            "Your path couldn’t load"
        }
    }

    var message: String {
        switch self {
        case .offline:
            "Reconnect to refresh today’s recommendation."
        case .expiredSession:
            "Your session expired. Sign in again to keep your progress synced."
        case .server:
            "SaturnPath hit a temporary problem. Your saved progress is safe."
        }
    }

    var systemImage: String {
        switch self {
        case .offline:
            "wifi.slash"
        case .expiredSession:
            "person.crop.circle.badge.exclamationmark"
        case .server:
            "exclamationmark.arrow.trianglehead.2.clockwise.rotate.90"
        }
    }
}

enum HomeViewState: Equatable, Sendable {
    case idle
    case loading
    case empty
    case content(HomeViewContent)
    case failure(HomeViewFailure)
}

@MainActor
@Observable
final class HomeViewModel {
    private(set) var state: HomeViewState = .idle

    func load(
        using repository: any HomeRepository,
        force: Bool = false
    ) async {
        guard force || state == .idle else {
            return
        }

        state = .loading

        do {
            if let content = try await repository.fetchHome() {
                state = .content(content)
            } else {
                state = .empty
            }
        } catch let error as RepositoryError {
            state = .failure(Self.map(error))
        } catch let error as APIClientError {
            state = .failure(Self.map(error))
        } catch {
            state = .failure(.server)
        }
    }

    private static func map(_ error: RepositoryError) -> HomeViewFailure {
        switch error {
        case .offline:
            .offline
        case .expiredSession:
            .expiredSession
        case .unavailable:
            .server
        }
    }

    private static func map(_ error: APIClientError) -> HomeViewFailure {
        switch error {
        case .offline:
            .offline
        case .authenticationRequired, .sessionExpired:
            .expiredSession
        default:
            .server
        }
    }
}
