const fs = require('fs');

let content = fs.readFileSync('src/services/MatrixService.ts', 'utf8');

// 1. Thay đổi Imports
content = content.replace(
    /import CryptoJS from 'crypto-js';\nimport { Buffer } from 'buffer';/g,
    "import { persistentLocalStorage } from './StorageService';\nimport { voipService } from './VoipService';"
);

// 2. Xóa PersistentLocalStorage (từ class PersistentLocalStorage đến export const persistentLocalStorage...)
content = content.replace(/class PersistentLocalStorage \{[\s\S]*?export const persistentLocalStorage = new PersistentLocalStorage\(\);\n/g, '');

// 3. Xóa các hàm tiện ích Base64/Buffer
content = content.replace(/\/\/ 🌟 HÀM TIỆN ÍCH: Ép chuỗi sang định dạng Unpadded Base64 chuẩn quốc tế của Matrix[\s\S]*?return buffer;\n}\n/g, '');

// 4. Sửa Call.incoming handler
content = content.replace(
    /if \(this\.activeCall\) \{\n\s+call\.hangup\('busy'\);\n\s+return;\n\s+\}\n\s+this\._handleNewCall\(call, true\);/g,
    "if (voipService.activeCall) {\n                        call.hangup('busy');\n                        return;\n                    }\n                    voipService.handleNewCall(call, true, 'voice');"
);

// 5. Xóa biến activeCall trong class
content = content.replace(/public activeCall: any = null;\n/g, '');

// 6. Xóa VOIP block
content = content.replace(/\/\/ === XỬ LÝ WEBRTC VOIP === \/\/[\s\S]*?\/\/ ======================== \/\/\n/g, '');

// 7. Xóa _encryptAndUploadFile và uploadFile
content = content.replace(/\/\/ ✅ SỬA ĐỔI CHUẨN ELEMENT: MÃ HÓA CUỐN CHIẾU THEO TỪNG CHUNK[\s\S]*?\/\/ --- THAY THẾ HOÀN TOÀN HÀM uploadFile TRONG MATRIX.TS ---[\s\S]*?async uploadFile[\s\S]*?await FileSystem\.deleteAsync\(tempEncryptedUri, \{ idempotent: true \}\)\.catch\(\(\) => \{\}\);\n\s+\}\n\s+\}\n/g, '');

content = content.replace(/\/\/ --- THAY THẾ HOÀN TOÀN HÀM uploadFile TRONG MATRIX.TS ---[\s\S]*?async uploadFile[\s\S]*?await FileSystem\.deleteAsync\(tempEncryptedUri, \{ idempotent: true \}\)\.catch\(\(\) => \{ \}\);\n\s+\}\n\s+\}\n/g, ''); // Dự phòng nếu old block

content = content.replace(/private async _encryptAndUploadFile[\s\S]*?await FileSystem\.deleteAsync\(tempEncryptedUri, \{ idempotent: true \}\)\.catch\(\(\) => \{\}\);\n\s+\}\n\s+\}\n/g, ''); // Cả _encryptAndUploadFile

// 8. Xóa decryptMatrixFile
content = content.replace(/\/\/ --- THAY THẾ HOÀN TOÀN HÀM decryptMatrixFile Ở CUỐI FILE MATRIX.TS ---[\s\S]*?export async function decryptMatrixFile[\s\S]*?throw e;\n\s+\}\n\}\n/g, '');

fs.writeFileSync('src/services/MatrixService.ts', content, 'utf8');
console.log("Refactored MatrixService.ts");
