import 'react-native-get-random-values';
import * as sdk from 'matrix-js-sdk';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import { EventEmitter } from 'events';
import { Platform, Alert, Share } from 'react-native';
import { registerForPushNotificationsAsync, setupNotificationCategories } from '../services/notifications';
// @ts-ignore
import OlmInstance from '@matrix-org/olm/olm_legacy.js';

const Olm = OlmInstance.default || OlmInstance;
(global as any).Olm = Olm;

const MATRIX_BASE_URL = 'https://matrix.5hpc.com';

// GIẢI PHÁP TỐI THƯỢNG: Sử dụng biến global để không bị mất Client khi Save file (Hot Reload)
const globalStore = global as any;

if (!globalStore.__matrixClient) {
    globalStore.__matrixClient = sdk.createClient({ baseUrl: MATRIX_BASE_URL });
}

let matrixClient = globalStore.__matrixClient;

// Import LocalStorageCryptoStore để lưu trữ khoá E2EE bền vững trên điện thoại
const { LocalStorageCryptoStore } = require('matrix-js-sdk/lib/crypto/store/localStorage-crypto-store');

class PersistentLocalStorage {
    private cache: { [key: string]: string } = {};
    private filePath: string = FileSystem.documentDirectory + 'matrix_localstorage.json';
    private saveTimeout: NodeJS.Timeout | null = null;
    public isInitialized: boolean = false; // Cờ đánh dấu trạng thái nạp file từ đĩa

    async init() {
        try {
            const fileInfo = await FileSystem.getInfoAsync(this.filePath);
            if (fileInfo.exists) {
                const content = await FileSystem.readAsStringAsync(this.filePath);
                this.cache = JSON.parse(content);
                console.log(`📁 Loaded ${Object.keys(this.cache).length} keys from PersistentLocalStorage`);
            }
        } catch (e) {
            console.error("Failed to initialize PersistentLocalStorage:", e);
            this.cache = {};
        } finally {
            this.isInitialized = true;
        }
    }

    getItem(key: string): string | null {
        return this.cache[key] !== undefined ? this.cache[key] : null;
    }

    setItem(key: string, value: string): void {
        this.cache[key] = String(value);
        this.save();
    }

    removeItem(key: string): void {
        delete this.cache[key];
        this.save();
    }

    key(index: number): string | null {
        const keys = Object.keys(this.cache);
        return keys[index] !== undefined ? keys[index] : null;
    }

    get length(): number {
        return Object.keys(this.cache).length;
    }

    private save() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        this.saveTimeout = setTimeout(async () => {
            try {
                await FileSystem.writeAsStringAsync(this.filePath, JSON.stringify(this.cache));
            } catch (e) {
                console.error("Failed to save PersistentLocalStorage:", e);
            }
        }, 100);
    }

    async clear() {
        this.cache = {};
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        try {
            await FileSystem.deleteAsync(this.filePath, { idempotent: true });
            console.log("📁 Cleared PersistentLocalStorage file.");
        } catch (e) { }
    }
}

export const persistentLocalStorage = new PersistentLocalStorage();

// Lưu trữ ID phòng chat đang active để màn hình ChatSingle có thể sử dụng
export let currentActiveRoomId: string | null = globalStore.__currentActiveRoomId || null;

export const setCurrentActiveRoomId = (id: string | null) => {
    currentActiveRoomId = id;
    globalStore.__currentActiveRoomId = id;
};

function bufferToWordArray(buffer: Buffer): CryptoJS.lib.WordArray {
    const len = buffer.length;
    const words: number[] = [];
    for (let i = 0; i < len; i += 4) {
        let word = 0;
        if (i + 0 < len) word |= buffer[i + 0] << 24;
        if (i + 1 < len) word |= buffer[i + 1] << 16;
        if (i + 2 < len) word |= buffer[i + 2] << 8;
        if (i + 3 < len) word |= buffer[i + 3] << 0;
        words.push(word);
    }
    return CryptoJS.lib.WordArray.create(words, len);
}

function wordArrayToBuffer(wordArray: CryptoJS.lib.WordArray): Buffer {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const buffer = Buffer.alloc(sigBytes);
    for (let i = 0; i < sigBytes; i++) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        buffer[i] = byte;
    }
    return buffer;
}

class MatrixService extends EventEmitter {
    public client: any = null;
    public homeserverUrl = MATRIX_BASE_URL;
    public secretKeys = new Map();
    public tempKey: any = null;
    public isResettingIdentity = false;
    public currentVerificationRequest: any = null;
    public activeCall: any = null;

