import Foundation
import SafariServices
import SwiftUI

enum ScientificCalculatorError: Error, Equatable, Sendable {
    case divisionByZero
    case domain
    case invalidExpression

    var message: String {
        switch self {
        case .divisionByZero: "Can’t divide by zero"
        case .domain: "Outside the function’s domain"
        case .invalidExpression: "Check the expression"
        }
    }
}

struct ScientificCalculatorEngine: Sendable {
    func evaluate(
        _ inputs: [PracticeCalculatorInput],
        lastAnswer: Double?,
        angleMode: PracticeCalculatorAngleMode
    ) throws -> Double {
        guard !inputs.isEmpty else {
            throw ScientificCalculatorError.invalidExpression
        }

        let tokens = try tokenize(inputs.map(\.parserText).joined())
        var parser = Parser(tokens: tokens, lastAnswer: lastAnswer, angleMode: angleMode)
        let result = try parser.parse()
        guard result.isFinite else {
            throw ScientificCalculatorError.domain
        }
        return abs(result) < 1e-12 ? 0 : result
    }

    private func tokenize(_ expression: String) throws -> [Token] {
        let characters = Array(expression.lowercased())
        var tokens: [Token] = []
        var index = 0

        while index < characters.count {
            let character = characters[index]

            if character.isWhitespace {
                index += 1
                continue
            }

            if character.isNumber || character == "." {
                let start = index
                var decimalCount = 0
                while index < characters.count,
                      characters[index].isNumber || characters[index] == "." {
                    if characters[index] == "." {
                        decimalCount += 1
                    }
                    index += 1
                }
                guard decimalCount <= 1,
                      let value = Double(String(characters[start..<index]))
                else {
                    throw ScientificCalculatorError.invalidExpression
                }
                tokens.append(.number(value))
                continue
            }

            if character.isLetter {
                let start = index
                while index < characters.count, characters[index].isLetter {
                    index += 1
                }
                tokens.append(.identifier(String(characters[start..<index])))
                continue
            }

            switch character {
            case "+": tokens.append(.add)
            case "-": tokens.append(.subtract)
            case "*": tokens.append(.multiply)
            case "/": tokens.append(.divide)
            case "^": tokens.append(.power)
            case "(": tokens.append(.openParenthesis)
            case ")": tokens.append(.closeParenthesis)
            default: throw ScientificCalculatorError.invalidExpression
            }
            index += 1
        }

        return tokens
    }
}

private extension PracticeCalculatorInput {
    var parserText: String {
        switch self {
        case .zero: "0"
        case .one: "1"
        case .two: "2"
        case .three: "3"
        case .four: "4"
        case .five: "5"
        case .six: "6"
        case .seven: "7"
        case .eight: "8"
        case .nine: "9"
        case .decimal: "."
        case .add: "+"
        case .subtract: "-"
        case .multiply: "*"
        case .divide: "/"
        case .power: "^"
        case .square: "^2"
        case .openParenthesis: "("
        case .closeParenthesis: ")"
        case .sine: "sin("
        case .cosine: "cos("
        case .tangent: "tan("
        case .logarithm: "log("
        case .naturalLogarithm: "ln("
        case .squareRoot: "sqrt("
        case .pi: "pi"
        case .answer: "ans"
        }
    }

    var displayText: String {
        switch self {
        case .multiply: " × "
        case .divide: " ÷ "
        case .add: " + "
        case .subtract: " − "
        case .square: "²"
        case .squareRoot: "√("
        case .pi: "π"
        case .answer: "Ans"
        default: parserText
        }
    }

    var startsNewExpressionAfterResult: Bool {
        switch self {
        case .add, .subtract, .multiply, .divide, .power, .square:
            false
        default:
            true
        }
    }
}

private enum Token: Equatable {
    case number(Double)
    case identifier(String)
    case add
    case subtract
    case multiply
    case divide
    case power
    case openParenthesis
    case closeParenthesis
}

private struct Parser {
    let tokens: [Token]
    let lastAnswer: Double?
    let angleMode: PracticeCalculatorAngleMode
    private var index = 0

