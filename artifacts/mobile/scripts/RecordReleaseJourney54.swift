import XCTest

// Exercises the production UI in a separately seeded, fresh simulator.
@MainActor
final class RecordReleaseJourney54: XCTestCase {
    private let app = XCUIApplication()
    override func setUpWithError() throws { continueAfterFailure = false }
    override func tearDownWithError() throws {
        capture("record-final-screen")
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "record-native-accessibility"
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


    func testUnifiedOptionalRecordAndBattle() throws {
        app.launch()
        visible(element("check-in-screen"), timeout: 60)
        tap(element("check-in-mood-4"))
        tap(element("check-in-fatigue-2"))
        tap(element("check-in-worry-3"))
        // Do not touch any optional life answer or a skip/none control.
        tap(element("moyamoya-no"))
        capture("record-optional-untouched")
        tap(element("check-in-next"))
        visible(element("home-wardrobe"), timeout: 60)
        XCTAssertFalse(element("check-in-screen").exists)
        app.terminate()
        app.launch()
        visible(element("home-wardrobe"), timeout: 60)
        XCTAssertFalse(element("check-in-screen").exists, "No repeated daily prompt")
        tap(element("home-condition"))
        visible(element("condition-screen"))
        reveal(element("life-selected-sleep"))
        XCTAssertEqual(element("life-selected-sleep").label, "未記録")
        reveal(element("life-selected-moyamoya"))
        XCTAssertEqual(element("life-selected-moyamoya").label, "ない")
        capture("record-answer-graphs")
        tap(element("condition-edit"))
        visible(element("check-in-screen"))
        tap(element("life-sleep-toggle"))
        tap(element("life-day-rest"))
        for label in ["ご飯をたくさん食べた", "恋人と会った", "友人と会った"] {
            tap(element("diary-quick-behavior-" + label))
        }
        tap(element("life-behavior-more"))
        tap(element("diary-behavior-好きなものを食べた"))
        tap(element("life-behavior-more"))
        visible(element("diary-quick-behavior-好きなものを食べた"))
        capture("record-optional-activities")
        tap(element("moyamoya-yes"))
        tap(element("moyamoya-pattern-loop"))
        tap(element("check-in-next"))
        visible(element("moyamoya-encounter"), timeout: 60)
        capture("record-matching-encounter")
        tap(element("moyamoya-fight"))
        visible(element("moyamoya-battle-screen"), timeout: 60)
        visible(element("battle-question"))
        capture("record-battle-started")
    }
}
