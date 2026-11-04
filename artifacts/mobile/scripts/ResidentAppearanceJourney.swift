import XCTest

// Runs against the unchanged installed Release simulator artifact.
// Only synthetic points are spent in the disposable simulator.
@MainActor
final class ResidentAppearanceJourney: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "app.replit.yokiyoki--")
    override func setUpWithError() throws {
        continueAfterFailure = false
    }
    override func tearDownWithError() throws {
        capture("appearance-final-screen")
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "appearance-native-accessibility"
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


    private func openWardrobe() {
        tap(element("home-more-menu"))
        tap(element("home-menu-wardrobe"))
        visible(element("wardrobe-screen"))
    }
    private func balance() -> Int {
        let digits = element("wardrobe-points").label.prefix { $0.isNumber }
        XCTAssertFalse(digits.isEmpty)
        return Int(digits) ?? -1
    }
    // Screenshots are visual evidence, not an automated assertion that a mouth
    // is visible. Inspect each attachment after the functional journey passes.
    private func settledCapture(_ name: String) {
        Thread.sleep(forTimeInterval: 3) // allow native WebView frames to settle
        visible(element("room-resident"))
        capture(name)
    }
    func testResidentAcrossLifecycleAndExpression() throws {
        launchGuestHome()
        capture("appearance-01-startup")
        settledCapture("appearance-02-startup-settled")
        openWardrobe()
        tap(element("wardrobe-action-panda"))
        tap(element("wardrobe-buy-confirm"))
        until("Panda point purchase must unlock") {
            self.element("wardrobe-action-panda").label == "着る"
        }
        tap(element("wardrobe-action-panda"))
        until("Panda must be equipped") {
            self.element("wardrobe-selected-name").label.contains("パンダ")
        }
        tap(element("wardrobe-back"))
        settledCapture("appearance-03-panda-home")
        XCUIDevice.shared.press(.home)
        until("App must enter background", timeout: 10) {
            self.app.state == .runningBackground || self.app.state == .runningBackgroundSuspended
        }
        Thread.sleep(forTimeInterval: 3)
        app.activate()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        capture("appearance-04-resume")
        settledCapture("appearance-05-resume-settled")
        app.terminate()
        launchGuestHome()
        capture("appearance-06-restart")
        settledCapture("appearance-07-restart-settled")
        tap(element("room-meal"))
        visible(text("ごはんをあげる"))
        tap(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "きのみ、5ポイント、満腹度プラス")).firstMatch)
        capture("appearance-08-meal-expression")
        visible(text("ごちそうさま。また一緒に食べようね。"), timeout: 30)
        settledCapture("appearance-09-after-meal")
    }
}
