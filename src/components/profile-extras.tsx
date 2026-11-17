import type { Highlight } from "@/lib/highlights";
import { HIGHLIGHT_KINDS } from "@/lib/highlights";
import { openToLabels } from "@/lib/open-to";

/** "Open to: Joining a band · Session work", as soft colored chips under the name. */
export function OpenToChips({ ids, className = "" }: { ids: string[]; className?: string }) {
  const items = openToLabels(ids);
  if (!items.length) return null;
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="text-[12px] font-semibold tracking-[0.12em] uppercase text-smoke mr-1">Open to</span>
      {items.map((o) => (
        <span
          key={o.id}
          className="h-8 px-3 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5"
          style={{ background: `color-mix(in srgb, ${o.color} 16%, transparent)`, color: o.color }}
        >
          <span className="size-1.5 rounded-full" style={{ background: o.color }} aria-hidden="true" />
          {o.label}
        </span>
      ))}
    </div>
  );
}

/** Standout moments: a release, a notable show, press, an award. */
export function HighlightList({ items, title = "Highlights" }: { items: Highlight[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
      <ul className="flex flex-col rounded-[22px] bg-stage divide-y divide-paper/8">
        {items.map((h) => {
          const kind = HIGHLIGHT_KINDS.find((k) => k.id === h.kind) ?? HIGHLIGHT_KINDS[4];
          const inner = (
            <>
              <span
                className="size-10 rounded-2xl shrink-0 flex items-center justify-center"
                style={{ background: `color-mix(in srgb, ${kind.color} 18%, transparent)`, color: kind.color }}
                aria-hidden="true"
              >
                <KindIcon kind={h.kind} />
              </span>
              <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-pretty">{h.title}</span>
                <span className="text-[13px] text-smoke">{[kind.label, h.detail, h.year].filter(Boolean).join(" · ")}</span>
              </span>
              {h.url && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-smoke shrink-0" aria-hidden="true">
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              )}
            </>
          );
          return (
            <li key={h.id}>
              {h.url ? (
                <a href={h.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-paper/4">
                  {inner}
                </a>
              ) : (
                <div className="flex items-center gap-3 px-4 py-3.5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function KindIcon({ kind }: { kind: Highlight["kind"] }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (kind) {
    case "release":
      return (
        <svg {...p}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case "show":
      return (
        <svg {...p}>
          <path d="M4 20h16M6 20V9l6-5 6 5v11" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "press":
      return (
        <svg {...p}>
          <path d="M5 4h11v16H5zM16 8h3v10a2 2 0 0 1-2 2" />
          <path d="M8 8h5M8 12h5M8 16h3" />
        </svg>
      );
    case "award":
      return (
        <svg {...p}>
          <circle cx="12" cy="9" r="5" />
          <path d="m9 13-1.5 8L12 19l4.5 2L15 13" />
        </svg>
      );
    default:
      return (
        <svg {...p}>
          <path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
        </svg>
      );
  }
}
