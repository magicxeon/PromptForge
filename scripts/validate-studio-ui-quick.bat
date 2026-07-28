@echo off
setlocal

cd /d "%~dp0.."

echo [1/4] Type-checking the React application...
call npm run typecheck:web
if errorlevel 1 goto :failed

echo [2/4] Linting the changed Studio UI modules...
call npx eslint ^
  web/src/app/routeRegistry/routes.ts ^
  web/src/components/layout/SidebarNavigation.tsx ^
  web/src/components/generation/EngineTargetPanel.tsx ^
  web/src/components/generation/GenerationExperience.tsx ^
  web/src/components/generation/GenerationResultSurface.tsx ^
  web/src/components/generation/ReferenceSlotGrid.tsx ^
  web/src/components/generation/StudioGenerationWorkspace.tsx ^
  web/src/components/collections/CollectionEditorDialog.tsx ^
  web/src/components/collections/CollectionMembershipSection.tsx ^
  web/src/components/collections/WorkingCollectionToolbar.tsx ^
  web/src/components/community/PublishCommunityResourceDialog.tsx ^
  web/src/components/media/GenerationImageViewer.tsx ^
  web/src/components/ui/Button.tsx ^
  web/src/components/visual-options/VisualImagePicker.tsx ^
  web/src/features/scene-builder/routes/SceneBuilderRoute.tsx ^
  web/src/features/generation/api/generationApi.ts ^
  web/src/features/generation/api/generationApi.test.ts ^
  web/src/features/studio/attributes/attributeModel.ts ^
  web/src/features/studio/attributes/attributeModel.test.ts ^
  web/src/features/studio/components/StudioRecentGenerations.tsx ^
  web/src/features/studio/routes/StudioRoute.tsx ^
  web/src/features/studio/studioModePolicy.ts ^
  web/src/features/studio/studioModePolicy.test.ts ^
  web/src/features/history/schemas/historySchemas.ts ^
  web/src/lib/navigation/hashScroll.ts
if errorlevel 1 goto :failed

echo [3/4] Running focused React Studio and generation tests...
call npm exec --workspace web vitest -- run ^
  src/app/routeRegistry/routes.test.ts ^
  src/components/generation/engineTargetPanelHelpers.test.ts ^
  src/features/generation/api/generationApi.test.ts ^
  src/features/studio/attributes/attributeModel.test.ts ^
  src/features/studio/studioModePolicy.test.ts
if errorlevel 1 goto :failed

echo [4/4] Running server prompt-mode parity tests...
call node --test test/reactGenerationModePromptParity.test.js
if errorlevel 1 goto :failed

echo.
echo Quick Studio UI validation passed.
exit /b 0

:failed
echo.
echo Quick Studio UI validation failed. Review the first error above.
exit /b 1
