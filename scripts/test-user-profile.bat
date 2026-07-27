@echo off
setlocal

for %%F in (
  "server/repositories/community/CreatorProfileRepository.js"
  "server/repositories/community/CreatorFollowRepository.js"
  "server/domain/community/CreatorProfileService.js"
  "server/domain/community/CreatorProfilePageService.js"
  "server/app/routes/communityCreatorRoutes.js"
  "server/app/createApp.js"
  "client/community/communityCreatorApi.js"
  "client/community/communityCharacterSection.js"
  "client/community/creatorProfileComponents.js"
  "client/community/creatorProfileHeader.js"
  "client/community/creatorProfileTabs.js"
  "client/community/creatorProfileOverview.js"
  "client/community/creatorProfileController.js"
  "client/community/accountProfileMenu.js"
  "client/community/communityMockUserSwitcher.js"
  "client/shell/navigationRegistry.js"
) do (
  node --check %%F || exit /b 1
)

node --test test/creatorProfilePage.test.js test/creatorProfile.test.js test/communityMvpIntegration.test.js test/i18nCatalogParity.test.js
exit /b %errorlevel%
