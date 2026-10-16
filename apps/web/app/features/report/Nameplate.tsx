// The report masthead. The theme's display name is the accent, then 日报 / 周报 / 月报.
// A name ending in Latin or a digit keeps a space (AI 日报, Web3 周报); a Chinese name does not (宏观日报).
const NOUN = { daily: "日报", weekly: "周报", monthly: "月报" } as const;

export function Nameplate({ which, subject = "", className = "" }: {
  which: keyof typeof NOUN | "archive";
  subject?: string;
  className?: string;
}) {
  const noun = which === "archive" ? "合订本" : NOUN[which];
  const lead = which === "archive" ? "日报" : subject;
  const gap = which !== "archive" && /[A-Za-z0-9]$/.test(subject);
  return (
    <span className={`inline-flex items-baseline font-black leading-none tracking-[-0.04em] ${className}`} aria-hidden="true">
      <span className={which === "archive" ? "text-ink" : "text-accent"}>{lead}</span>
      <span className={which === "archive" ? "text-accent" : "text-ink"}>{gap ? " " : ""}{noun}</span>
    </span>
  );
}
