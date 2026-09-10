import Foundation

enum PracticeCalculatorAngleMode: String, Codable, CaseIterable, Identifiable, Sendable {
    case degrees
    case radians

    var id: String { rawValue }

    var title: String {
        switch self {
        case .degrees: "Deg"
        case .radians: "Rad"
        }
    }
}

enum PracticeCalculatorInput: String, Codable, Equatable, Sendable {
    case zero
    case one
    case two
    case three
    case four
    case five
    case six
    case seven
    case eight
    case nine
    case decimal
    case add
    case subtract
    case multiply
    case divide
    case power
    case square
    case openParenthesis
    case closeParenthesis
    case sine
    case cosine
    case tangent
    case logarithm
    case naturalLogarithm
    case squareRoot
    case pi
    case answer
}

struct PracticeCalculatorState: Codable, Equatable, Sendable {
    var inputs: [PracticeCalculatorInput] = []
    var lastAnswer: Double?
    var showsResult = false
    var angleMode: PracticeCalculatorAngleMode = .degrees

    var isEmpty: Bool {
        inputs.isEmpty && lastAnswer == nil && angleMode == .degrees
    }
}

struct PracticeRecoveryState: Codable, Equatable, Sendable {
    let sessionID: String
    let questionID: String
    let selectedResponse: String?
    let elapsedSeconds: TimeInterval
    let scratchNotes: String
    let scratchDrawingData: Data?
    let calculatorState: PracticeCalculatorState?
    let updatedAt: Date
    let questionStep: PracticeQuestionStep?
    let submissionIdempotencyKey: String?

    init(
        sessionID: String,
        questionID: String,
        selectedResponse: String?,
        elapsedSeconds: TimeInterval,
        scratchNotes: String,
        scratchDrawingData: Data? = nil,
        calculatorState: PracticeCalculatorState? = nil,
        updatedAt: Date,
        questionStep: PracticeQuestionStep? = nil,
        submissionIdempotencyKey: String? = nil
    ) {
        self.sessionID = sessionID
        self.questionID = questionID
        self.selectedResponse = selectedResponse
        self.elapsedSeconds = elapsedSeconds
        self.scratchNotes = scratchNotes
        self.scratchDrawingData = scratchDrawingData
        self.calculatorState = calculatorState
        self.updatedAt = updatedAt
        self.questionStep = questionStep
        self.submissionIdempotencyKey = submissionIdempotencyKey
    }
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
