import Foundation

// The pressure change alert for readings taken in the background: a
// line-for-line copy of checkAlert in src/alerts.ts, which is the rule the
// app uses while it is open and which `npm test` checks. A test compares
// the constants here with the TypeScript ones. Change one, change both.

struct BaroSample {
  let t: Double    // ms since 1970
  let hpa: Double
}

struct BaroAlertHit {
  let dir: String  // "rise" or "fall"
  let amount: Double
  let fromT: Double
  let at: Double
}

enum BaroAlert {
  /// ALERT_WINDOW_MS: three hours.
  static let windowMs: Double = 3 * 60 * 60 * 1000
  /// ALERT_IGNORE_ABOVE_HPA: a bigger change is the phone going up or down, not the air.
  static let ignoreAboveHpa: Double = 15

  /// `samples` in time order; the latest is the last one.
  static func check(_ samples: [BaroSample], thresholdHpa: Double, lastAt: Double?, lastDir: String?) -> BaroAlertHit? {
    guard samples.count >= 2, thresholdHpa > 0, let latest = samples.last else { return nil }
    let start = latest.t - windowMs
    var fallFrom: BaroSample? = nil
    var riseFrom: BaroSample? = nil
    for r in samples.dropLast() {
      if r.t < start || r.t > latest.t { continue }
      let fallOk = !(lastDir == "fall" && lastAt != nil && r.t < lastAt!)
      let riseOk = !(lastDir == "rise" && lastAt != nil && r.t < lastAt!)
      if fallOk && (fallFrom == nil || r.hpa > fallFrom!.hpa) { fallFrom = r }
      if riseOk && (riseFrom == nil || r.hpa < riseFrom!.hpa) { riseFrom = r }
    }
    let fall = fallFrom.map { $0.hpa - latest.hpa } ?? 0
    let rise = riseFrom.map { latest.hpa - $0.hpa } ?? 0
    func ok(_ x: Double) -> Bool { return x >= thresholdHpa - 1e-9 && x <= ignoreAboveHpa }
    let fallHit: BaroAlertHit? = (ok(fall) && fallFrom != nil) ? BaroAlertHit(dir: "fall", amount: fall, fromT: fallFrom!.t, at: latest.t) : nil
    let riseHit: BaroAlertHit? = (ok(rise) && riseFrom != nil) ? BaroAlertHit(dir: "rise", amount: rise, fromT: riseFrom!.t, at: latest.t) : nil
    if let f = fallHit, let r = riseHit { return f.amount >= r.amount ? f : r }
    return fallHit ?? riseHit
  }

  /// "Pressure fell 4 hPa in the last 3 hours." The unit's name, its size in
  /// hPa and its decimals come from the app (src/units.ts), so the words match.
  static func text(_ hit: BaroAlertHit, unit: String, hpaPerUnit: Double, decimals: Int) -> String {
    let value = hit.amount / (hpaPerUnit > 0 ? hpaPerUnit : 1)
    let f = NumberFormatter()
    f.numberStyle = .decimal
    f.minimumFractionDigits = 0
    f.maximumFractionDigits = max(0, decimals)
    f.roundingMode = .halfUp
    let amount = f.string(from: NSNumber(value: value)) ?? String(format: "%.\(decimals)f", value)
    return "Pressure \(hit.dir == "fall" ? "fell" : "rose") \(amount) \(unit) in the last 3 hours."
  }
}
