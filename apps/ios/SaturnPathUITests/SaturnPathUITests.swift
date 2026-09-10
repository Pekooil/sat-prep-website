import XCTest

@MainActor
final class SaturnPathUITests: XCTestCase {
    func testAppLaunchesIntoHomeAndNavigatesAcrossTabs() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(
            app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8),
            "Home should be visible after launch."
        )
        XCTAssertTrue(
            app.descendants(matching: .any)["saturnpath.home.rings"].exists,
            "The daily progress rings should have an accessible summary."
        )

        app.swipeUp()
        let startButton = app.buttons["saturnpath.home.start"]
        XCTAssertTrue(startButton.waitForExistence(timeout: 2))
        XCTAssertTrue(startButton.isHittable, "The primary action should clear the tab bar after scrolling.")

        app.tabBars.buttons["Progress"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.progress.title"].waitForExistence(timeout: 2))

        app.tabBars.buttons["Review"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.review.title"].waitForExistence(timeout: 2))

        app.tabBars.buttons["Profile"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.profile.title"].waitForExistence(timeout: 2))

        app.tabBars.buttons["Home"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 2))
    }

    func testMockSignInAndOnboardingReachHome() {
        let app = XCUIApplication()
        app.launchEnvironment["SATURNPATH_MOCK_ROOT_STATE"] = "sign-in"
        app.launch()

        let appleButton = app.buttons["saturnpath.auth.apple"]
        XCTAssertTrue(appleButton.waitForExistence(timeout: 8))
        appleButton.tap()

        XCTAssertTrue(app.staticTexts["saturnpath.onboarding.title"].waitForExistence(timeout: 3))
        app.buttons["saturnpath.onboarding.continue"].tap()
        app.buttons["saturnpath.onboarding.continue"].tap()
        app.buttons["saturnpath.onboarding.continue"].tap()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 5))
    }

    func testMockPracticeJourneyReturnsHome() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.swipeUp()

        let startButton = app.buttons["saturnpath.home.start"]
        XCTAssertTrue(startButton.waitForExistence(timeout: 3))
        startButton.tap()

        XCTAssertTrue(app.staticTexts["saturnpath.practice.prompt"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.choice.B"].tap()

        let submitButton = app.buttons["saturnpath.practice.submit"]
        XCTAssertTrue(submitButton.isEnabled)
        submitButton.tap()

        XCTAssertTrue(app.staticTexts["saturnpath.practice.feedback"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.practice.path-change"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.practice.adaptation"].exists)
        let feedbackScreenshot = XCTAttachment(screenshot: app.screenshot())
        feedbackScreenshot.name = "Adaptive route feedback"
        feedbackScreenshot.lifetime = .keepAlways
        add(feedbackScreenshot)
        app.buttons["saturnpath.practice.next"].tap()

        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.practice.stop-recommendation"].waitForExistence(timeout: 5))
        let recommendationScreenshot = XCTAttachment(screenshot: app.screenshot())
        recommendationScreenshot.name = "Adaptive stop recommendation"
        recommendationScreenshot.lifetime = .keepAlways
        add(recommendationScreenshot)
        app.buttons["saturnpath.practice.stop.finish"].tap()

        XCTAssertTrue(app.staticTexts["saturnpath.practice.summary"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.finish"].tap()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 5))
    }

    func testPracticeQuestionRestoresAfterTermination() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.swipeUp()
        app.buttons["saturnpath.home.start"].tap()

        let choice = app.buttons["saturnpath.practice.choice.D"]
        XCTAssertTrue(choice.waitForExistence(timeout: 5))
        choice.tap()
        XCTAssertTrue(choice.isSelected)

        app.terminate()
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.swipeUp()
        app.buttons["saturnpath.home.start"].tap()

        let restoredChoice = app.buttons["saturnpath.practice.choice.D"]
        XCTAssertTrue(restoredChoice.waitForExistence(timeout: 5))
        XCTAssertTrue(restoredChoice.isSelected)
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.practice.timer"].exists)

        app.buttons["saturnpath.practice.close"].tap()
        app.buttons["Leave Practice"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 5))
    }

    func testRecommendedStopCanKeepPracticing() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.swipeUp()
        app.buttons["saturnpath.home.start"].tap()

        XCTAssertTrue(app.buttons["saturnpath.practice.choice.B"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.choice.B"].tap()
        app.buttons["saturnpath.practice.submit"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.practice.feedback"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.next"].tap()

        let keepPracticing = app.buttons["saturnpath.practice.stop.keep"]
        XCTAssertTrue(keepPracticing.waitForExistence(timeout: 5))
        keepPracticing.tap()

        XCTAssertTrue(app.textFields["saturnpath.practice.student-response"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.close"].tap()
        app.buttons["Leave Practice"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 5))
    }

    func testReviewPresentsServerOwnedCollections() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.tabBars.buttons["Review"].tap()

        XCTAssertTrue(app.staticTexts["saturnpath.review.title"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.review.item.review-linear-equations"].exists)

        let retesting = app.buttons["saturnpath.review.filter.retesting"]
        if !retesting.isHittable {
            app.scrollViews["saturnpath.review.filters"].swipeLeft()
        }
        retesting.tap()
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.review.item.review-words-context"].waitForExistence(timeout: 5))

        let saved = app.buttons["saturnpath.review.filter.saved"]
        if !saved.isHittable {
            app.scrollViews["saturnpath.review.filters"].swipeLeft()
        }
        saved.tap()
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.review.item.review-quadratics"].waitForExistence(timeout: 5))

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Review collections"
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    func testIncorrectAnswerRequiresAndSavesMistakeReason() {
        let app = XCUIApplication()
        app.launchEnvironment["SATURNPATH_MOCK_PRACTICE_OUTCOME"] = "incorrect"
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.swipeUp()
        app.buttons["saturnpath.home.start"].tap()
        XCTAssertTrue(app.buttons["saturnpath.practice.choice.A"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.choice.A"].tap()
        app.buttons["saturnpath.practice.submit"].tap()

        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.practice.classification"].waitForExistence(timeout: 5))
        let nextButton = app.buttons["saturnpath.practice.next"]
        XCTAssertFalse(nextButton.isEnabled)

        app.buttons["saturnpath.practice.classification.careless"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.practice.classification.saved"].waitForExistence(timeout: 5))
        XCTAssertTrue(nextButton.isEnabled)

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Mistake classification"
        screenshot.lifetime = .keepAlways
        add(screenshot)

        nextButton.tap()
        XCTAssertTrue(app.textFields["saturnpath.practice.student-response"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.close"].tap()
        app.buttons["Leave Practice"].tap()
    }

    func testScratchpadStaysBelowQuestionAndRestoresTypedNotes() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.swipeUp()
        app.buttons["saturnpath.home.start"].tap()

        let prompt = app.staticTexts["saturnpath.practice.prompt"]
        XCTAssertTrue(prompt.waitForExistence(timeout: 5))
        let scratchpadButton = app.buttons["saturnpath.practice.scratchpad"]
        XCTAssertTrue(scratchpadButton.waitForExistence(timeout: 5))
        scratchpadButton.tap()

        let scratchpadTitle = app.staticTexts["saturnpath.scratchpad.sheet"]
        XCTAssertTrue(scratchpadTitle.waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["saturnpath.scratchpad.canvas"].exists)
        XCTAssertLessThanOrEqual(
            prompt.frame.maxY + 8,
            scratchpadTitle.frame.minY,
            "The scratchpad must begin below the complete question."
        )

        let drawingScreenshot = XCTAttachment(screenshot: app.screenshot())
        drawingScreenshot.name = "Question-safe drawing scratchpad"
        drawingScreenshot.lifetime = .keepAlways
        add(drawingScreenshot)

        app.segmentedControls.buttons["Notes"].tap()
        let notes = app.textViews["saturnpath.scratchpad.notes"]
        XCTAssertTrue(notes.waitForExistence(timeout: 5))
        notes.tap()
        notes.typeText("2x + 4 = 10")

        let notesScreenshot = XCTAttachment(screenshot: app.screenshot())
        notesScreenshot.name = "Typed scratch notes"
        notesScreenshot.lifetime = .keepAlways
        add(notesScreenshot)

        app.buttons["saturnpath.scratchpad.done"].tap()
        XCTAssertTrue(app.buttons["saturnpath.practice.scratchpad"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.scratchpad"].tap()
        app.segmentedControls.buttons["Notes"].tap()

        let restoredNotes = app.textViews["saturnpath.scratchpad.notes"]
        XCTAssertTrue(restoredNotes.waitForExistence(timeout: 5))
        XCTAssertTrue((restoredNotes.value as? String)?.contains("2x + 4 = 10") == true)

        app.buttons["saturnpath.scratchpad.done"].tap()
        app.buttons["saturnpath.practice.close"].tap()
        app.buttons["Leave Practice"].tap()
    }

    func testScientificCalculatorEvaluatesAndRestoresAttemptState() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 8))
        app.swipeUp()
        app.buttons["saturnpath.home.start"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.practice.prompt"].waitForExistence(timeout: 5))

        app.buttons["saturnpath.practice.scratchpad"].tap()
        XCTAssertTrue(app.staticTexts["saturnpath.scratchpad.sheet"].waitForExistence(timeout: 5))
        app.segmentedControls.buttons["Calculator"].tap()

        let calculator = app.descendants(matching: .any)["saturnpath.calculator"]
        XCTAssertTrue(calculator.waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["saturnpath.calculator.official-graphing"].exists)

        app.buttons["saturnpath.calculator.key.input-seven"].tap()
        app.buttons["saturnpath.calculator.key.input-multiply"].tap()
        app.buttons["saturnpath.calculator.key.input-eight"].tap()

        let equalsButton = app.buttons["saturnpath.calculator.key.equals"]
        if !equalsButton.isHittable {
            calculator.swipeUp()
        }
        XCTAssertTrue(equalsButton.waitForExistence(timeout: 2))
        equalsButton.tap()

        calculator.swipeDown()

        let result = app.staticTexts["saturnpath.calculator.result"]
        XCTAssertTrue(result.waitForExistence(timeout: 3))
        XCTAssertTrue(result.label.contains("56"))

        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = "Native scientific calculator"
        screenshot.lifetime = .keepAlways
        add(screenshot)

        app.buttons["saturnpath.scratchpad.done"].tap()
        app.buttons["saturnpath.practice.scratchpad"].tap()
        app.segmentedControls.buttons["Calculator"].tap()

        let restoredResult = app.staticTexts["saturnpath.calculator.result"]
        XCTAssertTrue(restoredResult.waitForExistence(timeout: 3))
        XCTAssertTrue(restoredResult.label.contains("56"))

        app.buttons["saturnpath.scratchpad.done"].tap()
        app.buttons["saturnpath.practice.close"].tap()
        app.buttons["Leave Practice"].tap()
    }
}
