import Foundation
import Security

struct AuthSession: Codable, Equatable, Sendable {
    let userID: String
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date
}

enum SessionStoreError: Error, Equatable, Sendable {
    case encodingFailed
    case decodingFailed
    case keychain(status: OSStatus)
}

protocol SessionStoring: Sendable {
    func load() async throws -> AuthSession?
    func save(_ session: AuthSession) async throws
    func clear() async throws
}

actor KeychainSessionStore: SessionStoring {
    private let service: String
    private let account: String
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(
        service: String = "app.saturnpath.ios.auth",
        account: String = "current-session"
    ) {
        self.service = service
        self.account = account
    }

    func load() throws -> AuthSession? {
        var query = baseQuery
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)

        if status == errSecItemNotFound {
            return nil
        }
        guard status == errSecSuccess else {
            throw SessionStoreError.keychain(status: status)
        }
        guard let data = item as? Data else {
            throw SessionStoreError.decodingFailed
        }

        do {
            return try decoder.decode(AuthSession.self, from: data)
        } catch {
            throw SessionStoreError.decodingFailed
        }
    }

    func save(_ session: AuthSession) throws {
        let data: Data
        do {
            data = try encoder.encode(session)
        } catch {
            throw SessionStoreError.encodingFailed
        }

        let attributes: [String: Any] = [
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
        ]
        let updateStatus = SecItemUpdate(baseQuery as CFDictionary, attributes as CFDictionary)

        if updateStatus == errSecItemNotFound {
            var newItem = baseQuery
            attributes.forEach { newItem[$0.key] = $0.value }
            let addStatus = SecItemAdd(newItem as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw SessionStoreError.keychain(status: addStatus)
            }
            return
        }

        guard updateStatus == errSecSuccess else {
            throw SessionStoreError.keychain(status: updateStatus)
        }
    }

    func clear() throws {
        let status = SecItemDelete(baseQuery as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw SessionStoreError.keychain(status: status)
        }
    }

    private var baseQuery: [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
        ]
    }
}

actor InMemorySessionStore: SessionStoring {
    private var session: AuthSession?

    init(session: AuthSession? = nil) {
        self.session = session
    }

    func load() -> AuthSession? {
        session
    }

    func save(_ session: AuthSession) {
        self.session = session
    }

    func clear() {
        session = nil
    }
}

enum SessionAccessError: Error, Equatable, Sendable {
    case expired
}

struct SessionAccessTokenProvider: AccessTokenProviding {
    let store: any SessionStoring
    let now: @Sendable () -> Date

    init(
        store: any SessionStoring,
        now: @escaping @Sendable () -> Date = Date.init
    ) {
        self.store = store
        self.now = now
    }

    func accessToken() async throws -> String? {
        guard let session = try await store.load() else {
            return nil
        }
        guard session.expiresAt > now() else {
            throw SessionAccessError.expired
        }
        return session.accessToken
    }
}
