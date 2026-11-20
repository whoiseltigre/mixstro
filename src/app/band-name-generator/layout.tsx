import { SiteChrome } from "@/components/blog/site-chrome";
import "../blog/blog.css";
import "./bng.css";

/** mixstro.com/band-name-generator wears the same site chrome as the blog. */
export default function GeneratorLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome current="tools">{children}</SiteChrome>;
}
