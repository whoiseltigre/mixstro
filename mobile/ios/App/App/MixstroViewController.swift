import UIKit
import Capacitor

/// The app's root screen: Capacitor's web view plus the native parts that make Mixstro feel
/// like an iPhone app (tab bar, swipe back, pull to refresh, menus). See MixstroNativePlugin.
class MixstroViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MixstroNativePlugin())
        // Swipe from the left edge to go back, like every iPhone app.
        webView?.allowsBackForwardNavigationGestures = true
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        // Capacitor turns the page's bounce off; pull to refresh (MixstroNativePlugin) needs it.
        webView?.scrollView.bounces = true
        webView?.scrollView.alwaysBounceVertical = true
        view.backgroundColor = UIColor(red: 15 / 255, green: 13 / 255, blue: 11 / 255, alpha: 1)
    }
}
