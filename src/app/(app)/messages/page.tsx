export const metadata = { title: "Messages · Mixstro" };

/** The list itself lives in the layout. This fills the right pane from 768px until a chat is picked. */
export default function Messages() {
  return (
    <main className="hidden md:flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <span aria-hidden="true" className="size-14 rounded-full bg-paper/6 border border-paper/10 flex items-center justify-center text-smoke">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
          <path d="M4 4.5h10.5A1.5 1.5 0 0116 6v6.5a1.5 1.5 0 01-1.5 1.5H9l-3.5 3v-3H4a1.5 1.5 0 01-1.5-1.5V6A1.5 1.5 0 014 4.5z" />
          <path d="M19 8.5h.5A1.5 1.5 0 0121 10v6.5a1.5 1.5 0 01-1.5 1.5H19v3l-3.5-3H11" />
        </svg>
      </span>
      <h2 className="text-[18px] font-semibold">Pick a conversation</h2>
      <p className="text-[14px] text-smoke max-w-[280px]">Your chats with musicians you&apos;ve connected with show up on the left.</p>
    </main>
  );
}
