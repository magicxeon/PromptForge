@echo off
setlocal
cd /d "%~dp0.."

echo [1/2] Checking Community pre-commercial modules...
for %%F in (
  "server\domain\community\CommunityGalleryService.js"
  "server\domain\community\CommunityComparisonShareService.js"
  "server\domain\community\CommunityCollectionShareService.js"
  "server\domain\community\CommunityLaunchReadinessService.js"
  "server\app\routes\communityGalleryRoutes.js"
  "server\app\routes\communityComparisonRoutes.js"
  "server\app\routes\communityCollectionRoutes.js"
  "server\app\routes\communityReadinessRoutes.js"
  "client\community\communityFeed.js"
  "client\community\communityPostDetail.js"
  "client\community\communityGalleryApi.js"
  "client\community\communityTemplateActions.js"
  "client\community\communityComparisonShare.js"
  "client\community\communityCollectionShare.js"
  "client\community\creatorProfilePage.js"
) do (
  node --check "%%~F"
  if errorlevel 1 exit /b 1
)

echo [2/2] Running Community 05, 08, 09 and engagement tests...
node scripts\validate-i18n-catalogs.js
if errorlevel 1 exit /b 1
node --test ^
  test\communityMvpIntegration.test.js ^
  test\communityGalleryHandoff.test.js ^
  test\communityComparisonShare.test.js ^
  test\communityCollectionShare.test.js ^
  test\communityClientFeaturePolicy.test.js ^
  test\communityPublicSnapshot.test.js ^
  test\communityGeneratedShare.test.js ^
  test\communityModerationReporting.test.js ^
  test\creatorProfile.test.js ^
  test\communityGalleryCharacterContracts.test.js ^
  test\communityEngagementService.test.js ^
  test\communityRankingService.test.js ^
  test\communityFeaturePolicy.test.js
if errorlevel 1 exit /b 1

echo Community pre-commercial validation passed.
endlocal
