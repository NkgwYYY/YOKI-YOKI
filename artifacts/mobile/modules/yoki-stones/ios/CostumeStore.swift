import Foundation
import StoreKit

let costumeIDs: Set<String> = Set(["dog", "cat", "rabbit", "frog", "panda"].map { "yokiyoki.costume." + $0 })

actor CostumeStore {
  private var purchasing = false
  private func failure(_ text: String) -> NSError {
    NSError(domain: "YokiCostumes", code: 1, userInfo: [NSLocalizedDescriptionKey: text])
  }
  private func verified(_ result: VerificationResult<Transaction>) throws -> Transaction {
    guard case .verified(let transaction) = result,
      costumeIDs.contains(transaction.productID), transaction.productType == .nonConsumable,
      transaction.appBundleID == Bundle.main.bundleIdentifier else {
      throw failure("着ぐるみの購入を検証できませんでした。")
    }
    return transaction
  }
  func catalog() async throws -> [[String: Any]] {
    try await Product.products(for: costumeIDs).filter { $0.type == .nonConsumable }.map { ["id": $0.id, "price": $0.displayPrice] }
  }
  func purchase(_ id: String) async throws -> [String: String] {
    guard costumeIDs.contains(id), !purchasing else { throw failure("購入処理を確認してください。") }
    purchasing = true
    defer { purchasing = false }
    guard let product = try await Product.products(for: [id]).first, product.type == .nonConsumable else {
      throw failure("商品情報を取得できません。しばらくして再試行してください。")
    }
    // The Japanese storefront is configured at ¥50. Never silently charge a
    // different Japanese price if App Store Connect configuration has drifted.
    if product.priceFormatStyle.currencyCode == "JPY", product.price != Decimal(50) {
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
      guard costumeIDs.contains(result.unsafePayloadValue.productID) else { continue }
      pending.append(try verified(result))
    }
    var products = Set<String>()
    for await result in Transaction.currentEntitlements {
      guard costumeIDs.contains(result.unsafePayloadValue.productID) else { continue }
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

