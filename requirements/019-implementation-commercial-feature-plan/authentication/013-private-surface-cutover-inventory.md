# AUTH-013 Private Surface And Cutover Inventory

**Parent:** [AUTH-019](../Phase2-04-authentication-sessions-and-authorization.md)  
**Task:** AUTH-T15A complete; source inventory independently reviewed by Security/QA  
**Snapshot:** Historical source inventory2026-10-11; representative customer Login/private cutover accepted2026-10-12 under AUTH-T15B/C/E/F/G/H. Exact runtime evidence is in AUTH-012; this ledger is not positive UAT for every inventoried route.  
**Primary:** Backend Platform Architect. Reviewers: Security and QA.  
**Write owner:** this document only; Lead owns plan, evidence and architecture map.

## 1. Authority and classification

Read AUTH-004/008/011, the Backend charter, orchestration009 and099 Agent Start
Here/server ownership. Identity owns session/status/actor authority; resource
owners retain authorization. No application source, runtime data, environment,
visibility policy, financial state or provider workflow was changed. No app was
started, imported for execution or called over the network. Architecture map unchanged:
this is documentation within the existing Authentication boundary.

The endpoint ledger below enumerates all31 registrars actually called by
`server/app/createApp.js:187` through282. This is a static source inspection,
not an Express runtime stack assertion. All311 registration statements include
loop expressions and two duplicate pairs; they do not equal311 distinct concrete
URLs. The loops are expanded explicitly below.

| Class | Cutover contract | Verification set |
|---|---|---|
| P | Public configuration/catalog/health; no customer work or credential authority. Preserve existing feature gates. | V01,V02,V08 |
| O | Optional real identity: null guest, sanitized public result; owner/staff additions require a valid active session. | V01,V02,V04,V08 |
| O* | Public snapshot/read intent with current actor-required or mixed visibility contracts. Resolve explicit null-viewer adaptation in the owning facade before activation; never fabricate a guest customer. | V01,V02,V04,V08 |
| A | Active real identity plus resource owner/action checks, reads and writes. Qualified development bypass is the only AUTH-009 local exception. | V01-V07,V09 |
| S | Active real staff identity plus existing narrower Admin/Support policy and required staff assurance; no role from headers. | V01-V07,V10 |
| F | Isolated development fixture endpoint only; unavailable/empty in production independently of mock UI flags. | V02,V11 |

P/O annotations describe the reviewed target boundary, not proof that current
null-actor runtime succeeds. A method or public name alone never determines
visibility. HEAD, Range, conditional304, static path variants and progress events
inherit the same resource decision. All unsafe browser actions require AUTH-011
CSRF unless a narrowly verified callback protocol explicitly owns an exemption.

## 2. Registered capability families and their owners

Paths/line anchors here and section8 are repository-relative source references.
Each family includes every endpoint in its section8 ledger, with exceptions below.

| Registrar and composition anchor | Existing authority/resource path | Cutover rule and retained behavior |
|---|---|---|
| attributesRoutes.js153/162; createApp187 | Attribute catalog public runtime bundle/provider catalog | P providers/bundle. Preserve sanitized enabled capabilities; do not expose administrative configuration. |
| promptComposerRoutes.js10; createApp192 | Prompt Composer proposal service | A proposals; authoring payloads and actor use require private entry. |
| identityRoutes.js8/12/20/28; createApp193 | Identity/UserPreferenceService; MockUserRepository currently | O me; A preferences; F mock-users. Existing preference boolean remains unchanged. |
| creditRoutes.js11-111; createApp197 | CreditApplicationService | A balance, estimate, ledger and legacy aliases; mock grants/recharge additionally retain Credits' authorized-mock/Admin/Support gate (CreditAccountRepository668). Production mock authority is excluded; Auth does not change staff grant rights or grant/recharge automatically. |
| learningRoutes.js27-58; createApp198 | LearningAccessPolicy/Tutorial/AICinema facades | O config; S catalog/all writes/purchase stubs. Existing Admin-only, feature-off/production exclusion and unavailable billing stay intact. |
| collectionRoutes.js4-89; createApp199 | CollectionManager; username resolver | A list/detail/default/images and all mutations; preserve collection ownership and non-disclosing foreign404. |
| generationRoutes.js7-127; createApp200 | GenerationApplicationService | P look-sheet preset; A preview, enhancement, generate, job/group/status/SSE. Debug prompt preview keeps its existing role/config gate in addition to authentication. Accepted work/settlement survives logout. |
| mediaExportRoutes.js2; createApp201 | Assets/MediaExportService; GenerationExportSourceService | A POST export with source owner checks; preserve bounded original-image/Comparison export and cancellation contract. |
| generationJobCenterRoutes.js2; createApp202 | GenerationJobCenterService | A actor-owned job projection. |
| fashionBlueprintRoutes.js25-93; createApp203 | Fashion Blueprint facade/assets | P model catalog; A reference uploads/resolve/quotes/run reads and proof approval. |
| referenceRoutes.js10-46; createApp204 | Assets ReferenceAssetService and Reference Processing | P processing-policy; A upload/composite/planning; retain reference-role/provider limits and owner checks. |
| referenceHandoffRoutes.js11; createApp205 | Assets FaceReferenceHandoffService | A source-owned face handoff; no new provider dispatch. |
| historyRoutes.js18-97; createApp206 | Generation HistoryRepository/presentation/delete workflow | A page/detail/presentation/delete; username fallback is a gap, derivative and304 still require owner/session. |
| comparisonRoutes.js13-66; createApp210 | ComparisonOrchestrator | A estimate/list/set/winner/delete. getComparisonActor4-11 checks merely nonempty userId/username, so current fabricated guest passes that shape check; real active authority must precede it. |
| adminRoutes.js35-181; createApp211 | Admin policies/backoffice/investigation/Support/config/Credits/Audit | S all reads and commands; preserve admin vs support distinctions and audited, idempotent commands. |
| adminAttributeCatalogRoutes.js6-92; createApp217 | AttributeCatalogApplicationService/AdminPolicy | S all overview/definitions/draft/read/upload/approve/validate/publish/rollback. |
| adminFinanceRoutes.js22-34; createApp218 | Finance policies/read models/drafts | S all inventory/report/draft endpoints; existing Finance permissions retained, no financial mutation redesign. |
| communityTaxonomyRoutes.js5/16; createApp219 | CommunityFeaturePolicy/Classification | P public feature flags/taxonomy. |
| communityShareRoutes.js19-146; createApp223 | CommunityShareService, PostAccess, VideoShare | A generation share-status/drafts/publish/delete; O* template-previews/detail and post video/poster after owning snapshot visibility checks. |
| communityCreatorRoutes.js18-101; createApp229 | CreatorProfileService/CreatorProfilePageService | A own profile/presentation/follow; O profile and portfolio; O* page currently asserts actor. Owner portfolio additions remain private. |
| communityModerationRoutes.js14/28; createApp234 | CommunityModerationService/AdminPolicy | A reporting; S staff reports read. |
| communityEngagementRoutes.js19-162; createApp238 | Ranking/Engagement/Moderation | P public feed; A personalized engagement/comments/reactions/votes/reports today. Views support optional actor in domain but HTTP supplies no anonymousSessionHash; no anonymous-write claim. |
| characterProfileRoutes.js29-377; createApp244 | CharacterProfileService/LookService/Sharing/Casting export | A private profile/versions/looks/candidates/stats/media; S Admin moderation; O* Community character lists/detail/works/stats/media; A handoff. Separate public sheet/face visibility remains source policy. |
| communityGalleryRoutes.js17-76; createApp251 | CommunityGalleryService/Character sharing/PostAccess | A add/reuse/character handoff; O* creator gallery/characters and image/thumbnail routes. |
| communityReadinessRoutes.js5; createApp255 | CommunityLaunchReadinessService | P current readiness projection; verify no private release/config data is returned before production. Auth does not approve broader launch exposure. |
| communityComparisonRoutes.js7-49; createApp259 | CommunityComparisonShare/PostAccess/ImagePresentation | A publish; O* public snapshot image/video/poster/presentation, never raw private Comparison access. |
| communityCollectionRoutes.js6/19; createApp265 | CommunityCollectionShare/PostAccess | A publish; O* published collection item image/thumbnail. |
| sceneTemplateRoutes.js28-214; createApp270 | CommunityShareService + Template public workflow | A draft/publish/edit/use/remix; S moderate/taxonomy; O* shared list/detail/image/thumbnail/presentation. |
| templateRoutes.js11-131; createApp277 | TemplateCoreService/TemplatePoseProxyService | P published list/detail; A owner input-policy/use sessions/archive/proxy reads/estimate/prepare/review. Published does not grant private references. |
| cinematicRoutes.js9-747; createApp278 | CinematicApplicationService -> Generation/Assets/Credits | P video/authoring/faceless-previs capabilities; A all Project/Series/Scene/Shot/writing/clip-bundle/export-manifest work; S Admin cinematic projections. Story-plan proposals support POST progress stream. |
| videoGenerationRoutes.js15-87; createApp282 | VideoGenerationApplicationService | P gated video capabilities; A quote/trusted-sources/task create/list/detail. Preserve durable task recovery and original requester. |

