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
        app.buttons["saturnpath.practice.next"].tap()

        XCTAssertTrue(app.staticTexts["saturnpath.practice.summary"].waitForExistence(timeout: 5))
        app.buttons["saturnpath.practice.finish"].tap()

        XCTAssertTrue(app.staticTexts["saturnpath.home.title"].waitForExistence(timeout: 5))
    }
}
