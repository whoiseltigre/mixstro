/**
 * Placeholder shapes shown the moment you tap, while the server fetches the real page.
 * Next.js prefetches these with each link, so a tap swaps to one with no wait.
 */
import { cx } from "./ui";

export function Bone({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block rounded-full bg-paper/8 skeleton-shimmer", className)} />;
}

/** Generic page: a title and a few rows. */
export function PageSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading" className="pt-safe md:pt-6 px-5 md:px-0 pb-32 flex flex-col gap-6">
      <div className="mt-6 md:mt-0 flex flex-col gap-2.5">
        <Bone className="h-3.5 w-28" />
        <Bone className="h-9 w-48 rounded-[12px]" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Bone className="size-12 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <Bone className="h-4 w-2/5" />
            <Bone className="h-3.5 w-3/4" />
          </div>
        </div>
      ))}
    </main>
  );
}

/** Today: one big photo card with the name and buttons at the bottom. */
export function TodaySkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading Today" className="relative h-dvh md:h-auto md:min-h-[calc(100dvh-88px)] overflow-hidden md:pt-6">
      <div className="absolute md:relative inset-x-0 top-0 h-[71%] md:h-[420px] md:max-w-[560px] md:rounded-[28px] bg-stage skeleton-shimmer" />
      <div className="absolute md:relative inset-x-0 bottom-0 md:mt-6 pb-[calc(max(env(safe-area-inset-bottom),16px)+96px)] md:pb-16 px-5 md:px-0 flex flex-col gap-3 md:max-w-[560px]">
        <Bone className="h-3.5 w-32" />
        <Bone className="h-12 w-56 rounded-[14px]" />
        <Bone className="h-4 w-4/5" />
        <div className="flex gap-3 pt-4">
          <Bone className="size-[54px] shrink-0" />
          <Bone className="h-[51px] flex-1" />
        </div>
      </div>
    </main>
  );
}

/** The Board: title, then shelves of cards. */
export function BoardSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading the Board" className="pt-safe md:pt-6 pb-32 md:pb-16 flex flex-col gap-7 md:gap-9 overflow-hidden">
      <div className="mt-3 md:mt-0 px-5 md:px-0 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Bone className="h-3.5 w-36" />
          <Bone className="h-9 w-44 rounded-[12px]" />
        </div>
        <Bone className="h-9 md:h-11 w-20" />
      </div>
      {[0, 1].map((s) => (
        <section key={s} className="flex flex-col gap-3">
          <Bone className="mx-5 md:mx-0 h-5 w-52" />
          <div className="flex gap-3 md:gap-3.5 px-5 md:px-0">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="shrink-0 w-[250px] md:w-[300px] rounded-[22px] overflow-hidden bg-stage">
                <div className="h-[140px] md:h-[160px] bg-paper/5 skeleton-shimmer" />
                <div className="p-4 flex flex-col gap-2">
                  <Bone className="h-4 w-4/5" />
                  <Bone className="h-3.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

/** A profile: photo, name, a few facts. */
export function ProfileSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading profile" className="pb-32 flex flex-col gap-5 md:max-w-[720px] md:pt-6">
      <div className="h-[46dvh] md:h-[360px] md:rounded-[28px] bg-stage skeleton-shimmer" />
      <div className="px-5 md:px-0 flex flex-col gap-3">
        <Bone className="h-10 w-48 rounded-[12px]" />
        <Bone className="h-4 w-64" />
        <div className="grid grid-cols-2 gap-2.5 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-16 rounded-[16px]" />
          ))}
        </div>
      </div>
    </main>
  );
}

/** A conversation: header and a few bubbles. */
export function ChatSkeleton() {
  return (
    <main aria-busy="true" aria-label="Loading conversation" className="relative h-dvh md:h-full flex flex-col">
      <div className="pt-safe px-4 h-[72px] md:h-16 flex items-center gap-3 border-b border-paper/8">
        <Bone className="size-10 shrink-0" />
        <Bone className="h-4 w-32" />
      </div>
      <div className="flex-1 px-4 py-6 flex flex-col justify-end gap-3">
        <Bone className="h-10 w-3/5 rounded-[20px]" />
        <Bone className="h-10 w-2/5 rounded-[20px] self-end" />
        <Bone className="h-14 w-1/2 rounded-[20px]" />
        <Bone className="h-10 w-1/3 rounded-[20px] self-end" />
      </div>
      <div className="px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        <Bone className="h-12 w-full" />
      </div>
    </main>
  );
}
