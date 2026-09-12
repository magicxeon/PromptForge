# Seedance Composition Reference Browse

Owner: Playground Video UI; VideoGenerationApplicationService reference facade.
Primary: Product Requirement Architect. Review: Backend/security and QA,
sequential by implementer. Existing reference and Credit lifecycle retained.

## Scope And Ordered Plan

1. Expose allowImageReferenceUploads in the existing Seedance 2.x catalog policy.
2. Reuse PlaygroundVideoSources exactly as Seedance 1.0/Veo: enable its existing
   generated-image picker and Browse button in reference_image. No source switch
   or new mode. Preserve legacy selected images as local references.
   Browse uses existing owner-scoped PNG/JPEG/WebP upload (12 MiB), named image
   list and model reference limit. No Base64 in saved browser state.
3. The enabled reference-image list sends multimodal reference_image/image_reference, never
   first_frame. Standard reference preparation checks ownership, hash and count.
   Server permits this exception only for enabled models, Playground image mode,
   the standard plan and image_reference purposes. Character Look Sheet and
   dedicated trusted-source contracts keep their existing restrictions; Cinematic unchanged.
4. Uploaded composition references resolve as verified local bytes through the
   existing loader, not trusted Seedream URLs. Provider moderation remains active.
   No claim of sketch detection or guaranteed acceptance. Failed uploads and
   provider rejections must not clear prior selected images.
5. Focused offline reference/selection tests and type check. No paid generation
   or backend restart. Existing test-playground-video-references.mjs owns checks.

No new runtime paths, dependencies, pricing or approval bypass. Uploaded and
owned generated images can share the existing named reference list.
UI EN/TH labels and existing responsive source grid preserved. User generation
is separate UAT; optional composition-to-photorealism prompt remains user-authored.

Status: implemented. Backend reference suite 14/14; selection/shared upload UI
12/12; type check passed. Browser fixture EN/TH at 390/820/1440 passed six checks,
including quote reference parity and no clipping. Evidence directory:
C:/Users/punya/AppData/Local/Temp/mpf-video-references-layout-Slmvqs.
Runner groups: composition-browse, types, layout-composition (set
VIDEO_LAYOUT_ORIGIN to the running local Vite URL). No real provider acceptance
or generated quality claimed; user will test the sketch.
