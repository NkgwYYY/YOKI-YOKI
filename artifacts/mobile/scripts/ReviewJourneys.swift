import XCTest

// XCTest addresses the installed app directly. This also distinguishes native
// hit-testing from a third-party driver's iPhone-on-iPad coordinate conversion.
@MainActor
final class ReviewJourneys: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "app.replit.yokiyoki--")
    private let diary = "Release QA: a quiet day."

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
        capture("final-screen")
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "native-accessibility-hierarchy"
        hierarchy.lifetime = .keepAlways
        add(hierarchy)
        app.terminate()
    }

    private func element(_ id: String) -> XCUIElement {
        app.descendants(matching: .any).matching(identifier: id).firstMatch
    }

    private func text(_ label: String) -> XCUIElement {
        app.descendants(matching: .any).matching(
            NSPredicate(format: "label == %@ OR value == %@", label, label)
        ).firstMatch
    }

    private func visible(_ target: XCUIElement, timeout: TimeInterval = 30,
                         file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(target.waitForExistence(timeout: timeout),
                      "Expected screen/control: \(target)", file: file, line: line)
    }

    private func reveal(_ target: XCUIElement,
                        file: StaticString = #filePath, line: UInt = #line) {
        for _ in 0..<12 {
            if target.exists && target.isHittable { return }
            let scroller = app.scrollViews.allElementsBoundByIndex.first { $0.isHittable }
            if let scroller = scroller { scroller.swipeUp(velocity: .slow) }
            else { app.swipeUp(velocity: .slow) }
        }
        XCTFail("Control could not be reached by scrolling: \(target)", file: file, line: line)
    }

    private func tap(_ target: XCUIElement,
                     file: StaticString = #filePath, line: UInt = #line) {
        visible(target, file: file, line: line)
        reveal(target, file: file, line: line)
        XCTAssertTrue(target.isEnabled, "Control disabled: \(target)", file: file, line: line)
        target.tap()
    }

    private func capture(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    func testFreshGuestReviewJourneys() {
        // The workflow creates a fresh simulator, never a user's installation.
        app.launch()
        visible(element("profile-nickname"), timeout: 60)
        tap(element("profile-nickname"))
        element("profile-nickname").typeText("Yoki QA\n")
        tap(element("profile-age-unknown"))
        tap(element("profile-gender-unknown"))
        // Unknown age prevents real ad requests during automated testing.
        reveal(text("いっしょにはじめる"))
        tap(text("いっしょにはじめる"))
        if text("よろしくね！").waitForExistence(timeout: 4) { tap(text("よろしくね！")) }
        visible(element("home-daily-record"))
        capture("01-home")

        tap(element("home-daily-record"))
        visible(element("diary-character-story"))
        capture("02-diary")
        tap(element("diary-tab-user"))
        tap(element("diary-input"))
        element("diary-input").typeText(diary)
        tap(element("diary-keyboard-done"))
        XCTAssertEqual(element("diary-input").value as? String, diary)
        reveal(element("diary-mood-3"))
        tap(element("diary-mood-3"))
        XCTAssertTrue(element("diary-mood-3").isSelected)
        reveal(element("diary-send"))
        tap(element("diary-send"))
        visible(element("diary-user-page"))
        visible(text(diary))
        capture("03-saved-diary")
        tap(element("diary-home"))

        tap(element("room-meal"))
        visible(text("ごはんをあげる"))
        capture("04-food")
        tap(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "きのみ、5ポイント、満腹度プラス")).firstMatch)
        visible(element("home-chat"))
        tap(element("home-chat"))
        tap(text("少し、お話しする"))
        tap(text("話しかける内容"))
        text("話しかける内容").typeText("Release QA draft")
        tap(text("送信"))
        visible(text("AIへの情報送信"))
        capture("05-ai-disclosure")
        reveal(text("AIを使わずに戻る"))
        tap(text("AIを使わずに戻る"))
        visible(text("Release QA draft"))
        capture("06-chat-draft")
        tap(text("部屋へ戻る"))

        tap(element("world-map-open"))
        visible(text("村をめぐる"))
        XCTAssertFalse(element("world-map-tobacco").exists)
        capture("07-map")
        tap(element("world-map-workshop"))
        tap(element("world-map-travel"))
        tap(element("world-go-work"))
        visible(element("egg-job-action"))
        capture("08-game")
        tap(element("egg-job-action"))
        visible(text("お玉ですくい上げる"))
        tap(element("egg-job-action"))
        visible(element("egg-job-result"))
        capture("09-game-result")
        tap(element("egg-job-back"))
        tap(element("world-gate-home"))

        app.terminate()
        app.launch()
        visible(element("home-daily-record"))
        tap(element("home-daily-record"))
        tap(element("diary-tab-user"))
        visible(text(diary))
        capture("10-persisted-diary")
        tap(element("diary-home"))
        tap(text("思い出"))
        tap(element("album-details-toggle"))
        reveal(element("guest-insights"))
        visible(text("端末の記録から振り返ります。AIには送信しません。"))
        capture("11-guest-insights")
    }
}
