import XCTest

@MainActor
final class SaturnPathUITests: XCTestCase {
    func testAppLaunchesIntoTheFoundationShell() {
        let app = XCUIApplication()
        app.launch()

        XCTAssertTrue(
            app.staticTexts["saturnpath.shell.title"].waitForExistence(timeout: 8),
            "The SaturnPath shell title should be visible after launch."
        )
        XCTAssertTrue(
            app.descendants(matching: .any)["saturnpath.shell.status"].exists,
            "The environment status card should be accessible after launch."
        )
    }
}
