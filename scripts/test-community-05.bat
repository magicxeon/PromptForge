@echo off
setlocal

echo [1/2] Checking Community Explore client modules...
node --check client\community\communityEngagementApi.js || exit /b 1
node --check client\community\communityFeed.js || exit /b 1
node --check client\community\communityHomePage.js || exit /b 1

echo [2/2] Running Community feed contracts and localization tests...
node --test ^
  test\communityFeaturePolicy.test.js ^
  test\communityClientFeaturePolicy.test.js ^
  test\communityEngagementRoutes.test.js ^
  test\communityRankingService.test.js ^
  test\i18nCatalogParity.test.js

if errorlevel 1 exit /b 1
echo Community-05 Explore validation passed.
