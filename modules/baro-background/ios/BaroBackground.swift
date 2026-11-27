import BackgroundTasks
import CoreMotion
import Foundation
import UIKit
import UserNotifications

// The background reading. iOS decides when (and whether) to run the app in
// the background; this asks for an app refresh at the earliest 15 minutes
// out and a processing run at the earliest 2 hours out, every time. When
// one runs, it takes one reading from the pressure sensor (CMAltimeter,
// the same source expo-sensors reads while the app is open), keeps it for
// the app, checks the pressure change alert, and asks for the next run.
//
// iOS does not run it after the app is swiped away in the app switcher,
// with Background App Refresh off, or in Low Power Mode, and runs it less
// for an app that is rarely opened. Nothing here touches the network.

enum BaroBackground {
  static let refreshId = "com.bwk.barometer.refresh"
  static let processingId = "com.bwk.barometer.processing"

  static let refreshAfter: TimeInterval = 15 * 60
  static let processingAfter: TimeInterval = 2 * 60 * 60

  /// Called once from application(_:didFinishLaunchingWithOptions:), as iOS requires.
  static func register() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: refreshId, using: nil) { task in
      handle(task)
    }
    BGTaskScheduler.shared.register(forTaskWithIdentifier: processingId, using: nil) { task in
      handle(task)
    }
  }

  /// Asks iOS for the next runs. Safe to call often: a new request replaces the old one.
  static func schedule() {
    #if targetEnvironment(simulator)
    return
    #else
    let refresh = BGAppRefreshTaskRequest(identifier: refreshId)
    refresh.earliestBeginDate = Date(timeIntervalSinceNow: refreshAfter)
    try? BGTaskScheduler.shared.submit(refresh)

    let processing = BGProcessingTaskRequest(identifier: processingId)
    processing.requiresNetworkConnectivity = false
    processing.requiresExternalPower = false
    processing.earliestBeginDate = Date(timeIntervalSinceNow: processingAfter)
    try? BGTaskScheduler.shared.submit(processing)
    #endif
  }

  private static func handle(_ task: BGTask) {
    // Ask for the next run first, so a run cut short still leads to another.
    schedule()
    let reader = BaroReader()
    task.expirationHandler = {
      reader.cancel()
    }
    reader.readOnce(timeout: 10) { hpa in
      if let hpa = hpa {
        record(hpa: hpa, at: Date().timeIntervalSince1970 * 1000)
      }
      task.setTaskCompleted(success: hpa != nil)
    }
  }

  /// Keeps a reading and checks the alert. Also used by the test menu to try the same path by hand.
  static func record(hpa: Double, at t: Double) {
    var hit: BaroAlertHit? = nil
    var config: BaroStore.AlertConfig? = nil
    BaroStore.queue.sync {
      BaroStore.addBackgroundReading(t: t, hpa: hpa)
      let c = BaroStore.alertConfig()
      config = c
      guard c.on, c.thresholdHpa > 0 else { return }
      let state = BaroStore.alertStateUnlocked()
      if let h = BaroAlert.check(BaroStore.recentSamples(), thresholdHpa: c.thresholdHpa, lastAt: state.lastAt, lastDir: state.lastDir) {
        hit = h
        BaroStore.setAlertStateUnlocked(lastAt: h.at, lastDir: h.dir)
      }
    }
    if let h = hit, let c = config {
      notify(BaroAlert.text(h, unit: c.unit, hpaPerUnit: c.hpaPerUnit, decimals: c.decimals), id: "barometer.alert.\(Int(h.at))")
    }
  }

  static func notify(_ body: String, id: String) {
    let content = UNMutableNotificationContent()
    content.title = "Pressure change"
    content.body = body
    let request = UNNotificationRequest(identifier: id, content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request, withCompletionHandler: nil)
  }

  /// "available", "denied" or "restricted": the Background App Refresh switch for this app.
  /// Main queue only (the module runs it there).
  static func refreshStatus() -> String {
    let status = MainActor.assumeIsolated { UIApplication.shared.backgroundRefreshStatus }
    switch status {
    case .available: return "available"
    case .denied: return "denied"
    case .restricted: return "restricted"
    @unknown default: return "available"
    }
  }
}

/// One reading from the pressure sensor: the median of the first few samples, or nil.
final class BaroReader: @unchecked Sendable {
  private let altimeter = CMAltimeter()
  private let queue = OperationQueue()
  private var samples: [Double] = []
  private var done = false
  private var finish: ((Double?) -> Void)? = nil
  private let lock = NSLock()

  init() {
    queue.maxConcurrentOperationCount = 1
  }

  func readOnce(timeout: TimeInterval, _ completion: @escaping (Double?) -> Void) {
    guard CMAltimeter.isRelativeAltitudeAvailable(), CMAltimeter.authorizationStatus() == .authorized else {
      completion(nil)
      return
    }
    finish = completion
    altimeter.startRelativeAltitudeUpdates(to: queue) { [weak self] data, error in
      guard let self = self else { return }
      if let data = data {
        // kPa from CoreMotion; the app keeps hPa.
        self.samples.append(data.pressure.doubleValue * 10.0)
        if self.samples.count >= 3 { self.end() }
      } else if error != nil {
        self.end()
      }
    }
    DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { [weak self] in
      self?.queue.addOperation { self?.end() }
    }
  }

  /// Everything that touches `samples` runs on the reader's one serial queue.
  func cancel() {
    queue.addOperation { [weak self] in self?.end() }
  }

  private func end() {
    lock.lock()
    if done {
      lock.unlock()
      return
    }
    done = true
    lock.unlock()
    altimeter.stopRelativeAltitudeUpdates()
    let sorted = samples.filter { $0 >= 250 && $0 <= 1100 }.sorted()
    let value: Double? = sorted.isEmpty ? nil : sorted[sorted.count / 2]
    finish?(value)
    finish = nil
  }
}