Registrar names above are exact filenames under `server/app/routes/`; source
line numbers are fully expanded in section8. No extra route module under that
folder was found unregistered at the inventory snapshot. Auth/Assets registrars
were absent in that historical snapshot; `authRoutes.js`, `assetRoutes.js` and
`AssetDeliveryService.js` are now implemented and mounted under accepted T15B/C/E/F.
Raw `/outputs` and orphan static mounts are retired; actual-app fixture checks
cover stable-owned History/Jobs/JobCenter and original/derivative delivery.
AUTH-012 records representative runtime evidence. No root compatibility route is used
as a placement precedent.

Loop expansion: generationRoutes47 expands quote/execute; communityEngagement58
and73 expand like/save; communityGallery75 expands gallery/characters;
characterProfile287 expands image/thumbnail/face/sheet and376 expands
thumbnail/face/sheet; cinematic51 expands chapter-order/scene-order,164 expands
estimate/proposals/approve. learning56 registers both purchases and
catalog/:id/purchase. cinematic287/292 and297/302 duplicate the shared-character
detach/delete registrations; first-handler ordering must be preserved, not
silently “fixed” as auth scope.

## 3. Static files, media, downloads and streaming

| Exact current source | Current exposure and owner | Required check/handoff |
|---|---|---|
| createApp155 `/react-assets` | Vite built browser assets; P. | Public shell assets work with no session; no credential-bearing bundle/config. |
| createApp158 `/assets` -> client/assets | Runtime design/brand/visual authoring assets; P only for deliberate public assets. Not an actor media authorization facade. | Preserve public manifest prefix used by visualManifestApi8-11/53. No blanket login on assets. Unknown/custom private files require owning classification before publication, no directory-wide assumption. |
| createApp159 `/i18n` | Public catalogs/manifest. | P; translation catalogs must contain no account/runtime data. |
| createApp160 `/outputs` -> OUTPUTS_DIR | Unguarded static private originals/derivatives/video/posters/references, regardless of URI unpredictability. Global middleware currently invents guest/default actors. | T15C must remove unrestricted serving and retain only source-authorized delivery. Owner session, wrong owner, revoked and guest; Range/HEAD/304; nested paths/traversal/symlink escape. |
| createApp161 `/sub-app-game-character` | Registered static mount, target directory absent at inspection. | Orphan mount, not a live owner/auth bypass proof. Keep unavailable or remove in scoped composition; do not resurrect legacy runtime. |
| createApp168 `GET /api/health` | P health/time. | Remains public; no DB/session secret diagnostics. |
| createApp288 SPA fallback | Matched React browser paths only, excludes /api/. | P shell; private data comes only from authorized APIs. Unknown API does not fall back to HTML. |
| historyRoutes67/113-121 | Source-checked image presentation; private ETag/cache. | Reauthorize before304; preserve owner on derivative and cached response. Private max-age3600 requires review on logout/shared-device semantics; do not confuse HTTP cache with current session authority. |
| characterProfileRoutes170/263/288 | Private Look sheet, featured candidates and image/thumbnail/face/sheet sendFile. | A source profile/look owner; direct media no mock query proof. |
| characterProfileRoutes354/365/377 | Community Character media/featured image. | O* approved public projection plus original source visibility; no auto-exposure of a private reusable Character. |
| communityShare105, communityComparison20/34/49, communityCollection19, communityGallery76, sceneTemplate101/132 | Published snapshot video/poster/image/thumbnail/presentation transport. | O* owning publication policy; hidden/removed/private deny, deliberate public survives anonymously. Unlisted direct-link and members_only remain distinct. |
| mediaExportRoutes2; MediaExportService16/30/42/62 | Authenticated binary PNG/JPEG/ZIP-style export boundary with owner sources. | A CSRF/body validation and owner checks before bytes; preserve export limits and owning Generation/Comparison entry points. |
| cinematicRoutes74/80/707 | Clip bundle plan/build and export manifest. | A; underlying file paths/URLs must be authorized even if plan itself is owned. No unauthenticated ZIP or manifest-media bypass. |
| generationRoutes127 | Job SSE attaches via username at open; removes listener on disconnect. | A owner at open and revocation/status/expiry during continued delivery; close stream without cancelling accepted job/altering Credit settlement. |
| cinematicRoutes422/765-807 | POST story-plan progress/result/error stream, heartbeat15s. | A CSRF+actor before stream headers; revoke delivery on auth loss without automatic billable resubmit or changing already accepted operation outcome. |

`server/config/paths.js:12` fixes outputs at client/outputs,20 fixes server/data.
Private output examples are real source contracts: ReferenceAssetService142-160
stores uploaded references under actor subdirectories with /outputs URLs;
CinematicVideoAssetService63/160/247 stores video/poster/publicUrl projections;
Reference Processing deterministicImageProcessor70 exposes derived references.
The field name publicUrl does not establish public visibility.

Assets AssetRepository53/69 has owner lookup contracts, but no registered
private-media HTTP facade exists. GenerationExportSourceService6-9 already
resolves an owned generated image through Generation. T15C should add a focused
Assets delivery facade/route that delegates owning source authorization and
contains file resolution, rather than treating output basenames as ownership.
Legacy output files without a trustworthy source record remain denied pending
an explicitly approved mapping; do not infer ownership from filename/usernames.

No literal mpfUserId/mpf_user_id media URL producer was found in current
server/domain or web/src non-test source; actorContextMiddleware6 still accepts
both globally, including arbitrary direct media URLs. This is a supported
credential-injection surface even without a current caller. Native img/video/a
requests never carry the JSON client's x-mpf-user-id header and currently rely
on unrestricted /outputs or mock fallback. No session secret may replace it in
a query string. Same-origin session-authorized media is the preferred AUTH-004
contract; any scoped capability requires separate bounded source approval.

## 4. Actor, lifecycle and mock compatibility gaps

