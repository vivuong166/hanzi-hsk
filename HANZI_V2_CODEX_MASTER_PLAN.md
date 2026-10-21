# HANZI V2 — Product Rebuild Master Plan for Codex

> Ngôn ngữ: Tiếng Việt. Ngày phân tích: 21/10/2026. Đầu vào: `hanzi-hsk-main.zip` (React + TypeScript/Vite + Express/JavaScript + PostgreSQL/Neon).
>
> MỤC TIÊU: Xây lại thành một sản phẩm EdTech hoàn chỉnh, premium, mobile-first, hiệu quả trong học tập và thực sự đáng tin cho ôn thi HSK. Không được chỉ đổi màu CSS và thêm hiệu ứng. Không tự nhận có nội dung HSK 3.0/đề thi chuẩn nếu chưa kiểm chứng.

## 0. Vai trò và nguyên tắc làm việc

Bạn là Codex trong vai trò đồng thời Product Designer, Senior UI/UX Engineer, Senior Fullstack Engineer, QA Lead và Learning Experience Designer. Chủ động đọc toàn bộ repository trước khi sửa.

**Cách phối hợp bắt buộc:**

1. Bắt đầu từ audit, viết `docs/v2/00-AUDIT.md`, không sửa trực tiếp source khi chưa có bản đồ hệ thống và danh sách cần di chuyển.
2. Chốt trong docs: mục tiêu sản phẩm, user journeys, sitemap, data model, UI components, design tokens, thứ tự triển khai và tiêu chí nghiệm thu.
3. Triển khai từng vertical slice (UI + state + API + persistence + tests) nhỏ, chạy được; không để một đống màn hình demo chưa kết nối API.
4. Sau mỗi phase: cập nhật `docs/v2/PROGRESS.md` (đã làm / chưa làm / giới hạn / cách test / rủi ro / files thay đổi). Ghi nhận quyết định kiến trúc vào `docs/v2/DECISIONS.md`.
5. Không xóa dữ liệu, thay ID, bỏ endpoint hoặc thay DB schema khi chưa có kế hoạch migration và kiểm thử rollback. Giữ lại một nhánh/điểm phục hồi dự án cũ.
6. Mọi tính năng do AI sinh nội dung phải được xác thực. Không tạo giả API, giả biểu đồ, giả lượt học, giả câu thi, giả phiên đồng bộ hay nút bấm không làm gì.
7. Tránh tự ý dùng khóa API, nguồn tài liệu không rõ bản quyền, hoặc commit `.env`. Đảm bảo người dùng phát triển local bằng `.env.example`.
8. Không tự chuyển React sang Vue/Next.js nếu không có lý do rõ ràng. Ưu tiên tối ưu dự án hiện tại và dựng lại module trên stack phù hợp.
9. Với mỗi task: nêu file tạo/sửa, lý do, cách test, điều kiện đạt. Dùng code dễ đọc, TypeScript strict, không tập trung logic trong `App.tsx`.
10. Khi thiếu dữ liệu để hoàn thiện tính năng thật, dùng **trạng thái chưa hỗ trợ** rõ ràng; không bịa dữ liệu để nhìn như đã hoàn thành.

## 1. Báo cáo audit mã nguồn gốc (chỉ từ source, chưa chạy UI/E2E)

### Tài sản cần giữ

- `src/content/hsk4-2015.ts`: danh mục tích lũy 1.200 từ HSK 2.0/2015, cấp 1=150 từ, cấp 2=150 mới, cấp 3=300 mới, cấp 4=600 mới, vẫn giữ phân biệt mục đồng hình.
- `src/content/hsk2-2015-metadata.ts`: nguồn metadata pinyin/từ loại; có provenance riêng.
- `src/content/hsk2-vi-glosses-*.ts`: nghĩa Việt ngắn.
- `src/content/hsk2-example-sentences.ts` và `scripts/build-hsk2-examples.mjs`: câu ví dụ và pipeline sinh câu có attribution.
- `src/data.ts`: model từ vựng/16 ngữ pháp/4 bài exercise mẫu và mapping; giữ ý tưởng nội dung, phải tách module.
- `DATA_SOURCES.md` và `DATA_LICENSE.md`: bảo toàn provenance, attribution và nghĩa vụ license CC BY-SA 4.0 đối với dữ liệu câu ví dụ chuyển đổi.
- `server/index.js`: endpoint auth, user, learning-state, activity/admin dùng làm tham chiếu khi migrate.
- Local account-specific state và server persistence: giữ nguyên dữ liệu người dùng hiện hữu qua migration có kiểm thử.

### Vấn đề P0 — sửa trước khi nói 'production ready'

