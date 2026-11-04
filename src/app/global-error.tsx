"use client";

// Last-resort error page, used when the root layout itself fails. It can't rely on the
// layout's fonts or CSS, so it carries its own minimal styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          textAlign: "center",
          color: "#F5F1EC",
          fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif',
          background: "radial-gradient(60% 45% at 50% 100%, rgba(255,178,69,.28), transparent 70%), #0F0D0B",
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 96, fontWeight: 700, letterSpacing: "-0.06em", color: "#FFB245" }}>Oops</p>
          <h1 style={{ margin: "16px 0 0", fontSize: 34, fontWeight: 600, letterSpacing: "-0.03em" }}>
            Something went out of tune.
          </h1>
          <p style={{ margin: "12px auto 0", maxWidth: "36ch", color: "#A8A49E", fontSize: 17, lineHeight: 1.5 }}>
            That one&apos;s on us. Try again, and if it keeps happening, reload the page in a minute.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 32,
              height: 56,
              padding: "0 28px",
              borderRadius: 999,
              border: 0,
              background: "#F5F1EC",
              color: "#0F0D0B",
              fontSize: 17,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
