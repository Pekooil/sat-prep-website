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
}
