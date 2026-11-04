import ExpoModulesCore
import StoreKit
import CryptoKit

private actor StoneStore {
  private let ids: Set<String> = ["yokiyoki.evolution_stone", "yokiyoki.regression_stone"]
  private var purchasing = false
  private func failure(_ text: String) -> NSError {
    NSError(domain: "YokiStones", code: 1, userInfo: [NSLocalizedDescriptionKey: text])
  }
  private func token(_ owner: String) -> UUID {
    // Keep build41's per-owner token. A new deterministic UUID would orphan
    // purchases that were verified by Apple but not yet credited locally.
    let hash = SHA256.hash(data: Data(owner.utf8)).map { String(format: "%02x", $0) }.joined()
    let key = "yoki.stones.account." + hash
    if let saved = UserDefaults.standard.string(forKey: key), let existing = UUID(uuidString: saved) {
      return existing
    }
    let created = UUID()
    UserDefaults.standard.set(created.uuidString, forKey: key)
    return created
  }
  private func checked(_ result: VerificationResult<Transaction>, owner: String) throws -> Transaction {
    guard case .verified(let t) = result, ids.contains(t.productID), t.productType == .consumable,
      t.purchasedQuantity == 1, t.revocationDate == nil,
      t.appBundleID == Bundle.main.bundleIdentifier, t.appAccountToken == token(owner) else {
      throw failure("購入の検証または利用者の確認ができませんでした。")
    }
    return t
  }
  private func receipt(_ t: Transaction) -> [String: Any] {
    ["transactionId": String(t.id), "productId": t.productID]
  }
  func catalog() async throws -> [[String: Any]] {
    let products = try await Product.products(for: ids)
    return products.filter { $0.type == .consumable }.map { ["id": $0.id, "price": $0.displayPrice] }
  }
  func purchase(_ id: String, owner: String) async throws -> [String: Any] {
    guard ids.contains(id), !owner.isEmpty, !purchasing else { throw failure("購入処理を確認してください。") }
    purchasing = true
    defer { purchasing = false }
    guard let product = try await Product.products(for: [id]).first, product.type == .consumable else {
      throw failure("商品情報を取得できません。しばらくして再試行してください。")
    }
    switch try await product.purchase(options: [.appAccountToken(token(owner))]) {
    case .success(let result):
      var data = receipt(try checked(result, owner: owner)); data["status"] = "purchased"; return data
    case .pending: return ["status": "pending"]
    case .userCancelled: return ["status": "cancelled"]
    @unknown default: throw failure("購入状態を確認できませんでした。")
    }
  }
  func unfinished(_ owner: String) async -> [[String: Any]] {
    var results: [[String: Any]] = []
    for await result in Transaction.unfinished {
      if let t = try? checked(result, owner: owner) { results.append(receipt(t)) }
    }
    return results
  }
  // Called only after durable, idempotent local credit. Failed credits stay unfinished.
  func finish(_ id: String, owner: String) async throws {
    for await result in Transaction.unfinished {
      if case .verified(let raw) = result, String(raw.id) == id {
        let t = try checked(result, owner: owner)
        await t.finish(); return
      }
    }
  }
}

public final class YokiStonesModule: Module {
  private let store = StoneStore()
  private var listener: Task<Void, Never>?
  public func definition() -> ModuleDefinition {
    Name("YokiStones")
    Events("transactionsChanged")
    OnCreate {
      self.listener = Task { [weak self] in
        for await result in Transaction.updates {
          if Task.isCancelled { return }
          if case .verified(let t) = result, ["yokiyoki.evolution_stone", "yokiyoki.regression_stone"].contains(t.productID) {
            self?.sendEvent("transactionsChanged", [:])
          }
        }
      }
    }
    OnDestroy { self.listener?.cancel() }
    AsyncFunction("catalog") { () async throws -> [[String: Any]] in try await self.store.catalog() }
    AsyncFunction("purchase") { (id: String, owner: String) async throws -> [String: Any] in try await self.store.purchase(id, owner: owner) }
    AsyncFunction("unfinished") { (owner: String) async -> [[String: Any]] in await self.store.unfinished(owner) }
    AsyncFunction("finish") { (id: String, owner: String) async throws in try await self.store.finish(id, owner: owner) }
  }
}
