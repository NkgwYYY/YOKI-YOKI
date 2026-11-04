import ExpoModulesCore
import StoreKit

public final class YokiCostumesModule: Module {
  private let store = CostumeStore()
  private var listener: Task<Void, Never>?
  public func definition() -> ModuleDefinition {
    Name("YokiCostumes")
    Events("transactionsChanged")
    OnCreate {
      self.listener = Task { [weak self] in
        for await result in Transaction.updates {
          if Task.isCancelled { return }
          if costumeIDs.contains(result.unsafePayloadValue.productID) {
            self?.sendEvent("transactionsChanged", [:])
          }
        }
      }
    }
    OnDestroy { self.listener?.cancel() }
    AsyncFunction("catalog") { () async throws -> [[String: Any]] in try await self.store.catalog() }
    AsyncFunction("purchase") { (id: String) async throws -> [String: String] in try await self.store.purchase(id) }
    AsyncFunction("snapshot") { () async throws -> [String: Any] in try await self.store.snapshot() }
    // Explicit restore button only; never prompt for an Apple Account at startup.
    AsyncFunction("sync") { () async throws in try await AppStore.sync() }
    AsyncFunction("finish") { (id: String) async throws in try await self.store.finish(id) }
  }
}
