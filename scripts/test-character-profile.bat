@echo off
setlocal
cd /d "%~dp0.."

echo [1/3] Checking Character Profile JavaScript syntax...
for %%F in (
  "server\app\routes\characterProfileRoutes.js"
  "server\app\routes\generationRoutes.js"
  "server\domain\admin\AdminPolicyService.js"
  "server\domain\character-profiles\characterCastingPolicy.js"
  "server\domain\character-profiles\characterTypePolicy.js"
  "server\domain\character-profiles\characterProfilePolicy.js"
  "server\domain\character-profiles\CharacterCastingExportService.js"
  "server\domain\character-profiles\CharacterProfileService.js"
  "server\domain\character-profiles\CharacterProfileSharingService.js"
  "server\domain\character-profiles\CharacterUsageService.js"
  "server\domain\community\CommunityFeaturePolicyService.js"
  "server\domain\generation\generationRequestService.js"
  "server\domain\generation\promptCompiler.js"
  "server\domain\generation\QueueManager.js"
  "server\domain\generation\referenceUtils.js"
  "server\repositories\character-profiles\CharacterProfileRepository.js"
  "server\repositories\character-profiles\CharacterProfileVersionRepository.js"
  "server\repositories\character-profiles\CharacterUsageRepository.js"
  "client\character-profiles\characterProfileApi.js"
  "client\character-profiles\characterProfileState.js"
  "client\character-profiles\characterTypeControl.js"
  "client\character-profiles\characterHandoff.js"
  "client\character-profiles\characterCastingExport.js"
  "client\character-profiles\characterProfileEditor.js"
  "client\character-profiles\characterProfilePage.js"
  "client\core\formRenderer.js"
  "client\core\generationService.js"
  "client\core\promptCompiler.js"
  "client\community\communityCharacterSection.js"
  "client\community\communityCharacterDirectory.js"
) do (
  node --check "%%~F"
  if errorlevel 1 exit /b 1
)

echo [2/3] Validating localization catalogs...
node scripts\validate-i18n-catalogs.js
if errorlevel 1 exit /b 1

echo [3/3] Running Character Profile and integration tests...
node --test ^
  test\characterProfileLifecycle.test.js ^
  test\characterCastingExport.test.js ^
  test\characterProfileSharing.test.js ^
  test\characterDestinationHandoff.test.js ^
  test\characterUsageAnalytics.test.js ^
  test\characterSheetPersistence.test.js ^
  test\modeSpecificCharacterReference.test.js ^
  test\sceneCharacterDirection.test.js ^
  test\referenceValueNormalization.test.js ^
  test\creditGenerationBilling.test.js ^
  test\communityFeaturePolicy.test.js ^
  test\communityFeatureGateRoutes.test.js ^
  test\communityClientFeaturePolicy.test.js ^
  test\communityMvpIntegration.test.js ^
  test\i18nCatalogParity.test.js
if errorlevel 1 exit /b 1

echo Character Profile validation passed.
exit /b 0
