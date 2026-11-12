/** Line icons for the instrument families, drawn on a 24px grid to sit with the rest of the UI. */
const PATHS: Record<string, React.ReactNode> = {
  Guitar: (
    <>
      <path d="M13.6 10.4L20 4" />
      <path d="M18.6 2.6l2.8 2.8" />
      <path d="M9.8 8.6c1.5-.5 3.2-.1 4.3 1s1.5 2.8 1 4.3c-.4 1.1-1.4 1.6-2.2 2.3-.7.6-.8 1.6-1.4 2.4-1.6 2-5 2.1-7 .1s-1.9-5.4.1-7c.8-.6 1.8-.7 2.4-1.4.7-.8 1.2-1.8 2.8-1.7z" />
      <circle cx="9.6" cy="14.4" r="1.3" />
    </>
  ),
  // A bass clef: the one symbol every bassist reads.
  Bass: (
    <>
      <path d="M5 9.5C5 6.5 7.4 4.5 10.2 4.5c3.3 0 5.3 2.4 5.3 5.6 0 5-4.4 8.4-10.5 10.4" />
      <circle cx="6.8" cy="9.6" r="1.8" fill="currentColor" />
      <circle cx="19" cy="8" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12.6" r="1.15" fill="currentColor" stroke="none" />
    </>
  ),
  Drums: (
    <>
      <ellipse cx="12" cy="12" rx="8" ry="3" />
      <path d="M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" />
      <path d="M10 10.5L5 3.5M14 10.5l5-7" />
    </>
  ),
  Keys: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
      <path d="M7.25 6v12M12 6v12M16.75 6v12" />
      <path d="M5.75 6v6.5h3V6M10.5 6v6.5h3V6M15.25 6v6.5h3V6" fill="currentColor" stroke="none" />
    </>
  ),
  Vocals: (
    <>
      <rect x="9" y="2.5" width="6" height="11.5" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </>
  ),
  // A violin from the front: scroll, neck, waisted body, f-holes, bridge.
  Strings: (
    <>
      <path d="M12 1.8a1.3 1.3 0 0 1 1.3 1.3c0 .7-.6 1.1-1.3 1.1V8" />
      <path d="M12 8c-2.6 0-4.2 1.1-4.2 2.9 0 1.1 1 1.5 1 2.4 0 .9-1.8 1.5-1.8 3.6 0 2.8 2.3 4.3 5 4.3s5-1.5 5-4.3c0-2.1-1.8-2.7-1.8-3.6 0-.9 1-1.3 1-2.4C16.2 9.1 14.6 8 12 8z" />
      <path d="M9.9 14c.4.7.4 1.6 0 2.3M14.1 14c-.4.7-.4 1.6 0 2.3M10.6 17.8h2.8M12 8v9.8" />
    </>
  ),
  Horns: (
    <>
      <path d="M2 12h2.5" />
      <rect x="4.5" y="10.5" width="9.5" height="3" rx="1" />
      <path d="M7 10.5V7.5M9.5 10.5V7.5M12 10.5V7.5" />
      <path d="M14 10.5L21 6.5v11L14 13.5" />
    </>
  ),
  Producer: (
    <>
      <path d="M6 3.5v17M12 3.5v17M18 3.5v17" />
      <rect x="4" y="13" width="4" height="3" rx="1" fill="currentColor" />
      <rect x="10" y="6.5" width="4" height="3" rx="1" fill="currentColor" />
      <rect x="16" y="10.5" width="4" height="3" rx="1" fill="currentColor" />
    </>
  ),
  Songwriter: (
    <>
      <path d="M4 20l1-4.2L16.3 4.5a2.1 2.1 0 0 1 3 3L8 18.8z" />
      <path d="M14.5 6.3l3 3" />
      <path d="M13 20h7" />
    </>
  ),
  DJ: (
    <>
      <circle cx="10.5" cy="13" r="7.5" />
      <circle cx="10.5" cy="13" r="2" />
      <path d="M19.5 3v6.5l-4 4" />
    </>
  ),
};

export function InstrumentIcon({ family, size = 26 }: { family: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[family] ?? <circle cx="12" cy="12" r="7" />}
    </svg>
  );
}
