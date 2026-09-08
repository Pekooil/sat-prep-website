import Foundation
import Testing
@testable import SaturnPath

struct SessionStoreTests {
    @Test
    func inMemoryStoreSupportsSaveLoadAndClear() async throws {
        let store = InMemorySessionStore()
        let session = AuthSession(
            userID: "user-1",
            accessToken: "access",
            refreshToken: "refresh",
            expiresAt: Date(timeIntervalSince1970: 2_000)
        )

        try await store.save(session)
        #expect(try await store.load() == session)

        try await store.clear()
        #expect(try await store.load() == nil)
    }

    @Test
    func tokenProviderRejectsExpiredSession() async throws {
        let store = InMemorySessionStore(
            session: AuthSession(
                userID: "user-1",
                accessToken: "expired-access",
                refreshToken: "refresh",
                expiresAt: Date(timeIntervalSince1970: 100)
            )
        )
        let provider = SessionAccessTokenProvider(
            store: store,
            now: { Date(timeIntervalSince1970: 200) }
        )

        await #expect(throws: SessionAccessError.expired) {
            try await provider.accessToken()
        }
    }
}