| Source | Observed contract/gap | Required target |
|---|---|---|
| actorContextMiddleware4-16 | NODE_ENV production only affects absent credentials; valid x-mpf-user-id/mpfUserId/mpf_user_id still selects MockUserRepository in production. | Client-supplied ID never credentials; resolve real session optionally then gate all private reads/writes. |
| actorContextMiddleware18-39/44-70 | Missing/invalid production read becomes fabricated anonymous_user with isMockActor; development absent defaults usr_demo. Missing/invalid writes401. | Guests are null; absent/off bypass requires normal session. No production fallback or privileged mock fixture. |
| actorContextMiddleware73-82; MockUserRepository61-68 | Only disabled mutation blocked; suspended and disabled reads pass. Actor projects accountStatus. | Every private request validates authoritative active lifecycle/version; status revokes sessions/pending grants across instances. |
| createApp83-101 | resolveRequestUsername accepts body/query user/username, mismatch check, then user_demo fallback. | No request username proof or default identity; compatibility username may derive only from validated Identity projection. |
| collectionRoutes6-93, generationRoutes98/129, historyRoutes27/56/98, creditRoutes13-113 | Legacy username selection still used. History61/110 defaults missing owners to user_demo. | Preserve verified stable IDs; fail closed on unmapped legacy record, no new real account claims. |
| AdminIdentityService5/14-34 | active/suspended/disabled, expectedStatus/idempotency; writes mock repo and returns mock_actor_refresh_required. | Identity owns atomic status/security-version/revocation+Audit; keep Admin policy/reason/self-protection/idempotency and result compatibility consciously reconciled. |
| AdminPolicyService6-11 | Staff role check lacks lifecycle/session/MFA proof by itself. | Central active session plus staff assurance before role/action gate; narrow admin vs support stays. |
| UserPreferenceService12/18-37/43-47 | Default mock repo; findById/updatePreferences; any nonempty actor ID accepted locally. | Wire canonical real Identity adapter; active owner check outside+inside facade, preserve confirmCreditUsage boolean/default. |
| repositoryContracts44-49 | assertActorContext checks merely nonempty userId; fabricated guest qualifies. | Do not globally loosen/replace this with an anonymous customer. Null-capable public readers use explicit visibility contracts, mutations remain authenticated. |
| recordNormalizer9-24 | Legacy username lookup and missing owner fallback usr_demo. | No automatic ownership transfer; preserve approved opaque owner IDs; unknown records cannot become new user's property. |

Mock repository coupling remains in these exact existing files (read consumers,
not permission to refactor all repositories): AdminBackofficeService,
CreditManager, UserPreferenceService and AdminIdentityService; repositories
AssetRepository, AuditLogRepository, CollectionRepository, ComparisonRepositoryAdapter,
CreditAccountRepository, CreditLedgerRepository, GenerationResultRepository,
SceneTemplateSnapshotRepository, CommunityPostRepository, CommunityGalleryRepository,
CommunityCharacterRepository and RemixEventRepository; all under their canonical
domain/repository capability folders. recordNormalizer resolves historical owners.
Those are domain projection/backfill dependencies, distinct from HTTP credentials.
A blanket import rename would silently change financial/legacy ownership and is
outside this task. Lead must use injected current-user lookup or separate bounded
owning work where needed, keeping unapproved legacy data quarantined.

Public null-viewer gaps are concrete: CommunityPostAccessService35/89/104/125/152
asserts actor even for public detail/media; CreatorProfilePageService35 does too;
CommunityGalleryService97/118/158 requires actor; CharacterProfileSharingService128/140/
215/365/460 requires actor; CommunityTemplateDetailService16/39 requires actor.
CreatorProfileService64/73 and PostAccessService29 already permit null for some
reads. Community policy21-35 permits public/unlisted direct link while members_only
needs userId; private/hidden/removed deny unless owner/staff. Target adaptation
must preserve those distinctions and publication sanitization, not blanket
“all Community GET public”. Personalized engagement/comments presently require
actor (CommunityEngagementService35/109); keep A until a reviewed bounded optional
public projection is chosen. recordView59-70 permits a null actor only with an
anonymous session hash; the current route never supplies that hash.

D08 approved real-account ID/data claims remain unresolved. Do not copy all
mock users, passwords, staff roles, Credit balances or seed work into real
accounts. Any fixture mapping is explicitly isolated, never evidence of a real
claim. No production data mutation is authorized by this inventory.

## 5. Browser transports and state boundaries

| Exact source | Observed behavior | Assigned correction |
|---|---|---|
| apiClient30/38 and71/86/95 | JSON and progress POST attach active mock header; no explicit cross-origin credential/CSRF or actor-generation response guard. | T13A common session/CSRF transport, exact configured origin, no automatic unsafe retry, late actor/mode response discard. |
| apiClient58/161-168 | JSON wrapper supports export Blob; apiMediaBlob independently attaches mock header and returns Blob. | Same authority/error/expiry transition for both binary paths; do not mutate active cache from old request. |
| apiClient144-158 | apiMediaUrl only validates same/API origin (also permits data/blob); generates naked native URLs. | Media owner authorizes each network URL; URL safety alone is not resource auth. |
| ActorProvider35-52/57-63 | Parallel me+mock-users; schema nonnull; on refresh failure old actor retained; cache clears only explicit ID switch. | Guest/error/revocation immediately clears private authority; generation fence plus abort/cancel and mode+ID namespaces, bounded config refresh. |
| actorStore1-9; actorSchemas3-11 | Persisted mpf_active_mock_user_id defaults usr_demo; no authMode/accountStatus in owning schema. | Server authority; nullable me, mode+ID validated projection; no session secret in browser storage. |
| queryKeys1-29; userPreferences7-30 | Actor-relative keys and preference late-response checks use ID only. | T13A mode+ID scope; stale bypass/session same-ID results cannot cross. |
| actorScopedStorage20-70; handoffStorage14-52; faceReferenceHandoff9-29 | Draft/handoff envelopes and keys use actorId. | Mode+ID binding and explicit cleanup on logout/mode change; preserve versioned data without sharing unqualified drafts. |
| AccountMenu37/98; AccountPreferencesDialog8-10; AppShell51-60 | Settings closes/remounts on actorId only; shell private credits/profile enabled by Boolean(actor). | Mode/ID/auth-loss closes settings and disables private queries before render. |
| web/src/app/router.tsx14-71 | Shared AppShell and lazy routes, no central real-session loader/guard. Public explore/posts/characters/profiles coexist with private me/create/library/comparisons/credits and Admin routes. Legacy aliases redirect to canonical routes. | T13A guard private views and preserve public navigation, return-path and sibling UI. UI gating supplements server authorization; private deep links cannot start queries before real authority resolves. |
| AuthenticatedMediaImage28 | Blob path, abort on component change. | Shared late-response fence must also invalidate created object URLs on session/mode change. |
| cinematicApi298; CinematicPortableShot37 | Progress and Blob consumers. | T13A parity fixture: expired/revoked/mode switch pending request produces no stale private result. |
| visualManifestApi8-11/53 | Separate fetch for public visual-character-builder manifests, same-origin credentials; no mock header. | Explicit public asset exception, preserve source prefix and schema; not a second private API client. |

Native private consumers: HistoryDetailRoute37/50, GenerationLibrary209/365,
CollectionDetailRoute75, GenerationResultSurface256, GenerationResultGrid51,
GenerationImageViewer122/238, GenerationVideoViewer166, VideoMediaPlayer41/50,
ComparisonWorkspace403/442, ComparisonThumbnailGrid68/69,
ReferenceSlotGrid255, FaceReferenceDestinationDialog97,
HistoryReferencePicker62, PlaygroundRecentGenerations56,
PlaygroundVideoWorkspace599/632, FashionBlueprintRoute1383,
FashionProductionSurface131, MediaStage95/133/137, CinematicPortableShot37.
These are exact files under web/src canonical components/features; private sources
must return authorized URLs without redesigning sibling UI.

