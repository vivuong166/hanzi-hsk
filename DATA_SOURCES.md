# Hồ sơ dữ liệu từ vựng

## HSK 2.0 / 2015 — HSK 4

- Curriculum ID: `hsk-2.0-2015`
- Phạm vi: HSK 4 tích lũy, 1.200 mục từ vựng.
- Tệp nguồn: `新 HSK（一级）词汇（150）` đến `新 HSK（四级）词汇（1200）`.
- Nguồn phát hành: Chinese Test / 汉语考试服务网.
- URL: <https://www.chinesetest.cn/userfiles/file/cihui.pdf>
- Ngày đối chiếu: 2026-10-19.

## Quy tắc mô hình hóa

- Mục 1–150 có `introducedAtLevel: 1`.
- Mục 151–300 có `introducedAtLevel: 2`.
- Mục 301–600 có `introducedAtLevel: 3`.
- Mục 601–1.200 có `introducedAtLevel: 4`.
- `officialLabel` giữ nguyên cách phân biệt trong tài liệu gốc, ví dụ `得（dei）` hoặc `过（动）`.
- `hanzi` là dạng đơn giản dùng để học và tìm kiếm. Pinyin và từ loại ưu tiên từ bộ metadata HSK 2.0 nêu bên dưới; `pinyin-pro` chỉ là phương án dự phòng, còn các trường hợp được ghi chú ở tài liệu gốc được ghi đè thủ công.
- Các mục trùng bề mặt như `长`, `还`, `只` vẫn là những mục riêng theo số thứ tự nguồn; không gộp làm mất nghĩa/từ loại có thể khác nhau.

## Trạng thái nội dung

- `curated`: đã có nghĩa Việt, từ loại và ví dụ theo ngữ cảnh do dự án biên soạn.
- `sourced`: đã xác nhận thuộc danh mục HSK 4, có Hán tự, pinyin, từ loại, nghĩa Việt ngắn và câu ví dụ tiếng Trung được ánh xạ từ nguồn hoặc biên soạn dự phòng theo ngữ cảnh.

## Metadata pinyin và từ loại

- Nguồn metadata: [drkameleon/complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary), bộ danh sách HSK 2.0/2015 cũ.
- Giấy phép nguồn metadata: MIT License.
- Dự án chỉ dùng pinyin và từ loại từ nguồn này. Nghĩa Việt ngắn được biên soạn trong dự án; các mục không có từ loại từ metadata được gán thủ công và có kiểm tra để không còn trạng thái `Chưa phân loại`.

Không dùng bộ dữ liệu HSK 3.0 để bù vào danh mục này. HSK 3.0 phải được lưu thành curriculum riêng vì cấp độ và yêu cầu từ vựng khác HSK 2.0/2015.

## Câu ví dụ cho flashcard

- Tệp sinh: `src/content/hsk2-example-sentences.ts`.
- Nguồn câu: [no7z/hsk-sentences-audio](https://github.com/no7z/hsk-sentences-audio). Dự án chọn một câu có token trùng chính xác với từng mục HSK 2.0, thay vì dùng danh mục HSK 3.0 làm danh mục từ vựng.
- Các mục không có câu token khớp, cùng các từ đồng hình cần phân biệt nghĩa, dùng câu ngắn do dự án biên soạn. Danh sách override nằm trong `scripts/build-hsk2-examples.mjs`.
- Nội dung được kiểm tra để mỗi mục HSK 4 đều có một câu tiếng Trung; các bản dịch ví dụ tiếng Việt chỉ hiển thị ở mục `curated` do dự án tự biên soạn, tránh đưa vào bản dịch máy chưa kiểm duyệt.
- Điều khoản và attribution cho phần dữ liệu nhập được ghi tại `DATA_LICENSE.md`.
