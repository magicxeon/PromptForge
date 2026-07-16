# Community-02 Prompt Composer AI and Structured Freestyle

**Status:** Proposed - Awaiting Review  
**Feature type:** Prompt intelligence and config prefill  
**Depends on:** Visual Character Builder schema, model/provider gateway, shared audit  
**Created:** 2026-07-15

## 1. Objective

Allow users to describe an image idea in natural language while still producing a structured prompt/config that fits ModelPromptForge's existing dropdown-driven generation pattern.

Freestyle must not bypass the structured system. It should be a faster way to prefill it.

## 2. Product Principle

Prompt Composer AI is not just a chatbot that writes prettier prompts. Its job is to transform user intent into:

- Structured config values.
- Suggested dropdown selections.
- Missing-field questions only when required.
- Final prompt text in the platform's preferred pattern.
- Classification signals for community tags.

## 3. MVP Flow

```text
user writes idea
-> Prompt Composer AI extracts intent
-> system proposes structured config
-> user reviews and edits dropdowns
-> generate image
-> save, compare or share to community
```

Example:

```text
Input:
"อยากได้นางแบบใส่เดรสสีแดงถ่ายในคาเฟ่ แบบภาพโฆษณาเกาหลี"

Output:
Content Type: Fashion
Style: Korean Fashion, Commercial Photography
Subject: female model
Outfit: red dress
Environment: cafe
Lighting: soft natural window light
Camera: portrait campaign style
Prompt: structured final prompt
```

## 4. Structured Output Contract

Prompt Composer AI should return a machine-readable proposal:

```json
{
  "contentType": "fashion",
  "visualStyles": ["korean_fashion", "commercial_photography"],
  "marketContexts": [],
  "fieldSelections": [
    {
      "fieldId": "outfit",
      "valueId": "red_dress",
      "confidence": 0.86,
      "sourceText": "เดรสสีแดง"
    }
  ],
  "customPromptParts": {
    "subject": "female model",
    "scene": "inside a cafe",
    "lighting": "soft natural window light"
  },
  "missingFields": [],
  "safetyNotes": [],
  "finalPromptDraft": "..."
}
```

Exact field IDs must align with the Visual Character Builder schema.

## 5. User Control

- Show proposed config before generation.
- Users can edit dropdowns and text fields before generate.
- Low-confidence mappings should be visually marked for review.
- If Composer cannot map an idea to a supported field, keep it as a custom prompt part rather than inventing a dropdown option.
- Character/model selection should be injected through known identity fields and profile references.

## 6. Provider and Cost Policy

- If Prompt Composer AI uses a paid text model, the system must display or account for cost according to the platform billing policy.
- Composer must not start image generation by itself.
- Composer requests should be logged as prompt-assist operations without storing sensitive raw data in normal logs.

## 7. Acceptance Criteria

- Freestyle can produce editable structured config from natural language.
- Generated prompt follows existing quality rules and prompt order.
- Composer does not create unapproved official categories or dropdown values.
- Users can generate from the composed config without manually rebuilding the prompt.
- Community share flow can reuse Composer classification signals.
