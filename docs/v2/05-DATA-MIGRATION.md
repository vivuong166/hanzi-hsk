# HANZI V2 — Migration từ V1

## Nguồn V1

- Browser backup: `hanzi.learning-state.v1.user-<id>`.
- Server authoritative hiện có: `learning_states.state` theo `user_id`.
- Các trường V1: reviews, favorites, difficult, mistakes, activity, completedGrammar, completedExercises, typingAttempts và mockExamHistory.

## Mapping

| V1 | V2 | Ghi chú |
| --- | --- | --- |
| `reviews[wordId]` | `review_cards` + `review_events` baseline | ID vocabulary giữ ổn định; ghi provenance import |
| `favorites`, `difficult` | `user_word_flags` | Mỗi flag là một record có user ownership |
| `mistakes` | `mistake_records` | Chỉ map question còn canonical; còn lại giữ legacy payload |
| `activity` | `learning_activity_events`/legacy summary | Không suy diễn phút chính xác từ dữ liệu cũ |
| `completedGrammar`, `completedExercises` | completion/attempt import | Gắn version nội dung |
| `typingAttempts` | practice attempts nếu schema đủ | Nếu thiếu dữ liệu, lưu legacy backup |
| `mockExam*` | legacy-only | Không chuyển thành exam chính thức |

## Quy trình an toàn

1. Export/snapshot immutable state V1 và checksum trước khi ghi.
2. Migrate content trước, tạo bảng mapping `legacy_word_id -> curriculum_id + source_index`.
3. Dùng migration runner có `migration_run_id`, idempotency constraints và report số record imported/skipped/unmapped.
4. Rehearse trên database copy, chạy import hai lần, xác nhận lần hai không tạo thêm review/attempt.
5. Chỉ đánh dấu migrated sau validation. Giữ snapshot để rollback đọc được; không xóa blob V1 trong phase đầu.
6. Khi cả server và local backup tồn tại, chọn server state nếu đã migrate; local chỉ là fallback/import một lần có xác nhận, không được ghi đè silent.

## Mapper đã có (chưa chạy trên database)

`server/migrations/v1-learning-state.js` tạo một import plan thuần, không ghi DB. Plan chứa SHA-256 checksum ổn định theo nội dung và idempotency key có checksum cho review baseline/event, flags, mistake record, activity summary và completion canonical.

- ID vocabulary/grammar/exercise không xác định, exercise được sinh động của V1 và payload không hợp lệ được ghi `unmapped` + `legacyOnly`, không suy đoán mapping.
- `activity` được giữ như `v1_aggregate`, không được biến thành các event phút học giả.
- `typingAttempts` và `mockExam*` giữ nguyên `legacyOnly` cho đến khi domain đích có schema đã xác thực.
- Mapper có fixture test kiểm tra determinism, idempotency key, checksum và preservation. SQL migration runner và importer thủ công đã có, nhưng chưa chạy/rehearse trên database copy.

`hsk4-jianyì` có trong curated draft V1 nhưng không xuất hiện trong catalogue chuẩn 1.200 mục; nó bắt buộc ở `unmapped`/legacy snapshot, không được map bằng suy đoán.

## Lệnh vận hành (chưa chạy trong workspace này)

1. Tạo backup và database copy, chạy `npm run db:migrate` rồi `npm run db:seed-content` trên copy.
2. Rehearse `npm run db:import-v1 -- --user-id=<id>` hai lần; lần một tạo run/snapshot, lần hai trả `already_imported` và không tạo thêm event/attempt.
3. So sánh count `review_cards`, `review_events`, flags, mistakes, summaries, completions với report; kiểm tra `unmapped` và `legacyOnly` trước khi chạy production.
4. Chỉ sau khi rehearsal pass, chạy từng user trên database đã backup. Không xóa `learning_states` trong đợt import.

## Không migrate bằng suy đoán

Các ID hoặc question không map được sẽ được ghi report `unmapped`, không bịa mapping. Các aggregate như minutes/mastered cũ được gắn legacy source, không dùng làm metric V2 chính thức.
