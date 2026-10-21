# HANZI V2 — Product Requirements

## Phạm vi phát hành MVP

HANZI V2 là công cụ học tiếng Trung dành cho người Việt, tập trung vào **HSK 2.0/2015**. Dữ liệu từ vựng phát hành là 1.200 mục tích lũy đến HSK 4 (HSK 1: 150, HSK 2: 150 mới, HSK 3: 300 mới, HSK 4: 600 mới).

HSK 3.0 không hiển thị như curriculum có thể học, thi hay tìm kiếm trong MVP. Nếu xuất hiện trong cài đặt/roadmap, trạng thái phải là “Chưa hỗ trợ”.

## Người dùng và nhu cầu

- Người học có 5–20 phút, cần biết chính xác việc học tiếp theo.
- Người học HSK 4 cần ôn từ đúng lúc, hiểu lỗi và quay lại luyện đúng điểm yếu.
- Người dùng đăng nhập lại/đổi thiết bị cần không mất tiến độ đã đồng bộ.

## Giá trị cốt lõi

1. Today đề xuất một phiên học rõ ràng dựa trên review đến hạn, từ mới và mục tiêu.
2. Học từ theo flashcard, đánh giá Again/Hard/Good/Easy và biết lần ôn tiếp theo.
3. Vocabulary hỗ trợ Hán tự, Pinyin có/không dấu và nghĩa Việt; chi tiết từ có URL ổn định.
4. Practice lưu lỗi kèm prompt, đáp án, giải thích và mở lại chính xác nội dung cần luyện.
5. Mọi progress/insight đều có nguồn event thật hoặc hiển thị trạng thái chưa có dữ liệu.

## Không thuộc MVP

- HSK 3.0 curriculum hoặc đề thi.
- Timed mock exam khi chưa có blueprint/question bank được kiểm duyệt.
- Leaderboard, coin/gacha, social feed.
- AI tutor hoặc AI-generated exam/content chưa qua review.
- Cam kết offline/PWA hoàn chỉnh hoặc audio thu âm thật.

## North-star và guardrails

North-star: tỷ lệ phiên đã lên kế hoạch được hoàn thành với review rating hoặc kết quả practice có thể đo.

Không dùng tổng clicks, thời gian mở website, streak hay biểu đồ mẫu làm chỉ số thành công. Mọi chỉ số cần nêu rõ cách tính và khoảng thời gian.

## Tiêu chí chức năng cấp sản phẩm

- Giao diện mobile-first, dùng được từ 320 đến 1440 px; desktop có sidebar gọn, mobile có bottom nav bốn mục.
- Mỗi route có loading, empty, error có thể khôi phục, offline/online disclosure, disabled và focus state.
- Nội dung hiển thị nhãn `HSK 2.0 (2015) · HSK n` cùng trạng thái verified/draft khi phù hợp.
- Không có dead button hoặc biểu đồ/dữ liệu giả.
