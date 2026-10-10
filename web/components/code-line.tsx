import { Token } from "@/lib/types";

export function CodeLine({ tokens }: { tokens: Token[] }) {
  return (
    <div className="min-h-[1.6em] whitespace-pre">
      {tokens.length === 0 ? (
        <span>&nbsp;</span>
      ) : (
        tokens.map((tk, i) => (
          <span key={i} style={{ color: tk.c }}>
            {tk.t}
          </span>
        ))
      )}
    </div>
  );
}
