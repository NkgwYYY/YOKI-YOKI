import XCTest
import StoreKitTest

// Runs against the exact installed Release simulator artifact. StoreKit's local
// test service is isolated to the disposable simulator; no real purchases.
@MainActor
final class RoomReleaseJourney53: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "app.replit.yokiyoki--")
    private var store: SKTestSession!
    override func setUpWithError() throws {
        continueAfterFailure = false
        store = try SKTestSession(configurationFileNamed: "RoomProducts53")
        store.storefront = "JPN"
        store.locale = Locale(identifier: "ja_JP")
        store.disableDialogs = true
        store.clearTransactions()
    }
    override func tearDownWithError() throws {
        capture("room-final-screen")
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "room-native-accessibility"
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
            // The first control can start at the scroll view's exact top edge.
            // An invented inset makes a visible button impossible to reveal.
            let viewport = surface.frame
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

    private func home() {
        app.launch()
        visible(element("home-wardrobe"), timeout: 60)
        visible(element("room-resident"))
    }
    private func openShop() {
        tap(element("home-wardrobe"))
        tap(element("wardrobe-room-shop"))
        visible(element("room-shop-screen"))
    }
    private func balance() -> Int {
        let digits = element("room-shop-balance").label.filter { $0.isNumber }
        return Int(digits) ?? -1
    }
    private func pick(_ id: String) {
        let target = element("room-product-" + id)
        let rail = element("room-products-rail")
        reveal(rail)
        for _ in 0..<4 {
            if target.exists && target.isHittable { target.tap(); return }
            rail.swipeLeft()
        }
        XCTFail("Product not reachable: " + id)
    }
    private func price(_ yen: Int) {
        visible(element("room-buy-store"))
        until("Native StoreKit price must resolve", timeout: 30) {
            let b = self.element("room-buy-store")
            return b.isEnabled && b.label.contains(String(yen))
        }
    }
    func testRoomPurchasesAndPersistence() throws {
        home(); openShop()
        let before = balance()
        XCTAssertEqual(before, 10000)
        // Record every real product preview and price in the local storefront.
        for (tab, ids, yen) in [("matching", ["panda-set", "rabbit-set"], 200),
                                ("room", ["rain-cafe", "star-room", "washitsu"], 500),
                                ("furniture", ["panda-furniture", "rabbit-furniture"], 200)] {
            tap(element("room-shop-tab-" + tab))
            for id in ids {
                pick(id); price(yen)
                reveal(element("room-set-preview")); capture("iap-preview-" + id)
                reveal(element("room-buy-store")); capture("iap-price-" + id)
            }
        }
        XCTAssertEqual(balance(), before, "Preview must not spend points")
        tap(element("room-shop-tab-matching"))
        tap(element("room-buy-points"))
        tap(element("room-cancel-points"))
        XCTAssertEqual(balance(), before)
        // Panda is already owned: pay only the partial bundle price.
        tap(element("room-buy-points")); tap(element("room-confirm-points"))
        visible(element("room-apply")); XCTAssertEqual(balance(), before - 1300)
        tap(element("room-apply")); visible(text("おうちに反映しました。"))
        tap(element("room-show-home")); visible(element("home-roomGood-bamboo-cushion"))
        capture("panda-matching-home")
        openShop(); tap(element("room-shop-tab-room")); price(500)
        // Real StoreKit 2 API, local test storefront. No production purchase.
        tap(element("room-buy-store")); visible(element("room-apply"), timeout: 30)
        XCTAssertEqual(balance(), before - 1300)
        tap(element("room-apply")); visible(text("おうちに反映しました。"))
        tap(element("room-show-home")); visible(element("home-wardrobe"))
        capture("cafe-room-home")
        app.terminate(); home(); openShop()
        XCTAssertEqual(balance(), before - 1300)
        tap(element("room-shop-tab-room")); visible(element("room-apply"))
        XCTAssertFalse(element("room-apply").isEnabled, "Applied theme persists across restart")
        tap(element("room-restore")); visible(text("1種類の購入を復元しました。"), timeout: 30)
        XCTAssertEqual(balance(), before - 1300)
        tap(element("room-reset-theme"))
        visible(text("いつものお部屋に戻しました。"))
        tap(element("room-shop-tab-matching")); visible(element("room-apply"))
        XCTAssertFalse(element("room-apply").isEnabled, "Point-bought matching set survives restoration")
        capture("room-restore-retains-points-and-original-layout")
    }
}
