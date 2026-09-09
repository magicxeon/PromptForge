# Comparison Export Interaction

Status: implemented and verified; evidence in 029. Owner: shared media controls / ComparisonWorkspace.

- Only the aggregate Comparison download command becomes gold, using Engine
  action tokens. Per-image and Look Sheet downloads retain current appearance.
- Open a compact accessible dialog with selected output/model summary, Auto /
  portrait / landscape, PNG / JPEG, Standard / High, preview, Fit/zoom, Download.
  Keep existing viewer controls and sibling actions. No theme/decorations picker.
- Initial selection is all completed images for 2-4; larger runs require choosing
  2-4 explicitly. Maintain run order; never reorder by loading completion.
- Preparing shows the shared yellow spinner and disables Download. Final encoded
  preview must decode before enabling Download; show actual dimensions and warnings.
- Selection/settings changes abort or invalidate old requests and revoke obsolete
  object URLs; never display/download a stale result. Actor switch/unmount cancels
  work and clears private preview. No durable blobs/base64/cache or auto-publication.
- Retry only Export; preserve selection on failure. Cancel/close remains available.
  Download uses the ready blob with a sanitized timestamp filename; report Download
  started, not Saved. Browser save dialogs are not evidence of disk persistence.
- Radix dialog keyboard/focus behavior, localized EN/TH labels, fit preview on
  mobile without rearranging the exported grid; retain controls at 390/820/1440.
- Full labels and stable output order remain available as semantic DOM content.
