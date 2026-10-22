# HANZI V2 — Progress

> **Cập nhật 21/10/2026 — V1-first:** `src/App.tsx` là runtime đang chạy. Đây là đợt nâng cấp UI/UX của V1, không phải thay thế V1 bằng shell `src/v2/`. Những mục Phase 1–3 bên dưới mô tả groundwork V2 đã dựng; `src/v2/` không phải entry point hiện tại. Xem `07-V1-UX-UPGRADE.md`.

> **Cập nhật 22/10/2026 — V2 inherited upgrade:** Hướng sản phẩm chuyển sang hoàn thiện V2 như một upgrade kế thừa dữ liệu V1. V1 vẫn là runtime cho tới khi mỗi tài khoản đi qua snapshot/import/rehearsal/parity gate; không có auto-migration hoặc xóa `learning_states`. Xem `09-V2-UPGRADE-CONTRACT.md`.

> **Cập nhật 22/10/2026 — handover foundation:** API có `GET /api/v2/upgrade/status` để kiểm tra V1 snapshot theo tài khoản và chỉ cho phép V2 learning API khi đầy đủ schema event. Importer khóa trường hợp V1 đã đổi sau import để tránh merge sai. `POST /api/v2/upgrade/import-v1` còn tắt mặc định và chỉ mở bằng cấu hình sau backup/rehearsal; chưa có dữ liệu thật nào được migrate.

> **Cập nhật 22/10/2026 — Dictionary foundation:** V2 có route `/dictionary` tra Hán tự, Pinyin (có/không dấu) và nghĩa Việt trong 1.200 mục HSK 2.0/2015 đã có, không gọi API ngoài. `src/content/dictionary.ts` là provider boundary để mở rộng từ dữ liệu có license về sau; phạm vi local được nêu rõ, không giả làm từ điển Trung–Việt đầy đủ. Xem `10-DICTIONARY-FOUNDATION.md`.

## 21/10/2026 — Phase 0: audit & specification

### Đã làm

- Đọc `HANZI_V2_CODEX_MASTER_PLAN.md` và audit source/assets hiện có.
- Chốt phạm vi MVP: **HSK 2.0/2015**; không xây HSK 3.0 trong đợt này.
- Tạo bộ tài liệu Phase 0: audit, PRD, UX flows, design system, architecture, data migration, test plan và decisions.
- Chạy `npm run typecheck` và `npm run build`: pass. Build có cảnh báo JS bundle vượt 500 kB.

### Phase 1 — Design System & Shell (đang triển khai)

### Đã làm

- Chuyển entry point sang `src/v2/App.tsx`; giữ nguyên `src/App.tsx` V1 để phục vụ đối chiếu/migration, không xóa dữ liệu hay endpoint V1.
- Tạo shell Calm Hanzi Studio tại `src/v2/v2.css`: tokens light/dark, sidebar desktop, bottom navigation mobile, focus state và `prefers-reduced-motion`.
- Thêm History API routing cho `/today`, vocabulary detail, grammar detail, practice, mistakes, progress và settings.
- Kết nối library/search/word detail/grammar với content HSK 2.0 hiện có; search mở đúng deep-link của từ.
- Các surface chưa có persistence (Today plan, mistakes, progress) công khai trạng thái thiếu dữ liệu, không dựng số học/streak/biểu đồ giả.
- Practice chỉ dùng 4 bài hiện có trong phiên trình duyệt và nêu rõ kết quả chưa được đồng bộ.
- Chạy `npm run typecheck` và `npm run build`: pass. Bundle V2 631.41 kB (246.24 kB gzip), vẫn có cảnh báo chunk >500 kB.
- Xác nhận Vite preview trả HTTP 200 cho `/today`, `/learn/vocabulary`, `/learn/grammar`, `/practice`, `/progress`.

### Phase 2 — Content & Curriculum Infrastructure (hoàn thành local content boundary)

### Đã làm

