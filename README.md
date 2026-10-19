# HANZI — HSK 4

Ứng dụng học tiếng Trung tối giản, ưu tiên trải nghiệm học và ôn tập hằng ngày cho người học Việt Nam.

## Chạy cục bộ

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định là `http://127.0.0.1:4173`).

## Kiểm tra và build

```bash
npm run typecheck
npm run build
```

## Những gì có trong bản hiện tại

- Tổng quan với kế hoạch ngày và số liệu dựa trên hoạt động thực.
- Thư viện đủ 1.200 mục từ vựng HSK 2.0/2015 tích lũy cho HSK 4, có Hán tự, pinyin, nghĩa Việt ngắn, từ loại, câu ví dụ, tìm kiếm không dấu pinyin, lọc, phát âm fallback bằng SpeechSynthesis, lưu từ và đánh dấu từ khó.
- Flashcard lật thẻ: mặt trước là Hán tự; mặt sau có pinyin, từ loại, nghĩa Việt, câu ví dụ và vị trí trong danh mục. Chọn được bộ riêng HSK 1 (150 từ), HSK 2 (150), HSK 3 (300) hoặc HSK 4 (600); các phiên mới đi tuần tự qua từ chưa học, rồi ưu tiên thẻ đến hạn.
- Tiến độ, từ yêu thích, từ khó và lịch ôn được gắn với tài khoản đang đăng nhập, lưu trên Neon theo `user_id`; bản sao trên trình duyệt cũng tách theo từng tài khoản.
- Bốn bài ngữ pháp có giải thích tiếng Việt, ví dụ, so sánh và đánh dấu hoàn thành.
- Bài tập trắc nghiệm, điền từ, sắp xếp câu cùng Sentence Builder; lỗi được lưu vào Sổ tay lỗi sai.
- Thống kê hoạt động, heatmap 30 ngày, giao diện tối/sáng và thiết kế đáp ứng cho di động.

Tiến độ được đồng bộ vào Neon cho tài khoản đang đăng nhập. Trình duyệt giữ một bản sao cục bộ theo khóa `hanzi.learning-state.v1.user-<id>` để hỗ trợ khi kết nối tạm thời không ổn định; bản sao này không được dùng chung giữa các tài khoản.

## Giới hạn minh bạch

Danh mục từ vựng HSK 4 hiện đủ 1.200 mục theo HSK 2.0/2015; hồ sơ nguồn nằm trong `DATA_SOURCES.md`. Toàn bộ mục có Hán tự, pinyin, nghĩa Việt ngắn, từ loại và câu ví dụ tiếng Trung. Mười hai mục `curated` có thêm bản dịch ví dụ tiếng Việt do dự án biên soạn; các mục còn lại chỉ hiển thị câu Trung để không đưa vào bản dịch Việt chưa kiểm duyệt. Câu ví dụ đã nhập có attribution và điều khoản tại `DATA_LICENSE.md`. Nghĩa Việt ngắn là trợ giúp học nhanh, vì vậy các từ đa nghĩa cần được rà soát theo ngữ cảnh trước khi dùng làm nội dung xuất bản chính thức. Lịch ôn hiện dùng thuật toán khoảng cách thích ứng cục bộ, chưa phải triển khai FSRS đã kiểm chứng.
