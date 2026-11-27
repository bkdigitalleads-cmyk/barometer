import ExpoModulesCore
import UIKit

// Registers the background tasks at launch (iOS only accepts that before
// launch finishes) and asks for the next run whenever the app goes to the
// background.
public class BaroAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    BaroBackground.register()
    BaroBackground.schedule()
    return true
  }

  public func applicationDidEnterBackground(_ application: UIApplication) {
    BaroBackground.schedule()
  }
}