    init(
        tokens: [Token],
        lastAnswer: Double?,
        angleMode: PracticeCalculatorAngleMode
    ) {
        self.tokens = tokens
        self.lastAnswer = lastAnswer
        self.angleMode = angleMode
    }

    mutating func parse() throws -> Double {
        let value = try parseExpression()
        guard index == tokens.count else {
            throw ScientificCalculatorError.invalidExpression
        }
        return value
    }

    private mutating func parseExpression() throws -> Double {
        var value = try parseTerm()

        while true {
            if match(.add) {
                value += try parseTerm()
            } else if match(.subtract) {
                value -= try parseTerm()
            } else {
                return value
            }
        }
    }

    private mutating func parseTerm() throws -> Double {
        var value = try parseUnary()

        while true {
            if match(.multiply) {
                value *= try parseUnary()
            } else if match(.divide) {
                let divisor = try parseUnary()
                guard divisor != 0 else {
                    throw ScientificCalculatorError.divisionByZero
                }
                value /= divisor
            } else {
                return value
            }
        }
    }

    private mutating func parseUnary() throws -> Double {
        if match(.add) {
            return try parseUnary()
        }
        if match(.subtract) {
            return -(try parseUnary())
        }
        return try parsePower()
    }

    private mutating func parsePower() throws -> Double {
        var value = try parsePrimary()
        if match(.power) {
            value = Foundation.pow(value, try parseUnary())
        }
        guard value.isFinite else {
            throw ScientificCalculatorError.domain
        }
        return value
    }

    private mutating func parsePrimary() throws -> Double {
        guard index < tokens.count else {
            throw ScientificCalculatorError.invalidExpression
        }

        switch tokens[index] {
        case let .number(value):
            index += 1
            return value
        case let .identifier(identifier):
            index += 1
            return try parseIdentifier(identifier)
        case .openParenthesis:
            index += 1
            let value = try parseExpression()
            guard match(.closeParenthesis) else {
                throw ScientificCalculatorError.invalidExpression
            }
            return value
        default:
            throw ScientificCalculatorError.invalidExpression
        }
    }

    private mutating func parseIdentifier(_ identifier: String) throws -> Double {
        switch identifier {
        case "pi":
            return Double.pi
        case "ans":
            guard let lastAnswer else {
                throw ScientificCalculatorError.invalidExpression
            }
            return lastAnswer
        case "sin", "cos", "tan", "log", "ln", "sqrt":
            guard match(.openParenthesis) else {
                throw ScientificCalculatorError.invalidExpression
            }
            let argument = try parseExpression()
            guard match(.closeParenthesis) else {
                throw ScientificCalculatorError.invalidExpression
            }
            return try evaluateFunction(identifier, argument: argument)
        default:
            throw ScientificCalculatorError.invalidExpression
        }
    }

    private func evaluateFunction(_ function: String, argument: Double) throws -> Double {
        switch function {
        case "sin":
            return Foundation.sin(convertedAngle(argument))
        case "cos":
            return Foundation.cos(convertedAngle(argument))
        case "tan":
            let angle = convertedAngle(argument)
            guard abs(Foundation.cos(angle)) > 1e-12 else {
                throw ScientificCalculatorError.domain
            }
            return Foundation.tan(angle)
        case "log":
            guard argument > 0 else {
                throw ScientificCalculatorError.domain
            }
            return Foundation.log10(argument)
        case "ln":
            guard argument > 0 else {
                throw ScientificCalculatorError.domain
            }
            return Foundation.log(argument)
        case "sqrt":
            guard argument >= 0 else {
                throw ScientificCalculatorError.domain
            }
            return Foundation.sqrt(argument)
        default:
            throw ScientificCalculatorError.invalidExpression
        }
    }

    private func convertedAngle(_ angle: Double) -> Double {
        angleMode == .degrees ? angle * .pi / 180 : angle
    }

    private mutating func match(_ token: Token) -> Bool {
        guard index < tokens.count, tokens[index] == token else {
            return false
        }
        index += 1
        return true
    }
}

