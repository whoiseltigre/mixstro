import { SiteChrome } from "@/components/blog/site-chrome";
import "./blog.css";

/** Site chrome for mixstro.com/blog: the homepage's nav and footer. */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome current="blog">{children}</SiteChrome>;
}
