# HANZI V2 — Architecture

## Hiện tại

Frontend React/Vite gọi Express JavaScript trực tiếp. `App.tsx` giữ toàn bộ `LearningState`; browser lưu localStorage và PUT toàn bộ state vào `learning_states.state`. PostgreSQL khởi tạo schema từ `server/index.js` lúc start.

## Kiến trúc đích, triển khai tăng dần

Không đổi framework chỉ để đổi framework. Giữ React/TypeScript/Vite và Express, đưa các domain ra module để tránh monolith.

```text
src/
  app/          # router, providers, layouts
  pages/        # route composition
  features/     # auth, today, vocabulary, grammar, study, practice, progress, settings
  shared/       # UI, styles/tokens, API client, schemas, utilities
server/
  modules/      # auth, curriculum, study, practice, analytics
  db/           # SQL migrations, queries, seeds
packages/domain/# pure types, validators, scheduling rules
packages/content/# validated HSK 2.0 imports
```

Tên thư mục là architecture target, không phải một lần di chuyển bắt buộc. Mỗi vertical slice phải có UI + API + persistence + test trước khi mở surface tiếp theo.

## Data ownership

- Content canonical: `curricula`, `curriculum_levels`, `vocabulary_entries`, senses/examples, grammar, content_sources.
- User domain: `user_settings`, `study_goals`, `review_cards`, immutable `review_events`, `study_sessions`, `learning_activity_events`.
- Practice domain: `exercises`, versioned `exercise_attempts`, `mistake_records`.

Mọi record người dùng có owner `user_id`; server lấy owner từ session, không tin `user_id` client gửi. Các review/attempt mutations dùng idempotency key; mutable aggregate có `version` để phát hiện stale write.

## Persistence groundwork đã dựng ở Phase 3

- `server/db/migrate.js` áp dụng SQL migration append-only và dừng nếu checksum file đã áp dụng bị thay đổi.
- `server/db/seed-content.js` seed identity 1.200 mục + 11 alias V1 map được; server không tin `wordId` tùy ý từ client.
- `POST /api/study/reviews` khóa review card trong transaction, ghi immutable `review_events` và replay an toàn theo `(user_id, idempotency_key)`.
- `POST /api/practice/attempts` tự chấm source curated server-side; `GET /api/practice/mistakes` chỉ trả lỗi thuộc session user hiện tại.
- `server/migrations/import-v1-learning-state.js` là CLI theo từng user, snapshot immutable V1 trước commit và bỏ qua cùng checksum đã import.

Chưa có database integration/rehearsal thực: code được unit-test với dependency fake, không được tuyên bố đã migrate hoặc sync production.

## Content boundary đã dựng ở Phase 2

`src/content/curriculum.ts` là read-model duy nhất V2 dùng để truy vấn HSK 2.0/2015. Nó gắn mỗi mục với `curriculumId`, `curriculumVersion`, `introducedLevel`, `itemSourceId`, provenance và `verificationStatus`; đồng thời cung cấp query theo level/từ khóa, detail lookup và validation coverage.

Authoring data hiện được phân theo domain:

- `src/content/vocabulary.ts`: catalogue 1.200 mục, curated overlay và enrichment Pinyin/gloss/example.
- `src/content/grammar.ts`: 16 grammar points, validation ID/nội dung/ví dụ song ngữ.
- `src/content/practice.ts`: 4 seed exercises, validation options/answer.
- `src/content/manifest.ts`: content release `hsk-2.0-2015.r1` và báo cáo validation tổng hợp.

`src/data.ts` chỉ còn facade tương thích cho V1 (và `levels` legacy). Facade trả chính collection từ content modules, không copy data.

Identity canonical của vocabulary là `hsk-2.0-2015:vocabulary:<sourceIndex>`. Trường `id` ứng dụng cũ vẫn được giữ để future migration/deep-link không bị vỡ. HSK 3.0 chỉ tồn tại trong `upcomingCurricula` ở trạng thái `not_supported`, không được query như data học.

## API MVP định hướng

```text
GET  /api/curricula
GET  /api/vocabulary?curriculum=hsk-2.0-2015&level=4&q=...
GET  /api/vocabulary/:id
GET  /api/study/today
POST /api/study/sessions
POST /api/study/sessions/:id/reviews
POST /api/study/reviews/:id/undo
POST /api/practice/sessions
POST /api/practice/attempts
GET  /api/practice/mistakes
GET  /api/study/progress
```

Auth endpoints giữ tương thích trong giai đoạn đầu nhưng phải được harden trước production: schema validation, rate limit, CSRF strategy, security headers, safe logs và TLS CA validation.