- Tạo `src/content/curriculum.ts` làm read-model HSK 2.0/2015 cho V2: metadata curriculum/level, query vocabulary, search Pinyin có dấu/`v`-`ü`, detail lookup, provenance và editorial verification status.
- Đổi shell V2 sang dùng content boundary mới thay vì import trực tiếp `src/data.ts`.
- Canonical identity được xác định là `hsk-2.0-2015:vocabulary:<sourceIndex>`; giữ ID V1 cho 11 mục curated có ID riêng để migration/deep-link không vỡ.
- HSK 3.0 chỉ là `not_supported`/upcoming trong content model, không thể query như curriculum học.
- Thêm Vitest và `npm run test`; tạo 4 test kiểm tra coverage 1.200 từ, phân bố 150/150/300/600, stable ID/provenance, Pinyin `lǜ`/`lv4` và trạng thái HSK 3.0.
- Tách authoring source của 4 bài luyện tập sang `src/content/practice.ts`; `src/data.ts` chỉ còn compatibility facade cho V1. Validation mới kiểm tra ID trùng, nội dung learner-facing, options và answer có thể chọn được.
- Tách 16 grammar points sang `src/content/grammar.ts` cùng validation về stable ID, trường learner-facing và ví dụ song ngữ. V1 vẫn dùng được qua facade ở `src/data.ts`; V2 import trực tiếp content domains.
- Tách vocabulary import pipeline (1.200 mục, curated overlay, Pinyin/gloss/example enrichment) sang `src/content/vocabulary.ts`; bổ sung test facade đảm bảo các import V1 và V2 cùng trỏ một content collection, không tạo data copy hoặc làm vỡ legacy IDs.
- Thêm `src/content/manifest.ts`: content release `hsk-2.0-2015.r1`, manifest 3 domains và validation hợp nhất. Đây là version sẽ được ghi vào attempts/completions khi persistence được xây; không ngụ ý HSK 3.0 đã được hỗ trợ.
- `npm run typecheck`, `npm run test`, `npm run build`: pass. Sau Phase 3 groundwork, toàn repo có 18 tests / 7 files; production bundle 635.58 kB JS (249.54 kB gzip), vẫn có warning chunk >500 kB.

### Phase 3 — Auth + Backend Persistence + Migration (đang triển khai)

### Đã làm

- Bắt đầu P0 security hardening ở Express: PostgreSQL SSL mặc định verify CA (`rejectUnauthorized: true`), production cấm `DATABASE_SSL_MODE=disable`; `CLIENT_ORIGIN` được parse/validate thay vì tin chuỗi tùy ý.
- Thêm Origin guard cho mọi API mutation, security response headers và rate limit đăng nhập/đăng ký theo IP (10 lần / 15 phút). Có 5 unit tests cho origin/rate-limit/header. Rate limit hiện là in-memory single-instance baseline, không tuyên bố phù hợp multi-instance.
- Cập nhật `.env.example` với origin Vite của dự án (4173), `DATABASE_SSL_MODE` và `TRUST_PROXY`; không đọc hoặc thay đổi `.env`.
- Thêm mapper V1 thuần `server/migrations/v1-learning-state.js`: checksum snapshot, import plan deterministic/idempotency-keyed, canonical mapping injected từ runner và nhánh `legacyOnly`/`unmapped` trung thực. Mapper thuần không có database write.
- Thêm migration runner raw SQL (`db:migrate`), identity seed (`db:seed-content`) và importer V1 theo từng user (`db:import-v1`). Các lệnh không được tự chạy; chưa có database rehearsal/backup hoặc write vào DB cấu hình ở workspace này.
- Dựng review-event API (transaction + row lock + idempotency) và curated practice API (server tự chấm, lưu/xóa mistake thật). V2 có auth card, attempt sync khi đăng nhập và mistake retry về đúng exercise; anonymous/API-unavailable states được hiển thị rõ.
- Bổ sung alias cho 11 curated V1 IDs map được; `hsk4-jianyì` không có trong catalogue chuẩn nên giữ `unmapped` thay vì suy đoán.

### Chưa làm

- Chưa có database backfill/rehearsal, ownership integration test với PostgreSQL thật, lint, E2E, accessibility/performance report.
- Chưa xử lý P0 concurrency của `learning_states` JSONB hoặc đưa persistence sang event model; migration runner/backfill/ownership integration tests là phần Phase 3 tiếp theo.
- Chưa kiểm tra screenshot/viewport thật bằng browser: Computer Use approval hết hạn khi bắt đầu QA; không khẳng định responsive visual đã đạt ở mọi viewport.
- Entry V2 không đọc/ghi `learning_states` để tránh biến JSON blob V1 thành nguồn dữ liệu V2 ngầm. V2 chỉ dùng API event mới khi user đăng nhập và schema/seed đã được vận hành.
- Chưa có flashcard learning UI, API-to-UI review session, undo, database rehearsal và true ownership integration test; đây là phần còn lại Phase 3–4.
- Phase 2 còn cần workflow CI/import chính thức nếu/ khi content catalogue được cập nhật.

### Giới hạn / rủi ro

- `git status` cần gọi cục bộ với `-c safe.directory='C:/HUST_backlog/prj_tinh_nghich/hsk'`; không thay đổi Git global config.
- `.env` không được đọc hay thay đổi.
- Mock exam hiện tại không được coi là nội dung thi đã xác thực.
- Browser provider không có trong môi trường QA, nên không thể xác nhận screenshot/viewport thật trong đợt này; HTTP preview cục bộ trả 200.

### Tiếp theo

1. Hoàn thiện QA trực quan Phase 1 tại 320/375/430/768/1024/1440 px khi browser preview khả dụng; sửa các lỗi layout phát hiện được.
2. Rehearse `db:migrate` + `db:seed-content` + V1 import hai lần trên database copy; thêm PostgreSQL authorization/concurrency integration tests.
3. Hoàn thiện Flashcard review UI (due queue/rate/undo/session summary) gọi review-event API thật; sau đó đo responsive/a11y bằng browser provider khi khả dụng.