Mixed/public consumers that must preserve published access: CommunityPostRoute149,
PublicComparisonCard79, SharedTemplatePanel42/43, CreatorProfileHero50/59,
ProfileShowcaseCards125, CharacterProfileHero93, CharacterCard34,
CreatorProfileRoute418 and CharacterPortrait14. Source authority determines which
URL is public. Replacing every img with Blob or gating every public profile is
not an approved design change.

Exact native-media consumer paths for scoped handoff (the line anchors above
identify the affected interactions; this is not blanket UI edit permission):

```text
web/src/features/history/routes/HistoryDetailRoute.tsx
web/src/features/history/components/GenerationLibrary.tsx
web/src/features/collections/routes/CollectionDetailRoute.tsx
web/src/components/generation/GenerationResultSurface.tsx
web/src/components/generation/GenerationResultGrid.tsx
web/src/components/media/GenerationImageViewer.tsx
web/src/components/media/GenerationVideoViewer.tsx
web/src/components/media/VideoMediaPlayer.tsx
web/src/components/comparisons/ComparisonWorkspace.tsx
web/src/components/comparisons/ComparisonThumbnailGrid.tsx
web/src/components/generation/ReferenceSlotGrid.tsx
web/src/components/generation/FaceReferenceDestinationDialog.tsx
web/src/features/scene-builder/components/HistoryReferencePicker.tsx
web/src/features/playground/components/PlaygroundRecentGenerations.tsx
web/src/features/playground/components/PlaygroundVideoWorkspace.tsx
web/src/features/fashion-blueprint/routes/FashionBlueprintRoute.tsx
web/src/features/fashion-blueprint/components/FashionProductionSurface.tsx
web/src/components/media/MediaStage.tsx
web/src/features/cinematic/components/CinematicPortableShot.tsx
web/src/features/community/routes/CommunityPostRoute.tsx
web/src/features/community/components/comparisons/PublicComparisonCard.tsx
web/src/features/scene-builder/components/SharedTemplatePanel.tsx
web/src/components/profiles/CreatorProfileHero.tsx
web/src/components/profiles/ProfileShowcaseCards.tsx
web/src/components/profiles/CharacterProfileHero.tsx
web/src/components/profiles/CharacterCard.tsx
web/src/features/profiles/routes/CreatorProfileRoute.tsx
web/src/features/profiles/components/CharacterPortrait.tsx
```

## 6. Verification cases for every ledger row

These are future acceptance cases, not tests run by T15A. Isolated fixtures must
cover every concrete method/path/loop expansion, not one representative wildcard.

| Case | Required proof |
|---|---|
| V01 | Guest can read each P/O deliberately public result; each A/S read/write/media denies401 without payload/bytes. Auth restricted contexts/receipts do not provide private authority. |
| V02 | Valid/invalid/absent mock header and both query aliases, username body/query, forged role, duplicate cookies cannot alter real authority; production has no usr_demo/anonymous_user fallback. |
| V03 | Authorized owner preserves normal result; wrong owner/unknown opaque ID use non-disclosing denial. Credential bypass alone cannot bypass source ownership. |
| V04 | Suspend/disable/revoke/security-version change/idle/absolute expiry denies next private request across two instances; background status polls do not extend idle lifetime. |
| V05 | Unsafe JSON, progress and export all require exact Origin+CSRF; invalid/missing proof blocks before provider/Credit/domain mutation. Public callback exemptions narrowly verified. |
| V06 | Output original/thumbnail/reference/video/poster, native direct URL, media/export/clip bundle and headers Range/HEAD/If-None-Match cannot bypass source decision; contain paths/symlinks and prevent private cache reuse after auth change. |
| V07 | Open SSE/POST progress cannot keep emitting private data after revocation/expiry; disconnect closes only listener/transport. Existing accepted work remains reconcilable under normal login, no automatic resubmit/refund. |
| V08 | Public/approved unlisted snapshot read/media/thumbnail/presentation remains available anonymously; members_only/private/draft/hidden/removed cannot leak. Owner/staff projection extras remain protected. |
| V09 | JSON/export Blob/media Blob/progress/native media auth loss produces one stable transition; late old actor or same-ID old-mode responses never populate current private cache/drafts/object URLs. |
| V10 | Real active staff with qualified MFA keeps narrower admin/support capabilities; fabricated mock staff/role never enters Admin/Finance/Audit/Support or status command. Preserve self-protection/audit/idempotency. |
| V11 | Bypass exacttrue only development+qualified isolated fixture+loopback startup/request/Vite topology; absent/false/off+restart requires sessions. No real SMTP/provider/Credit seed mutation; methods disabled, fixed low-privilege actor and visible mode. |
| V12 | Missing/invalid production auth config, DB/key failure, method rollout disabled or rollback deny private identity; do not restore mock/JSON/demo fallback. No paid worker or real data side effect before safe startup qualification. |

Existing adjacent fixture owners to extend where appropriate: test/userPreferences.test.js,
test/adminSafeMvp.test.js, test/adminBackoffice.test.js,
test/communityOwnershipPolicy.test.js, test/communityPublicSnapshot.test.js,
test/communityVideoShare.test.js, test/communityComparisonShare.test.js,
test/communityCollectionShare.test.js, test/communityGalleryCharacterContracts.test.js,
test/mediaExport.test.js, test/historyRepository.test.js,
test/generationJobCenter.test.js; frontend apiClient.test.ts,
AuthenticatedMediaImage.test.tsx and actorScopedStorage.test.ts in their source folders.
Do not execute tests importing full createApp against repository data as proof of
isolation. New grouped auth tests must use dependency injection/disposable
sources per T03A and selectable sessions-authorization/integration/UI runners.

## 7. Historical Task Boundaries And Current Cutover

The table preserves the reviewed task decomposition. T15B/C/E/F/G/H are now
source-accepted; implemented paths supersede their former planned labels. The
current JSON plan owns exact scopes, including alternate Queue/JobCenter stable
owner checks and actual `qualify-cutover.mjs`/`qualify-login-app.mjs` runners.
The bootstrap observations below describe the original inspection, not today's
startup: canonical `prepareServerComposition` qualifies before protected imports,
and Login readiness does not start billable recovery.

This table narrows candidates for Lead review/plan changes; it does not grant
write ownership to T15A. Existing files are exact, new paths explicitly planned.
Source line anchors above identify affected code, not permission for broad rewrites.

