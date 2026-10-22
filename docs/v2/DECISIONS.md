# HANZI V2 — Decisions

> **Cập nhật 21/10/2026 — ADR-012:** V1 là runtime chính cho đợt nâng cấp UI/UX. Shell `src/v2/` chưa có feature parity nên không được thay thế V1; mọi modernize tiếp theo phải giữ state, local-storage key và endpoint V1.

> **Cập nhật 22/10/2026 — ADR-013:** V2 được tiếp tục như một bản nâng cấp kế thừa V1. V1 state không bị xóa/ghi đè; V2 chỉ được kích hoạt theo từng tài khoản sau snapshot, import idempotent, rehearsal DB và kiểm tra parity. Xem `09-V2-UPGRADE-CONTRACT.md`.

| ID | Ngày | Quyết định | Lý do / hệ quả |
| --- | --- | --- | --- |
| ADR-001 | 21/10/2026 | MVP chỉ dùng HSK 2.0/2015 | Đã có 1.200 mục content và provenance; tránh trộn curriculum/danh nhãn HSK 3.0 chưa sẵn sàng |
| ADR-002 | 21/10/2026 | Giữ React/Vite + Express trong giai đoạn rebuild | Đủ cho incremental migration; ưu tiên tách domain hơn chuyển framework |
| ADR-003 | 21/10/2026 | Không phát hành Mock Exam trong MVP | Hiện câu hỏi sinh từ vocabulary/seed, không có format/timer/scoring đã xác thực |
| ADR-004 | 21/10/2026 | Calm Hanzi Studio là art direction | Premium, calm, mobile-first; sử dụng ivory/jade/ink và hierarchy rõ, không sao chép reference UI |
| ADR-005 | 21/10/2026 | Event-based persistence là đích bắt buộc | Tránh overwrite JSON blob, hỗ trợ idempotency, undo và multi-device conflict handling |
| ADR-006 | 21/10/2026 | Phase 1 dùng History API router nội bộ, không thêm dependency | Deep-link V2 hoạt động với Vite fallback; chọn router thư viện sẽ được đánh giá khi các domain/API cần nested data loading |
| ADR-007 | 21/10/2026 | Canonical vocabulary identity là `curriculum_id + sourceIndex`; giữ `id` ứng dụng V1 | 11 mục curated dùng ID V1 riêng nhưng map đúng sourceIndex/Hán tự; không đổi ID để bảo toàn migration/deep-link cũ |
| ADR-008 | 21/10/2026 | Release nội dung đầu tiên là `hsk-2.0-2015.r1` | Version này sẽ gắn vào attempts/completions V2; nó phiên bản hóa content project, không khẳng định một chuẩn HSK mới hay HSK 3.0 |
| ADR-009 | 21/10/2026 | Rate limit hiện là memory-local baseline | Bảo vệ ngay một server instance; trước deploy multi-instance phải chuyển sang shared rate-limit store/edge, không được coi hiện trạng là distributed protection |
| ADR-010 | 21/10/2026 | Dùng raw SQL migration runner có checksum | Giữ stack `pg` hiện có, tránh thêm ORM trước rehearsal; migration append-only, không auto-DDL lúc server start |
| ADR-011 | 21/10/2026 | V1 import là CLI theo từng user, không auto-migrate lúc login | Bắt buộc backup/rehearsal và review `unmapped`; tránh âm thầm ghi dữ liệu không map được |
| ADR-012 | 21/10/2026 | V1 là runtime chính trong đợt modernize UI/UX | Shell V2 chưa có feature parity nên không được thay thế V1; state và endpoint V1 được giữ nguyên |
| ADR-013 | 22/10/2026 | V2 là upgrade kế thừa V1 theo handover gate | V1 JSON được snapshot bất biến, import idempotent và V2 không trở thành concurrent writer trước khi rehearsal/parity pass |
| ADR-014 | 22/10/2026 | Dictionary V2 local-first, provider boundary | 1.200 mục HSK hiện có là nguồn nghĩa Việt đã kiểm soát; không leak API key, không phụ thuộc third-party endpoint hay mơ hồ license. Full dictionary chỉ được import từ release có provenance/license đã duyệt; API chỉ là enhancement server-side có nhãn. |