    constructor() {
        super();
        this.client = globalStore.__matrixClient;
    }

    async _getSecretStorageDefaultKeyId() {
        if (!this.client) return null;
        try {
            const ssssEvent = this.client.getAccountData('m.secret_storage.default_key');
            if (ssssEvent) return ssssEvent.getContent().key;
        } catch (e) {
            console.warn("Could not get SSSS default key from account data:", e);
        }
        if (typeof this.client.getSecretStorageDefaultKeyId === 'function') {
            try {
                return await this.client.getSecretStorageDefaultKeyId();
            } catch (e) { return null; }
        }
        return null;
    }

    async login(username: string, password: string) {
        const tempClient = sdk.createClient({ baseUrl: this.homeserverUrl });
        const response = await tempClient.login("m.login.password", {
            user: username,
            password: password,
        });

        const authData = {
            userId: response.user_id,
            accessToken: response.access_token,
            deviceId: response.device_id,
            baseUrl: this.homeserverUrl
        };

        // Dọn dẹp thiết bị cũ để tránh Key Sharing lag và rate-limiting
        try {
            console.log("🧹 Fetching user devices for stale session cleanup...");
            const devicesResponse = await tempClient.getDevices();
            const deviceList = devicesResponse.devices || [];
            console.log(`Found ${deviceList.length} total devices for user ${username}.`);

            // Chỉ dọn dẹp nếu tổng số thiết bị lớn hơn 5
            if (deviceList.length > 5) {
                // Sắp xếp theo last_seen_ts giảm dần (mới nhất lên đầu)
                const sortedDevices = [...deviceList].sort((a: any, b: any) => {
                    const tsA = a.last_seen_ts || 0;
                    const tsB = b.last_seen_ts || 0;
                    return tsB - tsA;
                });

                // Giữ lại thiết bị hiện tại và 2 thiết bị hoạt động gần đây nhất
                const keepDeviceIds = new Set<string>();
                keepDeviceIds.add(response.device_id);

                let addedCount = 0;
                for (const d of sortedDevices) {
                    if (d.device_id !== response.device_id && addedCount < 2) {
                        keepDeviceIds.add(d.device_id);
                        addedCount++;
                    }
                }

                const devicesToDelete = deviceList
                    .map((d: any) => d.device_id)
                    .filter((id: string) => !keepDeviceIds.has(id));

                if (devicesToDelete.length > 0) {
                    console.log(`🧹 Deleting ${devicesToDelete.length} stale devices...`);
                    await tempClient.deleteMultipleDevices(devicesToDelete, {
                        type: 'm.login.password',
                        identifier: {
                            type: 'm.id.user',
                            user: response.user_id
                        },
                        password: password
                    });
                    console.log("✅ Stale devices cleaned up successfully!");
                }
            }
        } catch (cleanupError: any) {
            console.warn("⚠️ Failed to clean up stale devices during login:", cleanupError.message || cleanupError);
        }

        await AsyncStorage.setItem('matrix_session', JSON.stringify(authData));
        return await this.startSession(authData);
    }

    async register(username: string, password: string) {
        const tempClient = sdk.createClient({ baseUrl: this.homeserverUrl });
        try {
            const response = await tempClient.register(
                username,
                password,
                undefined,
                { type: "m.login.dummy" } as any
            );
            const authData = {
                userId: response.user_id,
                accessToken: response.access_token,
                deviceId: response.device_id,
                baseUrl: this.homeserverUrl
            };
            await AsyncStorage.setItem('matrix_session', JSON.stringify(authData));
            return await this.startSession(authData);
        } catch (e) {
            console.error("Registration failed:", e);
            throw e;
        }
    }

    async requestPasswordReset(email: string) {
        const tempClient = sdk.createClient({ baseUrl: this.homeserverUrl });
        return await tempClient.requestPasswordToken("email", {
            email: email,
            client_secret: "eclo_secret_reset",
            send_attempt: 1
        });
    }

    async restoreSession() {
        const json = await AsyncStorage.getItem('matrix_session');
        if (!json) return false;
        try {
            await this.startSession(JSON.parse(json));
            return true;
        } catch (e) {
            console.error("Restore failed:", e);
            return false;
        }
    }

