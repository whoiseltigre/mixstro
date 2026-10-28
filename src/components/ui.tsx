import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

const LOGO_POINTS =
  "4.43 12.84 4.27 12.84 12 20.57 16.89 15.68 19.28 15.68 12 22.95 2.28 13.23 1.05 12 1.9 11.15 4.94 11.15 7.57 12.9 10.05 9.6 11.86 13.72 13.82 7.28 16.97 13.59 18.98 13.59 20.57 12 12 3.43 4.68 10.75 2.29 10.75 12 1.05 22.95 12 19.68 15.28 15.93 15.28 14.2 11.82 12.15 18.57 9.67 12.92 7.96 15.19 4.43 12.84";

export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <polygon points={LOGO_POINTS} />
    </svg>
  );
}

export function Wordmark({ size = 24 }: { size?: number }) {
  return (
    <span role="img" aria-label="Mixstro" className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span aria-hidden="true" className="font-wordmark font-bold tracking-[0.16em]" style={{ fontSize: size * 0.7 }}>
        MIXSTRO
      </span>
    </span>
  );
}

type Variant = "primary" | "glass" | "gel";

const base =
  "h-14 w-full rounded-full text-[17px] flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none";
const variants: Record<Exclude<Variant, "gel">, string> = {
  primary: "bg-paper text-ink font-semibold",
  glass: "glass text-paper font-medium",
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

export function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}
