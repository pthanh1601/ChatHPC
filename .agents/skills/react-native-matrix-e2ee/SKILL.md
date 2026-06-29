---
name: react-native-matrix-e2ee
description: Hướng dẫn chi tiết cách mã hóa và giải mã file đính kèm (Attachments) theo chuẩn Matrix E2EE (MSC1767) trong React Native sử dụng crypto-js (JS Fallback). Kích hoạt kỹ năng này khi có lỗi giải mã (khiên đỏ) hoặc khi viết mã hóa file E2EE.
---

# Kỹ năng: Mã hóa đính kèm Matrix E2EE trong React Native

Khi mã hóa tệp đính kèm trong môi trường React Native (Expo) bằng thư viện thuần JS `crypto-js` (do không có native crypto module), bạn BẮT BUỘC phải tuân thủ các quy tắc sống còn sau để đảm bảo các Client khác (như Element Android, Element Web, Element iOS) có thể giải mã thành công, không bị lỗi "khiên đỏ" (Decryption error).

## 1. Tránh tràn bộ đếm Counter (Counter Overflow)
Trong chế độ `AES-CTR` của WebCrypto API, `counter` sử dụng 64-bit thấp của `iv` (16 bytes). Tuy nhiên, `crypto-js` thao tác qua mảng 4 block 32-bit (WordArray) và nếu block cuối cùng (word thứ 4) được khởi tạo bằng một giá trị random quá cao, nó có thể bị tràn khi mã hóa file lớn, sinh ra rác dữ liệu.
**Quy tắc:** Bắt buộc khóa word thứ 4 của IV về 0 trước khi khởi tạo `encryptor`.
```javascript
const iv = CryptoJS.lib.WordArray.random(16);
iv.words[2] &= 0x7FFFFFFF; 
iv.words[3] = 0; // Tránh tràn đếm của CryptoJS vĩnh viễn
```

## 2. Quy tắc Padding của Base64 (CỰC KỲ QUAN TRỌNG)
Các Client khác của Matrix (đặc biệt là Element Android và Web) sử dụng parser Base64 cực kỳ khắt khe của Java/Browser. Bạn phải định dạng JSON đúng chuẩn Spec (MSC1767 / RFC7517) cho các trường mã hóa `k`, `iv`, và `sha256`:
- `k` (Khóa JWK): **Bắt buộc dùng Base64URL Không Padding (Unpadded)**. Thay `+` bằng `-`, `/` bằng `_` và xóa đuôi `=`.
- `iv` (Vector khởi tạo): **Bắt buộc dùng Base64 chuẩn CÓ Padding**. Tức là phải CHỮA LẠI đuôi `=` nếu bị thiếu. Không bao giờ được cắt padding của `iv`.
- `hashes.sha256`: **Bắt buộc dùng Base64 chuẩn CÓ Padding**.

## 3. Toàn vẹn dữ liệu nhị phân (Chống đứt gãy file)
Việc mã hóa file lớn trên RN không hỗ trợ tốt `ArrayBuffer`, buộc phải đọc file thành chuỗi Base64 để parse. Khi dùng `crypto-js`, tuyệt đối không được chuyển kết quả thành các chuỗi Base64 nhỏ rồi dùng phép toán cộng chuỗi `String + String`. Việc này tạo ra một chuỗi chứa dấu Padding `==` ở đoạn nối. Khi `expo-file-system` lưu file, nó sẽ ngừng đọc ngay khi gặp dấu `=` ở giữa, khiến file bị cắt cụt (Truncate) -> Lỗi sai Hash SHA-256.
**Quy tắc:** Bắt buộc nối mảng `WordArray` lại với nhau trước khi xuất thành Base64.
```javascript
// ĐÚNG: Nối WordArray trước rồi toString(Base64) 1 lần duy nhất
const finalWordArray = encryptedChunk.clone();
if (finalChunk && finalChunk.sigBytes > 0) {
    finalWordArray.concat(finalChunk);
}
const finalEncryptedBase64 = finalWordArray.toString(CryptoJS.enc.Base64);
```

Tuân thủ nghiêm ngặt các điều trên sẽ giúp file mã hóa hoàn toàn trùng khớp chuẩn thuật toán của Native, đảm bảo đối phương luôn xem được ảnh.