    async startSession(authData: any) {
        if (this.client) {
            this.client.stopClient();
        }

        console.log(`🛠 Creating Client for ${authData.userId}...`);
        this.isResettingIdentity = false;

        const cryptoCallbacks = {
            getSecretStorageKey: async ({ keys, name }: any) => {
                const keyObject = keys || {};
                const keyIds = Object.keys(keyObject);

                for (const keyId of keyIds) {
                    if (this.secretKeys.has(keyId)) {
                        return [keyId, this.secretKeys.get(keyId)];
                    }
                }
                if (this.tempKey) {
                    const targetKeyId = keyIds[0] || await this._getSecretStorageDefaultKeyId();
                    if (targetKeyId) return [targetKeyId, this.tempKey];
                }
                if (this.isResettingIdentity) {
                    const targetKeyId = keyIds[0] || "dummy_key_id";
                    const dummyKey = new Uint8Array(32);
                    (global as any).crypto?.getRandomValues(dummyKey);
                    return [targetKeyId, dummyKey];
                }
                return null;
            },
            cacheSecret: async (name: string, secret: any) => { }
        };

        // Sử dụng IndexedDBStore giống bản Web (nhờ fake-indexeddb). Fake localstorage để không văng lỗi.
        const mockLocalStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { } };
        const store = (global as any).indexedDB ? new sdk.IndexedDBStore({
            indexedDB: (global as any).indexedDB,
            localStorage: (global as any).localStorage || mockLocalStorage,
            dbName: "eclo-chat-sync-store"
        }) : new sdk.MemoryStore();

        // 🟢 Đảm bảo nạp xong Cache từ đĩa lên RAM trước khi khởi tạo CryptoStore
        if (!persistentLocalStorage.isInitialized) {
            await persistentLocalStorage.init();
        }

        this.client = sdk.createClient({
            baseUrl: authData.baseUrl,
            accessToken: authData.accessToken,
            userId: authData.userId,
            deviceId: authData.deviceId,
            timelineSupport: true,
            sessionStore: store,
            cryptoStore: new LocalStorageCryptoStore(persistentLocalStorage), // Sử dụng LocalStorageCryptoStore lưu khóa bền vững vào đĩa
            cryptoCallbacks: cryptoCallbacks as any,
        });

        // Lắng nghe sự kiện token hết hạn/hủy để tự động đăng xuất
        this.client.on("Session.logged_out", async () => {
            console.warn("⚠️ Access token is invalid/revoked, logging out...");
            await this.clearCache();
            this.emit('session.logged_out');
        });

        globalStore.__matrixClient = this.client;

        try {
            // Tự động khôi phục khóa giải mã E2EE từ SecureStore nếu có
            try {
                const savedRecoveryKey = await SecureStore.getItemAsync('matrix_recovery_key');
                if (savedRecoveryKey) {
                    const cleanInput = savedRecoveryKey.trim().replace(/\s/g, '');
                    let privateKeyUint8: Uint8Array | string | null = null;
                    try {
                        // 🌟 Dùng import động bất đồng bộ chuẩn api để không bị lỗi phân tích cú pháp tĩnh trên Hermes
                        const { decodeRecoveryKey } = await import('matrix-js-sdk/lib/crypto-api/recovery-key');
                        privateKeyUint8 = decodeRecoveryKey(cleanInput);
                    } catch {
                        privateKeyUint8 = cleanInput;
                    }
                    if (privateKeyUint8) {
                        this.tempKey = privateKeyUint8;
                    }
                }
            } catch (secErr) {
                console.warn("Could not load recovery key from SecureStore on startup:", secErr);
            }

            // Khởi tạo Olm và hệ thống mã hóa Legacy (Chống crash khi Hot Reload)
            if (!globalStore.__olmInitialized) {
                console.log("Khởi tạo Olm Legacy...");
                await Olm.init();
                globalStore.__olmInitialized = true;
            }

            await this.client.initCrypto();

            this.client.setGlobalErrorOnUnknownDevices(false);

            this.client.getSecretStorageKey = cryptoCallbacks.getSecretStorageKey;

            // Đưa khóa giải mã vào secretKeys map sau khi crypto đã khởi tạo xong và defaultKeyId có sẵn
            const defaultKeyId = await this._getSecretStorageDefaultKeyId();
            if (defaultKeyId && this.tempKey) {
                this.secretKeys.set(defaultKeyId, this.tempKey);
                console.log("🔑 Restored default SSSS key:", defaultKeyId);
            }

            console.log("✅ Crypto Initialized!");
        } catch (e: any) {
            console.error("❌ Crypto Failed:", e);
            if (e.message?.includes("account in the store doesn't match") || e.message?.includes("DecryptionError") || e.message?.includes("token")) {
                await this.clearCache();
                this.emit('session.logged_out');
                return;
            }
        }

