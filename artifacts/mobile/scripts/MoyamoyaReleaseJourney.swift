import XCTest

// Runs against the exact installed Release simulator artifact. StoreKit's local
// test service is isolated to the disposable simulator; no real purchases.
@MainActor
final class MoyamoyaReleaseJourney: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "app.replit.yokiyoki--")
    override func setUpWithError() throws { continueAfterFailure = false }
    override func tearDownWithError() throws {
        capture("battle-final-screen")
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "battle-native-accessibility"
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
            // Fixed tabs and tutorial controls sit beside, not inside, the
            // visible ScrollView. Only use a viewport that owns this target.
            let identity = NSPredicate(format: "identifier == %@ AND label == %@",
                                       target.identifier, target.label)
            let targetFrame = target.frame
            let scroller = app.scrollViews.allElementsBoundByIndex.first { candidate in
                candidate.descendants(matching: target.elementType)
                    .matching(identity).allElementsBoundByIndex
                    .contains { $0.frame == targetFrame } && candidate.isHittable
            }
            let surface = scroller ?? app
            // In iPhone compatibility mode the Application has no useful
            // screen frame. Fixed controls still have valid native hit tests.
            if scroller == nil && target.exists && target.isHittable { return }
            // XCUITest can throw while evaluating isHittable for a button
            // clipped by the scroll viewport. Bring its full frame into view
            // before asking native hit-testing for an activation point.
            // ScrollView and descendant frames already share screen coordinates;
            // intersecting them with Application.frame breaks iPad compatibility.
            let viewport = surface.frame.insetBy(dx: 0, dy: 16)
            if scroller != nil && target.exists && !target.frame.isEmpty {
                let bounds = target.frame
                let fits = bounds.height <= viewport.height
                    ? viewport.contains(bounds)
                    : viewport.intersection(bounds).height >= 100
                if fits && target.isHittable { return }
            }
            // A return button can be above the viewport after scrolling a form.
            // Use its native screen frame to reveal it in the correct direction.
            if target.exists && target.frame.height > 0 &&
                target.frame.minY < viewport.minY {
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

    private func requireResidentRenderer() {
        let resident = element("room-resident")
        visible(resident)
        // This exact release artifact does not expose renderer diagnostics.
        // Preserve the real screen for visual inspection; do not assert a
        // debug-only accessibility value that is absent from production.
    }

    private func launchGuestHome() {
        // Each journey launches independently. An account-entry failure must
        // not prevent the room, care and persistence checks from executing.
        app.launch()
        until("An existing home or the guest entry must be available", timeout: 60) {
            self.element("home-daily-record").exists || self.element("welcome-guest").exists
        }
        if element("home-daily-record").exists {
            // The shared dock is also present on diary, chat and growth tabs.
            tap(element("home-tab"))
            requireResidentRenderer()
            return
        }
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
        requireResidentRenderer()
        capture("01-home")
    }



    private func checkIn(_ pattern: String?) {
        tap(element("home-daily-record"))
        tap(element("check-in-mood-3")); tap(element("check-in-next"))
        tap(element("check-in-fatigue-2")); tap(element("check-in-next"))
        tap(element("check-in-worry-2")); tap(element("check-in-next"))
        tap(element(pattern == nil ? "moyamoya-no" : "moyamoya-yes"))
        if let pattern { tap(element("moyamoya-pattern-" + pattern)) }
        capture("check-in-moyamoya")
        tap(element("check-in-next"))
        visible(element("home-daily-record"))
    }
    private func choose(_ id: String) {
        tap(element("battle-choice-" + id))
        visible(element("battle-feedback"))
        capture("battle-feedback-" + id)
        tap(element("battle-next"))
    }
    private func points() -> Int {
        let label = element("home-points").label
        return Int(label.prefix { $0.isNumber }) ?? -1
    }
    func testDailyCheckInEncounterBattleAndPersistence() throws {
        launchGuestHome()
        checkIn(nil)
        XCTAssertFalse(element("moyamoya-encounter").exists)
        checkIn("loop")
        visible(element("moyamoya-encounter"))
        XCTAssertTrue(element("battle-bgm-toggle").label.contains("オフ"))
        capture("home-encounter")
        tap(element("moyamoya-decline"))
        app.terminate(); launchGuestHome()
        XCTAssertFalse(element("moyamoya-encounter").exists)
        let before = points()
        XCTAssertGreaterThan(before, 0)
        checkIn("loop")
        tap(element("battle-bgm-toggle"))
        tap(element("moyamoya-fight"))
        visible(element("moyamoya-battle-screen"))
        capture("battle-start-original-costume")
        choose("replay"); choose("certainty")
        visible(element("battle-retry"))
        capture("battle-lost")
        tap(element("battle-retry"))
        choose("separate")
        // A background/foreground round trip keeps the turn and music settings.
        XCUIDevice.shared.press(.home); app.activate()
        choose("prepare")
        visible(text("グルグル雲をたおした！"))
        visible(text("＋10 YOKIポイント"))
        visible(text("モヤモヤ雲のクッションを「思い出」に追加したよ。"))
        capture("battle-victory")
        tap(element("battle-result-home"))
        XCTAssertEqual(points(), before + 10)
        app.terminate(); launchGuestHome()
        XCTAssertEqual(points(), before + 10)
        checkIn("busy")
        tap(element("moyamoya-fight"))
        choose("one"); choose("five")
        visible(text("今日の10ポイントは受け取り済み"))
        capture("battle-daily-cap")
        tap(element("battle-result-home"))
        XCTAssertEqual(points(), before + 10)
    }
}
