import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChevronDown, MoreHorizontal, Moon, Search, Sun } from "lucide-react";
import type { DesignSettings } from "@/hooks/use-design-settings";
import type { DocVersion } from "@/hooks/use-versions";
import { usePlatformTheme } from "@/hooks/use-platform-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface HeaderTab {
  id: string;
  label: string;
  order_index: number;
  metadata?: Record<string, any>;
}

export interface HeaderSwitcherOption {
  id: string;
  label: string;
}

export interface DocsPreviewHeaderProps {
  settings: DesignSettings;
  projectName: string;
  projectLogo?: string | null;
  onLogoClick?: () => void;

  tabs?: HeaderTab[];
  activeTabId?: string | null;
  onSelectTab?: (id: string | null) => void;

  versions?: DocVersion[];
  activeVersion?: DocVersion | null;
  onSelectVersion?: (v: DocVersion) => void;

  languages?: HeaderSwitcherOption[];
  activeLanguageId?: string | null;
  onSelectLanguage?: (id: string) => void;

  products?: HeaderSwitcherOption[];
  activeProductId?: string | null;
  onSelectProduct?: (id: string) => void;

  onSearchOpen: () => void;
  showThemeToggle?: boolean;
  rightActions?: ReactNode;
  mobileNav?: ReactNode;

  frameMaxWidth?: number;
  stickyTop?: number;
  height?: number;
}

const DEFAULT_HEIGHT = 56;

