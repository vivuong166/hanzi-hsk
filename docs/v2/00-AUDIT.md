# HANZI V2 — Audit mã nguồn hiện có

Ngày audit: 21/10/2026  
Phạm vi: repository hiện tại; chưa thay đổi mã ứng dụng.

## Kết luận ngắn

Ứng dụng hiện tại là React 18 + TypeScript/Vite ở frontend và Express JavaScript + PostgreSQL ở backend. Đây là nền tảng có thể giữ lại dữ liệu từ vựng HSK 2.0/2015, nhưng không thể coi là kiến trúc V2: phần lớn UI, state học và quy tắc học tập nằm trong `src/App.tsx`; backend lưu toàn bộ tiến độ bằng một JSONB blob.

V2 sẽ chỉ phát hành curriculum **HSK 2.0/2015** trong MVP. HSK 3.0 không nằm trong phạm vi triển khai hiện tại.

## Inventory

| Khu vực | Hiện trạng | Quyết định V2 |
| --- | --- | --- |
| `src/content/hsk4-2015.ts` | Danh mục tích lũy 1.200 mục HSK 2.0/2015 | Giữ, đóng gói thành nguồn curriculum có ID ổn định |
| `src/content/hsk2-2015-metadata.ts` | Pinyin/từ loại có provenance | Giữ, duy trì attribution |
| `src/content/hsk2-vi-glosses-*.ts` | Nghĩa Việt ngắn | Giữ, gắn trạng thái kiểm duyệt |
| `src/content/hsk2-example-sentences.ts` | Câu ví dụ; có CC BY-SA 4.0 | Giữ cùng `DATA_LICENSE.md` |
| `src/data.ts` | Adapter vocab và 16 ngữ pháp/4 bài tập seed | Tách theo domain; không dùng seed sinh tự động làm nội dung thi |
| `src/App.tsx` | 801 dòng: UI, router tự chế, state, scheduler, exams | Rebuild theo feature/route nhỏ; import state V1 |
| `src/styles.css` | Stylesheet đơn khối | Rebuild thành tokens, base, component/page styles |
| `server/index.js` | Auth, activity, một bảng `learning_states` JSONB | Migrate từng domain, vẫn giữ API/state V1 trong thời gian import |
| `DATA_SOURCES.md`, `DATA_LICENSE.md` | Provenance và attribution | Giữ nguyên, kiểm tra khi xuất bản nội dung |

## Bằng chứng kỹ thuật

- `package.json` chỉ có `dev`, `dev:server`, `dev:full`, `start`, `build`, `preview`, `typecheck`; chưa có lint/unit/integration/E2E script.
- `src/App.tsx:1-801` chứa kiểu dữ liệu, persistence phía client, navigation, dashboard, vocabulary, grammar, practice, review, exam, analytics, onboarding và search.
- `src/App.tsx:95-113` dùng lịch ôn heuristic tự viết; không có bằng chứng đây là FSRS.
- `src/App.tsx:186-194` ghi toàn bộ `LearningState` lên `/api/learning-state` sau debounce 450 ms.
- `server/index.js:167-186` upsert `learning_states.state` JSONB mà không có revision, ETag, idempotency key hay phát hiện xung đột.
- `server/index.js:24` cấu hình PostgreSQL với `rejectUnauthorized: false`.
- `server/index.js:98-139` có kiểm tra payload cơ bản, bcrypt/JWT/cookie httpOnly, nhưng không có rate limit login/register, Helmet hay lớp CSRF được xác định rõ.
- `src/App.tsx:515-554` sinh ngân hàng câu hỏi mock từ vocabulary/example và 10 seed; không phải bộ đề đã được biên tập/xác thực.
- `src/App.tsx:589-626` mô phỏng đề không có countdown/enforcement theo format đã kiểm chứng; không được gắn nhãn đề thi chuẩn.
- `src/App.tsx:636-654` dùng một phần tử có `role=button` bao quanh các nút tương tác; cần sửa semantic khi rebuild flashcard.
- `src/App.tsx:658-666` normalize Pinyin bỏ dấu thanh và thay `v` thành `u`; V2 phải có strict/lenient mode tách bạch và test chữ `ü`.
- `src/App.tsx:799` search chỉ đổi sang view Vocabulary, chưa deep-link đúng từ kết quả.

## Xác nhận có thể chạy

Chạy tại `hsk/` ngày 21/10/2026:

```text
npm run typecheck  -> pass
npm run build      -> pass
```

Build tạo bundle JavaScript 661.52 kB (255.78 kB gzip) và Vite cảnh báo chunk vượt 500 kB. Chưa có kết quả lint, test unit, integration, E2E, accessibility hay Lighthouse vì repository chưa cấu hình các lệnh đó.