| # | Bằng chứng | Kết luận/đích khắc phục |
|---|---|---|
| P0-01 | `src/App.tsx:515-554` | Đề mô phỏng sinh tự động từ ví dụ/vocab và 10 seed, không phải 10 bộ đề đã biên tập, chưa phù hợp để gắn nhãn đề chuẩn. Dựng ngân hàng câu hỏi được rà soát theo từng kỹ năng và phiên bản HSK. |
| P0-02 | `src/App.tsx:597-626` | Màn thi hiển thị 105 phút nhưng chưa có đồng hồ đếm ngược/enforcement, chấm số câu đúng thay vì điểm kỹ năng theo quy tắc và không có phân tích năng lực. Tách Practice Mode và Exam Mode; đảm bảo bộ đề đúng chuẩn đã khai báo. |
| P0-03 | `src/App.tsx:186-194` + `server/index.js:174-186` | Gửi/ghi đè toàn bộ JSON state sau debounce 450ms, không ETag/revision/atomic events. Nguy cơ overwrite khi có request cạnh tranh, nhiều tab/thiết bị hoặc offline. Dùng event-based API và version-based write; import snapshot cũ chỉ một lần. |
| P0-04 | `server/index.js:24` | Kết nối PG `ssl: { rejectUnauthorized: false }` bỏ kiểm chứng chứng chỉ máy chủ. Cấu hình TLS phù hợp provider/CA, không disable validation mặc định. |
| P0-05 | `server/index.js:98-139` | Chưa có rate limiting login/register và lớp bảo vệ production đầy đủ. Thêm rate limit, validation, cookie & CSRF review, error handling, safe logging. |
| P0-06 | `src/App.tsx:95-113` | Lịch ôn heuristic riêng. Không được quảng cáo là FSRS hoặc có hiệu quả học được chứng minh. Dùng thuật toán có test và mô tả trung thực. |

### Vấn đề P1 — UX, nội dung, kiến trúc

| # | Bằng chứng | Hướng giải quyết |
|---|---|---|
| P1-01 | `src/App.tsx` ~801 dòng, `src/styles.css` ~41 KB trong 59 dòng rất dài | Tách route, component, domain modules, hooks, services, CSS tokens. |
| P1-02 | `src/App.tsx:799` | Global search click chỉ chuyển route Vocabulary, không chọn từ tương ứng. Phải deep-link `/vocabulary/:wordId`. |
| P1-03 | `src/App.tsx:658-666` | Pinyin typing loại bỏ dấu thanh, `v -> u`, dẫn đến chấp nhận sai trường hợp `ü/u`. Có chế độ strict tone và lenient tone, normalize Unicode + ü đúng chuẩn, kiểm thử trường hợp đa âm. |
| P1-04 | `src/App.tsx:206-207`, `361-385`, `784-789` | “Mastered” chỉ là >=3 lần ôn; phút học cộng theo mỗi flashcard thay vì đo thời lượng phiên; lời chào luôn “Chào buổi sáng”. Các chỉ số/copy phải đúng thời điểm và đo bằng events có timestamp. |
| P1-05 | `src/App.tsx:44-55`, `797`, `src/data.ts:325-331` | Trộn ngôn ngữ 'HSK 1–4' với onboarding khóa HSK 4; HSK 5/6 mới chuẩn bị. Thiết kế curriculum selector: HSK 2.0 có vocab 1–4, chỉ HSK 4 có bộ exercises/exam đã rà soát; HSK 3.0 riêng. |
| P1-06 | `src/data.ts:306-323` | Chỉ 4 bài exercise mẫu được biên tập; các bài khác được sinh theo công thức. Phải bổ sung chất lượng nội dung theo kỹ năng, không chỉ đếm số câu. |
| P1-07 | `src/data.ts` | 12 từ curated có dịch ví dụ Việt, đa số phần còn lại chỉ có ví dụ Trung; `topic` phần lớn generic. Phải thêm content workflow, review queue, source tracking, versioning. |
| P1-08 | `src/App.tsx:792-795` | Nút “Làm lại” ở sổ lỗi chỉ chuyển qua màn bài tập, không định vị câu sai. Tạo mistake-focused practice session. |
| P1-09 | `src/App.tsx:636-654` | Flashcard có `div role=button` chứa nhiều `<button>` tương tác; cần semantically correct accessible interaction, tránh nested controls. |
| P1-10 | `server/index.js:141-145` | Page-view allowlist thiếu `exam`; thống kê sự kiện có thể không đầy đủ. Thiết kế event taxonomy, người dùng biết dữ liệu nào được ghi. |

**Không tự tuyên bố các điểm sau nếu chưa test:** build thành công, không có bug responsive, tương phản WCAG đạt chuẩn, hiệu năng Lighthouse, chất lượng chính xác của 1.200 bản dịch, triển khai production ổn định.

## 2. Tầm nhìn sản phẩm V2

**Định vị:** HANZI — học tiếng Trung theo tiến độ cá nhân, ôn đúng lúc, luyện thi có phản hồi thực tế. Người Việt bắt đầu HSK 4 có thể chọn chương trình/đích đến rõ ràng.

**Jobs to be done:**

- “Tôi có 15 phút: hãy chỉ tôi cần học gì ngay bây giờ.”
- “Tôi học từ này rồi nhưng cứ quên: hãy giúp tôi nhớ và dùng được trong câu.”
- “Tôi cần thi HSK 4: cho tôi biết mình yếu kỹ năng nào và nên luyện ở đâu.”
- “Tôi đổi máy vẫn giữ nguyên tiến độ, không mất lịch ôn.”
- “Tôi muốn tập trung luyện phát âm, pinyin có dấu thanh và ví dụ thực tế.”

