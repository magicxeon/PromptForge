# ModelPromptForge Project Requirements

## 1. Product Vision

ModelPromptForge is an AI image creation platform for users who want high-quality, photorealistic images without needing to understand prompt engineering.

The product combines:

- a structured prompt builder
- visual character creation controls
- multi-provider AI image generation
- image history and model comparison
- reusable character references
- future community, creator, and marketplace workflows

The long-term direction is to become a creative ecosystem for Fashion, Product Photography, Commercial Content, Character Creation, and AI image workflow sharing.

## 2. Core Goal

Help users create consistent AI-generated images by choosing visual and semantic options instead of writing prompts manually.

The app should guide the user through a continuous workflow:

```text
Headshot Grid -> Character Sheet Builder -> Story Mode
```

The generated output from one mode should naturally become an input for the next mode.

## 3. Target Users

Primary users:

- creators who generate AI portraits, fashion images, product shots, and commercial visuals
- non-technical users who do not understand prompt terminology
- users who want consistent characters across multiple images
- future creator/marketplace sellers who share prompts, workflows, and reusable character assets

The UX should feel closer to character creation in a game than to writing technical image prompts.

## 4. Current Application Modes

### 4.1 Headshot Grid

Purpose:

- create realistic face/headshot outputs
- define identity, face structure, hair, skin, and expression
- provide a starting point for reusable character creation

Key features:

- visual option controls for face shape, eyes, eyebrows, nose, lips, expression, hair, skin, and makeup
- prompt cleanup rules to remove contradictory wording
- admin prompt preview for validation
- direct-camera, front-facing headshot constraints
- next-step handoff to Character Sheet Builder

### 4.2 Character Sheet Builder

Purpose:

- create reusable character reference sheets for story/scene generation
- define identity, body silhouette, sheet layout, outfit, and clothing reference
- act as the canonical character asset for future Story Mode images

Key features:

- visual character controls
- body silhouette controls by gender
- outfit base controls by unisex/male/female groups
- clothing color pickers
- pattern and material controls
- outfit front/back reference upload
- modest default fallback clothing
- source ownership rules for identity/body/outfit
- cleanup rules for legacy fields and unsafe controls
- next-step handoff to Story Mode

### 4.3 Story Mode

Purpose:

- generate scene, fashion, product, lifestyle, and commercial images using selected or referenced characters
- compose pose, environment, lighting, camera, and story context

Key features:

- character sheet reference input
- face/style/pose reference support when provider allows it
- fashion direction and scene story controls
- prompt templates for different contexts
- future support for story continuity and multi-image workflows

## 5. Multi-Provider Image Generation

The app supports multiple AI providers and models from one interface.

Planned and/or implemented provider families include:

- OpenAI image models
- Gemini image models
- Grok image models
- BytePlus ModelArk Seedream models

Provider behavior must be capability-aware:

- some models use pixel width/height
- some models use fixed resolution presets such as 1K, 2K, or 4K
- some models support image references
- some models do not support image references
- some models support output format options
- some models do not support custom output format
- some models may support seed/randomness controls in the future

The UI must show only controls relevant to the selected provider/model.

## 6. Generation Engine Requirements

Core generation behavior:

- compile prompt from structured selections
- support admin editable prompt preview
- generate images through the selected provider/model
- show active render state
- scroll to Active Render Screen when generation starts
- support queued/background generation
- support provider streaming or polling fallback
- show generation metadata such as model, duration, aspect, and provider
- persist generated results in history

Error behavior:

- show user-readable error
- show technical details when available
- preserve request/provider metadata for debugging
- handle provider-specific validation errors gracefully

## 7. Model Comparison

The app includes AI model comparison features.

Purpose:

- compare multiple providers/models using the same prompt/configuration
- estimate credits before running comparison
- keep comparison sets in history
- show result grid and comparison metadata

Requirements:

- comparison should respect provider capabilities
- unsupported resolution/provider combinations should auto-fallback or show validation
- comparison results should not automatically trigger single-image handoff unless the user explicitly chooses a result

## 8. History, Collections, and Lineage

Generated outputs should become reusable assets.

The app should track:

- image URL
- prompt
- provider
- model
- timestamp
- generation duration
- reference parent job IDs
- face reference lineage
- style reference lineage
- character reference lineage
- outfit reference lineage
- future handoff lineage

History features:

- image grid
- pagination/load more
- lightbox detail view
- download original image
- use result as reference
- add image to collection
- show parent reference lineage when available

Collections:

- user can create collections
- user can assign generated images to collections
- future community sharing will build on collections