| Task | Exact owning files and permitted responsibility |
|---|---|
| T05B Identity actor/status | server/middleware/actorContextMiddleware.js; server/app/routes/identityRoutes.js; server/app/createApp.js; server/domain/identity/IdentityApplicationService.js (planned facade); server/domain/identity/AdminIdentityService.js; server/domain/identity/UserPreferenceService.js; server/repositories/identity/PostgresIdentityRepository.js. Wire real optional actor/current preferences and status/revocation through Identity; no mock data claims. Narrow additional staff/query projections only after frozen session handoff. |
| T15B HTTP mock exclusion | server/app/createApp.js; server/server.js; server/middleware/actorContextMiddleware.js; server/app/routes/identityRoutes.js; server/repositories/recordNormalizer.js (only explicit fail-closed owner resolution contract, no backfill); server/config/authPolicy.js and server/config/paths.js (approved runtime config/data boundary only). Require private routes by explicit ledger classification before capability code; remove HTTP/default/username authority. Root must also coordinate T13A transport before activation. |
| T15C private source transport | server/app/createApp.js; server/app/routes/assetRoutes.js (planned thin Assets transport); server/domain/assets/AssetDeliveryService.js (planned private read facade, not new storage/Generation owner); server/repositories/assets/AssetRepository.js; server/domain/generation/GenerationExportSourceService.js; server/app/routes/historyRoutes.js; server/app/routes/generationRoutes.js; server/domain/generation/GenerationApplicationService.js; server/app/routes/collectionRoutes.js; server/app/routes/creditRoutes.js (derive actor only, no finance rules); server/app/routes/cinematicRoutes.js (stream authority only). Existing source URLs may remain compatible only behind owning authorization; no raw static output fallthrough. |
| T15C preserve public snapshots | server/domain/community/CommunityPostAccessService.js; server/domain/community/communityPostPolicy.js; server/domain/community/CreatorProfilePageService.js; server/domain/community/CommunityGalleryService.js; server/domain/community/CommunityTemplateDetailService.js; server/domain/character-profiles/CharacterProfileSharingService.js. Explicit null viewer only on selected public reads; source policy remains. Their registered routes: `server/app/routes/communityShareRoutes.js`; `server/app/routes/communityCreatorRoutes.js`; `server/app/routes/communityGalleryRoutes.js`; `server/app/routes/communityComparisonRoutes.js`; `server/app/routes/communityCollectionRoutes.js`; `server/app/routes/sceneTemplateRoutes.js`; `server/app/routes/characterProfileRoutes.js`. Changes need owning Community/Character review; no global assertActorContext weakening. |
| T13A shared browser authority | `web/src/lib/api/apiClient.ts`; `web/src/lib/api/queryKeys.ts`; `web/src/lib/auth/ActorProvider.tsx`; `web/src/lib/auth/actorSchemas.ts`; `web/src/lib/auth/actorStore.ts`; `web/src/lib/auth/userPreferences.ts`; `web/src/lib/persistence/actorScopedStorage.ts`; `web/src/lib/persistence/handoffStorage.ts`; `web/src/lib/persistence/faceReferenceHandoff.ts`; `web/src/app/router.tsx`; `web/src/components/layout/AppShell.tsx`; `web/src/components/layout/AccountMenu.tsx`; `web/src/components/layout/AccountPreferencesDialog.tsx`; `web/src/components/media/AuthenticatedMediaImage.tsx`. Existing native consumers in section5 change only if authorized URL contracts require it. |
| T19A pre-start qualification | server/server.js; server/app/createApp.js; server/config/paths.js; server/config/authPolicy.js; server/middleware/actorContextMiddleware.js; web/vite.config.ts. Config must validate before dynamic import of composition/default singletons, qualify fixture paths and request/socket/Host/origin topology, bind loopback. No unsafe early recovery/paid provider activation. Any extra config/factory file must be named in the owning T19 plan before creation. |
| T19B visible/local transitions | T13A shared ActorProvider/schema/store/api/query/persistence files; web/src/components/layout/AppShell.tsx and AccountMenu.tsx; auth config projection through Identity. Mode badge/method disable, off/restart and same-ID mode cleanup. Scope addition follows UX review. |
| Validation | scripts/verify-authentication.mjs; scripts/authentication/qualify-sessions.mjs and qualify-integration.mjs (planned owning groups); test/authentication/sessions.test.js, actorAuthorization.test.js, privateMedia.test.js, cutover.test.js and developmentBypass.test.js (planned); owning frontend tests beside affected modules. Lead must reconcile actual filenames with tasks before creating them. |

A pre-start gate only inside createApp is too late: server.js3 loads dotenv,
5 dynamically imports createApp; createApp statically imports capability
singletons, QueueManager92/100/841 starts initHistory at construction, and
createApp143 starts LookSheet/Cinematic/Credit recovery immediately.
server.js43-67 later resumes video and installs the recovery monitor; listen10
has no explicit loopback binding. paths.js fixes real repo data/output roots and
Vite config34-42 has proxy but no explicit loopback host/allowlist. T19 must
positively qualify fixture targets before imports, and use isolated composition
to prevent provider/recovery/live-data side effects. Do not merely hide the
Login form or trust Host. Global trust/config/credentials are out of scope.

Deployment sequence: reviewed inventory -> session/actor contracts -> transport
parity -> isolated route/media/public snapshot gates -> bypass qualification ->
full isolated acceptance -> separately configured provider/legal/retention gates.
D08 legal versions/data claims, D02 sender, D03 deployment origins and D06 real
staff provisioning remain their own activation decisions. This inventory creates
no live mapping or deployment approval.

Rollback disables new login methods/entry, safely revokes authority where needed,
and keeps private data denied. Retain additive schema/old data for separately
authorized reconciliation; never roll back to production mock headers, demo
actor, JSON credentials or public output directory. Snapshot/public catalog
preservation is explicit. If an unowned legacy file cannot be reconciled, deny
that surface and report the gap rather than reopening unrestricted static media.

Checks actually performed: source reads plus rg registrar/HTTP method/static/
mock credential/native media/fetch/owner/status searches;31 route modules match
31 createApp registrar calls; registered orphan static target confirmed absent;
no other route module found. No runtime tests, live UAT, plan status changes,
architecture writes or code execution claims. Independent review and Lead
integration/plan scope reconciliation are the next action.

Offline ledger verification passed using Python with explicit UTF-8 reads:
31 source route modules,31 ledger modules,31 composition registrar calls,
311 ledger registration statements, zero incorrect method/line anchors, and
the registered sub-app-game-character directory absent. This validates source
coverage/anchors only. Scoped git diff --check passed; the new document is
untracked until ordinary version-control integration, so no application diff or
runtime result is implied.

## 8. Complete registered endpoint ledger

This source ledger covers all 31 route registrars called by createApp: 311 registration statements, before loop expansion and including duplicate Cinematic registrations. Each row inherits its family owner/checks in section 2 and case set in section 6. Line numbers identify the source snapshot inspected on 2026-10-11; revalidate after source changes. Static mounts, health and SPA fallback are separately inventoried above. Learning entries are relative to `/api/learning`.

### server/app/routes/adminAttributeCatalogRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 6 | GET `'/api/admin/attribute-catalog/overview'` | S |
| 10 | GET `'/api/admin/attribute-catalog/definitions'` | S |
| 14 | POST `'/api/admin/attribute-catalog/drafts'` | S |
| 18 | GET `'/api/admin/attribute-catalog/drafts/:draftId'` | S |
| 22 | PUT `'/api/admin/attribute-catalog/drafts/:draftId/option'` | S |
| 31 | POST `'/api/admin/attribute-catalog/drafts/:draftId/validate'` | S |
| 40 | POST `'/api/admin/attribute-catalog/drafts/:draftId/visual-candidates/plan'` | S |
| 48 | POST `'/api/admin/attribute-catalog/drafts/:draftId/focused-test/plan'` | S |
| 56 | POST `'/api/admin/attribute-catalog/drafts/:draftId/visual-candidates/upload'` | S |
| 65 | POST `'/api/admin/attribute-catalog/drafts/:draftId/visual-candidates/approve'` | S |
| 74 | POST `'/api/admin/attribute-catalog/drafts/:draftId/publish'` | S |
| 83 | POST `'/api/admin/attribute-catalog/releases/:releaseId/activate'` | S |
| 92 | POST `'/api/admin/attribute-catalog/rollback'` | S |

### server/app/routes/adminFinanceRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 22 | GET `'/api/admin/finance/inventory'` | S |
| 26 | GET `'/api/admin/finance/report'` | S |
| 30 | GET `'/api/admin/finance/drafts'` | S |
| 34 | POST `'/api/admin/finance/drafts'` | S |