**North Star Metric:** tỷ lệ người học hoàn thành những phiên học đã lên kế hoạch với recall hoặc kết quả bài tập có thể đo được. Không coi thời gian mở website, tổng clicks hoặc streak là thước đo thành công duy nhất.

**Nguyên tắc UX:**

1. One clear next action — dashboard đề xuất một CTA chính “Bắt đầu phiên hôm nay”.
2. Zero fake progress — mọi số liệu gắn với event thật; thiếu dữ liệu => nêu chưa đủ dữ liệu.
3. Learning over decoration — animation phải phục vụ lật thẻ, chuyển bước, phản hồi; không làm chậm tư duy.
4. Calm premium — có bản sắc Hán tự nhưng không rối, ít widget hơn, thứ bậc thị giác tốt hơn.
5. Mobile-first — toàn bộ hành trình học phải dùng tốt bằng một tay trên màn hình 320–430px.
6. Access for all — keyboard, focus visible, aria, đủ contrast, prefers-reduced-motion, không lệ thuộc màu để phản hồi.
7. Explain the why — câu sai giải thích và link về bài liên quan, không chỉ ghi “Sai”.

## 3. Thông tin chương trình HSK cực quan trọng

- **HSK 2.0 / 2015**: giữ bộ dữ liệu 1.200 mục từ (cộng dồn HSK 4), 600 mục mới ở HSK 4.
- **HSK 3.0**: chương trình **khác**; sử dụng dữ liệu/đề cương chính thức riêng, không chuyển nhãn cho các mục 2015 và không trộn cấp độ.
- Ngày 13/12/2026, HSK 3.0 được Chinese Test công bố ra mắt chính thức toàn cầu: https://old.chinesetest.cn/gonewcontent.do?flag=kdnew&id=51336883 và https://www.chinesetest.cn/syllabus.
- Trường dữ liệu bắt buộc: `curriculum_id`, `curriculum_version`, `level`, `introduced_level`, `item_source_id`, `license/provenance`, `verification_status`.
- UI phải hiển thị: `HSK 2.0 (2015) · HSK 4` hoặc `HSK 3.0 · HSK 4` khi nội dung thật sẵn sàng; có banner minh bạch mức độ hoàn thiện của từng chương trình.
- Không giả định format HSK 3.0 giống đề HSK 2.0; cần đối chiếu blueprint chính thức và mẫu đề theo từng phiên bản trước khi tạo Exam Mode.

## 4. Giao diện: Design Direction — “Calm Hanzi Studio”

### 4.1 Art direction

Bản sắc: hiện đại, thanh lịch, học thuật và đáng tin, giàu typography; lấy cảm hứng từ con dấu Hán tự, lưới giấy luyện chữ và tông ngọc bích, không biến thành game hào nhoáng.

- Background warm ivory `#F7F7F2`, surface `#FFFFFF`, dark ink `#1D2823`.
- Primary jade `#26755E`, soft jade `#EAF4EE`, accent terracotta `#C78265` dùng hạn chế.
- Border `#E3E9E2`; text secondary `#617168` — điều chỉnh để đủ contrast.
- Typography: một font UI đọc tốt tiếng Việt và một font CJK đáng tin (VD Inter/Be Vietnam Pro + Noto Sans SC). Font phải được load, subset nếu thích hợp, có fallback, theo giấy phép.
- Type scale nhất quán: body 15–16px, UI micro >=12px khi cần, Hán tự flashcard 72–112px desktop và khoảng 64–86px mobile tùy diện tích.
- Spacing grid 4/8; radius 12/16/24 theo chức năng; shadow nhẹ; icon có phong cách đồng nhất, không dùng hỗn hợp emoji/ký tự ngẫu nhiên làm hệ icon chính.
- Dark mode là một theme đủ contrast, không đảo màu đơn giản.
- Animation 140–240ms nhẹ; flip 3D đủ mượt; skeleton/optimistic feedback thật; tôn trọng reduced-motion.

### 4.2 Navigation / sitemap

**Desktop:** sidebar trái nhỏ gọn với 5 mục chính: `Hôm nay`, `Học từ`, `Ngữ pháp`, `Luyện tập`, `Luyện thi`; tiện ích: `Từ đã lưu`, `Sổ lỗi`, `Tiến độ`, `Cài đặt`. Search mở command palette.

**Mobile:** bottom nav 4 mục `Hôm nay`, `Học`, `Ôn`, `Tôi`; những mục ít thường xuyên vào More/Study Hub. Không nhồi 7–9 tab ở 320px.

**Deep link ổn định:**

```
/today
/learn/vocabulary
/learn/vocabulary/:wordId
/learn/grammar
/learn/grammar/:grammarId
/study/session/:sessionId
/practice
/practice/mistakes
/exams
/exams/:examId
/exams/attempts/:attemptId
/progress
/settings
/admin
```

### 4.3 8 màn hình tối quan trọng

