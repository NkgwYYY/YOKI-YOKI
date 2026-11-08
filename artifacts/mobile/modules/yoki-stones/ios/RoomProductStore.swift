import Foundation
import StoreKit

let roomProductIDs: Set<String> = Set(["panda-furniture", "rabbit-furniture", "panda-set", "rabbit-set", "rain-cafe", "star-room", "washitsu"].map { "yokiyoki.room." + $0.replacingOccurrences(of: "-", with: "_") })

actor RoomProductStore {
  private var purchasing = false
  private func failure(_ text: String) -> NSError {
    NSError(domain: "YokiRoomProducts", code: 1, userInfo: [NSLocalizedDescriptionKey: text])
  }
  private func verified(_ result: VerificationResult<Transaction>) throws -> Transaction {
    guard case .verified(let transaction) = result,
      roomProductIDs.contains(transaction.productID), transaction.productType == .nonConsumable,
      transaction.appBundleID == Bundle.main.bundleIdentifier else {
      throw failure("お部屋の購入を検証できませんでした。")
    }
    return transaction
  }
  func catalog() async throws -> [[String: Any]] {
    try await Product.products(for: roomProductIDs).filter { $0.type == .nonConsumable }.map { ["id": $0.id, "price": $0.displayPrice] }
  }
  func purchase(_ id: String) async throws -> [String: String] {
    guard roomProductIDs.contains(id), !purchasing else { throw failure("購入処理を確認してください。") }
    purchasing = true
    defer { purchasing = false }
    guard let product = try await Product.products(for: [id]).first, product.type == .nonConsumable else {
      throw failure("商品情報を取得できません。しばらくして再試行してください。")
    }
    // Validate the configured Japanese price before showing the payment sheet.
    let expected = ["rain_cafe", "star_room", "washitsu"].contains(String(id.split(separator: ".").last ?? "")) ? 500 : 200
    if product.priceFormatStyle.currencyCode == "JPY", product.price != Decimal(expected) {
      throw failure("販売価格を確認しています。しばらくして再試行してください。")
    }
    switch try await product.purchase() {
    case .success(let result):
      let transaction = try verified(result)
      guard transaction.revocationDate == nil else { throw failure("この購入は取り消されています。") }
      return ["status": "purchased"]
    case .pending: return ["status": "pending"]
    case .userCancelled: return ["status": "cancelled"]
    @unknown default: throw failure("購入状態を確認できませんでした。")
    }
  }
  func snapshot() async throws -> [String: Any] {
    // Collect unfinished IDs first. A newer transaction must not be finished
    // unless its entitlement was included in the durable local snapshot.
    var pending: [Transaction] = []
    for await result in Transaction.unfinished {
      guard roomProductIDs.contains(result.unsafePayloadValue.productID) else { continue }
      pending.append(try verified(result))
    }
    var products = Set<String>()
    for await result in Transaction.currentEntitlements {
      guard roomProductIDs.contains(result.unsafePayloadValue.productID) else { continue }
      let transaction = try verified(result)
      if transaction.revocationDate == nil { products.insert(transaction.productID) }
    }
    return ["products": Array(products), "finishable": pending.filter { $0.revocationDate != nil || products.contains($0.productID) }.map { String($0.id) }]
  }
  func finish(_ id: String) async throws {
    for await result in Transaction.unfinished {
      guard String(result.unsafePayloadValue.id) == id else { continue }
      let transaction = try verified(result)
      await transaction.finish()
      return
    }
  }
}
