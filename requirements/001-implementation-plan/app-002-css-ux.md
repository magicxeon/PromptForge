# Task app-002: Premium & User-Friendly UX/UI Design System

## 1. Goal
Implement the design system (`style.css`) with rich modern aesthetics (dark mode by default, neon accents, glassmorphism) paired with a highly intuitive, professional, and accessible UX.

## 2. Professional & User-Friendly UX/UI Design Specs
*   **Dual-Panel Workspace**:
    *   Left side is the control center (form inputs).
    *   Right side is the sticky preview and quick actions panel.
*   **Segmented Chips for Small Option Lists**:
    *   For fields with few options (e.g. Gender, Aspect Ratio, Camera Angle), instead of standard dropdown lists, render them as **clickable button chips** (segmented buttons) that turn active with a bright neon border. This reduces clicks and makes options clear at a glance.
*   **Dynamic Summary Badges on Accordion Headers**:
    *   When an accordion category (e.g., Hair) is collapsed, display a small summary badge of the selected items (e.g. *Hair: Long, Reddish-orange*) so users don't have to keep expanding panels to see their current selection.
*   **Interactive Sync Highlight**:
    *   Hovering over a token in the prompt preview box will highlight the corresponding select element/accordion in the left panel, making it easy for the user to understand which setting maps to which word.
*   **Theme Details**:
    *   Background: Deep charcoal/grey (`#0f0f11`, `#18181b`)
    *   Cards: Glassmorphism style (`backdrop-filter: blur(10px)` with semi-transparent violet overlays).
    *   Accents: Neon Purple (`#8b5cf6`), Neon Pink (`#ec4899`), Neon Cyan (`#06b6d4`)
*   **Animations**: Custom smooth accordion expansions and hover scaling transitions on clickable cards.

---

## 3. Proposed Changes

### [NEW] [style.css](file:///d:/development/ModelPromptForge/style.css)
*   Define variables for the neon theme.
*   Implement layout grids for the split workspace dashboard.
*   Add custom styles for:
    *   Accordions and their child badge selectors (`.accordion-header`, `.accordion-badge`).
    *   Visual chips/segment controls (`.option-chip`, `.option-chip.active`).
    *   Real-time prompt text area with glow highlights.
    *   Dynamic hover syncing selectors (`.interactive-highlight`).

---

## 4. Verification
- Open `index.html` in browser.
- Verify fonts and variables load.
- Test responsive resizing to see if the right sidebar drops below the form layout on narrow screens gracefully.
