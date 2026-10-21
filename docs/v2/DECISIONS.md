# HANZI V2 — Decisions

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
