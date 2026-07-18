# Step 1: Modularize Client-Side Monolith

## 1. Goal Description
The objective of this step is to refactor [**client/app.js**](file:///d:/development/ModelPromptForge/client/app.js) by dividing it into structured, category-based sub-files under `client/core/`. This technical debt refactoring ensures that each file focuses on a single responsibility (Single Responsibility Principle), is easier to read and debug, and prevents merge conflicts. The application will continue to run in the browser without any extra build or compilation steps.

---

## 2. Requirement Specifications

### Part 2.1: Unified State & Mappings (`studioState.js`)
1. **File Location**: `client/core/studioState.js`
2. **Responsibilities**:
   - Store global configurations and constants (`ATTRIBUTE_FILES`, `FIELD_TO_CATEGORY_MAP`, `FIELD_TO_PROMPT_CATEGORY_MAP`, `GENDER_TO_HAIR_PRESENTATION`, `HAIR_CUT_STYLE_PRESENTATION_OPTIONS`, `TAG_CONFLICT_RULES`, `CATEGORY_PRIORITIES`, `MODE_CATEGORY_POLICY`).
   - Define the main reactive state object: `window.ModelPromptForgeState` (acting as the single source of truth).
   - Provide standard helpers like `getLocalizedLabel(labelObj)`.

### Part 2.2: Reference Authority & Image References (`referenceManager.js`)
1. **File Location**: `client/core/referenceManager.js`
2. **Responsibilities**:
   - Implement reference state clearers: `clearFaceReferenceState()`, `clearCharacterReferenceState()`.
   - Implement reference checks: `isStoryCharacterReferenceActive()`, `getCharacterSheetSourceOwnership()`, `updateCharacterSheetSourceStatus()`.
   - Handle authority and rules injection: `applyReferenceAuthorityToSelections()`, `applyCharacterReferenceAuthority()`, `refreshReferenceAuthorityUI()`.
   - Handle mode reference validation rules: `enforceModeReferencePolicy()`, `enforceFaceMatchInvariant()`.
   - Update previews and thumbnails: `updateReferencePreviewsUI()`.
   - Manage image assignment functions: `assignFaceReference()`, `assignStyleReference()`, `assignCharacterReference()`, `cleanReferenceImageSrc()`, `uniqueReferenceJobIds()`.

### Part 2.3: Prompt Segment Compiler (`promptCompiler.js`)
1. **File Location**: `client/core/promptCompiler.js`
2. **Responsibilities**:
   - Compile activeSelections to the compiled prompt string.
   - Implement `generatePromptText(cleanTextOnly)`.
   - Implement helpers: `splitPromptPhrases()`, `uniquePromptParts()`, `normalizeIdentityPhrase()`, `normalizeHairPhrase()`, `getHairAdjective()`, `compactHairSegment()`, `sanitizeHeadshotExpression()`, `compactExpressionSegment()`, `compactSkinSegment()`, `buildCleanPromptSegments()`, `wrapPromptSegment()`.
   - Manage exclusion and dropdown tags: `enforceExclusionRules()`, `updateDropdownExclusions()`, `updateAccordionSummaryBadges()`, `resolveTagConflicts()`.

### Part 2.4: Session & Form Persistence (`persistence.js`)
1. **File Location**: `client/core/persistence.js`
2. **Responsibilities**:
   - Manage state serialization and deserialization via `localStorage` partitioned by `state.mode`.
   - Implement `saveCurrentModeState()`, `restoreCurrentModeState()`, `resetForm()`.
   - Manage UI restoration callbacks: `restoreSelectionsToUI()`, `setAspectInUI()`.

### Part 2.5: Dynamic Form Renderer (`formRenderer.js`)
1. **File Location**: `client/core/formRenderer.js`
2. **Responsibilities**:
   - Build HTML layout for fields and accordions dynamically based on loaded schemas.
   - Implement `renderForm()`.
   - Handle form redraw and hair presentations: `getSelectedHairPresentation()`, `filterHairCutStyleByPresentation()`, `clearInvalidHairCutStyleSelection()`, `getOptionsForField()`.
   - Manage visual dropdown controls: `loadVisualAssetManifests()`, `createVisualOptionPicker()`, `syncVisualPickers()`, `rerenderDynamicForm()`.
   - Coordinate with custom color pickers: `updateColorPickerUI()`.

### Part 2.6: Backend Services (`generationService.js`, `historyService.js`, `collectionService.js`, `lightboxService.js`)
1. **File Locations**:
   - `client/core/generationService.js`:
     - Resolving catalog: `getActiveProviderConfig()`, `getActiveModelConfig()`, `getSelectedImageResolution()`, `getEditablePromptText()`, `getGenerationRequestPayload()`, `usesProviderResolutionPreset()`, `applyModelCapabilityControls()`, `updateImageResolutionControl()`, `updateDimensionControlsVisibility()`, `updateAspectRatioCapabilityUI()`.
     - Credits and generation trigger: `updateCredits()`, `randomizePresetSelections()`.
   - `client/core/historyService.js`:
     - Load history items: `loadHistory()`, `getVisibleHistoryItems()`, `renderHistoryPagination()`, `observeHistoryImage()`, `renderHistory()`, `deleteHistory()`.
   - `client/core/collectionService.js`:
     - Collections management: `getCollectionById()`, `getCollectionsForJob()`, `loadCollections()`, `renderCollectionToolbar()`, `populateCollectionCoverOptions()`, `openCollectionEditor()`, `closeCollectionEditor()`, `saveCollectionFromEditor()`, `deleteActiveCollection()`, `renderMembershipModal()`, `openMembershipModal()`, `closeMembershipModal()`, `renderLightboxCollections()`, `initializeCollectionsUI()`.
   - `client/core/lightboxService.js`:
     - Fullscreen lightboxes: `createLightboxBrowseContext()`, `openLightbox()`, `closeLightbox()`, `setLightboxImage()`, `navigateLightbox()`, `openLineageLightboxItem()`, `renderLightboxItem()`, `updateLightboxNavigationLabels()`, `renderLightboxNavigation()`, `preloadLightboxNeighbors()`.
   - `client/core/utils.js` (Optional):
     - Scroll and helper events: `initializeScrollToViewport()`, `initializeAutoExpandConfigurator()`.

### Part 2.7: Entry Point Bootstrap (`app.js`)
1. **File Location**: `client/app.js`
2. **Responsibilities**:
   - Initialize the app on DOMContentLoaded: `initApp()`.
   - Implement core event listeners: `bindDynamicFormEvents()`, `bindEvents()`.
   - Handle clipboard functions: `copyPromptToClipboard()`, `copyPromptAsJSON()`.
   - Delegate actions to respective modules.

---

## 3. Load Sequence & HTML Integration
1. Update [**client/index.html**](file:///d:/development/ModelPromptForge/client/index.html) to load the files sequentially before `app.js`:
   ```html
   <script src="core/studioState.js"></script>
   <script src="core/referenceManager.js"></script>
   <script src="core/promptCompiler.js"></script>
   <script src="core/persistence.js"></script>
   <script src="core/formRenderer.js"></script>
   <script src="core/generationService.js"></script>
   <script src="core/historyService.js"></script>
   <script src="core/collectionService.js"></script>
   <script src="core/lightboxService.js"></script>
   <script src="app.js"></script>
   ```

---

## 4. Verification Plan
- **Pre-Refactor Check**: Capture all existing UI behaviors, prompt generation templates, and validation logic.
- **Post-Refactor Check**:
  1. Ensure no JavaScript compilation or loading errors appear in the console.
  2. Verify that changing options in the configurator updates the Live Prompt Preview dynamically with correct colorized tokens.
  3. Verify that changing active modes correctly saves the previous mode's configuration and restores the chosen mode's settings without resetting.
  4. Ensure Image References (Face Match, Style Match, Character references) function correctly.
  5. Verify that Collections can be created, updated, and populated with images from History.
  6. Confirm that the Lightbox navigates cleanly, displays lineage, and handles downloads.