1. **Landing + demo không cần login:** người mới xem giới thiệu và thử 3 flashcard + 1 ví dụ bài tập; không chặn mọi giá trị bằng màn đăng nhập. Mọi dữ liệu demo phải tách biệt.
2. **Onboarding thật:** chọn curriculum rõ ràng, cấp độ, ngày thi dự định (có thể bỏ qua), mục tiêu 10/15/20 từ/ngày, 5/10/20 phút/ngày; đánh giá đầu vào tùy chọn; có skip.
3. **Today dashboard:** greeting đúng giờ, hero “Kế hoạch 15 phút”, bộ đếm Due/New, đề xuất 1 CTA, progress thực tế, insight điểm yếu, resume last session; không bày quá nhiều card vô nghĩa.
4. **Vocabulary Library:** search Hán tự/pinyin có dấu hoặc không dấu/tiếng Việt, filter HSK version/level/status/part-of-speech, list ảo khi cần; click mở đúng word detail có URL, ví dụ có dịch khi verified, audio thật/fallback có nhãn, related words.
5. **Flashcards:** card flip chất lượng, shortcut chính xác, 4 lựa chọn Again/Hard/Good/Easy, số thẻ thực tế, undo rating trong phiên, nhiều chế độ nhận dạng/nghe/nói/nhập nghĩa, review due -> new -> optional extra.
6. **Grammar Studio:** cấu trúc và cách dùng, đối chiếu dễ nhầm, ví dụ âm thanh, mini quiz có giải thích, liên kết vào từ vựng, dashboard khuyến nghị ngữ pháp cần học.
7. **Practice & Error Studio:** luyện theo mục tiêu (từ mới, nghe, pinyin tone, ngữ pháp, sổ lỗi); phản hồi giải thích điều sai; CTA “Luyện lại lỗi này” đưa thẳng vào phiên phù hợp.
8. **Exam Studio:** tách `Practice (linh hoạt)` khỏi `Timed Mock (đúng format được xác thực)`, question navigator, autosave, pause rules rõ ràng, audio policies, submit confirmation, kết quả theo kỹ năng, hướng cải thiện; chỉ hiện bộ đề đã qua QA.

### 4.4 Các trạng thái bắt buộc

Mỗi màn có loading / empty / offline / recoverable error / success / disabled / screen reader labels / keyboard focus. Mobile viewport 320, 375, 430, 768, 1024, 1440px. Không dùng infinite horizontal scroll che nội dung quan trọng, không để bottom-nav đè CTA, tránh double scroll trên thư viện từ.

## 5. Learning Engine và dữ liệu giáo dục

### 5.1 Review engine

- Tách `review-scheduler` thành domain module có pure functions, test determinism bằng fake clock.
- Chọn phương án có thực chứng: SM-2-like rõ ràng hoặc FSRS khi triển khai đúng mô hình/định dạng tham số. Nếu dùng FSRS, không tự chế thuật toán rồi ghi nhãn FSRS.
- Phân biệt `new`, `learning`, `review`, `relearning`, `suspended`; card due theo timezone của người học.
- Mỗi review là immutable event với `rating`, `occurredAt`, `sessionId`, `deviceId` (nếu cần), `clientMutationId` idempotent. Không mất lịch sử khi schedule thay đổi.
- Undo thao tác gần nhất có xử lý server; không thể khiến điểm/mốc ôn sai khi refresh.
- Tách `learned` (đã xuất hiện), `reviewed` (đã được đánh giá), `retention` (ước lượng từ thuật toán nếu đáng tin) và `mastered` (định nghĩa sản phẩm được viết rõ). Không dùng >=3 lần review làm bằng chứng ghi nhớ lâu dài.

### 5.2 Vocabulary/content quality

- Giữ 1.200 mục HSK 2.0 ổn định, mapping ID không phá tiến độ cũ. Phân biệt các từ đồng hình (khác nghĩa/cách đọc).
- Nội dung cho mỗi entry: hanzi, pinyin, nghĩa (được kiểm duyệt), part-of-speech, curriculum, cấp, ví dụ, giải nghĩa ví dụ, tags, collocations, similar/confusable terms, audio URL/voice provenance, QA status, original source/license.
- Không tự động đưa bản dịch máy vào sản phẩm dưới nhãn “đã kiểm duyệt”. Bản dịch chưa review được gắn `draft` và ẩn hoặc có cảnh báo.
- Định nghĩa cấp độ nội dung `verified`, `draft`, `unavailable`; trang thống kê coverage nội dung nội bộ cho admin, không lẫn với tiến độ học.
- Có script validate số bản ghi, uniqueness `curriculum_id + source_index`, Unicode Hanzi/Pinyin, missing fields, multi-pronunciation, topic, license, sample sentences và kiểm tra duplicate/homographs.
- Grammar/exercise mang tag kỹ năng và version riêng; viết ngân hàng bài tập chất lượng cao trước khi mở rộng số lượng.

### 5.3 Speech / Pinyin

