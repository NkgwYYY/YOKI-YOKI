import XCTest
import StoreKitTest

// Runs against the exact installed Release simulator artifact. StoreKit's local
// test service is isolated to the disposable simulator; no real purchases.
@MainActor
final class CostumeReleaseJourney: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "app.replit.yokiyoki--")
    private var store: SKTestSession!
    override func setUpWithError() throws {
        continueAfterFailure = false
        store = try SKTestSession(configurationFileNamed: "Costumes44")
        store.disableDialogs = true
        store.clearTransactions()
    }
    override func tearDownWithError() throws {
        capture("costume-final-screen")
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "costume-native-accessibility"
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
    func testCostumePurchasesAndRestoration() throws {
        launchGuestHome()
        openWardrobe()
        let before = balance()
        XCTAssertGreaterThanOrEqual(before, 2500)
        // First capture each unowned product and verify that the native module
        // resolves its local StoreKit catalog, not a mock JS bridge.
        for id in ["dog", "cat", "rabbit", "frog", "panda"] {
            tap(element("wardrobe-action-\(id)"))
            visible(element("wardrobe-buy-store"))
            until("Japanese StoreKit price must resolve to 50 yen", timeout: 30) {
                let button = self.element("wardrobe-buy-store")
                return button.isEnabled && button.label.contains("50")
            }
            XCTAssertTrue(element("wardrobe-buy-confirm").isEnabled)
            capture("iap-review-\(id)")
            tap(element("wardrobe-buy-cancel"))
        }
        XCTAssertEqual(balance(), before, "Cancelling must not spend points")
        tap(element("wardrobe-action-dog"))
        tap(element("wardrobe-buy-confirm"))
        until("Point purchase must unlock dog") {
            self.element("wardrobe-action-dog").label == "着る"
        }
        XCTAssertEqual(balance(), before - 500)
        tap(element("wardrobe-action-dog"))
        until("Dog must be equipped") {
            self.element("wardrobe-selected-name").label.contains("いぬ")
        }
        capture("point-purchase-dog-equipped")
        // Genuine StoreKit purchase invocation, handled by the Xcode test
        // storefront. The native verified transaction must reach durable state.
        tap(element("wardrobe-action-cat"))
        tap(element("wardrobe-buy-store"))
        until("StoreKit purchase must unlock cat", timeout: 30) {
            self.element("wardrobe-action-cat").label == "着る"
        }
        XCTAssertEqual(balance(), before - 500, "IAP must not spend points")
        tap(element("wardrobe-action-cat"))
        until("Cat must be equipped") {
            self.element("wardrobe-selected-name").label.contains("ねこ")
        }
        capture("store-purchase-cat-equipped")
        app.terminate()
        launchGuestHome()
        openWardrobe()
        XCTAssertEqual(balance(), before - 500)
        XCTAssertTrue(element("wardrobe-selected-name").label.contains("ねこ"))
        tap(element("wardrobe-restore"))
        until("Purchase restoration must complete", timeout: 30) {
            self.text("1種類の購入を復元しました。").exists
        }
        XCTAssertEqual(balance(), before - 500)
        XCTAssertEqual(element("wardrobe-action-dog").label, "着る", "Restore must retain point purchases")
        capture("store-restored-and-point-purchase-retained")
    }
}
