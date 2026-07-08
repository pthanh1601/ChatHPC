import * as FileSystem from 'expo-file-system';
import RNFS from 'react-native-fs';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import { matrixService, getMatrixClient } from './MatrixService';
import { Platform } from 'react-native';

// Try to load NativeMatrixCryptoModule (Swift for iOS)
let NativeMatrixCrypto: any = null;
if (Platform.OS === 'ios') {
    try {
        NativeMatrixCrypto = require('../../modules/native-matrix-crypto/src/NativeMatrixCryptoModule').default;
    } catch (e) {
        console.log('NativeMatrixCryptoModule not available:', e);
    }
}

// Fallback: Thử lấy thư viện Quick Crypto
let nativeCrypto: any = null;
try {
    nativeCrypto = require('react-native-quick-crypto');
    if (nativeCrypto && nativeCrypto.default) {
        nativeCrypto = nativeCrypto.default;
    }
} catch (e) {
    console.log('QuickCrypto not available:', e);
}

const toBase64UrlUnpaddedBuffer = (buffer: Buffer) => {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const toBase64UnpaddedBuffer = (buffer: Buffer) => {
    return buffer.toString('base64').replace(/=+$/, '');
};

const toBase64UrlUnpaddedJS = (wordArray: CryptoJS.lib.WordArray) => {
    return wordArray.toString(CryptoJS.enc.Base64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const toBase64UnpaddedJS = (wordArray: CryptoJS.lib.WordArray) => {
    return wordArray.toString(CryptoJS.enc.Base64).replace(/=+$/, '');
};

class MediaService {

    private async _encryptAndUploadFile(file: { uri: string, type: string, name: string, size?: number, info?: any }, isEncrypted: boolean, canEncrypt: boolean): Promise<{ mxcUrl: string, encryptionInfo: any, size: number }> {
        const client = getMatrixClient();
        if (!client) throw new Error("Matrix client is not initialized");

        let fileUriToUpload = file.uri;
        let uploadMimeType = file.type;
        let encryptionInfo: any = null;
        let tempEncryptedUri: string | null = null;
        let finalSize = file.size || 0;

        try {
            if (isEncrypted && canEncrypt) {
                const fileStat = await FileSystem.getInfoAsync(file.uri);
                if (fileStat.exists) {
                    finalSize = (fileStat as any).size || finalSize;
                }

                const fileExtension = file.name.split('.').pop() || 'tmp';
                tempEncryptedUri = RNFS.CachesDirectoryPath + '/enc_' + Date.now() + '.' + fileExtension;
                const cleanUri = file.uri.startsWith('file://') ? file.uri.substring(7) : file.uri;
                const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

                if (NativeMatrixCrypto) {
                    console.log(`🔒 [Swift Native Mode] Mã hóa tốc độ cao bằng CommonCrypto: ${file.name}`);
                    const nativeResult = await NativeMatrixCrypto.encryptFile(cleanUri, tempEncryptedUri);

                    encryptionInfo = {
                        v: "v2",
                        key: { alg: "A256CTR", ext: true, k: nativeResult.key, key_ops: ["encrypt", "decrypt"], kty: "oct" },
                        iv: nativeResult.iv,
                        hashes: { sha256: nativeResult.sha256 }
                    };
                } else if (nativeCrypto) {
                    console.log(`🔒 [Native Mode] Mã hóa file PHÂN MẢNH (Streaming) bằng Quick-Crypto: ${file.name}`);

                    const key = Buffer.from(nativeCrypto.randomBytes(32));
                    const iv = Buffer.from(nativeCrypto.randomBytes(16));
                    // Chuẩn Matrix (MSC1767): 8 byte cuối (64-bit) của IV phải bằng 0 để dùng làm Counter
                    iv.fill(0, 8, 16);

                    const cipher = nativeCrypto.createCipheriv('aes-256-ctr', key, iv);
                    const sha256 = nativeCrypto.createHash('sha256');

                    let position = 0;
                    while (position < finalSize) {
                        const lengthToRead = Math.min(CHUNK_SIZE, finalSize - position);
                        const b64Chunk = await RNFS.read(cleanUri, lengthToRead, position, 'base64');
                        const chunkBuffer = Buffer.from(b64Chunk, 'base64');

                        const encryptedBuffer = Buffer.from(cipher.update(chunkBuffer));
                        sha256.update(encryptedBuffer);

                        await RNFS.appendFile(tempEncryptedUri, encryptedBuffer.toString('base64'), 'base64');
                        position += lengthToRead;
                    }

                    const finalBuffer = Buffer.from(cipher.final());
                    if (finalBuffer.length > 0) {
                        sha256.update(finalBuffer);
                        await RNFS.appendFile(tempEncryptedUri, finalBuffer.toString('base64'), 'base64');
                    }

                    const sha256Hash = sha256.digest('base64');

                    encryptionInfo = {
                        v: "v2",
                        key: { alg: "A256CTR", ext: true, k: toBase64UrlUnpaddedBuffer(key), key_ops: ["encrypt", "decrypt"], kty: "oct" },
                        // IV VÀ SHA256 CỦA MATRIX SPEC BẮT BUỘC PHẢI GIỮ LẠI PADDING CỦA BASE64 CHUẨN (CÓ DẤU =)
                        iv: iv.toString('base64'),
                        hashes: { sha256: sha256Hash }
                    };
                } else {
                    console.log(`🔒 [JS Fallback Mode] Mã hóa file PHÂN MẢNH bằng crypto-js: ${file.name}`);
                    const key = CryptoJS.lib.WordArray.random(32);
                    const iv = CryptoJS.lib.WordArray.random(16);
                    iv.words[2] &= 0x7FFFFFFF;
                    iv.words[3] = 0; // Tránh tràn đếm

                    const encryptor = CryptoJS.algo.AES.createEncryptor(key, { iv: iv, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding });
                    const sha256 = CryptoJS.algo.SHA256.create();

                    let position = 0;
                    while (position < finalSize) {
                        const lengthToRead = Math.min(CHUNK_SIZE, finalSize - position);
                        const b64Chunk = await RNFS.read(cleanUri, lengthToRead, position, 'base64');
                        const plaintextWordArray = CryptoJS.enc.Base64.parse(b64Chunk.replace(/[^A-Za-z0-9+/=]/g, ''));

                        const encryptedChunk = encryptor.process(plaintextWordArray);

                        if (encryptedChunk && encryptedChunk.sigBytes > 0) {
                            sha256.update(encryptedChunk);
                            const chunkBase64 = encryptedChunk.toString(CryptoJS.enc.Base64);
                            await RNFS.appendFile(tempEncryptedUri, chunkBase64, 'base64');
                        }
                        position += lengthToRead;
                    }

                    const finalChunk = encryptor.finalize();
                    if (finalChunk && finalChunk.sigBytes > 0) {
                        sha256.update(finalChunk);
                        const finalBase64 = finalChunk.toString(CryptoJS.enc.Base64);
                        await RNFS.appendFile(tempEncryptedUri, finalBase64, 'base64');
                    }

                    const hashBase64 = sha256.finalize().toString(CryptoJS.enc.Base64); // CHUẨN CÓ DẤU =

                    encryptionInfo = {
                        v: "v2",
                        key: { alg: "A256CTR", ext: true, k: toBase64UrlUnpaddedJS(key), key_ops: ["encrypt", "decrypt"], kty: "oct" },
                        iv: iv.toString(CryptoJS.enc.Base64), // CHUẨN CÓ DẤU =
                        hashes: { sha256: hashBase64 }
                    };
                }

                fileUriToUpload = 'file://' + tempEncryptedUri;
                uploadMimeType = "application/octet-stream";
            }

            const uploadUrl = `${client.getHomeserverUrl()}/_matrix/media/v3/upload?filename=${encodeURIComponent(file.name)}`;
            const uploadResult = await FileSystem.uploadAsync(uploadUrl, fileUriToUpload, {
                headers: { 'Authorization': `Bearer ${client.getAccessToken()}`, 'Content-Type': uploadMimeType },
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
            });

            if (uploadResult.status !== 200) throw new Error(`Upload failed with status ${uploadResult.status}`);

            return { mxcUrl: JSON.parse(uploadResult.body).content_uri, encryptionInfo: encryptionInfo, size: finalSize };
        } catch (error) {
            console.error("Lỗi mã hóa file:", error);
            throw error;
        } finally {
            if (tempEncryptedUri) {
                await FileSystem.deleteAsync(tempEncryptedUri, { idempotent: true }).catch(() => { });
            }
        }
    }

    async uploadFile(roomId: string, file: { uri: string, type: string, name: string, size?: number, info?: any }, thumbnailData?: { uri: string, type: string, name: string, size?: number, info?: any }) {
        const client = getMatrixClient();
        if (!client) return null;

        const isEncrypted = client.isRoomEncrypted(roomId);
        const canEncrypt = client.isCryptoEnabled();

        let primaryFileResult;
        let thumbnailResult = null;

        try {
            primaryFileResult = await this._encryptAndUploadFile(file, isEncrypted, canEncrypt);

            if (thumbnailData) {
                thumbnailResult = await this._encryptAndUploadFile(thumbnailData, isEncrypted, canEncrypt);
            }

            let msgtype = 'm.file';
            if (file.type?.startsWith('image/')) msgtype = 'm.image';
            else if (file.type?.startsWith('audio/')) msgtype = 'm.audio';
            else if (file.type?.startsWith('video/')) msgtype = 'm.video';

            const content: any = {
                body: file.name || "Attachment",
                msgtype: msgtype,
                info: { mimetype: file.type, size: primaryFileResult.size, ...file.info }
            };

            if (isEncrypted && canEncrypt && primaryFileResult.encryptionInfo) {
                primaryFileResult.encryptionInfo.url = primaryFileResult.mxcUrl;
                content.file = primaryFileResult.encryptionInfo;
            } else {
                content.url = primaryFileResult.mxcUrl;
            }

            if (thumbnailResult && thumbnailData) {
                if (isEncrypted && canEncrypt && thumbnailResult.encryptionInfo) {
                    thumbnailResult.encryptionInfo.url = thumbnailResult.mxcUrl;
                    content.info.thumbnail_file = thumbnailResult.encryptionInfo;
                } else {
                    content.info.thumbnail_url = thumbnailResult.mxcUrl;
                }
                if (thumbnailData.info) {
                    content.info.thumbnail_info = { mimetype: thumbnailData.type, size: thumbnailResult.size, ...thumbnailData.info };
                }
            }

            const sendResponse = await matrixService._safeSendEvent(roomId, "m.room.message", content);
            return { ...sendResponse, mxcUrl: primaryFileResult.mxcUrl };
        } catch (error) {
            console.error("❌ Lỗi upload file:", error);
            throw error;
        }
    }

    async decryptMatrixFile(file: any, targetUri?: string) {
        const client = getMatrixClient();
        if (!client || !file || !file.url) throw new Error("File info is missing.");

        const outputUri = targetUri || (FileSystem.cacheDirectory + 'dec_temp_' + Date.now());

        try {
            let httpUrl = client.mxcUrlToHttp(file.url);
            if (httpUrl) {
                httpUrl = httpUrl.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');
            }

            const tempUri = FileSystem.cacheDirectory + 'enc_' + Date.now();
            const downloadResult = await FileSystem.downloadAsync(httpUrl, tempUri, {
                headers: client?.getAccessToken() ? { Authorization: `Bearer ${client.getAccessToken()}` } : {}
            });

            if (downloadResult.status !== 200) throw new Error(`HTTP ${downloadResult.status}`);

            if (nativeCrypto) {
                let kBase64 = file.key.k.replace(/-/g, '+').replace(/_/g, '/');
                while (kBase64.length % 4) kBase64 += '=';
                const key = Buffer.from(kBase64, 'base64');

                let ivBase64 = file.iv.replace(/-/g, '+').replace(/_/g, '/');
                while (ivBase64.length % 4) ivBase64 += '=';
                const iv = Buffer.from(ivBase64, 'base64');

                const encryptedB64 = (await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 })) as string;
                const ciphertextBuffer = Buffer.from(encryptedB64, 'base64');

                const decipher = nativeCrypto.createDecipheriv('aes-256-ctr', key, iv);
                const plaintextBuffer = Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()]);

                await FileSystem.writeAsStringAsync(outputUri, plaintextBuffer.toString('base64'), { encoding: FileSystem.EncodingType.Base64 });
            } else {
                const keyBase64 = file.key.k.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (file.key.k.length % 4)) % 4);
                const ivBase64 = file.iv.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (file.iv.length % 4)) % 4);
                const key = CryptoJS.enc.Base64.parse(keyBase64);
                const iv = CryptoJS.enc.Base64.parse(ivBase64);

                const decryptor = CryptoJS.algo.AES.createDecryptor(key, { iv: iv, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding });

                // Giải mã nguyên khối (One-pass) tương tự như mã hóa để tránh rủi ro đứt gãy
                const b64Data = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 });
                const ciphertextWordArray = CryptoJS.enc.Base64.parse(b64Data.replace(/[^A-Za-z0-9+/=]/g, ''));

                const decryptedChunk = decryptor.process(ciphertextWordArray);
                const finalChunk = decryptor.finalize();

                const finalWordArray = decryptedChunk.clone();
                if (finalChunk && finalChunk.sigBytes > 0) {
                    finalWordArray.concat(finalChunk);
                }

                const finalBase64Data = finalWordArray.toString(CryptoJS.enc.Base64);

                await FileSystem.writeAsStringAsync(outputUri, finalBase64Data, { encoding: FileSystem.EncodingType.Base64 });
            }

            await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => { });
            return outputUri;
        } catch (e: any) {
            console.error("❌ Lỗi luồng giải mã nhận file media:", e);
            throw e;
        }
    }
}

export const mediaService = new MediaService();
export const decryptMatrixFile = (file: any, targetUri?: string) => mediaService.decryptMatrixFile(file, targetUri);