## Keep / Rebuild / Remove

| Bề mặt hiện có | Quyết định | Lý do |
| --- | --- | --- |
| Đăng nhập/đăng ký | Rebuild dần, giữ dữ liệu | Cần rate limit, schema validation, CSRF/TLS review và tests |
| Dashboard | Rebuild | Cần một CTA học chính, dữ liệu event thật và copy đúng thời điểm |
| Vocabulary/library | Rebuild UI, giữ content | Cần URL ổn định, filter đúng curriculum, virtual list khi cần |
| Grammar | Rebuild UI và model | Giữ nội dung đã biên soạn, bổ sung provenance/review status |
| Flashcard | Rebuild | Scheduler, undo, semantic và session metrics cần tách riêng |
| Typing | Rebuild | Cần strict/lenient tone, Unicode `ü` và tests |
| Practice/mistakes | Rebuild | “Làm lại” phải mở đúng câu/session, không chỉ đổi view |
| Mock exam | Remove khỏi MVP UI | Không đủ content/timer/scoring đã xác thực; chỉ quay lại khi có bank QA |
| Analytics | Rebuild | Chỉ hiển thị số liệu rút từ event đã lưu, không cộng phút theo thẻ |
| Admin activity | Giữ nội bộ, harden sau | Không thuộc MVP học tập; cần audit/authorization test |

## Screen decisions

| Bề mặt/flow V1 | Quyết định | Điều kiện đưa sang V2 |
| --- | --- | --- |
| Auth screen | Rebuild | Auth hardening và form states hoàn chỉnh |
| Onboarding modal | Rebuild | Chọn HSK 2.0/2015, level, time/word goal, skip rõ ràng |
| Sidebar/top bar/mobile nav | Rebuild | Router thật, responsive 320–1440 px, không có tab quá tải |
| Command search dialog | Rebuild | Kết quả phải deep-link đúng word/grammar detail |
| Overview | Rebuild | One clear next action, data/event thật |
| Vocabulary list/detail | Rebuild UI, giữ content | URL canonical, filter/search chuẩn, source/status rõ |
| Grammar page | Rebuild UI, giữ content | Detail URL, quiz và related vocabulary chỉ khi nội dung verified |
| Exercises/Sentence builder | Rebuild | Session/attempt persistence, explanation và retry đúng question |
| Review flashcard | Rebuild | Semantic controls, undo, review event idempotent |
| Typing practice | Rebuild | Strict/lenient Pinyin, tone/`ü` tests |
| Notebook mistakes | Rebuild | Retry tạo đúng mistake-focused session |
| Analytics | Rebuild | Chỉ số dựa trên events/timer thực |
| Admin activity | Giữ nội bộ, harden sau | Ownership/audit test và pagination |
| Mock exam | Remove khỏi MVP | Chỉ phục hồi sau bank/blueprint/timer/scoring đã QA |

## Curriculum feature matrix

| Khả năng | HSK 2.0/2015 | HSK 3.0 |
| --- | --- | --- |
| Vocabulary 1–4 | Có: 1.200 mục source hiện có | Không phát hành |
| Pinyin/part of speech | Có metadata/provenance hiện có | Không phát hành |
| Grammar/practice | Có content seed, phải review/version hóa | Không phát hành |
| Flashcard/review | Thuộc MVP sau persistence migration | Không phát hành |
| Timed mock exam | Không thuộc MVP cho tới khi QA | Không phát hành |
| Nhãn UI | `HSK 2.0 (2015) · HSK n` | Chỉ “Chưa hỗ trợ”; không gán nhãn content cũ |

## Rủi ro và chặn triển khai

1. Không được quảng bá mock exam, audio, đồng bộ đa thiết bị, FSRS hay HSK 3.0 khi chưa có implementation và test tương ứng.
2. Không được di chuyển hoặc thay ID từ vựng trước khi có mapping `legacy ID -> canonical curriculum/sourceIndex` và import idempotent.
3. `.env` tồn tại cục bộ; tuyệt đối không đưa vào patch, log hay commit. `.env.example` là template hợp lệ.
4. Git status không đọc được trong sandbox hiện tại do Git báo `dubious ownership`; audit này không thay đổi cấu hình Git toàn cục.

## P0 trước production

- Thay JSONB overwrite bằng review/attempt events versioned, idempotent.
- Thiết kế migration và backup/rehearsal cho state V1.
- Sửa cấu hình TLS theo CA/provider; không tắt certificate validation mặc định.
- Thêm rate limiting, security headers, validation schema, review CSRF theo topology.
- Gỡ mock exam khỏi lời hứa sản phẩm cho tới khi có question bank được QA.
