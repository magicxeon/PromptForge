@echo off
setlocal

echo [1/2] Checking Community 09-11 modules...
node --check server\repositories\community\CommunityGalleryRepository.js || exit /b 1
node --check server\repositories\community\CommunityCharacterRepository.js || exit /b 1
node --check server\middleware\actorContextMiddleware.js || exit /b 1
node --check server\domain\credits\CreditReservationService.js || exit /b 1
node --check client\core\actorContext.js || exit /b 1
node --check client\community\communityMockUserSwitcher.js || exit /b 1

echo [2/2] Running Community 09-11 contract and regression tests...
node --test ^
  test\communityGalleryCharacterContracts.test.js ^
  test\deferredRepositoryContracts.test.js ^
  test\mockActorContext.test.js ^
  test\creditGenerationBilling.test.js ^
  test\creditReservationService.test.js ^
  test\creditPricingPolicy.test.js

if errorlevel 1 exit /b 1
echo Community 09-11 validation passed.