- Ưu tiên bản audio đã cấp phép hoặc TTS backend được kiểm soát; browser SpeechSynthesis chỉ fallback, label rõ, không đồng nhất giọng/khả năng giữa trình duyệt.
- Có playback normal/slow, replay shortcut, option ẩn pinyin/hint khi luyện nghe; loading/error audio rõ ràng.
- Pinyin input: **strict mode** chấm dấu thanh, **lenient mode** cho phép không đánh dấu thanh theo yêu cầu user nhưng ghi nhận tone chưa được kiểm chứng. Normalize `ü`, `u:`, `v` đúng quy tắc; giữ khác biệt `lu` và `lü`; test nǐ/ni3, lǜ/lv4, multi-syllable, punctuation, cách đọc từ nhiều âm.
- Phát âm người học qua microphone là phase nâng cao và phải xin quyền, có privacy policy; tuyệt đối không đưa ra “điểm phát âm AI” giả khi thiếu speech scoring engine.

### 5.4 Exam Engine

- Mỗi `exam_paper` là bộ đề **biên soạn và kiểm duyệt** với blueprint version, câu hỏi, đáp án, giải thích, kỹ năng, audio/image refs và mức độ khó.
- Đừng gọi những đề random theo seed là “đề chính thức”. Nếu generate theo template thì nhãn `luyện tập sinh tự động`, **không** `mock exam chuẩn`.
- HSK 2.0 HSK 4: dùng blueprint có nguồn đối chiếu; HSK 3.0: lấy blueprint riêng theo bản công bố trước khi mở timed exam.
- Đề có tính giờ thực, submit confirmation, resume hợp lệ, timeout policy, lưu đáp án theo questionId, item order version, score theo listening/reading/writing, bảng đáp án, sai ở đâu + luyện lại.
- Điểm câu đơn thuần không đại diện điểm chứng chỉ; chỉ quy đổi sang 300 điểm khi có phương pháp đã minh bạch và đúng giới hạn. Nếu không đủ cơ sở, hiển thị `x/y câu đúng` + `estimated performance` thay vì số điểm giả.
- Question types phải phù hợp ví dụ đề: nghe nội dung nhưng không reveal transcript nếu mục tiêu là nghe; nghe hội thoại có câu hỏi đúng ngữ cảnh; viết có đúng hình thức yêu cầu; hình ảnh được sử dụng đúng nguồn/lisence.
- Phân biệt `exam` timed (hạn chế hints) và `practice` (có explanations tức thì); tiếp tục đề cũ sau reload.

## 6. Kiến trúc đề xuất

**Khuyến nghị:** Giữ React + TypeScript + Vite cho frontend vì mã nguồn có sẵn; nâng dần backend Express sang TypeScript (không nhất thiết phải đổi framework), PostgreSQL/Neon. Áp dụng React Router, TanStack Query, Zod, React Hook Form, Tailwind CSS + design tokens, thư viện UI accessible có chọn lọc, Motion vừa đủ, ORM + SQL migration (Drizzle hoặc Prisma — **chọn một**), Vitest/React Testing Library/Playwright. Tối giản phụ thuộc.

```
apps/
  web/
    src/
      app/                 # providers, router, layouts
      pages/               # route pages
      features/
        auth/
        onboarding/
        today/
        vocabulary/
        grammar/
        study/
        practice/
        exams/
        analytics/
        settings/
      shared/
        ui/                 # Button, Dialog, Toast, Input, etc.
        styles/             # tokens, typography, themes
        lib/                # api client, schemas, utils
  api/
    src/
      server.ts
      middleware/
      modules/
        auth/
        curriculum/
        vocabulary/
        grammar/
        study/
        practice/
        exams/
        analytics/
      db/
        migrations/
        seeds/
packages/
  domain/                   # cross-platform types/schemas, pure learning rules
  content/                  # validated imports and curated resources
docs/v2/
  00-AUDIT.md
  01-PRD.md
  02-UX-FLOWS.md
  03-DESIGN-SYSTEM.md
  04-ARCHITECTURE.md
  05-DATA-MIGRATION.md
  06-TEST-PLAN.md
  DECISIONS.md
  PROGRESS.md
```

Cấu trúc trên là **định hướng**; nếu đơn repo thuận tiện hơn, có thể giữ `src/`, `server/`, miễn phân tách các domain tương đương và không dồn toàn bộ logic vào 1 file.

### Data model lõi

- `users`, `sessions`, `user_settings`, `study_goals`
- `curricula`, `curriculum_levels`, `vocabulary_entries`, `vocabulary_senses`, `examples`, `grammar_points`, `content_sources`
- `user_word_flags`, `review_cards`, `review_events`, `study_sessions`, `learning_activity_events`
- `exercises`, `exercise_attempts`, `mistake_records`
- `exam_blueprints`, `exam_papers`, `exam_questions`, `exam_attempts`, `exam_answers`
- `content_validation_reports` (admin nội bộ) và `audit_logs` bảo vệ quyền truy cập.

**Constraints cần có:** foreign keys, unique indices, server-side auth authorization every protected action, pagination, audit trail migrations; không lưu toàn bộ hành vi học là một JSONB blob có thể bị overwrite bởi request stale.

