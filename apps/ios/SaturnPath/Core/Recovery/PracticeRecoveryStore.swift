import Foundation

struct PracticeRecoveryState: Codable, Equatable, Sendable {
    let sessionID: String
    let questionID: String
    let selectedResponse: String?
    let elapsedSeconds: TimeInterval
    let scratchNotes: String
    let updatedAt: Date
}

enum PracticeRecoveryStoreError: Error, Equatable, Sendable {
    case corrupted
    case unavailable
}

protocol PracticeRecoveryStoring: Sendable {
    func load() async throws -> PracticeRecoveryState?
    func save(_ state: PracticeRecoveryState) async throws
    func clear() async throws
}

actor FilePracticeRecoveryStore: PracticeRecoveryStoring {
    private let fileURL: URL
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    init(fileURL: URL) {
        self.fileURL = fileURL
    }

    func load() throws -> PracticeRecoveryState? {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return nil
        }

        do {
            let data = try Data(contentsOf: fileURL)
            return try decoder.decode(PracticeRecoveryState.self, from: data)
        } catch {
            throw PracticeRecoveryStoreError.corrupted
        }
    }

    func save(_ state: PracticeRecoveryState) throws {
        do {
            try FileManager.default.createDirectory(
                at: fileURL.deletingLastPathComponent(),
                withIntermediateDirectories: true
            )
            let data = try encoder.encode(state)
            try data.write(to: fileURL, options: [.atomic, .completeFileProtection])
        } catch {
            throw PracticeRecoveryStoreError.unavailable
        }
    }

    func clear() throws {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return
        }

        do {
            try FileManager.default.removeItem(at: fileURL)
        } catch {
            throw PracticeRecoveryStoreError.unavailable
        }
    }
}

actor InMemoryPracticeRecoveryStore: PracticeRecoveryStoring {
    private var state: PracticeRecoveryState?

    init(state: PracticeRecoveryState? = nil) {
        self.state = state
    }

    func load() -> PracticeRecoveryState? {
        state
    }

    func save(_ state: PracticeRecoveryState) {
        self.state = state
    }

    func clear() {
        state = nil
    }
}
