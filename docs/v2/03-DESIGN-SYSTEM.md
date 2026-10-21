# HANZI V2 — Design system

## Direction: Calm Hanzi Studio

Tham chiếu hình ảnh được diễn giải thành một sản phẩm EdTech tối giản, hiện đại và êm: thẻ thoáng, hierarchy rõ, typography mạnh, nét giấy/lưới luyện chữ tinh tế. Không sao chép bố cục, thương hiệu, avatar, device frame hay số liệu của tham chiếu.

Desktop dùng rail/sidebar nhỏ và dashboard có một hành động chính. Mobile ưu tiên flashcard lớn, thao tác một tay và bottom nav bốn mục. Illustration chỉ dùng cho onboarding hoặc empty state, không phủ kín dashboard.

## Token nền tảng

| Token | Light | Vai trò |
| --- | --- | --- |
| `--bg-canvas` | `#F7F7F2` | Ivory ấm |
| `--bg-surface` | `#FFFFFF` | Bề mặt thẻ |
| `--ink-strong` | `#1D2823` | Chữ chính |
| `--ink-muted` | `#617168` | Chữ phụ, phải kiểm contrast |
| `--brand-jade` | `#26755E` | CTA/trạng thái chính |
| `--brand-jade-soft` | `#EAF4EE` | Bề mặt nhấn |
| `--accent-terracotta` | `#C78265` | Cảnh báo/nhấn có giới hạn |
| `--border-subtle` | `#E3E9E2` | Border |

Dark theme phải được thiết kế bằng token tương ứng và kiểm tra contrast, không đơn thuần đảo màu.

## Type, spacing và shape

- UI: Be Vietnam Pro hoặc Inter; CJK: Noto Sans SC, có fallback và kiểm tra license/subset trước khi tải.
- Body 15–16 px; micro copy không nhỏ hơn 12 px; chữ Hán trên flashcard 64–86 px mobile, 72–112 px desktop tùy diện tích.
- Grid 4/8 px; radius 12/16/24 px; shadow nhẹ, border rõ; icon SVG cùng style, không dùng emoji làm hệ icon.
- Motion 140–240 ms; flip chỉ dùng cho flashcard; `prefers-reduced-motion` tắt/giảm chuyển động.

## Component contract Phase 1

`Button`, `IconButton`, `TextField`, `Select`, `Badge`, `Progress`, `Card`, `EmptyState`, `ErrorState`, `Skeleton`, `Toast`, `Dialog`, `PageHeader`, `AppShell`, `BottomNav`, `Flashcard`.

Mỗi component có focus visible, state disabled/loading, nhãn accessible và touch target phù hợp. Flashcard không được lồng `<button>` trong một element đóng vai button.