        const registerMatrixPusher = async (matrixClientInstance: any) => {
            try {
                const token = await registerForPushNotificationsAsync();
                if (!token) {
                    console.log("⏳ Token chưa sẵn sàng, thử lại sau 3 giây...");
                    setTimeout(() => registerMatrixPusher(matrixClientInstance), 3000);
                    return;
                }

                const pureTokenString = String(token).trim();
                const currentPlatform = __DEV__ ? 'sandbox' : 'production';
                const currentTopic = 'chatapp.5hpc.app';

                console.log(`📡 [Element Mode] Tiến hành đẩy Pusher lên Homeserver...`);

                await matrixClientInstance.setPusher({
                    app_display_name: 'ChatHPC',
                    app_id: 'chatapp.5hpc.app',
                    pushkey: pureTokenString,
                    kind: 'http',
                    data: {
                        url: 'https://sygnal.5hpc.com/_matrix/push/v1/notify',
                        platform: currentPlatform,
                        topic: currentTopic,
                        format: 'event_id_only',

                        // 🌟 BỔ SUNG ĐOẠN ĐÁNH LỪA APPLE APNS GIỐNG HỆT CÁCH ELEMENT LÀM
                        default_payload: {
                            aps: {
                                alert: {
                                    "loc-key": "Notification",
                                    "loc-args": []
                                },
                                "mutable-content": 1, // Bắt buộc để thức dậy Background Task giải mã tin nhắn
                                sound: "default"
                            }
                        }
                    },
                    append: true,
                    device_display_name: Platform.OS + ' Device',
                    profile_tag: 'ChatHPC_IOS_Pusher',
                    lang: 'vi'
                });
                console.log(`✅ [Element Mode] Đăng ký Pusher THÀNH CÔNG trên Homeserver!`);
            } catch (error) {
                console.error("❌ Lỗi khi đăng ký Pusher, thử lại sau 5 giây:", error);
                setTimeout(() => registerMatrixPusher(matrixClientInstance), 5000);
            }
        };

        this.client.once('sync', (state: string) => {
            if (state === 'PREPARED') {
                console.log("🚀 Client PREPARED");
                this.emit('prepared');

                setupNotificationCategories();

                // Gọi hàm kích hoạt đăng ký liên tục đến khi nào Homeserver nhận thì thôi
                registerMatrixPusher(this.client);

                // TODO: voipService.init(); nếu có

                if (this.client.getCrypto()) {
                    this.client.on("crypto.verification.request" as any, (request: any) => {
                        this._handleVerificationRequest(request);
                    });
                }

                // Lắng nghe cuộc gọi đến (Inbound Call)
                this.client.on("Call.incoming" as any, (call: any) => {
                    if (this.activeCall) {
                        call.hangup('busy');
                        return;
                    }
                    this._handleNewCall(call, true);
                });
            }
        });

        await this.client.startClient({
            initialSyncLimit: 20,
            lazyLoadMembers: true
        });

