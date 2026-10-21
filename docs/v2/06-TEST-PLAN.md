# HANZI V2 — Test plan

## Baseline đã chạy

Ngày 21/10/2026: `node --check` cho server modules/migrations, `npm run typecheck`, `npm run test` và `npm run build` pass. `npm run test` có 31 tests / 15 files: content coverage/provenance, grammar/practice/manifest/facade, alias V1, Origin guard, rate limit, security headers, SQL migration checksum/ordering, HSK identity seed, scheduler fake clock, idempotent review/practice replay và V1 import plan/runner. Đây chưa phải API/database integration suite hoặc migration rehearsal. Production bundle là 642.95 kB (251.70 kB gzip); Vite vẫn cảnh báo chunk vượt 500 kB.

## Test cần bổ sung theo phase

| Lớp | Phạm vi |
| --- | --- |
| Unit | scheduler với fake clock; strict/lenient Pinyin/`ü`; vocabulary ID mapping; content validation; migration idempotency |
| API integration | auth/authorization; input validation; idempotency key; optimistic concurrency; A/B isolation; rate limit; migration runner với PostgreSQL copy |
| Component | focus order, accessible name/role/value, flashcard keyboard, reduced motion, error/empty/loading states |
| E2E | guest demo; login/onboarding; search deep link; rate/reload/due; mistake retry; mobile nav; logout/login |
| Manual QA | 320/375/430/768/1024/1440 px; keyboard; voice unavailable; offline/retry; two-tab conflict |

## Acceptance MVP tối thiểu

1. Người dùng chọn HSK 2.0/2015, HSK 4, học 10 thẻ; review events còn sau reload/login và due thay đổi đúng rule đã công bố.
2. Search `lǜ`, `lv4`, Hán tự hay nghĩa Việt đến đúng `/learn/vocabulary/:wordId`.
3. Một câu sai có prompt/answer/explanation; “Luyện lại” mở session chứa chính câu đó hoặc lý do retired rõ ràng.
4. Account A không đọc/ghi được dữ liệu account B.
5. Không có tràn ngang hay CTA bị che ở 320 px; toàn bộ thao tác chính dùng được bằng bàn phím.

Không báo các mục Lighthouse/WCAG/test xanh cho đến khi suite tương ứng tồn tại và có kết quả lưu lại.
