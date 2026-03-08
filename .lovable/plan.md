

## Problem

The current Design Settings UI uses a **floating, draggable, resizable popup** over the documentation preview. This feels unprofessional and clunky compared to how tools like Mintlify, Fern, Webflow, and Figma handle customization — they use **fixed side panels** integrated into the layout.

## Approach: Fixed Right-Side Settings Panel

Replace the floating popup with a **fixed right-side panel** (like Figma's inspector or Webflow's style panel). The documentation preview fills the remaining space on the left, creating a clean split-view layout.

```text
┌──────────────────────────────────────────────────────────────┐
│  ← Back  │  Project Name / Design Settings  │  Reset  Save  │
├──────────────────────────────────┬───────────────────────────┤
│                                  │  Design Settings Panel    │
│   Live Documentation Preview     │  ┌─────────────────────┐  │
│   (sidebar + content)            │  │ Global │ Blocks      │  │
│                                  │  ├─────────────────────┤  │
│   Scrollable, full height        │  │ Typography           │  │
│                                  │  │ Colors               │  │
│                                  │  │ Layout               │  │
│                                  │  │ Sidebar              │  │
│                                  │  │ ─── Block styles ──  │  │
│                                  │  │ Heading              │  │
│                                  │  │ Paragraph            │  │
│                                  │  │ Code Block ...       │  │
│                                  │  └─────────────────────┘  │
└──────────────────────────────────┴───────────────────────────┘
```

## Changes

### 1. `src/pages/DesignSettings.tsx` — Major refactor
- **Remove** the `useDraggableResizable` hook, floating panel positioning, drag handle, and resize handle
- **Replace** with a fixed-width right panel (`w-[340px]`) using `flex` layout:
  - Left side: `flex-1 overflow-auto` containing `DocContentView`
  - Right side: `w-[340px] border-l` fixed panel with scroll, containing the nav tabs and controls
- The nav tabs (Global sections + Block sections) become a **vertical accordion or collapsible list** in the side panel instead of wrapped chips — cleaner and more scannable
- Keep all existing control components (`TypographyControls`, `ColorControls`, etc.) unchanged
- Add a collapse/expand toggle for the panel (simple chevron button)

### 2. No other files need changes
All control logic, settings hooks, and rendering components remain the same. This is purely a layout refactor of `DesignSettings.tsx`.

