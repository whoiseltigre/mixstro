"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps a chat scroller on its newest message: on open, when a message arrives, and while
 * photos, voice notes and cards finish loading (they grow the list after the first scroll).
 * Once you scroll up to read, it stops following until the next new message.
 */
export function useStickToBottom(scroller: RefObject<HTMLElement | null>, count: number) {
  const pinned = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const toEnd = () => {
      if (pinned.current) el.scrollTop = el.scrollHeight;
    };
    const onScroll = () => {
      pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };
    const ro = new ResizeObserver(toEnd);
    // Items may sit in display: contents wrappers, which never resize, so watch their children too.
    el.querySelectorAll(":scope > *, :scope > * > *").forEach((c) => ro.observe(c));
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("load", toEnd, true);
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("load", toEnd, true);
    };
  }, [scroller, count]);

  useEffect(() => {
    pinned.current = true;
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [scroller, count]);
}
