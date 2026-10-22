# V2 Dictionary Foundation

## Quyết định hiện tại

Từ điển V2 là **local-first**. Provider đầu tiên (`hsk-2.0-2015-local`) chỉ tra 1.200 mục HSK 2.0/2015 đã có sẵn trong ứng dụng, theo Hán tự, Pinyin có/không dấu và nghĩa tiếng Việt.

- Không cần API key, không gửi truy vấn tra từ ra ngoài và vẫn hoạt động khi catalogue đã tải xong.
- Kết quả giữ `id`, `sourceIndex`, HSK level, provenance và nội dung đã có; không sinh một nghĩa hoặc ví dụ mới.
- UI nêu rõ giới hạn: không có kết quả chỉ có nghĩa là từ nằm ngoài phạm vi HSK cục bộ.
- `src/content/dictionary.ts` là provider boundary. UI không phụ thuộc trực tiếp vào dịch vụ bên thứ ba.

## Không dùng một dictionary API làm nguồn chính

Không gọi trực tiếp API từ trình duyệt, scrape Hanzii/Pleco/MDBG, hay đưa API key vào client. Cách đó làm UX phụ thuộc mạng, khó kiểm soát chi phí/rate limit, dễ mơ hồ về giấy phép và không giải quyết được chất lượng nghĩa tiếng Việt.

Nếu sau này cần tra ngoài HSK, phương án ưu tiên là import một release có version và provenance rõ ràng vào kho dữ liệu của HANZI. CC-CEDICT là một ứng viên cho lớp Trung–Anh: dữ liệu download hiện mang CC BY-SA 4.0, do đó trước khi nhập phải duyệt attribution, share-alike và phân tách phần diễn giải tiếng Việt do dự án biên soạn. Unihan chỉ nên bổ sung dữ kiện ký tự (đọc, thuộc tính), không thay thế nghĩa từ.

## Khi nào mới thêm API

Chỉ thêm provider server-side nếu có một use case không thể đáp ứng từ local data, ví dụ dịch nháp câu người dùng nhập hoặc âm thanh neural. Provider đó phải:

1. giữ secret trên server, có rate limit/cache/timeout và không log nội dung thừa;
2. trả về `provider`, phiên bản và trạng thái để UI ghi rõ “máy dịch/tham khảo”, không trộn vào nghĩa đã biên tập;
3. không ghi đè content HSK hoặc learning state V1/V2;
4. được kiểm tra điều khoản, chi phí và dữ liệu gửi ra trước khi bật cho người dùng.

## Mốc mở rộng an toàn

1. Download release dictionary được phê duyệt vào pipeline build/seed, ghi release date, checksum, license và attribution.
2. Parse vào bảng/index riêng, không lẫn với canonical HSK vocabulary.
3. Thêm exact / prefix / character segmentation, traditional–simplified aliases và review UI.
4. Biên soạn hoặc QA lớp nghĩa tiếng Việt riêng; machine translation chỉ là bản nháp có nhãn.
5. Chạy license, performance và privacy review trước khi bật cho toàn bộ user.
