# 006 Template Discovery and Reusable UI

## Business Requirement

Templates must be image-first and easy to discover wherever users browse work.
The final result is the strongest sales asset; technical metadata is secondary.

## Template Card

Required:

- full-frame final preview with professional Sharp presentation
- Template badge and category
- title and creator
- usage count, likes and saves
- usage credit price
- visible `Use Template` action
- prompt visibility indicator without revealing hidden content

## Template Detail

Required hierarchy:

1. large inspectable preview
2. creator and Template title
3. example result and description
4. inputs the user can replace
5. expected provider/model compatibility
6. usage price plus estimated generation price
7. Use Template primary action
8. engagement and more from creator

## Reuse

```text
TemplateCard
TemplateGallery
TemplateDetailPanel
TemplateHeroPreview
TemplateUseButton
TemplatePricingBadge
```

Feature routes provide data and callbacks. Components do not call providers or
create generation pipelines.

## Responsive and Accessibility

- preview remains prominent on desktop and mobile
- no cropped essential person/product content
- keyboard-accessible actions and dialog focus
- loading skeleton preserves layout
- Thai, English and Japanese labels fit
- hidden prompt state is communicated in text, not color alone