### server/app/routes/adminRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 35 | GET `'/api/admin/capabilities'` | S |
| 39 | GET `'/api/admin/provider-health'` | S |
| 43 | GET `'/api/admin/provider-controls'` | S |
| 50 | POST `'/api/admin/provider-controls/commands'` | S |
| 60 | GET `'/api/admin/content'` | S |
| 64 | GET `'/api/admin/traces/:identifier'` | S |
| 68 | GET `'/api/admin/generation-command-previews/:identifier'` | S |
| 72 | GET `'/api/admin/support/cases'` | S |
| 76 | POST `'/api/admin/support/cases'` | S |
| 85 | GET `'/api/admin/support/cases/:caseId'` | S |
| 89 | PATCH `'/api/admin/support/cases/:caseId'` | S |
| 93 | GET `'/api/admin/configuration/revisions'` | S |
| 97 | POST `'/api/admin/configuration/validations'` | S |
| 101 | POST `'/api/admin/configuration/revisions'` | S |
| 105 | POST `'/api/admin/configuration/revisions/:revisionId/publications'` | S |
| 108 | GET `'/api/admin/overview'` | S |
| 112 | GET `'/api/admin/users'` | S |
| 116 | GET `'/api/admin/users/:userId'` | S |
| 120 | POST `'/api/admin/users/:userId/status-commands'` | S |
| 129 | GET `'/api/admin/generations'` | S |
| 133 | GET `'/api/admin/operations'` | S |
| 137 | POST `'/api/admin/operations/:operationId/dismissals'` | S |
| 141 | POST `'/api/admin/operations/:operationId/restorations'` | S |
| 145 | GET `'/api/admin/community/posts'` | S |
| 149 | POST `'/api/admin/community/posts/:postId/moderation'` | S |
| 157 | GET `'/api/admin/credits/:userId/ledger'` | S |
| 161 | GET `'/api/admin/credit-reconciliation'` | S |
| 168 | POST `'/api/admin/credits/:userId/adjustments'` | S |
| 181 | GET `'/api/admin/audit-events'` | S |

### server/app/routes/attributesRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 153 | GET `'/api/providers'` | P |
| 162 | GET `'/api/attributes/bundle'` | P |

### server/app/routes/characterProfileRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 32 | POST `'/api/character-profiles'` | A |
| 40 | GET `'/api/character-profiles'` | A |
| 48 | GET `'/api/character-profiles/:id'` | A |
| 56 | PATCH `'/api/character-profiles/:id'` | A |
| 64 | DELETE `'/api/character-profiles/:id'` | A |
| 74 | POST `'/api/character-profiles/:id/archive'` | A |
| 82 | POST `'/api/admin/character-profiles/:id/moderation'` | S |
| 95 | GET `'/api/character-profiles/:id/versions'` | A |
| 104 | GET `'/api/character-profiles/:id/looks'` | A |
| 112 | POST `'/api/character-profiles/:id/looks/import-momelo'` | A |
| 117 | POST `'/api/character-profiles/:id/looks/import-generated'` | A |
| 122 | POST `'/api/character-profiles/:id/looks'` | A |
| 130 | GET `'/api/character-profiles/:id/looks/:lookId/versions/:versionId/generation-plan'` | A |
| 140 | POST `'/api/character-profiles/:id/looks/:lookId/versions/:versionId/generated-review'` | A |
| 150 | POST `'/api/character-profiles/:id/looks/:lookId/versions/:versionId/review'` | A |
| 160 | POST `'/api/character-profiles/:id/looks/:lookId/versions/:versionId/approve'` | A |
| 170 | GET `'/api/character-profiles/:id/looks/:lookId/versions/:versionId/media/sheet'` | A |
| 182 | POST `'/api/character-profiles/:id/looks/:lookId/retire'` | A |
| 190 | POST `'/api/character-profiles/:id/versions'` | A |
| 202 | POST `'/api/character-profiles/:id/casting-export-plan'` | A |
| 210 | POST `'/api/character-profiles/:id/approve'` | A |
| 223 | POST `'/api/character-profiles/:id/convert-to-reusable'` | A |
| 231 | POST `'/api/character-profiles/:id/sharing'` | A |
| 239 | PATCH `'/api/character-profiles/:id/featured-image'` | A |
| 251 | GET `'/api/character-profiles/:id/featured-image-candidates'` | A |
| 263 | GET `'/api/character-profiles/:id/featured-image-candidates/:sourceType/:sourceId/media'` | A |
| 278 | GET `'/api/character-profiles/:id/stats'` | A |
| 288 | GET ``/api/character-profiles/:id/media/${mediaKind}`` | A |
| 303 | GET `'/api/community/characters'` | O* |
| 313 | GET `'/api/community/characters/:id'` | O* |
| 323 | GET `'/api/community/characters/:id/works'` | O* |
| 333 | GET `'/api/community/characters/:id/stats'` | O* |
| 344 | POST `'/api/community/characters/:id/handoffs'` | A |
| 354 | GET `'/api/community/character-profiles/:id/image'` | O* |
| 365 | GET `'/api/community/character-profiles/:id/featured-image'` | O* |
| 377 | GET ``/api/community/character-profiles/:id/${mediaKind}`` | O* |