private enum ScientificCalculatorKey: Hashable, Identifiable, Sendable {
    case input(PracticeCalculatorInput)
    case delete
    case clear
    case equals

    var id: String {
        switch self {
        case let .input(input): "input-\(input.rawValue)"
        case .delete: "delete"
        case .clear: "clear"
        case .equals: "equals"
        }
    }

    var title: String {
        switch self {
        case let .input(input):
            switch input {
            case .sine: "sin"
            case .cosine: "cos"
            case .tangent: "tan"
            case .logarithm: "log"
            case .naturalLogarithm: "ln"
            case .squareRoot: "√"
            case .square: "x²"
            case .add: "+"
            case .subtract: "−"
            case .multiply: "×"
            case .divide: "÷"
            case .power: "xʸ"
            case .openParenthesis: "("
            case .closeParenthesis: ")"
            case .pi: "π"
            case .answer: "Ans"
            default: input.parserText
            }
        case .delete: "Delete"
        case .clear: "AC"
        case .equals: "="
        }
    }

    var accessibilityLabel: String {
        switch self {
        case let .input(input):
            switch input {
            case .add: "Plus"
            case .subtract: "Minus"
            case .multiply: "Multiply"
            case .divide: "Divide"
            case .power: "Power"
            case .square: "Square"
            case .openParenthesis: "Open parenthesis"
            case .closeParenthesis: "Close parenthesis"
            case .sine: "Sine"
            case .cosine: "Cosine"
            case .tangent: "Tangent"
            case .logarithm: "Base ten logarithm"
            case .naturalLogarithm: "Natural logarithm"
            case .squareRoot: "Square root"
            case .pi: "Pi"
            case .answer: "Previous answer"
            case .decimal: "Decimal point"
            default: title
            }
        case .delete: "Delete last entry"
        case .clear: "Clear expression"
        case .equals: "Equals"
        }
    }

    var isOperator: Bool {
        switch self {
        case .input(.add), .input(.subtract), .input(.multiply), .input(.divide), .input(.power):
            true
        default:
            false
        }
    }

    var isDestructive: Bool {
        self == .clear
    }
}

struct ScientificCalculatorView: View {
    @Binding var state: PracticeCalculatorState

    @State private var errorMessage: String?
    @State private var showsOfficialGraphingCalculator = false

    private let engine = ScientificCalculatorEngine()
    private let officialGraphingURL = URL(string: "https://www.desmos.com/testing/collegeboard/graphing")!

    var body: some View {
        ScrollView {
            VStack(spacing: SaturnPathSpacing.small) {
                display
                calculatorOptions
                keypad

                Text("Native scientific calculator. Graphing practice opens Desmos’s official SAT calculator.")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(SaturnPathTheme.softInk)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .scrollIndicators(.hidden)
        .scrollBounceBehavior(.basedOnSize)
        .sheet(isPresented: $showsOfficialGraphingCalculator) {
            OfficialCalculatorBrowser(url: officialGraphingURL)
                .ignoresSafeArea()
        }
        .accessibilityIdentifier("saturnpath.calculator")
    }

    private var display: some View {
        VStack(alignment: .trailing, spacing: 4) {
            Text(expressionText)
                .font(.system(.subheadline, design: .monospaced))
                .foregroundStyle(SaturnPathTheme.mutedInk)
                .lineLimit(1)
                .minimumScaleFactor(0.55)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityLabel("Expression, \(spokenExpression)")
                .accessibilityIdentifier("saturnpath.calculator.expression")

            Text(resultText)
                .font(.system(.title, design: .rounded, weight: .bold))
                .foregroundStyle(errorMessage == nil ? SaturnPathTheme.ink : SaturnPathTheme.coralDeep)
                .lineLimit(1)
                .minimumScaleFactor(0.55)
                .frame(maxWidth: .infinity, alignment: .trailing)
                .accessibilityLabel(resultAccessibilityLabel)
                .accessibilityIdentifier("saturnpath.calculator.result")
        }
        .padding(.horizontal, SaturnPathSpacing.medium)
        .padding(.vertical, SaturnPathSpacing.small)
        .frame(minHeight: 76)
        .background(SaturnPathTheme.surfaceStrong, in: RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: SaturnPathRadius.control, style: .continuous)
                .stroke(errorMessage == nil ? SaturnPathTheme.lineStrong : SaturnPathTheme.coral.opacity(0.7), lineWidth: 1)
        }
    }

    private var calculatorOptions: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: SaturnPathSpacing.small) {
                anglePicker
                officialGraphingButton
            }

