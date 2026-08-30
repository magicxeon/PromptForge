# 002 - Meta Muse Provider Adapter And Normalization

Status: Hidden Base64 adapter scaffold implemented; live response evidence and
URL normalization remain blocked
Depends on: Requirement 001 evidence gate

## 1. Purpose

Implement one Meta Muse transport adapter behind the existing image Generation
workflow. The adapter translates only verified provider fields and returns the
same normalized output contract as other image providers.

## 2. Runtime Placement

```text
server/providers/MetaMuseProvider.js
server/providers/providerAdapters.js
server/config/providers.json
test/metaMuseProvider.test.js
test/fixtures/providers/meta-muse/
```

Do not add a Meta-specific route, queue, History repository, Credit service, or
frontend API client.

## 3. Adapter Contract

`MetaMuseProvider` extends `BaseProvider` and implements:

```js
generateImage(prompt, options)
```

The first implementation supports only verified text-to-image generation. It
must:

1. require a non-empty server-side API key;
2. resolve base URL from `META_MUSE_BASE_URL` with the verified production URL
   as the default;
3. apply a bounded timeout from `META_MUSE_API_TIMEOUT_MS`;
4. send `model`, `prompt`, and `n: 1` only until other fields are verified;
5. reject references, edit requests, unsupported size/resolution, unsupported
   output count, and unsupported streaming before network dispatch;
6. validate HTTP status and response content type;
7. normalize successful output to `{ base64, mimeType, usage?, providerMetadata? }`;
8. download an expiring provider URL server-side when that is the verified
   response form, enforce byte/content limits, and persist through the existing
   output pipeline;
9. never return an API key, raw response body, or signed URL to normal logs;
10. surface a stable request ID when Meta provides one.

## 4. Error Normalization

Map verified errors to the existing Generation error categories while retaining
provider details only in safe server diagnostics:

| Provider condition | Product behavior | Retry |
|---|---|---|
| invalid request/model | terminal user/config error | no |
| authentication/permission | provider unavailable/configuration error | no |
| moderation/safety | terminal policy error with safe user message | no |
| rate limit | retryable only when retry headers and idempotency safety permit | bounded |
| provider 5xx | provider failure | bounded only when duplicate billing is impossible |
| timeout/network | provider unreachable | bounded only under same idempotency rule |
| malformed success payload | provider response error | no automatic paid retry |

Never retry a create request merely because the response was lost unless Meta
provides a verified idempotency or operation lookup contract. Avoid duplicate
images and duplicate provider charges.

## 5. Request And Response Validation

- Prompt length is validated before dispatch using verified limits.
- Response MIME must be an approved raster image type.
- Decoded bytes must be non-empty and within the existing image output limit.
- URL downloads must reject redirects to unsafe schemes or private network
  targets and must use bounded redirects/timeouts.
- Provider usage values are stored only when documented; do not fabricate token
  or image cost fields.

## 6. Debug And Observability

Optional diagnostics use `META_MUSE_DEBUG=false` and existing logging patterns.
Safe fields include event, provider/model, request ID, latency, status, output
MIME, output byte count, and a prompt fingerprint. Do not log raw prompt text,
authorization headers, Base64, signed URLs, or provider response bodies.

## 7. Automated Tests

Mock transport; automated tests must not call Meta or spend money.

- exact minimal create payload;
- authorization and content-type headers without snapshotting the secret;
- successful Base64 response normalization;
- successful URL response normalization if verified;
- empty/malformed success rejection;
- each stable provider error mapping;
- timeout and network failure behavior;
- references/edit/unsupported controls rejected before fetch;
- no raw prompt, token, Base64, or signed URL in debug logs;
- Provider Factory resolves the adapter only when registered and configured.

## 8. Acceptance Criteria

- One adapter serves every product surface through Generation.
- Only documented request fields are sent.
- Outputs use the existing normalized provider contract.
- Error behavior is deterministic and Credit settlement remains owned by the
  existing Generation lifecycle.
- Existing provider adapters and tests are unchanged in behavior.
