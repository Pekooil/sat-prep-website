# iOS-to-Web Backend Requests

**Owner:** Native iOS coding session  
**Consumer:** Web/shared-backend coding session

Use this file when native implementation needs a contract or backend behavior change. The iOS session must not directly edit the OpenAPI contract, migrations, or TypeScript engines.

## Open requests

### Represent and query saved review items — `OPEN`

- Date: September 9, 2026
- Native feature blocked: Production Saved filter in the Review tab.
- Existing operation/schema: `GET /review`, `ReviewState`, and `ReviewItem` in OpenAPI 0.1.0.
- Requested behavior or field: Define a contract-backed way to query saved items and identify whether each returned review item is saved. This may be a separate `saved` query flag/collection plus an `isSaved` field; it does not need to make `saved` a review lifecycle state.
- Why existing contract is insufficient: `ReviewState` contains only `due`, `learning`, `retesting`, and `resolved`, while `ReviewItem` has no saved marker. The native product requirement includes a Saved filter.
- Backward-compatibility requirement: Keep the existing review lifecycle values and default `GET /review` behavior valid for older clients.
- Suggested acceptance test: Save a review item, request the Saved collection, and assert the item is returned with its lifecycle state unchanged and a stable saved marker.

### Provide classification presentation metadata and constrained Other detail — `OPEN`

- Date: September 9, 2026
- Native feature blocked: Live one-tap mistake classification with a constrained Something Else entry.
- Existing operation/schema: `POST /attempts/{attemptId}/classification`, `ClassificationRequest`, and `AttemptFeedback` in OpenAPI 0.1.0.
- Requested behavior or field: Return ordered classification options with stable IDs and student-facing labels in attempt feedback or bootstrap metadata. Allow an optional trimmed `otherText` only when `classification` is `other`, with a documented maximum length of 80 characters.
- Why existing contract is insufficient: The request accepts only the classification enum, so the server cannot supply presentation copy and a student cannot explain an Other reason. The mock-backed iOS foundation keeps both details behind repository types until the contract is ready.
- Backward-compatibility requirement: Continue accepting the existing classification-only body; make new response/request fields additive and optional for older clients.
- Suggested acceptance test: Verify a standard classification succeeds without detail, Other rejects blank or over-80-character detail, and a valid Other detail is stored and returned without exposing it in answer-safe question payloads.

## Request template

### Short request title — `OPEN`, `ACCEPTED`, `READY`, or `DECLINED`

- Date:
- Native feature blocked:
- Existing operation/schema:
- Requested behavior or field:
- Why existing contract is insufficient:
- Backward-compatibility requirement:
- Suggested acceptance test:
