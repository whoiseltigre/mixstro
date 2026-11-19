import UIKit
import WebKit
import Capacitor

/// Native chrome around the web app, driven from src/lib/native.ts:
/// - A real iOS tab bar (Liquid Glass on iOS 26+). The site says which tab is active and when
///   the bar shows (`updateChrome`); taps come back as `tabSelect` / `create` events.
/// - Pull to refresh on the page (`refresh` event, the site calls `endRefresh` when done).
/// - Native action-sheet menus for long presses (`showMenu`).
@objc(MixstroNativePlugin)
public class MixstroNativePlugin: CAPPlugin, CAPBridgedPlugin, UITabBarDelegate {
    public let identifier = "MixstroNativePlugin"
    public let jsName = "MixstroNative"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "updateChrome", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endRefresh", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showMenu", returnType: CAPPluginReturnPromise),
    ]

    private struct Tab { let href: String; let title: String; let symbol: String; let selected: String }
    private let tabs: [Tab] = [
        Tab(href: "/discover", title: "Home", symbol: "house", selected: "house.fill"),
        Tab(href: "/board", title: "Board", symbol: "pin", selected: "pin.fill"),
        Tab(href: "create", title: "Create", symbol: "plus.circle.fill", selected: "plus.circle.fill"),
        Tab(href: "/messages", title: "Messages", symbol: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill"),
        Tab(href: "/me", title: "Profile", symbol: "person.crop.circle", selected: "person.crop.circle.fill"),
    ]
    private let tungsten = UIColor(red: 1, green: 178 / 255, blue: 69 / 255, alpha: 1)
    private let smoke = UIColor(red: 163 / 255, green: 156 / 255, blue: 147 / 255, alpha: 1)

    private var tabBar: UITabBar?
    private var wantsTabBar = false
    private var keyboardUp = false
    private var refresh: UIRefreshControl?
    private let selection = UISelectionFeedbackGenerator()

    public override func load() {
        DispatchQueue.main.async { self.setUp() }
    }

    private func setUp() {
        guard let vc = bridge?.viewController, let root = vc.view else { return }

        let bar = UITabBar()
        bar.translatesAutoresizingMaskIntoConstraints = false
        bar.delegate = self
        bar.tintColor = tungsten
        bar.unselectedItemTintColor = smoke
        bar.overrideUserInterfaceStyle = .dark
        bar.items = tabs.enumerated().map { index, tab in
            let item = UITabBarItem(title: tab.title, image: UIImage(systemName: tab.symbol), selectedImage: UIImage(systemName: tab.selected))
            item.tag = index
            if tab.href == "create" {
                // The bright + : always tungsten, never "selected".
                let config = UIImage.SymbolConfiguration(pointSize: 26, weight: .semibold)
                item.image = UIImage(systemName: tab.symbol, withConfiguration: config)?.withTintColor(tungsten, renderingMode: .alwaysOriginal)
                item.selectedImage = item.image
                item.accessibilityLabel = "Create"
            }
            return item
        }
        bar.isHidden = true
        root.addSubview(bar)
        NSLayoutConstraint.activate([
            bar.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            bar.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            bar.bottomAnchor.constraint(equalTo: root.bottomAnchor),
        ])
        tabBar = bar

        if let scroll = bridge?.webView?.scrollView {
            let control = UIRefreshControl()
            control.tintColor = UIColor(red: 245 / 255, green: 241 / 255, blue: 236 / 255, alpha: 0.8)
            control.addTarget(self, action: #selector(pulled), for: .valueChanged)
            scroll.refreshControl = control
            refresh = control
        }

        let center = NotificationCenter.default
        center.addObserver(self, selector: #selector(keyboardWillShow), name: UIResponder.keyboardWillShowNotification, object: nil)
        center.addObserver(self, selector: #selector(keyboardWillHide), name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    // MARK: Tab bar

    @objc func updateChrome(_ call: CAPPluginCall) {
        let visible = call.getBool("visible") ?? false
        let active = call.getString("active")
        let badge = call.getInt("badge") ?? 0
        let canRefresh = call.getBool("refresh") ?? true
        DispatchQueue.main.async {
            guard let bar = self.tabBar else { return call.resolve() }
            self.wantsTabBar = visible
            self.applyVisibility()
            if let active = active, let index = self.tabs.firstIndex(where: { $0.href == active }) {
                bar.selectedItem = bar.items?[index]
            } else {
                bar.selectedItem = nil
            }
            if let messages = self.tabs.firstIndex(where: { $0.href == "/messages" }) {
                bar.items?[messages].badgeValue = badge > 0 ? String(badge) : nil
            }
            self.bridge?.webView?.scrollView.refreshControl = canRefresh ? self.refresh : nil
            call.resolve(["height": visible ? bar.frame.height : 0])
        }
    }

    private func applyVisibility() {
        guard let bar = tabBar else { return }
        let show = wantsTabBar && !keyboardUp
        if bar.isHidden == !show { return }
        if show {
            bar.alpha = 0
            bar.isHidden = false
            UIView.animate(withDuration: 0.2) { bar.alpha = 1 }
        } else {
            bar.isHidden = true
        }
    }

    public func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
        let tab = tabs[item.tag]
        selection.selectionChanged()
        if tab.href == "create" {
            notifyListeners("create", data: [:])
            return
        }
        notifyListeners("tabSelect", data: ["href": tab.href])
    }

    @objc private func keyboardWillShow() {
        keyboardUp = true
        DispatchQueue.main.async { self.applyVisibility() }
    }

    @objc private func keyboardWillHide() {
        keyboardUp = false
        DispatchQueue.main.async { self.applyVisibility() }
    }

    // MARK: Pull to refresh

    @objc private func pulled() {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        notifyListeners("refresh", data: [:])
        // In case the page never answers.
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { self.refresh?.endRefreshing() }
    }

    @objc func endRefresh(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.refresh?.endRefreshing()
            call.resolve()
        }
    }

    // MARK: Menus

    /// { title?, actions: [{ title, destructive? }] } -> { index } (-1 when cancelled)
    @objc func showMenu(_ call: CAPPluginCall) {
        let title = call.getString("title")
        let actions = call.getArray("actions", JSObject.self) ?? []
        DispatchQueue.main.async {
            guard let vc = self.bridge?.viewController else { return call.resolve(["index": -1]) }
            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            let sheet = UIAlertController(title: title, message: nil, preferredStyle: .actionSheet)
            sheet.overrideUserInterfaceStyle = .dark
            for (index, action) in actions.enumerated() {
                let label = action["title"] as? String ?? ""
                let destructive = action["destructive"] as? Bool ?? false
                sheet.addAction(UIAlertAction(title: label, style: destructive ? .destructive : .default) { _ in
                    call.resolve(["index": index])
                })
            }
            sheet.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in call.resolve(["index": -1]) })
            sheet.view.tintColor = self.tungsten
            if let pop = sheet.popoverPresentationController {
                pop.sourceView = vc.view
                pop.sourceRect = CGRect(x: vc.view.bounds.midX, y: vc.view.bounds.midY, width: 0, height: 0)
            }
            vc.present(sheet, animated: true)
        }
    }
}
