"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * How a screen arrives. Going deeper (a profile, a post, a chat) slides in from the
 * right like a pushed iOS screen; switching tabs or going Back fades, so it never feels
 * like it is moving the wrong way. Used by the route templates, which remount per screen.
 */

const TABS = ["/discover", "/board", "/messages", "/me", "/search"];
const Parent = createContext<number | null>(null);

let lastPop = 0;
/** The first screen after a page load just appears (and matches the server HTML). */
let hydrated = false;
if (typeof window !== "undefined") window.addEventListener("popstate", () => (lastPop = performance.now()));

export function ScreenEnter({ children }: { children: ReactNode }) {
  const path = usePathname();
  const parentMount = useContext(Parent);
  const [mountedAt] = useState(() => (typeof performance === "undefined" ? 0 : performance.now()));
  const kind = useRef<"push" | "fade" | "none" | null>(null);
  useEffect(() => {
    hydrated = true;
  }, []);
  if (kind.current === null) {
    const now = mountedAt;
    if (!hydrated || typeof window === "undefined") kind.current = "none";
    // The outer template is already animating this same navigation.
    else if (parentMount !== null && now - parentMount < 80) kind.current = "none";
    else if (now - lastPop < 600 || TABS.includes(path)) kind.current = "fade";
    else kind.current = "push";
  }
  return (
    <Parent.Provider value={mountedAt}>
      <div className={kind.current === "push" ? "screen-push h-full" : kind.current === "fade" ? "screen-fade h-full" : "h-full"}>{children}</div>
    </Parent.Provider>
  );
}
