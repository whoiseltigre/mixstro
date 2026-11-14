"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

/**
 * A bottom sheet that behaves like a native one: it rises in, you can drag it down to
 * dismiss (and grab it mid-animation), tapping outside or Escape closes it, and the
 * phone's Back gesture closes the sheet instead of leaving the page. From 768px it is
 * a centered card that fades in.
 *
 * Render it while it should be open; it calls `onClose` once it has animated away.
 * Anything inside can close it with the same animation through `useSheetClose()`.
 */

const CloseContext = createContext<() => void>(() => {});

/** Close the sheet you're inside, with its exit animation (and its history entry). */
export function useSheetClose() {
  return useContext(CloseContext);
}

type Props = {
  onClose: () => void;
  children: ReactNode;
  /** The panel's own look: background, radius, padding, width. */
  className?: string;
  /** The dimmed backdrop's color and blur. */
  scrimClassName?: string;
  /** id of the heading that names the sheet, or a plain label. */
  labelledBy?: string;
  label?: string;
  /** Stacking order of the whole sheet. */
  z?: string;
  /** Desktop: centered card (default) or stay at the bottom. */
  center?: boolean;
  /** The small grab bar on phones. */
  handle?: boolean;
  style?: React.CSSProperties;
};

const DISMISS_FRACTION = 0.28;
const FLICK_SPEED = 0.55; // px per ms

export function Sheet({ onClose, children, className, scrimClassName = "bg-ink/65", labelledBy, label, z = "z-50", center = true, handle = true, style }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const closing = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const key = useRef(`${Date.now()}-${Math.random()}`).current;
  const pushed = useRef(false);

  // Rise in on the next frame so the transition runs from the closed position.
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    return () => cancelAnimationFrame(id);
  }, []);

  /** Animate away, then tell the parent. `fromHistory`: Back already removed our entry. */
  const finish = useCallback(
    (fromHistory = false) => {
      if (closing.current) return;
      closing.current = true;
      if (!fromHistory && pushed.current && window.history.state?.__sheet === key) {
        pushed.current = false;
        window.history.back();
      }
      pushed.current = false;
      const el = panel.current;
      if (el) {
        el.style.transition = "";
        el.style.transform = "";
      }
      if (scrim.current) scrim.current.style.opacity = "";
      setOpen(false);
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        onCloseRef.current();
      };
      el?.addEventListener("transitionend", (e) => e.target === el && e.propertyName === "transform" && end());
      setTimeout(end, 480);
    },
    [key],
  );

  const close = useCallback(() => finish(false), [finish]);

  // A history entry for the sheet, so Back (and Android's predictive back) closes it.
  useEffect(() => {
    const t = setTimeout(() => {
      window.history.pushState({ ...window.history.state, __sheet: key }, "");
      pushed.current = true;
    }, 0);
    const onPop = () => {
      if (pushed.current && window.history.state?.__sheet !== key) {
        pushed.current = false;
        finish(true);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => {
      clearTimeout(t);
      window.removeEventListener("popstate", onPop);
      // Closed from outside (the parent stopped rendering us, often because a link is
      // navigating away): unmark our entry rather than going back, which could race
      // the navigation and undo it.
      if (pushed.current && window.history.state?.__sheet === key) {
        const { __sheet: _drop, ...rest } = window.history.state;
        void _drop;
        window.history.replaceState(rest, "");
      }
      pushed.current = false;
    };
  }, [key, finish]);

  // Escape, scroll lock, and focus in and back out.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = overflow;
      before?.focus?.({ preventScroll: true });
    };
  }, [close]);

  // Drag down to dismiss. Touch only: on desktop it's a card.
  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    let startY = 0;
    let startX = 0;
    let base = 0;
    let dy = 0;
    let lastY = 0;
    let lastT = 0;
    let speed = 0;
    let mode: "idle" | "maybe" | "drag" | "scroll" = "idle";

    const scrollerAt = (target: EventTarget | null) => {
      let n = target as HTMLElement | null;
      while (n && n !== el.parentElement) {
        if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(n).overflowY)) return n;
        n = n.parentElement;
      }
      return null;
    };

    const onStart = (e: TouchEvent) => {
      if (closing.current || e.touches.length > 1) return;
      const scroller = scrollerAt(e.target);
      if (scroller && scroller.scrollTop > 0) {
        mode = "scroll";
        return;
      }
      const t = e.touches[0];
      startY = lastY = t.clientY;
      startX = t.clientX;
      lastT = e.timeStamp;
      speed = 0;
      // Grabbed mid-animation: carry on from wherever the panel is right now.
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      base = Math.max(0, m.m42);
      if (base > 0) {
        el.style.transition = "none";
        el.style.transform = `translateY(${base}px)`;
        mode = "drag";
      } else mode = "maybe";
    };

    const onMove = (e: TouchEvent) => {
      if (mode === "idle" || mode === "scroll") return;
      const t = e.touches[0];
      const moved = t.clientY - startY;
      if (mode === "maybe") {
        if (Math.abs(t.clientX - startX) > Math.abs(moved) && Math.abs(t.clientX - startX) > 6) return void (mode = "scroll");
        if (moved < -4) return void (mode = "scroll");
        if (moved < 6) return;
        mode = "drag";
        el.style.transition = "none";
      }
      e.preventDefault();
      dy = Math.max(0, base + moved);
      const dt = e.timeStamp - lastT;
      if (dt > 0) speed = (t.clientY - lastY) / dt;
      lastY = t.clientY;
      lastT = e.timeStamp;
      el.style.transform = `translateY(${dy}px)`;
      if (scrim.current) scrim.current.style.opacity = String(Math.max(0, 1 - dy / el.offsetHeight));
    };

    const onEnd = () => {
      if (mode !== "drag") return void (mode = "idle");
      mode = "idle";
      if (dy > el.offsetHeight * DISMISS_FRACTION || speed > FLICK_SPEED) {
        close();
      } else {
        el.style.transition = "";
        el.style.transform = "";
        if (scrim.current) scrim.current.style.opacity = "";
      }
      dy = 0;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [close]);

  return (
    <CloseContext.Provider value={close}>
      <div className={cx("fixed inset-0 flex items-end justify-center", center && "md:items-center", z)} role="dialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : label}>
        <div ref={scrim} data-open={open} aria-hidden="true" onClick={close} className={cx("sheet-backdrop absolute inset-0", scrimClassName)} />
        <div ref={panel} tabIndex={-1} data-open={open} style={style} className={cx("sheet-panel relative w-full outline-none overscroll-contain", center && "sheet-center", className)}>
          {handle && <span aria-hidden="true" className={cx("absolute left-1/2 top-[7px] -translate-x-1/2 h-[5px] w-9 rounded-full bg-paper/25 z-10", center && "md:hidden")} />}
          {children}
        </div>
      </div>
    </CloseContext.Provider>
  );
}

/** Inline access to the sheet's animated close, for markup written in the parent. */
export function SheetCloser({ children }: { children: (close: () => void) => ReactNode }) {
  return <>{children(useSheetClose())}</>;
}
