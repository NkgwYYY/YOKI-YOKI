import XCTest
import StoreKitTest

// Runs as the Release application target's UI test. StoreKit's local
// test service is isolated to the disposable simulator; no real purchases.
@MainActor
final class RoomReleaseJourney55: XCTestCase {
    private let app = XCUIApplication()
    private var store: SKTestSession!
    override func setUpWithError() throws {
        continueAfterFailure = false
        store = try SKTestSession(configurationFileNamed: "VisualProducts55")
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
        visible(element("unified-shop"))
        visible(element("shop-fitting-preview").descendants(matching: .any).matching(identifier: "resident-renderer-ready").firstMatch)
    }
    private func balance() -> Int {
        let digits = element("shop-balance").label.filter { $0.isNumber }
        return Int(digits) ?? -1
    }
    private func category(_ id: String) {
        let target = element("shop-tab-" + id)
        let rail = element("shop-tabs")
        reveal(rail)
        for _ in 0..<5 {
            if target.exists && rail.frame.contains(target.frame) && target.isHittable {
                target.tap(); return
            }
            if target.exists && target.frame.minX < rail.frame.minX { rail.swipeRight() }
            else { rail.swipeLeft() }
        }
        XCTFail("Category not reachable: " + id)
    }
    private func pick(_ id: String) {
        tap(element("shop-product-" + id))
    }
    private func preview(_ name: String) {
        tap(element("shop-see-preview"))
        visible(element("shop-fitting-preview").descendants(matching: .any).matching(identifier: "resident-renderer-ready").firstMatch)
        RunLoop.current.run(until: Date().addingTimeInterval(0.35))
        reveal(element("shop-fitting-preview"))
        capture(name)
    }
    private func price(_ yen: Int) {
        visible(element("shop-buy-store"))
        until("Native StoreKit price must resolve", timeout: 30) {
            let b = self.element("shop-buy-store")
            return b.isEnabled && b.label.contains(String(yen))
        }
    }
    func testUnifiedShopPurchasesAndPersistence() throws {
        home(); capture("home-subtle-wardrobe"); openShop()
        let before = balance()
        XCTAssertEqual(before, 10000)
        capture("unified-shop-first-screen")
        category("costumes")
        for id in ["panda", "dog", "cat", "rabbit", "frog"] {
            pick("costume-" + id)
            if id != "panda" { price(50) }
            preview("costume-" + id + "-front")
            for view in ["angle", "side", "back", "roll"] {
                tap(element("shop-view-" + view))
                // Shared-value pose is interpolated by the local renderer.
                RunLoop.current.run(until: Date().addingTimeInterval(0.5))
                capture("costume-" + id + "-" + view)
            }
            tap(element("shop-view-front"))
        }
        for (tab, ids, yen) in [("sets", ["panda-set", "rabbit-set"], 200),
                                ("sets", ["rain-cafe", "star-room", "washitsu"], 500),
                                ("furniture", ["panda-furniture", "rabbit-furniture"], 200)] {
            category(tab)
            for id in ids {
                pick(id); price(yen)
                preview("iap-preview-" + id)
                reveal(element("shop-buy-store")); capture("iap-price-" + id)
            }
        }
        XCTAssertEqual(balance(), before, "Preview must not spend points")
        category("sets"); pick("panda-set")
        tap(element("shop-buy-points")); tap(element("shop-cancel-points"))
        XCTAssertEqual(balance(), before)
        tap(element("shop-buy-points")); tap(element("shop-confirm-points"))
        visible(element("shop-apply")); XCTAssertEqual(balance(), before - 1300)
        tap(element("shop-apply")); visible(text("おうちに反映しました。"))
        tap(element("shop-show-home")); visible(element("home-roomGood-bamboo-cushion"))
        capture("panda-matching-home")
        openShop(); category("sets"); pick("rain-cafe"); price(500)
        tap(element("shop-buy-store")); visible(element("shop-apply"), timeout: 30)
        XCTAssertEqual(balance(), before - 1300)
        tap(element("shop-apply")); visible(text("おうちに反映しました。"))
        tap(element("shop-show-home")); visible(element("home-wardrobe"))
        capture("cafe-room-home")
        app.terminate(); home(); openShop()
        XCTAssertEqual(balance(), before - 1300)
        category("sets"); pick("rain-cafe"); visible(element("shop-apply"))
        XCTAssertFalse(element("shop-apply").isEnabled, "Applied theme persists across restart")
        tap(element("shop-restore")); visible(text("1種類の購入を復元しました。"), timeout: 30)
        XCTAssertEqual(balance(), before - 1300)
        tap(element("shop-reset-theme"))
        visible(text("いつものお部屋に戻しました。"))
        category("sets"); pick("panda-set"); visible(element("shop-apply"))
        XCTAssertFalse(element("shop-apply").isEnabled, "Point-bought matching set survives restoration")
        capture("restore-retains-points-and-original-layout")
        tap(element("shop-back")); visible(element("home-daily-record"))
        tap(element("home-daily-record")); visible(element("memory-diary-art"))
        capture("diary-new-landing-image")
        tap(element("memory-open-diary")); visible(element("diary-home"))
        capture("diary-original-notebook")
    }
}