### API theo domain

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/curricula
GET    /api/vocabulary?curriculum=...&level=...&q=...
GET    /api/vocabulary/:id
GET    /api/grammar/:id
GET    /api/study/today
POST   /api/study/sessions
POST   /api/study/sessions/:id/reviews  # idempotency key
POST   /api/study/reviews/:id/undo
GET    /api/study/progress
POST   /api/practice/sessions
POST   /api/practice/attempts
GET    /api/practice/mistakes
GET    /api/exams
POST   /api/exams/:id/attempts
PATCH  /api/exams/attempts/:id/answers
POST   /api/exams/attempts/:id/submit
GET    /api/exams/attempts/:id/result
```

OpenAPI/spec-first nếu được; validate đầu vào Zod, cookie auth httpOnly/Secure/SameSite đúng môi trường, CSRF defense theo topology deployment, rate limit login, TLS CA validation, Helmet/security headers, no sensitive logging. Backend bắt buộc kiểm tra sở hữu bản ghi theo user, không tin user_id client gửi.

### Migration từ V1

- Snapshot V1 key `hanzi.learning-state.v1.user-<id>` chỉ là fallback, server `learning_states.state` là authoritative nếu có bản mới; phải có chiến lược merge tránh ghi đè bản gần nhất.
- Viết `import-v1-learning-state` có test fixtures, import reviews/favorites/difficult/mistakes/activity/typing/mockExamHistory, mapping các `curatedVocabulary` ID cũ sang canonical `curriculum + sourceIndex`.
- Event migration idempotent: re-run không tạo review/attempt trùng; source giữ immutable snapshot trước khi commit.
- Có rehearsal database, database backup, rollback strategy và schema version. Chỉ đánh dấu migrated sau khi checksum/validation thành công.
- Nêu rõ nếu trường legacy không đủ để ánh xạ thành dữ liệu chính xác; lưu legacy backup, không tự bịa.

### Offline/sync

- PWA và offline mode là mục tiêu phase tiếp theo, không hứa offline hoạt động hoàn toàn chỉ vì dùng localStorage.
- Nếu hỗ trợ offline: dùng IndexedDB queue, idempotent mutation IDs, retry/backoff, sync indicator (`Đã đồng bộ`, `Đang chờ mạng`, `Lỗi đồng bộ`) và conflict resolution; test mạng chập chờn/hai tab/hai thiết bị.
- Nếu chưa đủ nguồn lực: thông báo rõ yêu cầu online, ngăn silent data loss; bắt đầu với request version/optimistic locking.

## 7. Lộ trình Codex theo phase (Definition of Done)

### Phase 0 — Audit & Specification, P0

**Việc làm:** bảo quản mã cũ, kiểm tra build nếu dependencies sẵn, viết audit với bằng chứng mã nguồn, inventory dữ liệu, luồng học, tài liệu requirements; vẽ wireframes bằng Markdown/ASCII hoặc thiết kế có cấu trúc.

**Output:** `docs/v2/00-AUDIT.md`, `01-PRD.md`, `02-UX-FLOWS.md`, `04-ARCHITECTURE.md`, `DECISIONS.md`, `PROGRESS.md`.

**Done khi:** mọi màn hình hiện hữu có quyết định Keep/Rebuild/Remove, mỗi P0 có giải pháp, có migration plan và feature matrix HSK 2.0 vs 3.0.

### Phase 1 — Design System & Shell

**Việc làm:** tạo tokens, fonts, components, route layout, sidebar responsive, bottom nav, accessibility, states, onboarding shell, Storybook hoặc showcase components (optional).

**Output:** 8 màn đầu có UI coherent với trạng thái thật, có deep-link; skeleton/empty/error; không đụng logic dữ liệu sâu khi chưa ổn định.

**Done khi:** 320–1440px không tràn ngang, focus/keyboard sử dụng được, light/dark đúng tokens, không button inert, reduced-motion hoạt động.

### Phase 2 — Content & Curriculum Infrastructure

**Việc làm:** tách data files, schema, import script, validate coverage/provenance, kết nối content query, curriculum picker đúng chuẩn, đảm bảo IDs stable và bản quyền.

**Done khi:** 1.200 mục HSK 2.0 giữ nguyên unique/stable, không vỡ đồng hình, tìm đúng từ, verified/draft phân biệt; HSK 3.0 chưa có data thì hiển thị upcoming đúng sự thật.

### Phase 3 — Auth + Backend Persistence + Migration

**Việc làm:** Express TS modules, auth hardening, migrations, data model, import v1, version-aware writes, test authorization và tranh chấp updates.

**Done khi:** user A/B tách biệt, refresh/logout/login không mất dữ liệu, chạy import hai lần không nhân đôi, bad payload reject, SQL/authorization test pass.

### Phase 4 — Learning Experience Engine

**Việc làm:** Today plan tính dựa on due/new/goal, vocabulary detail, flashcard scheduler, undo, session summary, grammar, mistake re-practice, pinyin practice strict/lenient.

**Done khi:** luồng Today -> Study -> Rate -> DB -> reload -> Due hoạt động E2E; tiến độ đúng theo event; ví dụ có nguồn và TTS fallback rõ.

### Phase 5 — Exam Studio thật

**Việc làm:** bank đề đã kiểm chứng, practice mode, timed exam mode, autosave, submit, correct scoring/report theo skill, resume, error-focused recommendation.

**Done khi:** không ghi `official/mock` sai thực tế, câu listening không reveal transcript, timer và các policy có test, phản hồi kết quả đúng theo answer key.

### Phase 6 — QA / Performance / Deployment

**Việc làm:** test accessibility, unit/integration/e2e, security review, audit dependencies/licenses, performance budgets, migration rehearsal, CI, README local/deploy.

**Done khi:** test green, không P0/P1 tồn đọng chưa báo, hướng dẫn local + staging + production hoàn chỉnh, thực nghiệm thủ công các viewport và test keyboard/audio.

**Thứ tự ưu tiên:** Phase 0 -> 1 & 2 -> 3 -> 4 -> 5 -> 6. Không bỏ kiểm thử để làm animation; không tuyên bố hoàn thành khi mới có giao diện.

## 8. Tiêu chí nghiệm thu có thể đo

### Quality gates

- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e` chạy được (chỉ thêm script khi đã cấu hình thật).
- Unit tests cho scheduler với fake clock, bộ chuẩn hóa Pinyin, word ID mapping, content validation, scoring, migration idempotency.
- Integration tests auth + authorization, event idempotency, concurrent update, reload/offline behavior theo scope.
- E2E Playwright: guest tour; account create/sign-in; onboarding; search click correct word; start/rate/restart session; set favorites; mistake retry; timed practice; resume exam; logout/login; mobile nav.
- Lighthouse mục tiêu **>=90 accessibility**, **>=90 performance** trên kịch bản/thiết bị/mạng được nêu trong báo cáo; không coi đây là số liệu đạt nếu chưa chạy đo.
- Không lỗi nghiêm trọng WCAG 2.2 AA (tập trung, name/role/value, contrast, keyboard). Touch target hợp lý, chữ nhỏ nhất đọc được trên 320px.
- Không commit .env/tokens/DB URLs; rate-limit thử nghiệm; SQL injection + broken access control regression tests.
- Không tự nhận HSK official; nếu tài nguyên thuộc CC BY-SA 4.0, tuân thủ attribution/share-alike cho phần chuyển đổi liên quan.

