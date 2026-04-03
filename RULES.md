# 0docs Development Rules

## Rule 1: Design Tokens — Single Source of Truth

- **`src/styles/variables.css`** is the ONLY file containing design tokens.
- All tokens use the `--zdocs-` prefix.
- NO hardcoded hex/rgb values in components or other CSS files.
- NO semantic aliases or wrapper tokens outside `variables.css`.
- The bridge section in `variables.css` maps Shadcn/Tailwind semantic vars to zdocs tokens.

### Permitted Color Tokens

| Token | Dark | Light | Purpose |
|---|---|---|---|
| `--zdocs-bg1` | #0d0d0d | #f5f3f0 | Main background (darkest) |
| `--zdocs-bg2` | #161616 | #ffffff | Card/section background |
| `--zdocs-bg3` | #1e1e1e | #edeae6 | Elevated surfaces, inputs |
| `--zdocs-bg4` | #262626 | #e3e0db | Hover states |
| `--zdocs-bg5` | #303030 | #d6d3ce | Active states |
| `--zdocs-bg6` | #5a5a5a | #9e9b96 | Muted foreground elements |
| `--zdocs-border` | #2a2a2a | #ddd9d4 | All borders/dividers |
| `--zdocs-button` | #ffffff | #1a1a1a | Primary button bg |
| `--zdocs-button2` | #0d0d0d | #ffffff | Primary button text |
| `--zdocs-text1` | #f0f0f0 | #1a1a1a | Primary text |
| `--zdocs-text2` | #a0a0a0 | #6b6966 | Secondary text |
| `--zdocs-text3` | #707070 | #9a9895 | Tertiary text |
| `--zdocs-text4` | #484848 | #bfbdb9 | Muted text/placeholders |

## Rule 2: CSS Architecture

- `src/styles/variables.css` — tokens only (no classes)
- `src/styles/global-classes.css` — all reusable CSS classes
- `src/index.css` — imports + Tailwind directives only
- Tailwind is used ONLY for layout: `flex`, `grid`, `gap-*`, `p-*`, `m-*`, `w-*`, `h-*`
- All colors, typography, shadows, transitions use `var(--zdocs-*)` via CSS classes
- Every interactive element needs proper state classes: `:hover`, `:focus`, `.active`, `.selected`, `.disabled`, `.loading`

## Rule 3: File Organization

- Pages → `/src/pages/`
- Components → `/src/components/{category}/`
- Styles → `/src/styles/`
- Hooks → `/src/hooks/`
- Types → component-local or `/src/types/`
- API/integrations → `/src/integrations/`

## Rule 4: Component Structure

```tsx
// ============================================
// COMPONENT: ComponentName
// PURPOSE: What this component does
// USED IN: Which pages use it
// ============================================

// --- IMPORTS ---
// --- TYPES (props interface with comments) ---
// --- COMPONENT ---
// --- RENDER ---
```

## Rule 5: Page Structure

```tsx
// ============================================
// PAGE: PageName
// ROUTE: /route-path
// PURPOSE: What this page does
// ============================================

// --- IMPORTS ---
// --- TYPES ---
// --- VARIABLES (useState with comments) ---
// --- WORKFLOWS (functions with comment blocks) ---
// --- RENDER ---
```

## Rule 6: Variable Documentation

Every `useState` must have a comment:

```tsx
// Controls whether the sidebar panel is expanded
const [isExpanded, setIsExpanded] = useState(false);
```

## Rule 7: Clean HTML

- Use semantic elements: `<main>`, `<aside>`, `<section>`, `<nav>`, `<header>`
- Use descriptive class names: `zdocs-sidebar-left`, not `div > div > div`
- Props should be clearly named like visual attributes

## Rule 8: No Hardcoded Colors

```css
/* GOOD */
color: var(--zdocs-text1);
background: var(--zdocs-bg2);

/* BAD */
color: #ffffff;
background: hsl(0 0% 9%);
```

Exception: third-party brand SVGs may use their official colors.