        return this.client;
    }

    async clearCache() {
        if (this.client) {
            this.client.stopClient();
            this.client = null;
        }
        await AsyncStorage.clear();
        await SecureStore.deleteItemAsync('matrix_recovery_key').catch(() => { });
        await persistentLocalStorage.clear().catch(() => { });
    }

    // === XỬ LÝ WEBRTC VOIP === //
    async placeCall(roomId: string, type: 'voice' | 'video' = 'voice') {
        if (!this.client) return;
        const call = this.client.createCall(roomId);
        if (!call) return;
        this._handleNewCall(call, false, type);
    }

    _handleNewCall(call: any, isIncoming: boolean, type: 'voice' | 'video' = 'voice') {
        this.activeCall = call;

        const updateUI = () => {
            if (!this.activeCall) {
                this.emit('call.update', null);
                return;
            }
            const data = {
                id: call.callId,
                roomId: call.roomId,
                type: call.type || type,
                state: call.state,
                isIncoming: isIncoming && call.state === 'ringing',
                localStream: call.localUsermediaStream || call.localStream,
                remoteStream: call.remoteUsermediaStream || call.remoteStream,
            };
            this.emit('call.update', data);
        };

        call.on('state', (state: string) => {
            if (state === 'ended') this.activeCall = null;
            updateUI();
        });

        call.on('local_stream', (stream: any) => { this.emit('call.local_stream', stream); updateUI(); });
        call.on('remote_stream', (stream: any) => { this.emit('call.remote_stream', stream); updateUI(); });

        call.on('error', (err: any) => {
            console.error("Lỗi WebRTC/Call:", err);
            this.hangupCall();
        });

        if (!isIncoming) {
            if (type === 'video') call.placeVideoCall();
            else call.placeVoiceCall();
        }
        updateUI();
    }

    answerCall() {
        if (this.activeCall && this.activeCall.state === 'ringing') this.activeCall.answer();
    }

    hangupCall() {
        if (this.activeCall) {
            this.activeCall.hangup();
            this.activeCall = null;
            this.emit('call.update', null);
        }
    }
    // ======================== //

    _handleVerificationRequest(request: any) {
        this.currentVerificationRequest = request;
        request.on("change", () => {
            this.emit('verification.update', request);
        });
        this.emit('verification.request', request);
    }

    async startVerification() {
        if (!this.client) return;
        const request = await this.client.getCrypto().requestOwnUserVerification();
        if (request) this._handleVerificationRequest(request);
        return request;
    }

    cancelVerification() {
        if (this.currentVerificationRequest) {
            this.currentVerificationRequest.cancel({ code: "m.user", reason: "Cancelled by user" });
            this.currentVerificationRequest = null;
            this.emit('verification.update', null);
        }
    }

    // Hàm bọc an toàn chống crash E2EE
    async _safeSendEvent(roomId: string, eventType: string, content: any) {
        if (!this.client) return null;
        try {
            return await this.client.sendEvent(roomId, eventType, content);
        } catch (error: any) {
            if (error.message?.includes("client does not support encryption") || error.message?.includes("encryption")) {
                console.warn("Fallback: Bỏ qua mã hóa vì Engine E2EE cục bộ bị lỗi, chuyển sang gửi unencrypted...");

                const room = this.client.getRoom(roomId);
                if (room) {
                    // Đánh lừa Matrix SDK bằng cách override trực tiếp hàm isEncrypted() của Room
                    const originalIsEncrypted = room.isEncrypted;
                    room.isEncrypted = () => false;
                    try {
                        return await this.client.sendEvent(roomId, eventType, content);
                    } finally {
                        room.isEncrypted = originalIsEncrypted; // Trả lại nguyên trạng ngay sau khi gửi xong
                    }
                }
            }
            throw error;
        }
    }

    async sendMessage(roomId: string, content: string, htmlBody: string | null = null) {
        if (!this.client) return;

        const isEncrypted = this.client.isRoomEncrypted(roomId);

        // CHỈ tự động ép phòng thành phòng bảo mật nếu client hiện tại thực sự hỗ trợ Crypto
        if (!isEncrypted && this.client.isCryptoEnabled()) {
            this.client.sendStateEvent(roomId, "m.room.encryption", {
                algorithm: "m.megolm.v1.aes-sha2"
            }).catch((e: any) => console.warn("Could not enable encryption:", e.message));
        }

        const eventContent: any = { msgtype: "m.text", body: content };
        if (htmlBody) {
            eventContent.format = "org.matrix.custom.html";
            eventContent.formatted_body = htmlBody;
        }

        return await this._safeSendEvent(roomId, "m.room.message", eventContent);
    }

    async sendSystemMessage(roomId: string, text: string) {
        if (!this.client) return;
        return await this._safeSendEvent(roomId, "m.room.message", {
            body: text,
            msgtype: "m.notice"
        });
    }

    async uploadFile(roomId: string, file: {
        uri: string,
        type: string,
        name: string,
        size?: number,
        info?: any
    }) {
        if (!this.client) return;

        const isEncrypted = this.client.isRoomEncrypted(roomId);
        const canEncrypt = this.client.isCryptoEnabled();

        // Đọc file an toàn trên React Native bằng FileSystem thay vì fetch().blob()
        const base64Data = await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });
        let bufferToUpload = Buffer.from(base64Data, 'base64');
        (bufferToUpload as any).name = file.name;

        let encryptionInfo: any = null;

        if (isEncrypted && canEncrypt) {
            console.log("🔒 Encrypting attachment file for E2EE room...");
            const key = CryptoJS.lib.WordArray.random(32);
            const iv = CryptoJS.lib.WordArray.random(16);

            // Chuyển Buffer trực tiếp sang WordArray (Tránh parsing chuỗi Base64 cực lớn gây đơ UI)
            const dataWordArray = bufferToWordArray(bufferToUpload);

            const encrypted = CryptoJS.AES.encrypt(dataWordArray, key, {
                iv: iv,
                mode: CryptoJS.mode.CTR,
                padding: CryptoJS.pad.NoPadding
            });

            // Chuyển ciphertext WordArray trực tiếp sang Buffer (Tối ưu RAM gấp 3 lần)
            bufferToUpload = wordArrayToBuffer(encrypted.ciphertext);
            (bufferToUpload as any).name = file.name;

            const keyBase64Url = key.toString(CryptoJS.enc.Base64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            const ivBase64 = iv.toString(CryptoJS.enc.Base64).replace(/=+$/, '');
            const sha256Hash = CryptoJS.SHA256(encrypted.ciphertext).toString(CryptoJS.enc.Base64).replace(/=+$/, '');

            encryptionInfo = {
                v: "v2",
                key: { alg: "A256CTR", ext: true, k: keyBase64Url, key_ops: ["encrypt", "decrypt"], kty: "oct" },
                iv: ivBase64,
                hashes: { sha256: sha256Hash }
            };
            console.log("🔒 Attachment file E2EE encryption complete!");
        }

        const uploadResponse = await this.client.uploadContent(bufferToUpload, {
            name: file.name,
            type: (isEncrypted && canEncrypt) ? "application/octet-stream" : file.type,
            rawResponse: false
        });
        const content_uri = uploadResponse.content_uri || uploadResponse;

        let msgtype = 'm.file';
        if (file.type?.startsWith('image/')) msgtype = 'm.image';
        else if (file.type?.startsWith('audio/')) msgtype = 'm.audio';
        else if (file.type?.startsWith('video/')) msgtype = 'm.video';

        const content: any = {
            body: file.name || "Attachment",
            msgtype: msgtype,
            info: {
                mimetype: file.type,
                size: file.size,
                ...file.info
            }
        };

        if (isEncrypted && canEncrypt && encryptionInfo) {
            encryptionInfo.url = content_uri;
            content.file = encryptionInfo;
        } else {
            content.url = content_uri;
        }

        // Bổ sung chuẩn Voice Messages MSC3245 của Matrix để các client (Element) hiển thị đúng UI tin nhắn thoại
        if (msgtype === 'm.audio') {
            content["org.matrix.msc3245.voice"] = {};
            content["org.matrix.msc1767.text"] = file.name || "Voice message";

            const msc1767File: any = {
                name: file.name,
                mimetype: file.type,
                size: file.size
            };
            if (isEncrypted && canEncrypt && encryptionInfo) {
                msc1767File.file = encryptionInfo;
            } else {
                msc1767File.url = content_uri;
            }
            content["org.matrix.msc1767.file"] = msc1767File;

            content["org.matrix.msc1767.audio"] = {
                duration: file.info?.duration || 0
            };
            // Đảm bảo trường duration chuẩn của m.audio cũng được set một cách tường minh
            // phòng trường hợp spread operator (...) có lỗi ngầm.
            if (file.info?.duration) {
                content.info.duration = file.info.duration;
            }
        }

        const sendResponse = await this._safeSendEvent(roomId, "m.room.message", content);
        return {
            ...sendResponse,
            mxcUrl: content_uri
        };
    }

    async searchUsers(term: string) {
        if (!this.client || !term) return [];
        try {
            const response = await this.client.searchUserDirectory({ term, limit: 20 });
            return response.results;
        } catch (e) {
            return [];
        }
    }

    async createDirectChat(targetUserId: string) {
        if (!this.client) return;
        const rooms = this.client.getVisibleRooms();
        const existingRoom = rooms.find((room: any) => {
            const memberIds = room.getJoinedMembers().map((m: any) => m.userId);
            return memberIds.length === 2 && memberIds.includes(targetUserId);
        });

        if (existingRoom) return existingRoom.roomId;

        const result = await this.client.createRoom({
            visibility: "private",
            preset: "private_chat",
            invite: [targetUserId],
            is_direct: true,
            initial_state: [
                { type: "m.room.encryption", state_key: "", content: { algorithm: "m.megolm.v1.aes-sha2" } },
                { type: "m.room.history_visibility", state_key: "", content: { history_visibility: "shared" } }
            ]
        });
        return result.room_id;
    }

    async createGroupChat(name: string, inviteList: string[]) {
        if (!this.client) return;
        const result = await this.client.createRoom({
            name: name,
            visibility: "private",
            preset: "private_chat",
            invite: inviteList,
            initial_state: [
                { type: "m.room.encryption", state_key: "", content: { algorithm: "m.megolm.v1.aes-sha2" } }
            ]
        });
        return result.room_id;
    }

    async acceptInvite(roomId: string) { return await this.client?.joinRoom(roomId); }
    async rejectInvite(roomId: string) { return await this.client?.leave(roomId); }
    async leaveRoom(roomId: string) { return await this.client?.leave(roomId); }
    async kickUser(roomId: string, userId: string, reason?: string) { return await this.client?.kick(roomId, userId, reason); }

    async setPowerLevel(roomId: string, userId: string, powerLevel: number) {
        if (!this.client) return;
        const room = this.client.getRoom(roomId);
        if (!room) return;
        const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "");
        if (!powerLevelEvent) return;
        const content = powerLevelEvent.getContent();
        content.users[userId] = powerLevel;
        await this.client.sendStateEvent(roomId, "m.room.power_levels", content);
    }

    async setRoomAvatar(roomId: string, mxcUrl: string) {
        if (!this.client) return;
        return await this.client.sendStateEvent(roomId, "m.room.avatar", { url: mxcUrl });
    }

    async setRoomName(roomId: string, name: string) {
        if (!this.client) return;
        return await this.client.setRoomName(roomId, name);
    }

    getRoomMedia(roomId: string) {
        const room = this.client?.getRoom(roomId);
        if (!room) return [];
        return room.getLiveTimeline().getEvents()
            .filter((e: any) => {
                const type = e.getType();
                if (type === 'm.room.encrypted') {
                    try {
                        const clear = e.getClearContent();
                        return clear && ['m.image', 'm.file', 'm.video'].includes(clear.msgtype);
                    } catch { return false; }
                }
                return type === 'm.room.message' && ['m.image', 'm.file', 'm.video'].includes(e.getContent().msgtype);
            })
            .map((e: any) => ({
                eventId: e.getId(),
                sender: e.getSender(),
                ts: e.getTs(),
                content: e.getType() === 'm.room.encrypted' ? e.getClearContent() : e.getContent()
            })).reverse();
    }

    async setupSecureBackup(password: string) {
        if (!this.client) return;
        try {
            const crypto = this.client.getCrypto();
            const generatedKey = await crypto.createRecoveryKeyFromPassphrase(password);
            if (!generatedKey) throw new Error("Could not create recovery key.");

            this.tempKey = generatedKey.privateKey;
            await crypto.bootstrapSecretStorage({
                createSecretStorageKey: async () => generatedKey,
                setupNewSecretStorage: true,
                setupNewKeyBackup: true,
                setupNewCrossSigning: true,
            });

            const defaultKeyId = await this._getSecretStorageDefaultKeyId();
            if (defaultKeyId) this.secretKeys.set(defaultKeyId, generatedKey.privateKey);

            this.tempKey = null;
            const version = await crypto.getActiveSessionBackupVersion();
            if (version) await crypto.enableKeyBackup(version);

            await SecureStore.setItemAsync('matrix_recovery_key', generatedKey.encodedPrivateKey);

            return generatedKey.encodedPrivateKey;
        } catch (e) {
            this.tempKey = null;
            throw e;
        }
    }

    async restoreFromBackup(input: string) {
        if (!this.client) return;
        try {
            const crypto = this.client.getCrypto();
            const cleanInput = input.trim().replace(/\s/g, '');
            const isRecoveryKey = cleanInput.startsWith("Es") && cleanInput.length > 40;
            this.tempKey = null;

            if (isRecoveryKey) {
                try {
                    const { decodeRecoveryKey } = await import('matrix-js-sdk/lib/crypto-api/recovery-key');
                    this.tempKey = decodeRecoveryKey(cleanInput);
                } catch { this.tempKey = cleanInput; }
                await SecureStore.setItemAsync('matrix_recovery_key', cleanInput);
            } else {
                const recoveryKey = await crypto.createRecoveryKeyFromPassphrase(cleanInput);
                if (recoveryKey) {
                    this.tempKey = recoveryKey.privateKey;
                    await SecureStore.setItemAsync('matrix_recovery_key', recoveryKey.encodedPrivateKey);
                }
            }

            const defaultKeyId = await this._getSecretStorageDefaultKeyId();
            if (defaultKeyId && this.tempKey) this.secretKeys.set(defaultKeyId, this.tempKey);

            if (isRecoveryKey) {
                try { await crypto.restoreKeyBackup(); } catch (e: any) { console.warn(e.message); }
            } else {
                try { await crypto.restoreKeyBackupWithPassphrase(cleanInput); } catch (e: any) { console.warn(e.message); }
            }

            await crypto.bootstrapCrossSigning({
                authUploadDeviceSigningKeys: async (makeRequest: any) => {
                    return await makeRequest({
                        type: 'm.login.password',
                        identifier: { type: 'm.id.user', user: this.client.getUserId() },
                    });
                }
            });

            await crypto.checkKeyBackupAndEnable();
            this.tempKey = null;
            return true;
        } catch (e: any) {
            this.tempKey = null;
            if (e.message?.includes("Not authorized")) throw new Error("Mật khẩu không đúng.");
            throw e;
        }
    }

    async getBackupStatus() {
        if (!this.client) return { enabled: false };
        try {
            const crypto = this.client.getCrypto();
            if (!crypto) return { enabled: false };
            const backupVersion = await crypto.getActiveSessionBackupVersion();
            const defaultKeyId = await this._getSecretStorageDefaultKeyId();
            const crossSigningStatus = await crypto.getCrossSigningStatus();
            const deviceStatus = await crypto.getDeviceVerificationStatus(
                this.client.getUserId(),
                this.client.getDeviceId()
            );

            return {
                enabled: !!backupVersion,
                backupEnabled: !!backupVersion,
                hasServerBackup: !!defaultKeyId,
                crossSigningId: crossSigningStatus?.publicKeys?.master?.deviceId,
                isSecretStorageReady: !!defaultKeyId,
                isDeviceVerified: deviceStatus?.crossSigningVerified || !!crossSigningStatus?.privateKeys?.master,
            };
        } catch (e) {
            return { enabled: false, error: e };
        }
    }

    sendTyping(roomId: string, isTyping: boolean) {
        if (!this.client) return;
        this.client.sendTyping(roomId, isTyping, 30000);
    }
}

