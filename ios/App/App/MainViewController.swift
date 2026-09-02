import UIKit
import Capacitor

/// Capacitor's stock bridge view controller, with the system scroll-edge
/// treatment on the web view turned off.
///
/// iOS 26 gives every UIScrollView a soft "edge effect" — a progressive blur
/// applied to whatever content passes under the status-bar area. In a normal
/// native app that reads as polish; in this app it blurred the top bar and
/// anything scrolling beneath it, which is not something the web layer can
/// switch off (no CSS is involved — the app's own headers were verified
/// blur-free before this was added).
///
/// The property is set through key-value coding rather than the concrete
/// `topEdgeEffect` API on purpose: this project has to keep building against
/// SDKs older than iOS 26, where that symbol does not exist and a direct
/// reference would not compile. Reflection makes it a no-op there instead.
class MainViewController: CAPBridgeViewController {

    override func viewDidLoad() {
        super.viewDidLoad()
        disableScrollEdgeEffects()
    }

    private func disableScrollEdgeEffects() {
        guard let scrollView = webView?.scrollView else { return }

        for key in ["topEdgeEffect", "bottomEdgeEffect"] {
            guard scrollView.responds(to: NSSelectorFromString(key)),
                  let effect = scrollView.value(forKey: key) as? NSObject else { continue }
            effect.setValue(true, forKey: "hidden")
        }
    }
}
