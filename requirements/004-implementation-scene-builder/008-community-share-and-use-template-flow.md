# Scene-008 Community Share and Use Template Flow

**Status:** Proposed - Awaiting Review  
**Feature type:** Community sharing and remix UX  
**Depends on:** Community-04 in requirements/005-implementation-community-plan, Community-05 in requirements/005-implementation-community-plan, Scene Template contract  
**Created:** 2026-07-18

## 1. Objective

Connect Scene Builder templates to Community so users can share and reuse workflows without typing prompts.

## 2. Share From Scene Builder

After generating a Scene image, show:

```text
Share Scene Template
Use as Character Reference
Save to Collection
```

`Share Scene Template` opens a share preview.

## 3. Share Preview

Show:

- Generated image.
- Template title and description.
- Prompt visibility.
- Replaceable variables.
- Reference slot policies.
- Suggested taxonomy tags.
- Provider/model summary.

## 4. Use Template

From Community post detail:

```text
Use Template
```

Flow:

```text
load post -> validate template snapshot
-> open Scene Builder
-> prefill guided/manual state
-> show replacement checklist
-> user fills required slots
-> generate
```

## 5. Prompt Visibility Behavior

Visibility modes from Community-04 in requirements/005-implementation-community-plan apply:

- Full Prompt: show prompt and allow direct copy.
- Partial Prompt: show safe sections only.
- Remix Only: hide sensitive prompt text but allow template use.
- Private Prompt: no template use unless owner enables a special reuse policy later.

## 6. Remix Event

Record:

- templateId
- sourcePostId
- userId
- generatedJobId after success
- replacement slot completion status

Do not log private uploaded image contents in analytics.

## 7. Acceptance Criteria

- Scene Builder output can open share preview.
- Community post can expose `Use Template`.
- Use Template opens Scene Builder with required slots clearly marked.
- Remix generates through the normal generation pipeline.

## 8. Software Development Specification

### 8.1 Share Preview Input

```text
sourceGenerationResultId
sceneTemplateSnapshot
promptVisibility
referenceSlotPolicies
taxonomySuggestions
```

### 8.2 Share Preview Process

1. Validate actor owns or can share the source result.
2. Sanitize template snapshot for selected visibility.
3. Validate reference slot policies.
4. Create or update draft Community post.

### 8.3 Use Template Process

1. Fetch public post detail.
2. Read sanitized template snapshot.
3. Hydrate Scene Builder state.
4. Show replacement checklist.
5. Generate through normal generation service.
6. Record remix event after successful generation.

## 9. Implementation Concerns

- `Use Template` must not require manual prompt copy/paste for Guided templates.
- `Remix Only` must not expose hidden prompt text through public APIs.
- Provider/model fallback must happen before generation, not after user fills replacements.
- Community should consume Scene Builder contracts rather than duplicating template logic.

## 10. Functional Technical Specification

### 10.1 Client Files

```text
client/scene-builder/sceneSharePreview.js
client/scene-builder/sceneTemplateHydrator.js
client/scene-builder/sceneReplacementChecklist.js
client/community/communityTemplateActions.js
client/community/communityPostDetail.js
```

### 10.2 Server Files

```text
server/sceneTemplates/SceneTemplateService.js
server/sceneTemplates/sceneTemplateSanitizer.js
server/community/CommunityPostService.js
server/community/CommunityRemixService.js
```

### 10.3 Required Functions

```text
createSceneShareDraft(sourceGenerationId, options) -> ShareDraft
prepareSceneSharePreview(sourceGenerationId) -> SharePreview
publishSceneTemplateShare(draftId, publishInput) -> CommunityPost
useSceneTemplate(postId, viewerContext) -> SceneTemplateUsePayload
recordSceneTemplateRemix(postId, templateId, generatedJobId) -> RemixEvent
```

### 10.4 API Shape Draft

```text
POST /api/scene-templates/share-drafts
GET /api/scene-templates/share-drafts/:id
POST /api/community/posts/:postId/use-template
POST /api/community/posts/:postId/remix-events
```

Endpoint names can change later, but responsibilities must remain separated.

### 10.5 Concerns For Implementing Agents

- Community post detail should not implement its own hydrator.
- Share preview must run reference privacy validation before publish.
- Remix analytics must not include uploaded image contents.