export async function decryptMatrixFile(file: any) {
    const client = getMatrixClient();
    if (!client || !file || !file.url) {
        throw new Error("File info is missing.");
    }

    try {
        let httpUrl = client.mxcUrlToHttp(file.url);
        if (httpUrl) {
            httpUrl = httpUrl.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');
        }
        const headers: any = {};
        if (client.getAccessToken()) {
            headers['Authorization'] = `Bearer ${client.getAccessToken()}`;
        }

        // Dùng expo-file-system để download file mã hóa về máy
        const tempUri = FileSystem.cacheDirectory + 'enc_' + Date.now();
        const downloadResult = await FileSystem.downloadAsync(httpUrl, tempUri, { headers });
        if (downloadResult.status !== 200) {
            throw new Error(`Failed to fetch encrypted file: HTTP ${downloadResult.status}`);
        }

        // Đọc file mã hóa dưới dạng Base64
        const encryptedBase64 = await FileSystem.readAsStringAsync(downloadResult.uri, { encoding: FileSystem.EncodingType.Base64 });

        // Chuẩn bị khóa giải mã (Chuyển Base64URL sang Base64 chuẩn)
        const keyBase64 = file.key.k.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (file.key.k.length % 4)) % 4);
        const ivBase64 = file.iv.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (file.iv.length % 4)) % 4);

        const key = CryptoJS.enc.Base64.parse(keyBase64);
        const iv = CryptoJS.enc.Base64.parse(ivBase64);
        const ciphertext = CryptoJS.enc.Base64.parse(encryptedBase64);

        const cipherParams = CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext });

        // Giải mã bằng AES-CTR
        const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
            iv: iv,
            mode: CryptoJS.mode.CTR,
            padding: CryptoJS.pad.NoPadding
        });

        // Trả về chuỗi Base64 của tệp tin đã được giải mã
        const decryptedBase64 = CryptoJS.enc.Base64.stringify(decrypted);

        // Xóa file tạm
        FileSystem.deleteAsync(tempUri).catch(() => { });

        return decryptedBase64;
    } catch (e: any) {
        console.error("Error decrypting file:", e);
        throw e;
    }
}

export const matrixService = new MatrixService();

// Export các hàm cũ trỏ qua MatrixService để giữ Backward Compatibility cho các màn hình khác
export const getMatrixClient = () => matrixService.client;
export const loginToMatrix = (u: string, p: string) => matrixService.login(u, p);
export const startMatrixSync = () => { /* startSession đã tự động startClient */ };
export const restoreSession = () => matrixService.restoreSession();
export const createEncryptedRoom = (n: string, i: string[]) => matrixService.createGroupChat(n, i);
