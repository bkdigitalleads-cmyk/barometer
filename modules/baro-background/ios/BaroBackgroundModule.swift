import CoreMotion
import ExpoModulesCore

// The app's side of the background readings (src/background.ts):
//   takePending()                  -> [[t, hPa]]  readings taken in the background, handed over once
//   pushRecent(list)                              the app's last hours of readings, for the background alert check
//   configureAlert(on, hPa, unit, unitHpa, decimals)
//   alertState()                   -> { lastAt, lastDir }
//   setAlertState(lastAt, lastDir)
//   schedule()                                     ask iOS for the next background run
//   refreshStatus()                -> Promise<"available" | "denied" | "restricted">
//   lastRun()                      -> ms of the last background reading, or null
//   recordNow()                    -> Bool        test menu: one reading through the background path
//   isTestBuild()                  -> Bool        TestFlight or development (a sandbox receipt)
public class BaroBackgroundModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BaroBackground")

    Function("takePending") { () -> [[Double]] in
      return BaroStore.takePending()
    }

    Function("pushRecent") { (list: [[Double]]) in
      BaroStore.pushRecent(list, now: Date().timeIntervalSince1970 * 1000)
    }

    Function("configureAlert") { (on: Bool, thresholdHpa: Double, unit: String, hpaPerUnit: Double, decimals: Int) in
      BaroStore.setAlertConfig(BaroStore.AlertConfig(on: on, thresholdHpa: thresholdHpa, unit: unit, hpaPerUnit: hpaPerUnit, decimals: decimals))
    }

    Function("alertState") { () -> [String: Any] in
      let s = BaroStore.alertState()
      let lastAt: Any = s.lastAt.map { $0 as Any } ?? NSNull()
      let lastDir: Any = s.lastDir.map { $0 as Any } ?? NSNull()
      return ["lastAt": lastAt, "lastDir": lastDir]
    }

    Function("setAlertState") { (lastAt: Double?, lastDir: String?) in
      BaroStore.setAlertState(lastAt: lastAt, lastDir: lastDir)
    }

    Function("schedule") { () -> Void in
      BaroBackground.schedule()
    }

    // UIKit: read on the main queue.
    AsyncFunction("refreshStatus") { () -> String in
      return BaroBackground.refreshStatus()
    }.runOnQueue(.main)

    Function("lastRun") { () -> Double? in
      return BaroStore.lastRun()
    }

    AsyncFunction("recordNow") { (promise: Promise) in
      let reader = BaroReader()
      reader.readOnce(timeout: 10) { hpa in
        // `reader` is held by this closure until the reading is in.
        _ = reader
        if let hpa = hpa {
          BaroBackground.record(hpa: hpa, at: Date().timeIntervalSince1970 * 1000)
          promise.resolve(true)
        } else {
          promise.resolve(false)
        }
      }
    }

    Function("isTestBuild") { () -> Bool in
      return Bundle.main.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
    }
  }
}