### Acceptance scenarios

1. Người mới vào `/` xem demo mà không phải tạo tài khoản; đăng nhập xong chuyển sang plan cá nhân.
2. Người học chọn HSK 2.0 HSK4, học 10 từ; 10 review events được lưu chính xác, due update theo scheduler, reload vẫn giữ.
3. Tìm `lü`, `lv4`, Hán tự hoặc nghĩa Việt; click kết quả hiển thị đúng URL/từ và trạng thái lưu.
4. Trả lời sai một câu về cấu trúc 把; sổ lỗi chứa prompt, đáp án, giải thích; bấm “Luyện lại” mở đúng câu/loại bài.
5. Bắt đầu đề đã kiểm chứng, có đồng hồ, thoát rồi vào vẫn còn câu trả lời; sau submit có kết quả phần nghe/đọc/viết (nếu format hỗ trợ), câu sai và gợi ý ôn.
6. Hai phiên dùng chung tài khoản gửi mutation gần đồng thời; không làm mất các đánh giá đã lưu; API từ tài khoản khác không xem được dữ liệu.
7. Điện thoại 320px không có menu quá chật, CTA bị che hoặc phải vuốt ngang để đọc.
8. Trình duyệt thiếu giọng `zh-CN` hiển thị xử lý thiếu audio/fallback trung thực, không coi đã phát thành công.

## 9. Ưu tiên phát triển sản phẩm, không phình scope

**MVP chất lượng cao:** Curriculum 2.0 + Today + Vocabulary + Flashcard review + Grammar + Practice/Mistakes + Auth/sync + Progress chính xác + UI đầy đủ. 

**V1.1:** Exam Studio với bộ đề được QA (ít đề chất lượng tốt hơn hàng chục đề giả), Pinyin tone-sensitive, audio nâng cao.

**V1.2:** HSK 3.0 curriculum **khi** có nguồn dữ liệu được phép dùng và được kiểm duyệt; offline/PWA; phát âm nâng cao; AI tutor tùy ngân sách.

**Tránh trong đợt rebuild đầu:** leaderboard, mạng xã hội, coin/gacha, AI chấm nói thiếu engine, auto-generated 10.000 câu không biên tập, quảng cáo nhận diện bản quyền không rõ, ồ ạt dependency/animation, bản dịch AI chưa review.

## 10. MASTER PROMPT — COPY VÀO CODEX ĐỂ BẮT ĐẦU

