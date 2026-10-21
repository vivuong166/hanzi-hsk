# HANZI V2 — UX flows

## Information architecture

Desktop: Hôm nay, Học từ, Ngữ pháp, Luyện tập, Tiến độ; tiện ích gồm Từ đã lưu, Sổ lỗi, Cài đặt. Search mở command palette.

Mobile bottom nav: Hôm nay, Học, Ôn, Tôi. Ngữ pháp, practice, saved và settings đi qua Study Hub/More để không nhồi tab.

## Route contract

```text
/today
/learn/vocabulary
/learn/vocabulary/:wordId
/learn/grammar
/learn/grammar/:grammarId
/study/session/:sessionId
/practice
/practice/mistakes
/progress
/settings
```

Routes exam chỉ được bổ sung lại khi phase Exam Studio có question bank đã QA. V2 MVP không deep-link đến mock exam.

## Luồng Today → Study → Review → Insight

1. Người học mở `/today`; hệ thống tải summary và giải thích kế hoạch 5/10/20 phút.
2. CTA duy nhất “Bắt đầu phiên hôm nay” tạo/resume study session thật.
3. Phiên ưu tiên thẻ due, sau đó thẻ mới trong goal; mỗi đánh giá gửi event có idempotency key.
4. Kết thúc phiên hiển thị số thẻ, ratings, thời lượng phiên đo thực tế và next due; người học có thể undo rating cuối nếu session còn mở.
5. `/progress` đọc event/persistence, không tự suy ra phút học từ số flashcard.

## Luồng vocabulary

1. Tìm bằng Hán tự, Pinyin có dấu/không dấu, `ü` hoặc `v` ở chế độ lenient, hay nghĩa Việt.
2. Chọn kết quả điều hướng `/learn/vocabulary/:wordId`, tải đúng mục từ và cho phép save/difficult.
3. Nếu TTS trình duyệt không có voice `zh-CN`, hiển thị fallback rõ ràng; không báo audio đã phát thành công.

## Luồng Practice → Mistakes → Retry

1. Người học chọn skill và bắt đầu practice session.
2. Câu sai ghi attempt/mistake cùng question version, prompt, đáp án, giải thích và timestamp.
3. `/practice/mistakes` nhóm lỗi nhưng CTA tạo session với chính các question ID còn phù hợp, không chỉ chuyển trang.
4. Nếu nội dung đã bị retire, hiển thị lý do và bài thay thế có nhãn rõ ràng.

## Các trạng thái chuẩn

Mọi flow phải có: loading skeleton, empty có CTA hợp lệ, recoverable error + retry, no-network disclosure, success feedback, disabled reason, keyboard order/focus visible và copy cho screen reader.
