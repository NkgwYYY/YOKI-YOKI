import XCTest

final class StoreCaptures43: XCTestCase {
    func testCurrentStoreScreens() throws {
        continueAfterFailure = false
        let app = XCUIApplication(bundleIdentifier: "app.replit.yokiyoki--")
        app.launchArguments = ["-AppleLanguages", "(ja)", "-AppleLocale", "ja_JP"]
        app.launchEnvironment["TZ"] = "Asia/Tokyo"
        app.launch()
        func element(_ id: String) -> XCUIElement {
            app.descendants(matching: .any).matching(identifier: id).firstMatch
        }
        func tap(_ id: String) {
            let e = element(id)
            XCTAssertTrue(e.waitForExistence(timeout: 60), "Missing control: \(id)")
            e.tap()
        }
        func shot(_ name: String) {
            let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
            attachment.name = name
            attachment.lifetime = .keepAlways
            add(attachment)
        }
        XCTAssertTrue(element("home-daily-record").waitForExistence(timeout: 90))
        sleep(12)
        shot("store43-home")
        tap("home-daily-record")
        tap("memory-open-diary")
        tap("diary-open-cover")
        XCTAssertTrue(element("diary-character-story").waitForExistence(timeout: 60))
        sleep(3)
        shot("store43-diary")
        tap("diary-home")
        XCTAssertTrue(element("home-daily-record").waitForExistence(timeout: 30))
        sleep(6)
        shot("store43-room")
    }
}
