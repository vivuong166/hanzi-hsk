# V2 upgrade contract — inherited from V1

Date: 22/10/2026

## Product decision

V2 is an upgrade of HANZI V1, not a separate demo and not a reset of a
learner's account. Existing V1 content, account identity, and learning
history must remain available throughout the upgrade.

`src/v2/` may become the active experience only after the account's V1 data
has passed the migration gate described below. Until then, `src/App.tsx`
remains the active learner runtime.

## Non-destructive data contract

1. Never delete or overwrite `learning_states.state` during the V2 rollout.
2. Preserve the full original V1 JSON payload in an immutable
   `v1_import_runs.source_snapshot` before writing any V2 learning records.
3. Preserve V1 account identity (`users.id`) and legacy vocabulary IDs. Map
   to the V2 canonical identity; do not invent a mapping for an unknown ID.
4. Import records with deterministic checksum-derived idempotency keys. A
   retry must not duplicate review events, flags, completions, or attempts.
5. Keep fields without a V2 home (for example legacy mock-exam data and
   personal notebooks until that V2 feature exists) inside the immutable V1
   snapshot and surface their migration status honestly.
6. Make V2 the only writer for a learner's new review events only after that
   learner has completed handover. V1 remains a fallback/reference during the
   rollout; it is not a second concurrent study writer.

## Handover gate per account

```
V1 learning state (authoritative)
        |
        | snapshot + checksum
        v
V1 import report -----> unmapped / legacy-only items retained in snapshot
        |
        | count and ownership validation
        v
V2 review cards, immutable events, flags, mistakes, completions
        |
        | learner sees result; no silent activation
        v
V2 becomes that account's active learning writer
```

The gate must be blocked when any of these is false:

- a database-copy rehearsal has not passed;
- V2 migrations and content identity seed are not installed;
- the V1 snapshot was not written or checksum/idempotency validation fails;
- imported count/report cannot be shown to the learner or operator;
- an unresolved V1 update would make the imported snapshot stale.

## Mapping scope

| V1 state | V2 destination | Treatment |
| --- | --- | --- |
| Account and `users.id` | Same user | Kept; no new account is created. |
| Reviews | `review_cards` + baseline `review_events` | Imported with original due date, interval, repetitions, lapses and rating. |
| Favorites / difficult flags | `user_word_flags` | Imported per canonical vocabulary entry. |
| Mistakes / curated completions | `mistake_records` / `content_completions` | Imported only when the content ID is known. |
| Daily activity | `learning_activity_summaries` | Kept as `v1_aggregate`, never converted into fake fine-grained events. |
| Goal and curriculum setting | `user_settings` | Imported if valid. |
| Theme, preferences, notebooks, recent lookups | V1 snapshot first; dedicated V2 settings/notebook domain before feature parity | Not discarded and never guessed. |
| Typing attempts / legacy mock exams / unknown items | V1 snapshot + `legacyOnly` report | Preserved but not misrepresented as V2 verified practice/exams. |

## Rollout sequence

1. **Compatibility baseline:** test V1 import plan, content aliases and all
   V2 API ownership rules without changing runtime.
2. **Database rehearsal:** backup a database copy; apply V2 migrations, seed
   content and import representative V1 accounts twice. Reconcile counts and
   review every `unmapped` item.
3. **V2 learning parity:** finish V2 review, settings, word flags and mistake
   retry against event APIs. Add migration-status UI; no placeholder personal
   metrics.
4. **Opt-in handover:** an authenticated learner gets a clear migration
   result before V2 is enabled for that account. V1 data remains intact.
5. **Default V2:** only after V2 E2E, accessibility, mobile and sync checks
   pass. V1 stays recoverable until a separately approved retirement plan.

## Explicit non-goals for the first V2 release

- No automatic bulk migration on login.
- No destructive database operation in a feature deploy.
- No claim that a legacy mock exam becomes an official/validated exam.
- No fake pronunciation score, handwriting recognition, or AI tutor.
