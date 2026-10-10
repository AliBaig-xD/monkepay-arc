// app/global-error.tsx
"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html>
      <body style={{ background: "#0b0e13", color: "#f5f6fe", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "monospace" }}>
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
          <p>Something went wrong.</p>
          <button onClick={reset} style={{ padding: "8px 16px", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