            VStack(spacing: SaturnPathSpacing.xSmall) {
                anglePicker
                officialGraphingButton
            }
        }
    }

    private var anglePicker: some View {
        Picker("Angle mode", selection: angleModeBinding) {
            ForEach(PracticeCalculatorAngleMode.allCases) { mode in
                Text(mode.title).tag(mode)
            }
        }
        .pickerStyle(.segmented)
        .frame(minWidth: 124, minHeight: 44)
        .accessibilityIdentifier("saturnpath.calculator.angle-mode")
    }

    private var officialGraphingButton: some View {
        Button {
            showsOfficialGraphingCalculator = true
        } label: {
            Label("Official SAT graphing", systemImage: "safari")
                .font(SaturnPathTypography.caption)
                .frame(maxWidth: .infinity, minHeight: 44)
                .padding(.horizontal, SaturnPathSpacing.xSmall)
        }
        .buttonStyle(.plain)
        .foregroundStyle(SaturnPathTheme.primaryDeep)
        .background(SaturnPathTheme.primarySoft, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
        .overlay {
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .stroke(SaturnPathTheme.primary.opacity(0.35), lineWidth: 1)
        }
        .accessibilityHint("Opens the official Desmos SAT calculator in an in-app browser")
        .accessibilityIdentifier("saturnpath.calculator.official-graphing")
    }

    private var keypad: some View {
        LazyVGrid(
            columns: Array(repeating: GridItem(.flexible(), spacing: SaturnPathSpacing.xSmall), count: 5),
            spacing: SaturnPathSpacing.xSmall
        ) {
            ForEach(Self.keys) { key in
                Button {
                    send(key)
                } label: {
                    keyLabel(key)
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(.plain)
                .foregroundStyle(keyForeground(key))
                .background(keyBackground(key), in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 13, style: .continuous)
                        .stroke(keyBorder(key), lineWidth: 1)
                }
                .accessibilityLabel(key.accessibilityLabel)
                .accessibilityIdentifier("saturnpath.calculator.key.\(key.id)")
            }
        }
    }

    @ViewBuilder
    private func keyLabel(_ key: ScientificCalculatorKey) -> some View {
        if key == .delete {
            Image(systemName: "delete.left")
                .font(.system(.body, weight: .semibold))
        } else {
            Text(key.title)
                .font(.system(.body, design: .rounded, weight: key == .equals ? .bold : .semibold))
        }
    }

    private func keyBackground(_ key: ScientificCalculatorKey) -> Color {
        if key == .equals {
            return SaturnPathTheme.primary
        }
        if key.isDestructive {
            return SaturnPathTheme.coralSoft
        }
        if key.isOperator {
            return SaturnPathTheme.primarySoft
        }
        return SaturnPathTheme.surfaceStrong
    }

    private func keyBorder(_ key: ScientificCalculatorKey) -> Color {
        if key == .equals {
            return SaturnPathTheme.primaryDeep
        }
        if key.isDestructive {
            return SaturnPathTheme.coral.opacity(0.5)
        }
        return SaturnPathTheme.lineStrong
    }

    private func keyForeground(_ key: ScientificCalculatorKey) -> Color {
        if key == .equals {
            return .white
        }
        if key.isDestructive {
            return SaturnPathTheme.coralDeep
        }
        if key.isOperator {
            return SaturnPathTheme.primaryDeep
        }
        return SaturnPathTheme.ink
    }

    private var angleModeBinding: Binding<PracticeCalculatorAngleMode> {
        Binding(
            get: { state.angleMode },
            set: { mode in
                state.angleMode = mode
                if state.showsResult {
                    evaluate()
                }
            }
        )
    }

    private var expressionText: String {
        state.inputs.isEmpty ? "0" : state.inputs.map(\.displayText).joined()
    }

    private var spokenExpression: String {
        state.inputs.isEmpty ? "zero" : state.inputs.map(\.accessibilityText).joined(separator: " ")
    }

    private var resultText: String {
        if let errorMessage {
            return errorMessage
        }
        guard state.showsResult, let lastAnswer = state.lastAnswer else {
            return "Ready"
        }
        return Self.formatted(lastAnswer)
    }

    private var resultAccessibilityLabel: String {
        if let errorMessage {
            return "Calculator error, \(errorMessage)"
        }
        guard state.showsResult, let lastAnswer = state.lastAnswer else {
            return "Calculator ready"
        }
        return "Result, \(Self.formatted(lastAnswer))"
    }

    private func send(_ key: ScientificCalculatorKey) {
        switch key {
        case let .input(input):
            if state.showsResult {
                state.inputs = input.startsNewExpressionAfterResult ? [] : [.answer]
                state.showsResult = false
            }
            guard state.inputs.count < 120 else { return }
            state.inputs.append(input)
            errorMessage = nil
        case .delete:
            if state.showsResult {
                state.inputs = []
                state.showsResult = false
            } else if !state.inputs.isEmpty {
                state.inputs.removeLast()
            }
            errorMessage = nil
        case .clear:
            state.inputs = []
            state.showsResult = false
            errorMessage = nil
        case .equals:
            evaluate()
        }
    }

    private func evaluate() {
        do {
            let result = try engine.evaluate(
                state.inputs,
                lastAnswer: state.lastAnswer,
                angleMode: state.angleMode
            )
            state.lastAnswer = result
            state.showsResult = true
            errorMessage = nil
        } catch let error as ScientificCalculatorError {
            state.showsResult = false
            errorMessage = error.message
        } catch {
            state.showsResult = false
            errorMessage = ScientificCalculatorError.invalidExpression.message
        }
    }

    private static func formatted(_ value: Double) -> String {
        let formatted = String(
            format: "%.12g",
            locale: Locale(identifier: "en_US_POSIX"),
            value
        )
        return formatted.replacingOccurrences(of: "-", with: "−")
    }

    private static let keys: [ScientificCalculatorKey] = [
        .input(.sine), .input(.cosine), .input(.tangent), .input(.logarithm), .input(.naturalLogarithm),
        .input(.squareRoot), .input(.square), .input(.openParenthesis), .input(.closeParenthesis), .delete,
        .input(.seven), .input(.eight), .input(.nine), .input(.divide), .clear,
        .input(.four), .input(.five), .input(.six), .input(.multiply), .input(.answer),
        .input(.one), .input(.two), .input(.three), .input(.subtract), .input(.pi),
        .input(.zero), .input(.decimal), .input(.add), .input(.power), .equals,
    ]
}

private extension PracticeCalculatorInput {
    var accessibilityText: String {
        switch self {
        case .add: "plus"
        case .subtract: "minus"
        case .multiply: "times"
        case .divide: "divided by"
        case .power: "to the power of"
        case .square: "squared"
        case .openParenthesis: "open parenthesis"
        case .closeParenthesis: "close parenthesis"
        case .sine: "sine of"
        case .cosine: "cosine of"
        case .tangent: "tangent of"
        case .logarithm: "base ten logarithm of"
        case .naturalLogarithm: "natural logarithm of"
        case .squareRoot: "square root of"
        case .pi: "pi"
        case .answer: "previous answer"
        case .decimal: "decimal point"
        default: parserText
        }
    }
}

private struct OfficialCalculatorBrowser: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredControlTintColor = UIColor(SaturnPathTheme.primaryDeep)
        return controller
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

#Preview("Scientific calculator") {
    @Previewable @State var state = PracticeCalculatorState()

    ScientificCalculatorView(state: $state)
        .padding()
        .frame(height: 520)
        .background(SaturnPathTheme.canvas)
}
