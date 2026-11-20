"use client";

/**
 * One haptic vocabulary, paired with the motion tokens (DESIGN.md, "Motion + haptics").
 *
 *   tap      light impact: a button or card was pressed and something will happen
 *   select   selection tick: a chip, tab, segment or toggle changed
 *   success  notification: a Connect landed, a post went up, a song was added
 *   warning  notification: something was blocked or needs another look
 *   heavy    medium impact: a sheet snapped shut, a drag passed its point of no return
 *
 * In the iPhone app this is the native Taptic Engine (Capacitor's Haptics plugin, reached
 * through window.Capacitor so the website needs no package). On Android browsers it's a short
 * vibration. iPhone Safari has no vibration API, but toggling a hidden switch control
 * plays the system tick, so `select` and `tap` still answer there.
 */

export type Haptic = "tap" | "select" | "success" | "warning" | "heavy";

type HapticsPlugin = {
  impact?: (o: { style: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void>;
  notification?: (o: { type: "SUCCESS" | "WARNING" | "ERROR" }) => Promise<void>;
  selectionChanged?: () => Promise<void>;
  selectionStart?: () => Promise<void>;
};

function nativeHaptics(): HapticsPlugin | null {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, unknown> } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return (cap.Plugins?.Haptics as HapticsPlugin | undefined) ?? null;
}

const PATTERN: Record<Haptic, number | number[]> = {
  tap: 8,
  select: 5,
  success: [10, 60, 18],
  warning: [18, 80, 18],
  heavy: 16,
};

let lastAt = 0;
let iosSwitch: HTMLLabelElement | null = null;

/** iPhone Safari 18+: a switch control ticks when toggled, even when hidden. */
function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

const isIOSWeb = () => typeof navigator !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent) && !("vibrate" in navigator);

export function haptic(kind: Haptic = "tap") {
  if (typeof window === "undefined") return;
  // Two in the same instant feel like a buzz, not a tap.
  const now = performance.now();
  if (now - lastAt < 40) return;
  lastAt = now;

  const native = nativeHaptics();
  if (native) {
    const p =
      kind === "select"
        ? native.selectionChanged?.()
        : kind === "success"
          ? native.notification?.({ type: "SUCCESS" })
          : kind === "warning"
            ? native.notification?.({ type: "WARNING" })
            : native.impact?.({ style: kind === "heavy" ? "MEDIUM" : "LIGHT" });
    p?.catch(() => {});
    return;
  }
  if (typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(PATTERN[kind]);
    } catch {
      // Blocked before the first tap, or turned off: silence is fine.
    }
    return;
  }
  if (isIOSWeb()) iosTick();
}