const DocsPreviewHeader = ({
  settings,
  projectName,
  projectLogo,
  onLogoClick,
  tabs,
  activeTabId,
  onSelectTab,
  versions,
  activeVersion,
  onSelectVersion,
  languages,
  activeLanguageId,
  onSelectLanguage,
  products,
  activeProductId,
  onSelectProduct,
  onSearchOpen,
  showThemeToggle = false,
  rightActions,
  mobileNav,
  frameMaxWidth,
  stickyTop = 0,
  height = DEFAULT_HEIGHT,
}: DocsPreviewHeaderProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { theme, toggle } = usePlatformTheme();
  const [themeAnnounce, setThemeAnnounce] = useState<string>("");
  const handleToggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    toggle();
    setThemeAnnounce(`Switched to ${next} theme`);
  };

  const visibleTabs = (tabs ?? [])
    .filter((t) => !t.metadata?.hidden)
    .sort((a, b) => a.order_index - b.order_index);

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (
      e.key !== "ArrowLeft" &&
      e.key !== "ArrowRight" &&
      e.key !== "Home" &&
      e.key !== "End"
    )
      return;
    e.preventDefault();
    const total = visibleTabs.length;
    if (total === 0) return;
    let next = idx;
    if (e.key === "ArrowLeft") next = (idx - 1 + total) % total;
    else if (e.key === "ArrowRight") next = (idx + 1) % total;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = total - 1;
    tabRefs.current[next]?.focus();
  };

  const showVersions =
    (versions?.length ?? 0) > 1 && !!activeVersion && !!onSelectVersion;
  const showLanguages = (languages?.length ?? 0) > 1;
  const showProducts = (products?.length ?? 0) > 1;
  const hasSwitchers = showVersions || showLanguages || showProducts;

  const ringStyle: CSSProperties = {
    ["--tw-ring-color" as any]: `hsl(${settings.primaryColor})`,
    ["--tw-ring-offset-color" as any]: `hsl(${settings.backgroundColor})`,
  };

  const headerStyle: CSSProperties = {
    top: stickyTop,
    height,
    backgroundColor: `hsl(${settings.backgroundColor})`,
    borderBottom: `1px solid ${
      scrolled ? `hsl(${settings.borderColor})` : "transparent"
    }`,
    transition: "border-color 200ms ease",
  };

  return (
    <header
      className="sticky z-50"
      style={headerStyle}
      data-preserve-motion
    >
      <div className="h-full px-6 lg:px-8 flex items-center gap-4">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          {mobileNav && <div className="lg:hidden">{mobileNav}</div>}
          <button
            type="button"
            onClick={onLogoClick}
            disabled={!onLogoClick}
            className="inline-flex items-center gap-2 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-default"
            style={ringStyle}
            aria-label={`${projectName} home`}
          >
            {projectLogo ? (
              <img
                src={projectLogo}
                alt=""
                className="h-6 w-auto max-w-[120px] object-contain"
              />
            ) : null}
            <span
              className="font-semibold tracking-tight truncate"
              style={{
                fontSize: "16px",
                color: `hsl(${settings.foregroundColor})`,
                fontFamily: `'${settings.bodyFont}', sans-serif`,
              }}
            >
              {projectName}
            </span>
          </button>
        </div>

        {visibleTabs.length > 0 && (
          <div
            className="hidden md:flex items-center h-full"
            role="tablist"
            aria-label="Documentation sections"
          >
            {visibleTabs.map((tab, idx) => {
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onKeyDown={(e) => onTabKey(e, idx)}
                  onClick={() => onSelectTab?.(isActive ? null : tab.id)}
                  className="relative h-full inline-flex items-center px-3.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:bg-accent/40 focus-visible:ring-2 focus-visible:ring-inset"
                  style={{
                    color: isActive
                      ? `hsl(${settings.foregroundColor})`
                      : `hsl(${settings.mutedForegroundColor})`,
                    fontWeight: isActive ? 500 : 400,
                    fontFamily: `'${settings.bodyFont}', sans-serif`,
                  }}
                >
                  {tab.label}
                  <span
                    aria-hidden
                    className="absolute left-3 right-3 bottom-[-1px] h-[2px] rounded-full transition-opacity duration-200"
                    style={{
                      backgroundColor: `hsl(${settings.primaryColor})`,
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex-1 min-w-0" />

        <button
          type="button"
          onClick={onSearchOpen}
          aria-label="Search documentation"
          className="hidden sm:flex items-center gap-2 h-9 pl-3 pr-2 rounded-lg border transition-colors hover:bg-accent w-[220px] md:w-[240px] lg:w-[280px] focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: `hsl(${settings.borderColor})`,
            color: `hsl(${settings.mutedForegroundColor})`,
            backgroundColor: `hsl(${settings.mutedColor} / 0.4)`,
            fontSize: "13px",
            fontFamily: `'${settings.bodyFont}', sans-serif`,
            ...ringStyle,
          }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left truncate">
            Search documentation...
          </span>
          <kbd
            className="inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              borderColor: `hsl(${settings.borderColor})`,
              color: `hsl(${settings.mutedForegroundColor})`,
            }}
          >
            ⌘K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onSearchOpen}
          aria-label="Search documentation"
          className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: `hsl(${settings.borderColor})`,
            color: `hsl(${settings.mutedForegroundColor})`,
            ...ringStyle,
          }}
        >
          <Search className="h-4 w-4" />
        </button>

        {hasSwitchers && (
          <>
            <div className="hidden md:flex items-center gap-1">
              {showVersions && (
                <SwitcherButton
                  settings={settings}
                  ringStyle={ringStyle}
                  label={activeVersion!.version_label || "Version"}
                  ariaLabel="Select version"
                  items={versions!.map((v) => ({
                    id: v.id,
                    label:
                      v.version_label + (v.is_default ? " (default)" : ""),
                    active: v.id === activeVersion!.id,
                    onSelect: () => onSelectVersion!(v),
                  }))}
                />
              )}
              {showLanguages && (
                <SwitcherButton
                  settings={settings}
                  ringStyle={ringStyle}
                  label={
                    languages!.find((l) => l.id === activeLanguageId)?.label ||
                    languages![0].label
                  }
                  ariaLabel="Select language"
                  items={languages!.map((l) => ({
                    id: l.id,
                    label: l.label,
                    active: l.id === activeLanguageId,
                    onSelect: () => onSelectLanguage?.(l.id),
                  }))}
                />
              )}
              {showProducts && (
                <SwitcherButton
                  settings={settings}
                  ringStyle={ringStyle}
                  label={
                    products!.find((p) => p.id === activeProductId)?.label ||
                    products![0].label
                  }
                  ariaLabel="Select product"
                  items={products!.map((p) => ({
                    id: p.id,
                    label: p.label,
                    active: p.id === activeProductId,
                    onSelect: () => onSelectProduct?.(p.id),
                  }))}
                />
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="More options"
                  className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    borderColor: `hsl(${settings.borderColor})`,
                    color: `hsl(${settings.mutedForegroundColor})`,
                    ...ringStyle,
                  }}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {showVersions && (
                  <>
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Version
                    </DropdownMenuLabel>
                    {versions!.map((v) => (
                      <DropdownMenuItem
                        key={`v-${v.id}`}
                        onClick={() => onSelectVersion!(v)}
                        className={`text-xs ${
                          v.id === activeVersion!.id ? "font-semibold" : ""
                        }`}
                      >
                        {v.version_label}
                        {v.is_default && (
                          <span className="ml-2 text-[10px] text-muted-foreground">
                            (default)
                          </span>
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                {showVersions && (showLanguages || showProducts) && (
                  <DropdownMenuSeparator />
                )}
                {showLanguages && (
                  <>
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Language
                    </DropdownMenuLabel>
                    {languages!.map((l) => (
                      <DropdownMenuItem
                        key={`l-${l.id}`}
                        onClick={() => onSelectLanguage?.(l.id)}
                        className={`text-xs ${
                          l.id === activeLanguageId ? "font-semibold" : ""
                        }`}
                      >
                        {l.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
                {showLanguages && showProducts && <DropdownMenuSeparator />}
                {showProducts && (
                  <>
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Product
                    </DropdownMenuLabel>
                    {products!.map((p) => (
                      <DropdownMenuItem
                        key={`p-${p.id}`}
                        onClick={() => onSelectProduct?.(p.id)}
                        className={`text-xs ${
                          p.id === activeProductId ? "font-semibold" : ""
                        }`}
                      >
                        {p.label}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          {showThemeToggle && (
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2"
              style={{
                color: `hsl(${settings.mutedForegroundColor})`,
                ...ringStyle,
              }}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          )}
          {rightActions}
        </div>
        <span role="status" aria-live="polite" className="sr-only">
          {themeAnnounce}
        </span>
      </div>
    </header>
  );
};

interface SwitcherButtonProps {
  settings: DesignSettings;
  ringStyle: CSSProperties;
  label: string;
  ariaLabel: string;
  items: Array<{
    id: string;
    label: string;
    active: boolean;
    onSelect: () => void;
  }>;
}

function SwitcherButton({
  settings,
  ringStyle,
  label,
  ariaLabel,
  items,
}: SwitcherButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={ariaLabel}
          className="inline-flex items-center gap-1 h-8 px-2.5 rounded-md border text-[12px] transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2"
          style={{
            borderColor: `hsl(${settings.borderColor})`,
            color: `hsl(${settings.mutedForegroundColor})`,
            fontFamily: `'${settings.bodyFont}', sans-serif`,
            ...ringStyle,
          }}
        >
          <span className="truncate max-w-[140px]">{label}</span>
          <ChevronDown className="h-3 w-3 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((it) => (
          <DropdownMenuItem
            key={it.id}
            onClick={it.onSelect}
            className={`text-xs ${it.active ? "font-semibold" : ""}`}
          >
            {it.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DocsPreviewHeader;
