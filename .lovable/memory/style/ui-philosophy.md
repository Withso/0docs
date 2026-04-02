# Memory: style/ui-philosophy
Updated: 2026-04-02

## Linear-Inspired UI Philosophy

The platform follows a Linear-inspired design philosophy: clean, minimal, and cozy with intelligent use of borders, fills, and spacing.

### Border Rules
- **Borders are near-invisible** — use `border-border/40` (40% opacity) as default, `border-border/50` for slightly more visible dividers
- **Never use full-opacity borders** on cards, containers, or sections. Linear uses ~5-8% contrast for borders in dark mode
- **Prefer fill colors over borders** for visual hierarchy — a subtle background difference (e.g., `bg-accent/40`) creates separation without harsh lines
- **Selected/active states use fills, NOT heavy borders** — e.g., `bg-accent` for selected, not `border-primary`
- **Dividers** use `h-px bg-border/50` instead of `<Separator />` where possible

### Color Hierarchy
- **Surface layers create depth**: `background` → `card` → `accent` → `accent/60` (each slightly lighter in dark, slightly gray-er in light)
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
- Cards: `p-5` or no card wrapper — prefer open layouts with dividers
- Between sections: `space-y-8` or `mb-8`
- Between form fields: `space-y-5`
- Generous negative space — UI should breathe

### Components
- **Cards**: use `platform-card` class (subtle border, no shadow) or no container at all
- **Avatars**: `bg-foreground/10 text-foreground` (NOT gradient backgrounds)
- **Badges**: `bg-accent text-muted-foreground border-0` (fill-based, no borders)
- **Buttons**: Default (primary) has no shadow. Ghost buttons for secondary actions
- **Dialogs**: `border-border/40 rounded-xl` 
- **Dropdown menus**: inherit the subtle border pattern

### Radius
- Default: `8px` (was 10px — slightly tighter like Linear)
- Cards/containers: `rounded-xl` (12px)
- Inputs: `rounded-lg` (8px)
- Buttons: `rounded-lg` (8px)
- Small elements (badges, chips): `rounded-md`

### Dark Mode Specifics
- Background: pure dark `#0d0d0d`
- Cards: `#161616` (just slightly lighter)
- Borders: `~12% lightness` — nearly invisible against card/background
- Text: `#f0f0f0` primary, `#707070` secondary, `#484848` tertiary

### Light Mode Specifics  
- Background: `#fafafa` (near-white, no warm tint)
- Cards: `#ffffff`
- Borders: `~91% lightness` — whisper-thin lines
- Text: near-black primary, `~45% gray` secondary
