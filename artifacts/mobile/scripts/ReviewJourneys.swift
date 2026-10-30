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
            let surface = scroller ?? app
            // A return button can be above the viewport after scrolling a form.
            // Use its native screen frame to reveal it in the correct direction.
            if target.exists && target.frame.height > 0 &&
                target.frame.minY < surface.frame.minY {
                surface.swipeDown(velocity: .slow)
            } else {
                surface.swipeUp(velocity: .slow)
            }
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

    private func until(_ message: String, timeout: TimeInterval = 15,
                       _ condition: @escaping () -> Bool,
                       file: StaticString = #filePath, line: UInt = #line) {
        let expectation = XCTNSPredicateExpectation(
            predicate: NSPredicate { _, _ in condition() }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [expectation], timeout: timeout), .completed,
                       message, file: file, line: line)
    }

    private func openDiary() {
        tap(element("home-daily-record"))
        if element("diary-open-cover").waitForExistence(timeout: 5) {
            tap(element("diary-open-cover"))
        }
        visible(element("diary-character-story"))
    }

    private func wallet() -> Int {
        visible(element("home-points"))
        let digits = element("home-points").label.prefix { $0.isNumber }
        XCTAssertFalse(digits.isEmpty)
        return Int(digits) ?? -1
    }

    private func dragFurnishing(_ id: String, dx: CGFloat, dy: CGFloat) -> CGRect {
        let item = element(id)
        tap(item)
        visible(element("furnishing-editor"))
        let before = item.frame
        let start = item.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.2, thenDragTo: start.withOffset(CGVector(dx: dx, dy: dy)))
        until("Dragged furnishing must move") {
            abs(item.frame.midX - before.midX) + abs(item.frame.midY - before.midY) > 10
        }
        until("The drop must finish saving") {
            self.element("furnishing-done").isEnabled &&
                self.element("furnishing-save-status").label == "ドラッグで移動・離すと保存"
        }
        XCTAssertFalse(element("furnishing-retry").exists)
        capture("placement-\(id)")
        tap(element("furnishing-done"))
        return item.frame
    }

    private func verifyFurnishingPurchaseAndPersistence() {
        // Only prepare-ios-review.py seeds this isolated simulator's wallet.
        // The production app is unchanged; purchases and placement use real UI.
        let before = wallet()
        XCTAssertGreaterThanOrEqual(before, 800)
        tap(element("world-map-open"))
        tap(element("menu-shop"))
        capture("12-native-shop")
        tap(element("shop-buy-room-sofa"))
        until("Sofa purchase must persist") {
            self.element("shop-buy-room-sofa").label == "模様替えで選ぶ"
        }
        tap(text("花"))
        tap(element("shop-buy-room-violet"))
        until("Flower purchase must persist") {
            self.element("shop-buy-room-violet").label == "模様替えで選ぶ"
        }
        tap(element("shop-open-atelier"))
        tap(element("atelier-furniture-sofa"))
        until("Purchased sofa must be saved and selected") {
            self.element("atelier-furniture-sofa").isSelected && self.element("atelier-furniture-sofa").isEnabled
        }
        tap(element("atelier-tab-flower"))
        tap(element("atelier-flower-violet"))
        until("Purchased flower must be saved and selected") {
            self.element("atelier-flower-violet").isSelected && self.element("atelier-flower-violet").isEnabled
        }
        tap(app.buttons["閉じる"])
        XCTAssertEqual(wallet(), before - 800, "Charge the two purchases exactly once")

        let sofa = dragFurnishing("home-furniture-sofa", dx: 35, dy: -24)
        let flower = dragFurnishing("home-flower-violet", dx: -40, dy: -28)
        XCTAssertEqual(wallet(), before - 800, "Moving furniture must not spend points")
        capture("13-furnished-home")
        app.terminate()
        app.launch()
        visible(element("home-furniture-sofa"))
        visible(element("home-flower-violet"))
        for (id, expected) in [("home-furniture-sofa", sofa), ("home-flower-violet", flower)] {
            until("Saved position must survive relaunch: \(id)") {
                let actual = self.element(id).frame
                return abs(actual.midX - expected.midX) < 3 && abs(actual.midY - expected.midY) < 3
            }
        }
        XCTAssertEqual(wallet(), before - 800)
        capture("14-persisted-furnished-home")
    }

    func testFreshGuestReviewJourneys() {
        // The workflow creates a fresh simulator, never a user's installation.
        app.launch()
        visible(element("welcome-register"), timeout: 60)
        visible(element("welcome-login"))
        capture("00-native-welcome")
        tap(element("welcome-login"))
        visible(element("auth-email"))
        visible(element("auth-password"))
        capture("00-native-login")
        tap(element("auth-submit"))
        visible(text("メールアドレスを入力してください"))
        tap(element("auth-email"))
        visible(app.keyboards.firstMatch)
        element("auth-email").typeText("qa@example.invalid")
        XCTAssertEqual(element("auth-email").value as? String, "qa@example.invalid")
        tap(element("auth-back"))
        tap(element("welcome-register"))
        visible(element("auth-email"))
        visible(text("アカウントを作成"))
        capture("00-native-register")
        tap(element("auth-back"))
        tap(element("welcome-guest"))
        visible(element("profile-nickname"), timeout: 60)
        tap(element("profile-nickname"))
        element("profile-nickname").typeText("Yoki QA\n")
        tap(element("profile-age-unknown"))
        tap(element("profile-gender-unknown"))
        // Unknown age prevents real ad requests during automated testing.
        reveal(text("いっしょにはじめる"))
        tap(text("いっしょにはじめる"))
        if text("よろしくね！").waitForExistence(timeout: 4) { tap(text("よろしくね！")) }
        if element("tutorial-skip").waitForExistence(timeout: 5) { tap(element("tutorial-skip")) }
        visible(element("home-daily-record"))
        visible(element("resident-renderer-ready"), timeout: 30)
        capture("01-home")

        openDiary()
        capture("02-diary")
        if element("diary-tab-user").exists { tap(element("diary-tab-user")) }
        let diaryInput = app.textViews["diary-input"]
        visible(diaryInput)
        reveal(diaryInput)
        XCTAssertTrue(diaryInput.isEnabled)
        // Tap the first writing line of the native UITextView, then require
        // actual onFocus feedback and the software keyboard before typing.
        // Do not retry a failed tap or programmatically force app focus.
        diaryInput.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.08)).tap()
        visible(app.buttons["diary-keyboard-done"], timeout: 10)
        visible(app.keyboards.firstMatch, timeout: 10)
        capture("02-diary-focused")
        diaryInput.typeText(diary)
        tap(element("diary-keyboard-done"))
        XCTAssertEqual(diaryInput.value as? String, diary)
        reveal(element("diary-mood-3"))
        tap(element("diary-mood-3"))
        XCTAssertTrue(element("diary-mood-3").isSelected)
        reveal(element("diary-send"))
        tap(element("diary-send"))
        visible(element("diary-user-page"))
        visible(text(diary))
        capture("03-saved-diary")
        tap(element("diary-request-reply"))
        tap(text("今は日記の保存だけ"))
        XCTAssertFalse(element("diary-ai-reply").exists)
        visible(text(diary))
        tap(element("diary-request-reply"))
        tap(text("同意して、返事をもらう"))
        visible(element("diary-ai-reply"), timeout: 60)
        XCTAssertFalse(element("diary-ai-reply").label.isEmpty)
        capture("03-diary-content-reply")
        tap(element("diary-home"))

        tap(element("room-meal"))
        visible(text("ごはんをあげる"))
        capture("04-food")
        tap(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "きのみ、5ポイント、満腹度プラス")).firstMatch)
        visible(element("home-chat"))
        // Room animation pauses on navigation. Finish the committed meal before
        // opening another screen, and verify its visible completion feedback.
        visible(text("ごちそうさま。また一緒に食べようね。"), timeout: 30)
        tap(element("home-chat"))
        tap(text("少し、お話しする"))
        tap(element("chat-input"))
        element("chat-input").typeText("Hello! Please greet me briefly.")
        tap(text("送信"))
        visible(text("AIへの情報送信"))
        capture("05-ai-disclosure")
        reveal(text("AIを使わずに戻る"))
        tap(text("AIを使わずに戻る"))
        visible(element("chat-input"))
        XCTAssertEqual(element("chat-input").value as? String, "Hello! Please greet me briefly.")
        capture("06-chat-draft")
        // A real, synthetic request must reach the service from the native app.
        tap(text("送信"))
        visible(text("AIへの情報送信"))
        reveal(text("同意してAIを使う"))
        tap(text("同意してAIを使う"))
        visible(element("chat-input"))
        XCTAssertFalse(element("chat-assistant-message").exists)
        tap(text("送信"))
        visible(element("chat-assistant-message"), timeout: 75)
        XCTAssertFalse(element("chat-send-error").exists)
        XCTAssertFalse(element("chat-assistant-message").label.isEmpty)
        capture("06-native-ai-reply")
        for scene in ["campfire", "rain", "stars", "cat"] {
            tap(element("chat-rest-open"))
            tap(element("rest-choose-\(scene)"))
            visible(element("rest-companion-touch"))
            tap(element("rest-companion-touch"))
            visible(element("rest-companion-reaction"))
            XCTAssertTrue(element("rest-end").isHittable)
            capture("06-rest-\(scene)")
            tap(element("rest-end"))
            visible(element("chat-input"))
            XCTAssertFalse(element("rest-end").exists)
        }
        tap(text("部屋へ戻る"))
        tap(element("home-more-menu"))
        reveal(text("プロフィール・話しかけ設定"))
        tap(text("プロフィール・話しかけ設定"))
        reveal(text("AIへの情報送信・同意設定"))
        tap(text("AIへの情報送信・同意設定"))
        reveal(text("同意を取り消す"))
        tap(text("同意を取り消す"))
        tap(text("AIへの情報送信・同意設定"))
        reveal(text("同意してAIを使う"))
        capture("06-ai-consent-withdrawn")
        tap(text("AIを使わずに戻る"))
        tap(text("戻る"))

        tap(element("world-map-open"))
        visible(element("home-direct-menu"))
        XCTAssertFalse(element("world-map-tobacco").exists)
        capture("07-home-menu")
        tap(element("menu-play"))
        tap(element("menu-egg"))
        visible(element("egg-job-action"))
        capture("08-game")
        XCTAssertFalse(element("egg-job-result").exists)
        tap(element("egg-job-action"))
        // A random legend order expires after 1.4 s, sometimes before XCTest
        // returns from start.tap(). Automatic expiry is a valid result. Require
        // fresh progress, tap a scoop if still active, and verify result/return.
        let scoopButton = app.buttons["egg-job-action"]
        let gameProgress = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in
            self.element("egg-job-result").exists ||
                (scoopButton.label == "お玉ですくい上げる" && scoopButton.isEnabled)
        }, object: nil)
        XCTAssertEqual(XCTWaiter.wait(for: [gameProgress], timeout: 15), .completed)
        if !element("egg-job-result").exists { scoopButton.tap() }
        visible(element("egg-job-result"))
        // One failed egg ends today's shift. A completed result must expose
        // either that saved end state or an enabled next order after success.
        if element("egg-job-day-ended").exists {
            visible(text("今日はここまで"))
            visible(text("記録を保存しました。また明日。"))
            XCTAssertTrue(text("TOO EARLY").exists || text("TOO LATE").exists)
            XCTAssertEqual(scoopButton.label, "また明日")
            XCTAssertFalse(scoopButton.isEnabled)
        } else {
            XCTAssertTrue(text("GOOD").exists || text("PERFECT").exists)
            XCTAssertEqual(scoopButton.label, "次の注文を受ける")
            XCTAssertTrue(scoopButton.isEnabled)
        }
        capture("09-game-result")
        tap(element("egg-job-back"))
        visible(element("home-daily-record"))

        verifyFurnishingPurchaseAndPersistence()

        app.terminate()
        app.launch()
        visible(element("home-daily-record"))
        openDiary()
        if element("diary-tab-user").exists { tap(element("diary-tab-user")) }
        visible(text(diary))
        visible(element("diary-ai-reply"))
        capture("10-persisted-diary")
        tap(element("diary-home"))
        tap(element("home-growth"))
        visible(element("compact-growth"))
        visible(element("growth-records-panel"))
        capture("11-growth-records")
        tap(element("growth-chart-trend"))
        visible(element("growth-week-chart"))
        tap(element("growth-tab-memories"))
        visible(element("growth-memories-panel"))
        visible(element("album-shared-days"))
        capture("11-growth-memories")
    }
}

