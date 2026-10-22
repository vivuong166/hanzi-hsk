# V1 learning UX enhancements

Date: 22/10/2026

## Goal

Make the existing V1 study loop easier to continue and personalize without
replacing its routes, scheduler, account session, or persisted learning state.

## Delivered improvements

| Need | V1 implementation |
| --- | --- |
| Find a word quickly | Global search covers Hanzi, pinyin, Vietnamese meaning and topic. Selecting a result opens that exact V1 word detail and records up to eight recent lookups. |
| Keep words by purpose | Learners can create personal notebooks, add a word from its detail panel, remove it later, and start a review queue for one notebook. Favorite and difficult words are available as smart collections. |
| Review intentionally | A notebook review uses the same existing V1 rating and scheduling path. Its result shows the actual count rated `again`/`hard` and `good`/`easy`; it does not invent an accuracy percentage. |
| Learn a word in context | The detail panel shows same-topic words and an existing grammar reference when content provides one. Pinyin in those suggestions can be hidden. |
| Adjust the study environment | Preferences persist in the V1 learning state: auto pronunciation, speech speed, related-word pinyin, font size, and daily new-word goal. |
| Practice output safely | The freehand canvas is an unscored writing space. Optional browser speech recognition shows a transcript only after an explicit microphone action; it is not presented as pronunciation scoring. |
| Preserve mobile access | The compact bottom navigation has a `Thêm` sheet for secondary study areas, notebooks, settings and role-gated admin activity. |

## Persistence and compatibility

The additions live in `LearningState`, inside the existing
`hanzi.learning-state.v1.user-<id>` backup and existing learning-state API
payload. `hydrateLearningState()` supplies defaults for accounts that have an
older saved V1 state, including old states without any preferences or notebook
fields.

The server's page-view allow-list accepts the two new V1 views (`notebooks`
and `settings`) so normal telemetry does not reject them.

## Deliberate boundaries

- Freehand input does **not** recognize or score stroke order.
- Speech recognition is browser-dependent and does **not** assess tone or
  pronunciation quality.
- The existing mock exam remains a practice feature, not an official exam.
- Community, public rankings, AI-generated answers, paid speech assessment and
  handwriting recognition need a separate product, privacy and service design;
  none are represented as already available.
