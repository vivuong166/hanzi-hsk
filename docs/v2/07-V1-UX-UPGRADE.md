# V1 UI/UX upgrade contract

Date: 21/10/2026

## Product direction

This work is a visual and usability upgrade of V1. It is not a replacement
application. `src/App.tsx` is the active runtime until a successor has
verified feature parity and a safe migration rehearsal.

## Non-negotiable compatibility contract

The following behavior remains owned by V1 and must keep working while its
visual components are improved:

| V1 capability | Compatibility requirement |
| --- | --- |
| Account session | Keep the existing auth endpoints and cookie behavior. |
| Learning state | Keep `hanzi.learning-state.v1.user-<id>` and `/api/learning-state` active. |
| Flashcards | Preserve deck selection, due/new queue, card flip, keyboard ratings and scheduling. |
| Vocabulary | Preserve search, audio trigger, favorites and difficult-word flags. |
| Grammar | Preserve per-lesson completion state. |
| Exercises and notebook | Preserve generated/curated exercise flow, mistake capture and retry. |
| Typing | Preserve pinyin normalization, timing and session summary. |
| Analytics | Continue deriving the dashboard from actual V1 activity only. |
| Mock exam | Preserve access and existing state, while keeping its non-official status explicit. |
| Admin activity | Preserve role-gated access. |

## UI direction

The V1 visual layer uses the Calm Hanzi Studio direction from the references:

- quiet ivory canvas, jade action color, ink text and soft warm accent;
- rounded, lightly elevated surfaces instead of dense panes;
- a stable desktop study rail and a compact mobile bottom navigation;
- clear daily-progress and primary-study hierarchy;
- flashcards with more breathing room and rating controls that remain easy to tap.

The presentation-only layer is `src/v1-modern.css`, loaded after the legacy
stylesheet. It must not change React state, storage, API requests or review
scheduling.

## Implementation order

1. Keep V1 as the entry point and stabilize the global shell.
2. Refresh dashboard, navigation and flashcard presentation without changing
   their behavior.
3. Refresh vocabulary, grammar, exercise, typing, analytics and auth surfaces
   in the same way.
4. Test each retained V1 flow before considering any V2 route for production.

## Current verification boundary

Typecheck, unit tests and production build pass after returning V1 to the
entry point. The available browser provider has no browser surface, so this
environment cannot yet provide screenshot or viewport verification.