## 9. Cross-Mode Character Workflow

The app should support a continuous creation pipeline.

### 9.1 Headshot to Character Sheet

After successful Headshot generation, show:

- `Build Character`

On confirm:

- switch to Character Sheet Builder
- carry compatible Character, Face, Hair, and Skin attributes
- attach generated headshot as Face Match if provider supports image references
- reset or leave Body/Clothing fresh by default
- re-render form and update prompt preview

### 9.2 Character Sheet to Story Mode

After successful Character Sheet generation, show:

- `Use as Story Character`

On confirm:

- switch to Story Mode
- restore Story Mode state
- attach generated character sheet as Character Reference if provider supports image references
- keep character-owned fields controlled by the reference
- let user continue with scene, pose, environment, lighting, and camera controls

### 9.3 Story Mode Result Actions

Story Mode result actions should focus on iteration:

- use as style reference
- create variant
- save to collection
- future share prompt/workflow

## 10. Visual Character Builder Asset System

The app uses visual option controls to help users select attributes without knowing technical terms.

Asset principles:

- visual options use consistent manifests
- each visual option maps to an attribute ID
- runtime assets live under `client/assets/visual-character-builder`
- source sheets and authoring manifests live under `visual-assets/character-builder`
- slicing scripts generate runtime assets from source sheets
- user-created icons can be added manually following the visual setup manual

Visual option categories include:

- face shape
- eyes
- eyebrows
- nose
- lips
- expression
- hair length/style/texture/fringe
- skin appearance
- body silhouette
- outfit base
- pattern/material

The visual system should remain structured so it can later move from JSON manifests to database-backed admin configuration.

## 11. Prompt System

The prompt compiler should:

- assemble structured selections into natural-language prompts
- respect mode-specific prompt rules
- remove duplicated or contradictory phrases
- avoid off-camera wording in headshot and character sheet outputs
- support custom color picker values
- support provider-safe prompt details
- include negative quality guidance such as avoiding CGI look and AI artifacts

Prompt modes:

- Headshot prompt
- Character Sheet prompt
- Story/normal prompt
- comparison prompt

Admin users should be able to view and edit the live prompt preview before generation.

## 12. Attribute and Schema System

The app loads attributes from JSON files in `attributes/`.

Important groups:

- Character
- Face
- Hair
- Skin
- Body
- Clothing
- Pose
- Environment
- Lighting
- Camera
- Quality
- Fashion Direction
- Scene Story

Mode policies decide which groups appear in each mode.

Character Sheet cleanup rules:

- hide NSFW controls
- hide GPT-Safe Mode controls
- hide Outfit Preset
- hide product-only clothing fields
- use Outfit Base as canonical clothing selector
- use Primary/Secondary color pickers instead of color preset cards
- remove non-binary from MVP
- prune incompatible legacy selections

## 13. Safety and Content Scope

Current MVP scope:

- realistic adult humans
- safe children where explicitly supported by safe portrait rules
- clothed, non-sensual character references
- fashion/commercial content
- product and lifestyle scenes

Excluded from MVP:

- NSFW generation controls
- sensual pose controls
- revealing clothing controls
- non-binary identity option
- community self-moderation assumptions

The product should default to safe, commercial-friendly, reusable image generation.

## 14. Community Platform Direction

The Community Platform is planned as a prompt discovery, remix, and creator community for AI image generation.

It is not intended to start as a generic social network. The first purpose is to help users discover strong generated images, inspect the prompt/workflow behind them, and reuse or remix those workflows inside Studio.

Primary community loop:

```text
see strong image -> inspect shared prompt/workflow -> remix in Studio
-> generate new image -> share back to Community
```

MVP community vision:

- share prompts
- share generated images
- share collections
- share prompt/config snapshots from history
- remix shared prompts directly into Studio
- follow creators
- like and save/bookmark
- discover trending prompts/images by official taxonomy
- browse categories such as Fashion, Product Photography, Beauty, Portrait, Commercial Photography, Thai Fashion, Korean Fashion, AI Idol, Advertisement, and Storytelling

Future creator system:

- creator profile
- ranking
- badges
- followers
- portfolio
- workflow library
- memberships
- marketplace
- creator statistics

MVP community should start small:

- community-first home with a compact workflow launcher
- structured freestyle prompt composer
- public/shared prompt pages
- creator profile basics
- collections
- discovery/trending
- post detail page with `Use / Remix Prompt`
- official taxonomy and auto-classification
- basic safety, moderation, and reporting

Deferred community features:

- paid prompt marketplace
- creator membership
- comment threads
- creator ranking leaderboard
- public collection marketplace
- revenue sharing
- advanced recommendation engine

Community must reuse core platform services for identity, ownership, assets, generation results, collections, jobs, and audit. It should own only community-specific domain records such as posts, creator profiles, follows, likes, taxonomy tags, reports, and remix events.

## 15. Commercial and Fashion Selling Direction

ModelPromptForge is also planned as an AI Visual Commerce Studio for creating images that help people sell clothing, products, and commercial content.

The commercial direction focuses especially on Thai small merchants, creators, agencies, and online sellers who need product-ready images without hiring a photographer, studio, and model for every campaign.

### 15.1 Commercial Product Purpose

The platform should help users create:

- fashion selling images for clothing, shoes, bags, accessories, and jewelry
- product photography and lifestyle product images
- product review and UGC-style images
- advertising and campaign visuals
- lookbook and fashion editorial images
- storyboard frames for short-form video, product reviews, and brand stories
- consistent multi-image sets using the same model, scene, lighting, and style
- marketplace-ready exports for Shopee, Lazada, Facebook, Instagram, TikTok, and website banners

The goal is to move from a general prompt/character generation tool into a solution-first commerce workflow:

```text
choose business goal -> upload product/reference -> select model/style/scene
-> estimate credits -> generate batch -> approve/regenerate -> export marketplace package
```

### 15.2 First Commercial Solution: Fashion Selling

Fashion Selling is the first planned commercial module.

Target user:

- small merchants
- online clothing shops
- fashion creators
- agencies producing repeated commercial visuals

Core workflow:

```text
Create Fashion Project
-> Upload product images
-> Select or create model profile
-> Select scene and photographer style
-> Configure consistency profile
-> Review credit estimate
-> Generate batch
-> Approve or regenerate
-> Export platform-ready image set
```

MVP outputs:

- cover image
- product/lifestyle image
- detail shot
- collection overview
- social-ready image
- marketplace-ready crop/export

### 15.3 Product Selling and Review Workflows

Future Product Selling workflows should support:

- product catalog upload
- product item metadata
- product-in-use scenes
- tabletop/e-commerce product images
- hand-held product shots
- premium product hero images
- product review persona
- UGC/lifestyle review imagery

This is intended for categories such as beauty, skincare, cosmetics, accessories, food, drinks, gadgets, home goods, and digital-commerce products.

### 15.4 Photographer Style Library

Commercial workflows should provide photographer-style presets so users can choose a visual direction without knowing photography terms.

Planned style families:

- Clean Premium Advertising
- Luxury Campaign
- Colorful Commercial
- Minimal Product Hero
- Fashion Editorial
- Korean Minimal
- Thai Contemporary
- Resort Fashion
- White Background E-commerce
- Premium Marketplace
- Product Review Lifestyle
- Storytelling/Cinematic

Each style should map to camera, lighting, composition, background, quality, and prompt segments.

### 15.5 Marketplace Export Presets

Approved images should be exportable into platform-ready packages.

Initial export targets:

| Platform | Typical Ratio |
| --- | --- |
| Shopee | 1:1 |
| Lazada | 1:1 |
| Facebook Feed | 4:5 |
| Instagram Feed | 4:5 |
| Instagram Story | 9:16 |
| TikTok | 9:16 |
| Website Banner | 16:9 |

Export package structure:

```text
project-name/
  shopee/
  lazada/
  facebook/
  instagram/
  tiktok/
  original/
```

### 15.6 Commercial Platform Foundation

The commercial platform should evolve into a modular monolith first.

Core platform services:

- application shell and module registry
- authentication, sessions, and authorization
- projects and ownership
- assets and storage
- product catalog
- collections
- credit ledger and transaction integrity
- packages, pricing, checkout, and payments
- durable jobs and batch orchestration
- provider gateway
- audit and support operations

Reusable modules:

- Visual Character Builder
- Product Catalog
- Model Profiles
- Consistency Profiles
- Approval Gallery
- Export Presets
- Photographer Style Library

Solution modules:

- Fashion Selling
- Product Review
- Storyboard
- Commercial Marketplace later

Solution modules must not call image providers directly, mutate balances, or bypass ownership checks. They create validated generation plans and invoke core application services.

## 16. Technical Architecture

Current architecture:

- Node-backed web app
- vanilla HTML/CSS/JavaScript frontend
- modular browser scripts under `client/core`, `client/clothing`, `client/comparisons`, and `client/shell`
- provider-aware generation service on the server
- file-backed storage for development history/comparisons
- JSON-backed attributes and UI schema
- visual asset manifests for option cards

Key client areas:

- `client/index.html`: application shell and DOM anchors
- `client/app.js`: bootstrap and top-level event wiring
- `client/core/studioState.js`: global state, mode policy, field maps
- `client/core/formRenderer.js`: dynamic form rendering and visual controls
- `client/core/promptCompiler.js`: client prompt preview
- `client/core/generationService.js`: provider/model selection and request payloads
- `client/core/referenceManager.js`: image reference assignment and previews
- `client/core/lightboxService.js`: image detail/lightbox/lineage view
- `client/core/crossModeHandoff.js`: Headshot -> Character Sheet -> Story Mode workflow
- `client/clothing/*`: modular clothing prompt and visual config
- `client/comparison.js` and `client/comparisons/*`: comparison workflow and dashboard
- `client/shell/*`: navigation and routing

Key server areas:

- `server/server.js`: process bootstrap and HTTP listener
- `server/app/createApp.js`: Express composition and dependency wiring
- `server/app/routes/*`: capability-oriented HTTP routes
- `server/domain/generation/promptCompiler.js`: server-side prompt compiler
- `server/domain/generation/generationRequestService.js`: request normalization and lineage context
- `server/domain/generation/QueueManager.js`: background generation queue
- `server/domain/comparisons/*`: model comparison orchestration and validation
- `server/repositories/*`: JSON persistence adapters and future database boundary
- `server/data/*`: canonical local runtime data
- provider adapters/registry: provider-specific image generation behavior

Future platform modules:

- project service
- product item service
- asset storage service
- batch generation service
- credit ledger service
- billing/payment service
- photographer style service
- export service
- community post/remix service
- creator profile service
- moderation/reporting service

## 17. Testing and QA

Testing expectations:

- prompt cleanup tests
- character sheet persistence tests
- clothing prompt assembly tests
- cross-mode handoff tests
- provider payload tests
- visual asset manifest gate checks
- manual viewport/lightbox workflow checks

Important manual QA flows:

1. Generate Headshot.
2. Use `Build Character`.
3. Confirm Character Sheet opens with Face Match/reference behavior.
4. Generate Character Sheet.
5. Use `Use as Story Character`.
6. Confirm Story Mode opens with Character Reference.
7. Generate Story image.
8. Check history/lightbox lineage.
9. Compare providers with same prompt.
10. Confirm unsupported provider controls are hidden or disabled.
11. Future: create Fashion Project and generate a batch product image set.
12. Future: share generated image to Community and remix it back into Studio.

## 18. Server Architecture

The server is organized around clear runtime, domain, repository and route boundaries.

Current structure:

- `server/server.js` is the bootstrap file only: load environment, create app, listen and run startup warmers
- `server/app/createApp.js` composes Express middleware, route modules and shared dependencies
- `server/app/routes/*` owns HTTP endpoint registration by capability
- `server/domain/*` owns business behavior such as generation, credits, comparisons, collections, community sharing and scene-template rules
- `server/repositories/*` owns storage access and JSON adapter contracts
- `server/data/*` is the canonical local JSON runtime state root
- `server/config/paths.js` resolves canonical data paths and no longer falls back to old root JSON locations

Storage rules:

- no runtime JSON should live directly under `server/`
- JSON state should go through repositories or `server/repositories/json/jsonFileStore.js`
- root compatibility re-export files should not be reintroduced
- future database adapters should preserve current repository method contracts before changing route behavior

## 19. Roadmap Priorities

Near-term:

- stabilize cross-mode handoff UX
- finish Character Sheet Builder visual controls
- complete body build and sheet layout visual assets
- refine outfit base visual clarity
- add seed/randomness control if providers support it
- improve provider-specific validation
- clarify Community Home, Playground and shared generation component direction

Mid-term:

- Story Mode refinement
- reusable character library
- collection workflow
- prompt/workflow sharing
- landing page and guided onboarding
- database migration plan for attributes/assets/history
- Community Prompt Gallery + Remix MVP
- creator mini profile and follow
- official taxonomy and auto-classification
- fashion selling prototype
- product catalog and project ownership foundation

Long-term:

- community discovery
- creator profiles
- creator marketplace
- memberships
- workflow marketplace
- admin visual attribute configuration
- production database-backed asset/attribute management
- commercial Fashion Selling module
- Product Review workflow
- Thai Storyboard workflow
- photographer style library
- marketplace export presets
- durable batch generation and credit ledger
