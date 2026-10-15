import { Link, useLocation } from "react-router";
import { SITE } from "@aihot/site";
import { Wordmark } from "@aihot/site/brand/Logo.tsx";
import { THEMES, switchThemePath, useActiveTheme } from "../../lib/theme";

export function ThemeMenu() {
  const active = useActiveTheme();
  const location = useLocation();
  const suffix = `${location.search}${location.hash}`;
  return (
    <details className="group relative" data-theme-switcher="">
      <summary className="mb-4 flex h-[50px] cursor-pointer list-none items-center justify-between px-1 text-ink [&::-webkit-details-marker]:hidden">
        <span aria-label={`${SITE.name} 主题切换`}>
          <Wordmark size={26} />
        </span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-ink-4">{active.name}</span>
      </summary>
      <div className="absolute left-0 top-[54px] z-20 min-w-[168px] rounded-card border border-line bg-surface p-1.5 shadow-[var(--shadow-card)]">
        {THEMES.map((theme) => {
          const to = `${switchThemePath(location.pathname, theme.id)}${suffix}`;
          const current = theme.id === active.id;
          return (
            <Link
              key={theme.id}
              to={to}
              prefetch="intent"
              aria-current={current ? "page" : undefined}
              className={`flex items-center justify-between rounded-tile px-3 py-2 text-[13px] transition-colors ${
                current ? "bg-accent/10 font-semibold text-accent" : "text-ink-2 hover:bg-bg-sunk"
              }`}
            >
              <span>{theme.name}</span>
              {current && <span className="text-[11px]">当前</span>}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
