import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const LOGO_POINTS =
  "4.43 12.84 4.27 12.84 12 20.57 16.89 15.68 19.28 15.68 12 22.95 2.28 13.23 1.05 12 1.9 11.15 4.94 11.15 7.57 12.9 10.05 9.6 11.86 13.72 13.82 7.28 16.97 13.59 18.98 13.59 20.57 12 12 3.43 4.68 10.75 2.29 10.75 12 1.05 22.95 12 19.68 15.28 15.93 15.28 14.2 11.82 12.15 18.57 9.67 12.92 7.96 15.19 4.43 12.84";

export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.25" strokeLinejoin="round" aria-hidden="true" className={className}>
      <polygon points={LOGO_POINTS} />
    </svg>
  );
}

/** Final lockup: diamond mark + lowercase "mixstro" in Outfit 550. `size` is the font size. */
export function Wordmark({ size = 24 }: { size?: number }) {
  const icon = Math.round(size * 0.95);
  return (
    <span role="img" aria-label="Mixstro" className="inline-flex items-center" style={{ gap: icon * 0.24 }}>
      <LogoMark size={icon} />
      <span
        aria-hidden="true"
        className="font-wordmark leading-none"
        style={{ fontSize: size, fontWeight: 550, letterSpacing: "-0.025em", transform: "translateY(-0.1em)" }}
      >
        mixstro
      </span>
    </span>
  );
}

type Variant = "primary" | "glass" | "danger" | "gel";

const base =
  "h-14 w-full rounded-full text-[17px] flex items-center justify-center gap-2 cursor-pointer transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgb(0_0_0/0.35)] active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper motion-reduce:transform-none disabled:opacity-40 disabled:pointer-events-none";
const variants: Record<Exclude<Variant, "gel">, string> = {
  primary: "bg-paper text-ink font-semibold hover:bg-white",
  glass: "glass text-paper font-medium hover:bg-paper/10",
  danger: "bg-[#FF453A] text-paper font-semibold hover:bg-[#ff6159]",
};

/** Primary actions. "gel" adds the Gel rim, reserved for Connect-type peak moments. */
export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  if (variant === "gel") {
    return (
      <div className="gel-rim rounded-full w-full">
        <button {...props} className={cx(base, variants.primary, "h-[53px]", className)}>
          {children}
        </button>
      </div>
    );
  }
  return (
    <button {...props} className={cx(base, variants[variant], className)}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Exclude<Variant, "gel"> }) {
  return (
    <Link {...props} className={cx(base, variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Chip({
  selected,
  children,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={cx(
        "h-11 px-4 rounded-full text-[15px] inline-flex items-center gap-1.5 border transition active:scale-[0.97]",
        selected ? "bg-paper text-ink border-paper font-semibold" : "border-paper/16 text-paper",
        className,
      )}
    >
      {selected && <CheckIcon size={14} />}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  id,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string; id: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[13px] font-semibold text-smoke">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={cx(
          "h-[52px] rounded-2xl bg-stage border border-paper/12 px-4 text-[17px] text-paper placeholder:text-smoke/60 outline-none focus:border-paper/50",
          className,
        )}
      />
      {hint && <p className="text-[12px] text-smoke">{hint}</p>}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="text-[13px] font-semibold text-smoke">{children}</h2>;
}

export function BackButton({ href, onClick }: { href?: string; onClick?: () => void }) {
  const icon = <ChevronLeft />;
  const cls = "glass size-10 rounded-full flex items-center justify-center shrink-0";
  return href ? (
    <Link href={href} aria-label="Back" className={cls}>
      {icon}
    </Link>
  ) : (
    <button type="button" aria-label="Back" onClick={onClick} className={cls}>
      {icon}
    </button>
  );
}

export function ChevronLeft({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function ChevronRight({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12l5 5 9-10" />
    </svg>
  );
}

export function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8s-1.8-.8-3-.8C7 7.2 5.5 8.1 4.7 9.6c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4s1.6-.8 3-.8 1.8.8 3 .8 2-1.1 2.8-2.3c.9-1.3 1.2-2.5 1.3-2.6-.1 0-2.5-.9-2.5-4zM14.2 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z" />
    </svg>
  );
}

/** Google's standard four-colour "G", unmodified per their branding guidelines. */
export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/** The verified check (#10). Shown next to a name once the profile is tied to a Google account. */
export function VerifiedMark({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Verified" className={cx("shrink-0", className)}>
      <path
        fill="currentColor"
        d="M12 1.5l2.4 1.9 3-.3 1 2.9 2.7 1.5-.6 3 1.5 2.6-2.2 2.1-.2 3-3 .6L15 21.6l-3-1-3 1-1.6-2.8-3-.6-.2-3-2.2-2.1 1.5-2.6-.6-3L5.6 6l1-2.9 3 .3z"
      />
      <path d="M8 12.3l2.6 2.6L16.2 9.3" fill="none" stroke="var(--color-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Google's own "Continue with Google" button (dark theme): #131314 fill, #8E918F stroke,
 * #E3E3E3 Roboto Medium label, the full-colour G on the left. Pill shape is one of their approved shapes.
 */
export function GoogleButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        base,
        "bg-[#131314] border border-[#8E918F] text-[#E3E3E3] text-[16px] font-medium gap-3 hover:bg-[#1f1f20] hover:border-[#E3E3E3]",
        className,
      )}
      style={{ fontFamily: "var(--font-roboto), Roboto, Arial, sans-serif" }}
    >
      <GoogleIcon size={20} /> Continue with Google
    </button>
  );
}
