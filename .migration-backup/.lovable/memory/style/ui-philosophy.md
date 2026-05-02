# Memory: style/ui-philosophy
Updated: 2026-04-02

## Linear-Inspired UI Philosophy

The platform follows a Linear-inspired design philosophy: clean, minimal, and cozy with intelligent use of borders, fills, and spacing. Sections must be visually differentiated using subtle background fills.

### Border Rules
- **Borders are near-invisible** — use `border-border/40` (40% opacity) as default, `border-border/50` for slightly more visible dividers
- **Never use full-opacity borders** on cards, containers, or sections. Linear uses ~5-8% contrast for borders in dark mode
- **Prefer fill colors over borders** for visual hierarchy — a subtle background difference (e.g., `bg-accent/40` or `bg-card`) creates separation without harsh lines
- **Selected/active states use fills, NOT heavy borders** — e.g., `bg-accent` for selected, not `border-primary`
- **Dividers** use `h-px bg-border/50` instead of `<Separator />` where possible
- **Borders are NOT eliminated** — they exist at very low opacity to add definition. The key is subtlety, not absence

### Section Differentiation (Critical)
- **Always differentiate sections with mild background fills** — e.g., wrap form groups in `bg-card` with a `border-border/40` border
- **The sidebar must have a distinct background** from the main content area — use `bg-sidebar-background` which is slightly darker (dark mode) or lighter (light mode) than `bg-background`
- **Content groups** (forms, action bars, settings blocks) should be wrapped in `rounded-xl bg-card p-5` with `border: 1px solid hsl(var(--border) / 0.4)`
- **Avatar/profile header areas** use `bg-accent/40` to stand out from surrounding content
- **Action rows** (save, sign out) get their own `bg-card` section to visually separate from form fields

### Color Hierarchy
- **Surface layers create depth**: `background` → `sidebar-background` → `card` → `accent` → `accent/60`
- **Text hierarchy**: `text-foreground` (primary) → `text-muted-foreground` (secondary) → `text-muted-foreground/50` (tertiary/icons)
- **No color accents** — the palette is monochrome neutral. CTA buttons use `primary` (white in dark / near-black in light)
- **Hover states**: gentle background shifts (`hover:bg-accent/50` or `hover:bg-accent/60`), never dramatic color changes

### Input Fields
- Default state: `bg-accent/40 border-transparent` (filled, borderless)
- Focus state: `focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring/30` (border appears subtly on focus)
- Height: `h-10` (not h-11 — more compact)

### Typography
- Font: Inter, 13px base for body, 14px for section headings, 11px for captions
- Labels use `text-muted-foreground` (NOT `text-foreground font-medium`)
- Headings use `font-medium` (NOT `font-semibold` or `font-bold` for section titles)
- Page titles: `text-2xl font-bold tracking-tight`

### Spacing
- Cards/sections: `p-5` with `rounded-xl`
- Between sections: `space-y-6` (tighter grouping than `space-y-8`)
- Between form fields: `space-y-5`
- Generous negative space — UI should breathe

### Components
- **Cards/Sections**: use `bg-card rounded-xl p-5` with `border: 1px solid hsl(var(--border) / 0.4)` for grouping content
- **Avatars**: `bg-foreground/10 text-foreground` (NOT gradient backgrounds)
- **Badges**: `bg-accent text-muted-foreground border-0` (fill-based, no borders)
- **Buttons**: Default (primary) has no shadow. Ghost buttons for secondary actions. Destructive ghost: `hover:text-destructive hover:bg-destructive/10`
- **Dialogs**: `border-border/40 rounded-xl` 
- **Dropdown menus**: inherit the subtle border pattern
- **Sidebar**: distinct `bg-sidebar-background` from main `bg-background`

### Radius
- Default: `8px` (was 10px — slightly tighter like Linear)
- Cards/containers: `rounded-xl` (12px)
- Inputs: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px)
- Small elements (badges, chips): `rounded-md`

### Dark Mode Specifics
- Background: pure dark `#0d0d0d` (5% lightness)
- Sidebar: slightly darker `#0a0a0a` (4% lightness) — creates panel differentiation
- Cards: `#161616` (9% lightness — visible lift from background)
- Borders: `~12% lightness` — nearly invisible against card/background
- Text: `#f0f0f0` primary, `#707070` secondary, `#484848` tertiary

### Light Mode Specifics  
- Background: `#fafafa` (98% lightness)
- Sidebar: slightly different `#f5f5f5` (96% lightness)
- Cards: `#ffffff` (100% — clean white, stands out from bg)
- Borders: `~91% lightness` — whisper-thin lines
- Text: near-black primary, `~45% gray` secondary
