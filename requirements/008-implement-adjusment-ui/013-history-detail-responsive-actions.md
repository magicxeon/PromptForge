# 013 My Image Responsive Action Bar

## Business Requirement

The owner must be able to inspect and manage a generated image from `My Images`
without action buttons overflowing, clipping, or causing horizontal page
scrolling. Download, collection, sharing, reference, and deletion actions must
remain discoverable at desktop and mobile widths.

## Software Design

`HistoryDetailRoute` remains the route owner. Its action region uses one
responsive layout contract:

- mobile uses a stable one- or two-column action grid;
- wider viewports use a wrapping horizontal toolbar;
- every direct action has a consistent minimum height and centered label;
- long translated labels wrap inside their own control instead of widening the
  page;
- destructive actions retain the shared danger treatment;
- dialogs remain reusable components and are not duplicated in the route.

The primary inspection image continues to use `object-fit: contain`.

## Implementation Plan

1. Update `web/src/features/history/routes/HistoryDetailRoute.tsx`.
2. Give the action region an explicit responsive grid/wrap layout.
3. Apply stable width and alignment to direct links and dialog triggers.
4. Verify English and Thai labels at approximately 390px and 1440px.

## Testing

- all available actions remain inside the information panel;
- no horizontal document scrolling at mobile width;
- Download remains a real original-media link;
- Collection, Share, Face Reference, and Delete dialogs still open;
- deleting an owned item still returns to My Images.