> Bạn là Principal Product Designer, Senior UI/UX Engineer, Senior Fullstack Engineer và QA Lead. Hãy đọc toàn bộ repository HANZI HSK hiện tại. Mục tiêu của chúng ta là HANZI V2, xây dựng lại sản phẩm học tiếng Trung cá nhân hóa, không phải bản reskin của website cũ.
>
> Đọc kỹ toàn bộ file `HANZI_V2_CODEX_MASTER_PLAN.md` này. File này là product specification. Trước khi code, audit codebase, đối chiếu bằng chứng ở mục 1, kiểm tra structure, run scripts có sẵn nếu môi trường hỗ trợ, tuyệt đối không giả mạo kết quả. Tạo `docs/v2/00-AUDIT.md`, `01-PRD.md`, `02-UX-FLOWS.md`, `03-DESIGN-SYSTEM.md`, `04-ARCHITECTURE.md`, `05-DATA-MIGRATION.md`, `06-TEST-PLAN.md`, `DECISIONS.md`, `PROGRESS.md`.
>
> Phân biệt rõ HSK 2.0/2015 1.200 mục từ và HSK 3.0 curriculum riêng. Giữ ID và tiến độ V1 thông qua migration được kiểm thử. Không tự sinh đề chuẩn HSK từ vocab random rồi gắn nhãn mock exam. Không tự nhận có audio, AI, FSRS, PWA hoặc đồng bộ đầy đủ nếu chưa triển khai và test thật.
>
> Về UI: chọn hướng Calm Hanzi Studio, premium minimalist, jade + warm ivory + ink, typography tiếng Việt/Hán tự tốt, responsive 320–1440px, light/dark, animation có ý nghĩa, WCAG 2.2 AA, không biểu tượng lộn xộn, không màn hình rỗng hay button vô dụng. Trải nghiệm cốt lõi là Today -> Study -> Review -> Insight và Practice -> Mistakes -> Retry.
>
> Về kỹ thuật: ưu tiên React/TypeScript/Vite frontend, Express/TypeScript backend + PostgreSQL/Neon, typed schemas, modular domain, event-based review persistence, optimistic concurrency/idempotency, auth secure, tests. Không gom lại thành App.tsx 2000 dòng. Chọn thư viện có lý do, tránh overengineering. Viết code có cấu trúc, tên rõ ràng, hỗ trợ local environment.
>
> Làm theo 7 phase trong kế hoạch. Ở lần thực thi đầu, ưu tiên hoàn thành **Phase 0** và dựng foundation Phase 1 nếu phù hợp; không lao vào sửa tất cả trong một đợt. Tự cập nhật `docs/v2/PROGRESS.md` sau mỗi lần làm. Với mọi phase, tự kiểm tra typecheck, lint, tests, build, và test giao diện khi môi trường hỗ trợ. Nếu lỗi không thể chạy do thiếu env/dependency, ghi rõ. Chỉ báo “Done” khi có bằng chứng.
>
> Bắt đầu bằng báo cáo: (1) inventory hệ thống cũ, (2) quyết định Keep/Rebuild/Remove, (3) mô hình dữ liệu/luồng mới, (4) kế hoạch di chuyển không mất dữ liệu, (5) danh sách việc Phase 1 kèm tiêu chí nghiệm thu, sau đó triển khai đúng theo thứ tự.

## 11. Prompt tiếp theo theo từng phase

Sau Phase 0, dùng prompt ngắn: `Hãy triển khai Phase 1 theo HANZI_V2_CODEX_MASTER_PLAN.md. Trước khi code, đọc docs/v2/PROGRESS.md và DECISIONS.md. Giữ đúng tiêu chí nghiệm thu Phase 1, viết tests phù hợp, cập nhật progress và cung cấp report file changes + commands + results + chưa hoàn thành.`

Áp dụng tương tự cho Phase 2–6. Không yêu cầu “làm toàn bộ trong một prompt” vì dễ tạo nhiều UI surface nhưng chưa kết nối dữ liệu thật và rất khó review.

## 12. Checklist bàn giao cuối

- [ ] Tất cả màn hình có UX state đầy đủ và responsive thật
- [ ] Curriculum labels đúng; HSK 3.0 không mượn data 2015
- [ ] Search deep-link đúng từ; không dấu/tone được xử lý đúng theo mode
- [ ] Flashcard state, scheduler và undo có tests
- [ ] Có dữ liệu/trạng thái “verified” cho nội dung xuất bản
- [ ] Time tracking đo theo phiên thực, không +1 phút mỗi thẻ
- [ ] Mistake retry mở đúng session/câu
- [ ] Exam mode chỉ dùng bank đề validated; có timer, kết quả theo skill
- [ ] Sync versioned/idempotent; migration V1 bảo toàn user data
- [ ] Backend secure cookies/TLS/rate limiting/ownership tests
- [ ] No dead buttons, no fake AI, no fake charts, no leaked secrets
- [ ] Typecheck, lint, unit, integration, e2e, build đã chạy có bằng chứng
- [ ] Dữ liệu bên thứ ba có license và attribution theo `DATA_LICENSE.md`
- [ ] README và docs/v2 đúng với code mới; ghi giới hạn trung thực

---

### Tài liệu tham chiếu

- Dự án gốc: `README.md`, `DATA_SOURCES.md`, `DATA_LICENSE.md`, `src/App.tsx`, `src/data.ts`, `src/content/*`, `server/index.js`, `src/styles.css`.
- CTI / Chinese Test — HSK 3.0 thông báo 13/12/2026: https://old.chinesetest.cn/gonewcontent.do?flag=kdnew&id=51336883
- CTI — HSK 3.0 syllabus & sample: https://www.chinesetest.cn/syllabus
- Official HSK2 2015 list link đã ghi trong dự án: https://www.chinesetest.cn/userfiles/file/cihui.pdf

Lưu ý: kế hoạch là blueprint và tiêu chí giao việc, không phải tuyên bố rằng V2 đã được code hay test.
