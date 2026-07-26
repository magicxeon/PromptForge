@echo off
setlocal

echo [1/2] Checking Community-12 modules...
node --check server\domain\community\communityEngagementPolicy.js || exit /b 1
node --check server\domain\community\CommunityEngagementService.js || exit /b 1
node --check server\domain\community\CommunityRankingService.js || exit /b 1
node --check server\domain\community\CommunityModerationService.js || exit /b 1
node --check server\domain\community\CommunityShareService.js || exit /b 1
node --check server\app\routes\communityEngagementRoutes.js || exit /b 1
node --check server\app\createApp.js || exit /b 1
node --check server\repositories\community\CommunityEngagementEventRepository.js || exit /b 1
node --check server\repositories\community\CommunityReactionRepository.js || exit /b 1
node --check server\repositories\community\CommunityCommentRepository.js || exit /b 1
node --check server\repositories\community\CommunityComparisonVoteRepository.js || exit /b 1
node --check server\repositories\community\CommunityEngagementAggregateRepository.js || exit /b 1
node --check server\repositories\community\CommunityPostRepository.js || exit /b 1
node --check client\community\communityEngagementApi.js || exit /b 1
node --check scripts\rebuild-community-engagement.js || exit /b 1

echo [2/2] Running Community-12 tests...
node --test ^
  test\communityEngagementPolicy.test.js ^
  test\communityEngagementService.test.js ^
  test\communityRankingService.test.js ^
  test\communityEngagementRoutes.test.js ^
  test\communityModerationReporting.test.js ^
  test\communityGeneratedShare.test.js ^
  test\sceneShareFlow.test.js

if errorlevel 1 exit /b 1
echo Community-12 validation passed.