### server/app/routes/cinematicRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 9 | GET `'/api/cinematic/video-capabilities'` | P |
| 24 | GET `'/api/cinematic/authoring-manifest'` | P |
| 33 | GET `'/api/cinematic/projects'` | A |
| 41 | GET `'/api/cinematic/projects/:projectId/prompt-preflight'` | A |
| 47 | GET `'/api/cinematic/projects/:projectId/series'` | A |
| 52 | PATCH ``/api/cinematic/projects/:projectId/${path}`` | A |
| 57 | POST `'/api/cinematic/projects/:projectId/series'` | A |
| 61 | PATCH `'/api/cinematic/series/:seriesId'` | A |
| 65 | POST `'/api/cinematic/series/:seriesId/seasons'` | A |
| 69 | POST `'/api/cinematic/series/:seriesId/chapters'` | A |
| 74 | GET `'/api/cinematic/projects/:projectId/clip-bundle'` | A |
| 80 | POST `'/api/cinematic/projects/:projectId/clip-bundle'` | A |
| 92 | POST `'/api/cinematic/projects'` | A |
| 100 | POST `'/api/cinematic/projects/:projectId/simple-scenes'` | A |
| 104 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/manual-storyboard'` | A |
| 108 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/storyboard-settings'` | A |
| 113 | POST `'/api/cinematic/story-enhancements'` | A |
| 122 | POST `'/api/cinematic/writing/quotes'` | A |
| 126 | GET `'/api/cinematic/writing/operations/:operationId'` | A |
| 131 | POST `'/api/cinematic/projects/:projectId/full-story/proposals'` | A |
| 140 | POST `'/api/cinematic/projects/:projectId/writing/quotes'` | A |
| 144 | GET `'/api/cinematic/projects/:projectId/writing/operations/:operationId'` | A |
| 149 | POST `'/api/cinematic/projects/:projectId/full-story/revisions'` | A |
| 154 | POST `'/api/cinematic/projects/:projectId/full-story/confirm'` | A |
| 159 | POST `'/api/cinematic/projects/:projectId/full-story/chapters'` | A |
| 165 | POST ``/api/cinematic/projects/:projectId/chapter-outline/${path}`` | A |
| 175 | POST `'/api/cinematic/projects/:projectId/chapter-proposals'` | A |
| 180 | POST `'/api/cinematic/projects/:projectId/chapter-proposals/:proposalId/apply'` | A |
| 185 | POST `'/api/cinematic/projects/:projectId/chapter-proposals/:proposalId/discard'` | A |
| 190 | POST `'/api/cinematic/projects/:projectId/scene-proposals'` | A |
| 197 | POST `'/api/cinematic/projects/:projectId/scene-proposals/:proposalId/apply'` | A |
| 202 | POST `'/api/cinematic/projects/:projectId/scene-proposals/:proposalId/discard'` | A |
| 207 | POST `'/api/cinematic/projects/:projectId/manual-scenes'` | A |
| 212 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId'` | A |
| 217 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/looks'` | A |
| 223 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shot-proposals'` | A |
| 230 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shot-proposals/:proposalId/apply'` | A |
| 235 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shot-proposals/:proposalId/discard'` | A |
| 240 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/manual-shots'` | A |
| 245 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/document'` | A |
| 250 | GET `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/writer-preparation'` | A |
| 257 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/writer-export'` | A |
| 264 | POST `'/api/cinematic/projects/:projectId/chapter-revisions/:revisionId/restore'` | A |
| 269 | PATCH `'/api/cinematic/projects/:projectId/shared-characters/:assignmentId/voice'` | A |
| 274 | PUT `'/api/cinematic/projects/:projectId/shared-characters/:assignmentId'` | A |
| 282 | PUT `'/api/cinematic/projects/:projectId/chapter-characters'` | A |
| 287 | POST `'/api/cinematic/projects/:projectId/shared-characters/:assignmentId/detach'` | A |
| 292 | DELETE `'/api/cinematic/projects/:projectId/shared-characters/:assignmentId'` | A |
| 297 | POST `'/api/cinematic/projects/:projectId/shared-characters/:assignmentId/detach'` | A |
| 302 | DELETE `'/api/cinematic/projects/:projectId/shared-characters/:assignmentId'` | A |
| 307 | PATCH `'/api/cinematic/projects/:projectId/chapter'` | A |
| 312 | POST `'/api/cinematic/projects/:projectId/cast/:assignmentId/wardrobe-suggestion'` | A |
| 322 | GET `'/api/cinematic/projects/:projectId'` | A |
| 330 | GET `'/api/cinematic/projects/:projectId/data-lineage'` | A |
| 343 | PATCH `'/api/cinematic/projects/:projectId/setup'` | A |
| 351 | PUT `'/api/cinematic/projects/:projectId/stage'` | A |
| 364 | PUT `'/api/cinematic/projects/:projectId/cast/:assignmentId'` | A |
| 375 | DELETE `'/api/cinematic/projects/:projectId/cast/:assignmentId'` | A |
| 388 | PUT `'/api/cinematic/projects/:projectId/cast/:assignmentId/looks/:lookId'` | A |
| 401 | GET `'/api/cinematic/projects/:projectId/cast/:assignmentId/looks/:lookId/removal-impact'` | A |
| 408 | DELETE `'/api/cinematic/projects/:projectId/cast/:assignmentId/looks/:lookId'` | A |
| 414 | PUT `'/api/cinematic/projects/:projectId/story-plan'` | A |
| 422 | POST `'/api/cinematic/projects/:projectId/story-plan/proposals'` | A |
| 437 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/direction-proposals'` | A |
| 447 | PUT `'/api/cinematic/projects/:projectId/shots/:shotId/storyboard-source'` | A |
| 460 | GET `'/api/cinematic/faceless-previs/capabilities'` | P |
| 469 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/faceless-previs'` | A |
| 480 | GET `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/storyboard-generation-context'` | A |
| 494 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/previous-video-frame'` | A |
| 505 | GET `'/api/cinematic/projects/:projectId/scenes/:sceneId/environment'` | A |
| 511 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/environment'` | A |
| 516 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/environment/proposals'` | A |
| 523 | GET `'/api/cinematic/projects/:projectId/scenes/:sceneId/environment/images'` | A |
| 529 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/environment/approve'` | A |
| 535 | POST `'/api/cinematic/projects/:projectId/storyboard-generation-batches'` | A |
| 601 | GET `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/produce-context'` | A |
| 615 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-quote'` | A |
| 626 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-attempts'` | A |
| 637 | POST `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-attempts/:attemptId/approve'` | A |
| 648 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId'` | A |
| 662 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/motion-direction'` | A |
| 676 | PATCH `'/api/cinematic/projects/:projectId/scenes/:sceneId/shots/:shotId/video-references'` | A |
| 686 | PUT `'/api/cinematic/projects/:projectId/scenes/:sceneId/shot-order'` | A |
| 699 | PUT `'/api/cinematic/projects/:projectId/timeline'` | A |
| 707 | GET `'/api/cinematic/projects/:projectId/export-manifest'` | A |
| 715 | GET `'/api/admin/cinematic/projects'` | S |
| 723 | GET `'/api/admin/cinematic/projects/:projectId'` | S |
| 731 | GET `'/api/admin/cinematic/video-tasks'` | S |
| 739 | GET `'/api/admin/cinematic/video-capabilities'` | S |
| 747 | DELETE `'/api/cinematic/projects/:projectId'` | A |

### server/app/routes/collectionRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 4 | GET `'/api/collections'` | A |
| 12 | POST `'/api/collections'` | A |
| 23 | GET `'/api/collections/:id'` | A |
| 34 | PATCH `'/api/collections/:id'` | A |
| 46 | DELETE `'/api/collections/default'` | A |
| 54 | DELETE `'/api/collections/:id'` | A |
| 65 | POST `'/api/collections/:id/images'` | A |
| 77 | DELETE `'/api/collections/:id/images/:jobId'` | A |
| 89 | PUT `'/api/collections/:id/default'` | A |

### server/app/routes/communityCollectionRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 6 | POST `'/api/community/collections/:collectionId/publish'` | A |
| 19 | GET `'/api/community/posts/:postId/collection-items/:itemId/:mediaKind(image\|thumbnail)'` | O* |

### server/app/routes/communityComparisonRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 7 | POST `'/api/community/comparisons/:setId/publish'` | A |
| 20 | GET `'/api/community/posts/:postId/comparison-slots/:slotId/image'` | O* |
| 34 | GET `'/api/community/posts/:postId/comparison-slots/:slotId/:mediaKind(video\|poster)'` | O* |
| 49 | GET `'/api/community/posts/:postId/comparison-slots/:slotId/presentations/:profileId'` | O* |

### server/app/routes/communityCreatorRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 18 | GET `'/api/community/creator-profiles/me'` | A |
| 27 | PATCH `'/api/community/creator-profiles/me'` | A |
| 39 | PATCH `'/api/community/creator-profiles/me/presentation'` | A |
| 51 | GET `'/api/community/creators/:handle/page'` | O* |
| 64 | GET `'/api/community/creators/:handle'` | O |
| 76 | GET `'/api/community/creators/:handle/posts'` | O |
| 89 | POST `'/api/community/creators/:profileId/follow'` | A |
| 101 | DELETE `'/api/community/creators/:profileId/follow'` | A |

### server/app/routes/communityEngagementRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 19 | GET `'/api/community/posts'` | P |
| 36 | GET `'/api/community/posts/:postId/engagement'` | A |
| 45 | POST `'/api/community/posts/:postId/views'` | A |
| 59 | PUT ``/api/community/posts/:postId/reactions/${reactionType}`` | A |
| 74 | DELETE ``/api/community/posts/:postId/reactions/${reactionType}`` | A |
| 90 | GET `'/api/community/posts/:postId/comments'` | A |
| 103 | POST `'/api/community/posts/:postId/comments'` | A |
| 118 | DELETE `'/api/community/posts/:postId/comments/:commentId'` | A |
| 132 | POST `'/api/community/posts/:postId/comments/:commentId/report'` | A |
| 148 | PUT `'/api/community/posts/:postId/comparison-vote'` | A |
| 162 | DELETE `'/api/community/posts/:postId/comparison-vote'` | A |

