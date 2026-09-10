import Foundation
import Testing
@testable import SaturnPath

struct ScientificCalculatorTests {
    private let engine = ScientificCalculatorEngine()

    @Test
    func calculatorHonorsOperatorPrecedence() throws {
        let result = try engine.evaluate(
            [.two, .add, .three, .multiply, .four],
            lastAnswer: nil,
            angleMode: .degrees
        )

        #expect(result == 14)
    }

    @Test
    func calculatorSupportsParenthesesAndRightAssociativePowers() throws {
        let grouped = try engine.evaluate(
            [.openParenthesis, .two, .add, .three, .closeParenthesis, .square],
            lastAnswer: nil,
            angleMode: .degrees
        )
        let powered = try engine.evaluate(
            [.two, .power, .three, .power, .two],
            lastAnswer: nil,
            angleMode: .degrees
        )

        #expect(grouped == 25)
        #expect(powered == 512)
    }

    @Test
    func calculatorUsesTheSelectedAngleMode() throws {
        let degreeResult = try engine.evaluate(
            [.sine, .three, .zero, .closeParenthesis],
            lastAnswer: nil,
            angleMode: .degrees
        )
        let radianResult = try engine.evaluate(
            [.cosine, .pi, .closeParenthesis],
            lastAnswer: nil,
            angleMode: .radians
        )

        #expect(abs(degreeResult - 0.5) < 1e-12)
        #expect(abs(radianResult + 1) < 1e-12)
    }

    @Test
    func calculatorSupportsRootsLogsAndPreviousAnswer() throws {
        let root = try engine.evaluate(
            [.squareRoot, .eight, .one, .closeParenthesis],
            lastAnswer: nil,
            angleMode: .degrees
        )
        let logarithm = try engine.evaluate(
            [.logarithm, .one, .zero, .zero, .closeParenthesis],
            lastAnswer: nil,
            angleMode: .degrees
        )
        let continued = try engine.evaluate(
            [.answer, .multiply, .two],
            lastAnswer: 7,
            angleMode: .degrees
        )

        #expect(root == 9)
        #expect(logarithm == 2)
        #expect(continued == 14)
    }

    @Test
    func calculatorRejectsDivisionByZero() {
        #expect(throws: ScientificCalculatorError.divisionByZero) {
            try engine.evaluate(
                [.one, .divide, .zero],
                lastAnswer: nil,
                angleMode: .degrees
            )
        }
    }

    @Test
    func calculatorRejectsInvalidDomainsAndIncompleteExpressions() {
        #expect(throws: ScientificCalculatorError.domain) {
            try engine.evaluate(
                [.squareRoot, .subtract, .one, .closeParenthesis],
                lastAnswer: nil,
                angleMode: .degrees
            )
        }
        #expect(throws: ScientificCalculatorError.invalidExpression) {
            try engine.evaluate(
                [.openParenthesis, .two, .add, .three],
                lastAnswer: nil,
                angleMode: .degrees
            )
        }
    }
}
