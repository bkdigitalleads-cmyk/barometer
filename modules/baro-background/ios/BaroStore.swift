import Foundation

// What the background side keeps between runs, in the app's own
// UserDefaults (on the phone only):
//  - pending: readings taken in the background, waiting for the app to
//    open and move them into its database (src/background.ts)
//  - recent: the last four hours of readings from both sides, so the
//    alert check sees the same three hours the app would
//  - the alert's settings, which the app writes whenever they change
//  - the alert state (when the last alert fired and which way), shared
//    with the app so one change alerts once, whichever side sees it first
// Every read-modify-write goes through one serial queue.

enum BaroStore {
  static let queue = DispatchQueue(label: "com.bwk.barometer.store")
  private static var d: UserDefaults { UserDefaults.standard }

  private static let pendingKey = "baro.pending"
  private static let recentKey = "baro.recent"
  private static let alertOnKey = "baro.alert.on"
  private static let alertHpaKey = "baro.alert.hpa"
  private static let unitKey = "baro.alert.unit"
  private static let unitHpaKey = "baro.alert.unitHpa"
  private static let unitDecimalsKey = "baro.alert.unitDecimals"
  private static let lastAtKey = "baro.alert.lastAt"
  private static let lastDirKey = "baro.alert.lastDir"
  private static let lastRunKey = "baro.lastRun"

  /// The most readings kept waiting (about a month of four runs a day, and more).
  static let maxPending = 2000
  static let recentMs: Double = 4 * 60 * 60 * 1000

  private static func pairs(_ key: String) -> [[Double]] {
    return (d.array(forKey: key) as? [[Double]]) ?? []
  }

  // MARK: readings

  /// Adds a background reading to both lists. Call on `queue`.
  static func addBackgroundReading(t: Double, hpa: Double) {
    var p = pairs(pendingKey)
    p.append([t, hpa])
    if p.count > maxPending { p.removeFirst(p.count - maxPending) }
    d.set(p, forKey: pendingKey)
    mergeRecent([[t, hpa]], now: t)
    d.set(t, forKey: lastRunKey)
  }

  /// Hands the waiting readings to the app and forgets them.
  static func takePending() -> [[Double]] {
    return queue.sync {
      let p = pairs(pendingKey)
      d.removeObject(forKey: pendingKey)
      return p
    }
  }

  /// The app's own readings from the last hours, for the next background check.
  static func pushRecent(_ list: [[Double]], now: Double) {
    queue.sync { mergeRecent(list, now: now) }
  }

  /// Call on `queue`.
  private static func mergeRecent(_ list: [[Double]], now: Double) {
    var byT: [Double: Double] = [:]
    for r in pairs(recentKey) + list where r.count == 2 { byT[r[0]] = r[1] }
    let kept = byT.filter { $0.key >= now - recentMs }.sorted { $0.key < $1.key }.map { [$0.key, $0.value] }
    d.set(kept, forKey: recentKey)
  }

  /// Call on `queue`.
  static func recentSamples() -> [BaroSample] {
    return pairs(recentKey).filter { $0.count == 2 }.map { BaroSample(t: $0[0], hpa: $0[1]) }.sorted { $0.t < $1.t }
  }

  static func lastRun() -> Double? {
    return queue.sync { d.object(forKey: lastRunKey) as? Double }
  }

  // MARK: alert settings and state

  struct AlertConfig {
    var on: Bool
    var thresholdHpa: Double
    var unit: String
    var hpaPerUnit: Double
    var decimals: Int
  }

  static func setAlertConfig(_ c: AlertConfig) {
    queue.sync {
      d.set(c.on, forKey: alertOnKey)
      d.set(c.thresholdHpa, forKey: alertHpaKey)
      d.set(c.unit, forKey: unitKey)
      d.set(c.hpaPerUnit, forKey: unitHpaKey)
      d.set(c.decimals, forKey: unitDecimalsKey)
    }
  }

  /// Call on `queue`.
  static func alertConfig() -> AlertConfig {
    let unit = d.string(forKey: unitKey) ?? "hPa"
    let per = d.double(forKey: unitHpaKey)
    return AlertConfig(
      on: d.bool(forKey: alertOnKey),
      thresholdHpa: d.double(forKey: alertHpaKey),
      unit: unit,
      hpaPerUnit: per > 0 ? per : 1,
      decimals: d.object(forKey: unitDecimalsKey) as? Int ?? 1
    )
  }

  /// Call on `queue`.
  static func alertStateUnlocked() -> (lastAt: Double?, lastDir: String?) {
    return (d.object(forKey: lastAtKey) as? Double, d.string(forKey: lastDirKey))
  }

  static func alertState() -> (lastAt: Double?, lastDir: String?) {
    return queue.sync { alertStateUnlocked() }
  }

  /// Call on `queue`.
  static func setAlertStateUnlocked(lastAt: Double?, lastDir: String?) {
    if let a = lastAt { d.set(a, forKey: lastAtKey) } else { d.removeObject(forKey: lastAtKey) }
    if let r = lastDir { d.set(r, forKey: lastDirKey) } else { d.removeObject(forKey: lastDirKey) }
  }

  static func setAlertState(lastAt: Double?, lastDir: String?) {
    queue.sync { setAlertStateUnlocked(lastAt: lastAt, lastDir: lastDir) }
  }
}
