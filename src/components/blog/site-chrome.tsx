import Link from "next/link";
import { Wordmark } from "@/components/ui";

const APP = "https://app.mixstro.com";

/** The homepage's nav and footer, shared by mixstro.com/blog and the free tools. */
export function SiteChrome({ current, children }: { current?: "blog" | "tools"; children: React.ReactNode }) {
  return (
    <div className="mxb">
      <header className="mxb-nav">
        <div className="mxb-wrap">
          <div className="mxb-bar">
            {/* Plain links: on mixstro.com "/" is the static homepage, not a Next page, so it needs a full load. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" aria-label="Mixstro home">
              <Wordmark size={21} />
            </a>
            <ul>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <li><a href="/#musicians">For musicians</a></li>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <li><a href="/#how">How it works</a></li>
              <li><Link href="/blog" aria-current={current === "blog" ? "page" : undefined}>Blog</Link></li>
            </ul>
            <span className="mxb-navr">
              <a className="mxb-signin" href={APP}>Sign in</a>
              <a className="mxb-btn paper sm" href={APP}>Join free</a>
            </span>
          </div>
        </div>
      </header>
      {children}
      <footer className="mxb-wrap">
        <div className="mxb-foot">
          <Wordmark size={21} />
          <nav>
            <Link href="/blog">Blog</Link>
            <Link href="/band-name-generator">Band name generator</Link>
            <a href={`${APP}/terms`}>Terms</a>
            <a href={`${APP}/privacy`}>Privacy</a>
          </nav>
          <span>© 2026 Mixstro</span>
        </div>
      </footer>
    </div>
  );
}
