# Technical Debt & Code Quality Master Plan (006-technical-dept)
**ID**: 006-technical-dept-master
**Application**: `ModelPromptForge`

This directory tracks refactoring tasks, technical debt payments, and modularization requirements designed to keep the codebase maintainable, performant, and clean.

---

## 1. Refactoring Goals
*   **Modularize `client/app.js`**: Split the giant monolithic file into smaller, focused modules based on functional concerns under `client/core/`.
*   **Maintain Clean Global State**: Maintain `window.ModelPromptForgeState` as a unified state source of truth.
*   **No Build Tool Dependency**: Keep using browser-native scripts and IIFEs loaded in order via `client/index.html` to avoid adding build complexity (Vite/Webpack).
*   **Improve Code Maintainability**: Allow developers to locate bugs and implement enhancements in focused service files without causing merge conflicts.

---

## 2. Refactoring Checklist

*   **[Step 1: Modularize Client-Side Monolith](file:///d:/development/ModelPromptForge/requirements/006-technical-dept/001-client-refactor-modularization.md)**
    *   Separate core state, constants, and mappings.
    *   Modularize reference managers and the prompt compiler.
    *   Decompose form renderer, persistence, and service layers (history, collection, generation, lightbox).
    *   Reduce `client/app.js` to an entry point bootstrap script.
    *   Update script imports in `client/index.html` in correct dependency order.