### server/app/routes/communityGalleryRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 17 | POST `'/api/community/gallery'` | A |
| 26 | GET `'/api/community/creators/:handle/gallery'` | O* |
| 37 | POST `'/api/community/gallery/:itemId/use-template'` | A |
| 46 | POST `'/api/community/characters'` | A |
| 55 | GET `'/api/community/creators/:handle/characters'` | O* |
| 66 | POST `'/api/community/characters/:itemId/use-character'` | A |
| 76 | GET ``/api/community/${resource}/:itemId/:mediaKind(image\|thumbnail)`` | O* |

### server/app/routes/communityModerationRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 14 | POST `'/api/community/posts/:postId/reports'` | A |
| 28 | GET `'/api/admin/community/reports'` | S |

### server/app/routes/communityReadinessRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 5 | GET `'/api/community/readiness'` | P |

### server/app/routes/communityShareRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 19 | GET `'/api/community/generations/:generationId/share-status'` | A |
| 28 | GET `'/api/community/template-previews'` | O* |
| 40 | GET `'/api/community/posts/:postId/template-detail'` | O* |
| 53 | POST `'/api/community/share-drafts'` | A |
| 66 | PATCH `'/api/community/share-drafts/:draftId'` | A |
| 79 | POST `'/api/community/share-drafts/:draftId/publish'` | A |
| 93 | DELETE `'/api/community/posts/:postId'` | A |
| 105 | GET `'/api/community/posts/:postId/:mediaKind(video\|poster)'` | O* |
| 121 | POST `'/api/community/video-share-drafts'` | A |
| 133 | PATCH `'/api/community/video-share-drafts/:draftId'` | A |
| 146 | POST `'/api/community/video-share-drafts/:draftId/publish'` | A |

### server/app/routes/communityTaxonomyRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 5 | GET `'/api/community/features'` | P |
| 16 | GET `'/api/community/taxonomy'` | P |

### server/app/routes/comparisonRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 13 | POST `'/api/comparisons/estimate'` | A |
| 21 | POST `'/api/comparisons'` | A |
| 30 | GET `'/api/comparisons'` | A |
| 38 | GET `'/api/comparisons/:setId'` | A |
| 46 | PATCH `'/api/comparisons/:setId'` | A |
| 54 | PATCH `'/api/comparisons/:setId/winner'` | A |
| 66 | DELETE `'/api/comparisons/:setId'` | A |

### server/app/routes/creditRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 11 | GET `'/api/credits/account'` | A |
| 22 | GET `'/api/credits'` | A |
| 37 | POST `'/api/credits/estimate'` | A |
| 81 | GET `'/api/credits/ledger'` | A |
| 92 | POST `'/api/credits/mock-grants'` | A |
| 111 | POST `'/api/credits/recharge'` | A |

### server/app/routes/fashionBlueprintRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 25 | POST `'/api/fashion-blueprints/assets'` | A |
| 32 | GET `'/api/fashion-blueprints/model-catalog'` | P |
| 39 | POST `'/api/fashion-blueprints/resolve'` | A |
| 60 | POST `'/api/fashion-blueprints/quotes'` | A |
| 67 | POST `'/api/fashion-blueprints/runs'` | A |
| 74 | GET `'/api/fashion-blueprints/runs/:id'` | A |
| 81 | GET `'/api/fashion-blueprints/runs'` | A |
| 93 | POST `'/api/fashion-blueprints/runs/:id/approve-proof'` | A |

### server/app/routes/generationJobCenterRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 2 | GET `'/api/generation/job-center'` | A |

### server/app/routes/generationRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 7 | GET `'/api/generation/look-sheet-preset'` | P |
| 8 | POST `'/api/generation/look-sheet-preview'` | A |
| 24 | POST `'/api/generation/prompt-preview'` | A |
| 48 | POST ``/api/generation/look-sheet-enhancement/${action}`` | A |
| 60 | GET `'/api/generation/look-sheet-enhancement/:id'` | A |
| 69 | POST `'/api/generate'` | A |
| 96 | GET `'/api/jobs/:id'` | A |
| 113 | GET `'/api/generation-groups/:id'` | A |
| 127 | GET `'/api/jobs/:id/stream'` | A |

### server/app/routes/historyRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 18 | GET `'/api/history'` | A |
| 55 | GET `'/api/history/:id'` | A |
| 67 | GET `'/api/history/:id/presentations/:profileId'` | A |
| 97 | DELETE `'/api/history/:id'` | A |

### server/app/routes/identityRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 8 | GET `'/api/me'` | O |
| 12 | GET `'/api/me/preferences'` | A |
| 20 | PATCH `'/api/me/preferences'` | A |
| 28 | GET `'/api/mock-users'` | F |

### server/app/routes/learningRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 31 | GET `'/config'` | O |
| 39 | GET `'/catalog'` | S |
| 44 | POST `'/catalog'` | S |
| 47 | GET `'/catalog/:id'` | S |
| 51 | PATCH `'/catalog/:id'` | S |
| 54 | DELETE `'/catalog/:id'` | S |
| 55 | POST `'/catalog/:id/publish'` | S |
| 56 | POST `['/purchases', '/catalog/:id/purchase']` | S |

### server/app/routes/mediaExportRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 2 | POST `'/api/media/exports'` | A |

### server/app/routes/promptComposerRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 10 | POST `'/api/prompt-composer/proposals'` | A |

### server/app/routes/referenceHandoffRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 11 | POST `'/api/reference-handoffs/face'` | A |

### server/app/routes/referenceRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 10 | POST `'/api/references'` | A |
| 24 | POST `'/api/references/composites'` | A |
| 38 | GET `'/api/references/processing-policy'` | P |
| 46 | POST `'/api/references/processing-plan'` | A |

### server/app/routes/sceneTemplateRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 28 | POST `'/api/scene-templates/share-drafts'` | A |
| 39 | POST `'/api/scene-templates/share-drafts/:draftId/publish'` | A |
| 82 | GET `'/api/scene-templates/shared'` | O* |
| 92 | GET `'/api/scene-templates/shared/:postId'` | O* |
| 101 | GET `'/api/scene-templates/shared/:postId/presentations/:profileId'` | O* |
| 132 | GET `'/api/scene-templates/shared/:postId/:mediaKind(image\|thumbnail)'` | O* |
| 156 | PATCH `'/api/scene-templates/shared/:postId'` | A |
| 169 | POST `'/api/scene-templates/shared/:postId/moderate'` | S |
| 182 | PATCH `'/api/scene-templates/shared/:postId/taxonomy'` | S |
| 195 | POST `'/api/scene-templates/shared/:postId/use-template'` | A |
| 214 | POST `'/api/scene-templates/remix-events'` | A |

### server/app/routes/templateRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 11 | GET `'/api/templates/:templateId/input-policy'` | A |
| 18 | GET `'/api/templates'` | P |
| 39 | GET `'/api/templates/:templateId'` | P |
| 58 | POST `'/api/templates/:templateId/use-sessions'` | A |
| 81 | POST `'/api/templates/:templateId/archive'` | A |
| 93 | GET `'/api/templates/:templateId/pose-proxy'` | A |
| 105 | POST `'/api/templates/:templateId/pose-proxy/estimate'` | A |
| 117 | POST `'/api/templates/:templateId/pose-proxy/prepare'` | A |
| 131 | POST `'/api/templates/:templateId/pose-proxy/:proxyId/review'` | A |

### server/app/routes/videoGenerationRoutes.js

| Line | Method and registered path expression | Class |
|---|---|---|
| 15 | GET `'/api/generation/video/capabilities'` | P |
| 37 | POST `'/api/generation/video/quote'` | A |
| 48 | GET `'/api/generation/video/trusted-sources'` | A |
| 60 | POST `'/api/generation/video/tasks'` | A |
| 74 | GET `'/api/generation/video/tasks'` | A |
| 87 | GET `'/api/generation/video/tasks/:taskId'` | A |


