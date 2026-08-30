# 001 - Meta Muse API Contract And Evidence Gate

Status: Proposed  
Depends on: none

## 1. Purpose

Establish a testable Meta Muse API contract before runtime implementation. This
gate prevents assumptions from leaking into provider capabilities, UI controls,
Credit quotes, or Fashion routing.

## 2. Confirmed Contract

The supplied example confirms only:

```http
POST https://api.meta.ai/v1/images/generations
Authorization: Bearer <server-side-secret>
Content-Type: application/json
```

```json
{
  "model": "muse-image-1.0",
  "prompt": "a watercolor painting of a red fox sitting in a snowy pine forest, soft golden morning light",
  "n": 1
}
```

This is a text-to-image candidate request. It does not prove the output schema
or any optional field.

## 3. Evidence To Capture Before Adapter Completion

Use an authorized development project and sanitized test prompt. Record no API
key or private media.

1. exact successful create response schema;
2. MIME type and whether media arrives as Base64, data URL, durable URL, or
   expiring URL;
3. request ID and provider correlation headers;
4. documented and observed timeout behavior;
5. validation-error response for an invalid model;
6. authentication-error response with a deliberately invalid test token;
7. moderation/safety response using a provider-safe test case;
8. rate-limit and retry headers if documented;
9. supported `n` range;
10. supported dimensions, aspect ratios, resolution, quality, and output format;
11. maximum prompt length and encoding requirements;
12. create-image pricing and billing unit;
13. edit endpoint method, content type, image field, mask behavior, reference
    count, accepted formats, byte limits, and response schema;
14. data retention and generated URL expiry policy.

## 4. Capability Matrix

| Capability | Initial state | Promotion evidence |
|---|---|---|
| text-to-image | candidate, confirmed request shape only | successful normalized live response |
| output count `n=1` | candidate | successful live request |
| output count `n>1` | disabled | documented limit plus parity tests |
| image editing | disabled | authenticated edit docs plus live fixture |
| image references | disabled | verified edit/reference semantics and limits |
| masks | disabled | verified edit contract |
| aspect ratio | no selectable capability | documented values plus live tests |
| resolution/size | no selectable capability | documented values plus live tests |
| streaming | disabled | explicit documented support |
| response format selection | disabled | documented values plus live tests |

If the API requires a size while the product requests an aspect ratio, define a
documented mapping in provider configuration. Do not let the adapter guess.

## 5. Contract Artifacts

Implementation should add sanitized fixtures under the existing automated test
fixture ownership, for example:

```text
test/fixtures/providers/meta-muse/create-success.json
test/fixtures/providers/meta-muse/create-validation-error.json
test/fixtures/providers/meta-muse/create-auth-error.json
```

Fixtures must remove tokens, signed URLs, user prompts, and private metadata.
If URLs expire, retain only a structurally equivalent placeholder.

## 6. Secret Naming Decision

The user-provided environment name is `META_MUSE_API-KEY`. Because hyphens are
awkward in many shells, the canonical name should be:

```text
META_MUSE_API_KEY
```

The Provider Registry should temporarily accept the supplied name as an alias:

```text
apiKeyEnv: META_MUSE_API_KEY
apiKeyEnvAliases: [META_MUSE_API-KEY]
```

The alias is compatibility-only. Neither value may appear in public catalogs,
logs, errors, snapshots, or browser bundles.

## 7. Documentation Verification Gate

Before implementation, an engineer must read the authorized versions of:

- `https://dev.meta.ai/docs/api-reference/images/create-image`
- `https://dev.meta.ai/docs/api-reference/images/edit-image`
- `https://dev.meta.ai/docs/api-reference/images/schemas`

Record the verification date and account/project context without storing
project secrets. If documentation and live behavior disagree, keep the feature
disabled and record the discrepancy.

## 8. Acceptance Criteria

- Every advertised capability has primary documentation and live evidence.
- Unknown fields remain absent from requests and catalog capabilities.
- Sanitized fixtures cover success and stable error categories.
- The canonical and compatibility secret names are documented.
- No paid or customer-facing route is enabled by this requirement alone.

