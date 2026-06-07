import * as sdk from 'matrix-js-sdk';

const MATRIX_BASE_URL = 'https://matrix.5hpc.com';

// Khởi tạo client mặc định
let matrixClient = sdk.createClient({
  baseUrl: MATRIX_BASE_URL,
});

export const getMatrixClient = () => matrixClient;

// Lưu trữ ID phòng chat đang active để màn hình ChatSingle có thể sử dụng
export let currentActiveRoomId: string | null = null;

export const setCurrentActiveRoomId = (id: string | null) => {
  currentActiveRoomId = id;
};

/**
 * Hàm đăng nhập vào Matrix Server
 */
export const loginToMatrix = async (username: string, password: string) => {
  try {
    const response = await matrixClient.login('m.login.password', {
      user: username,
      password: password,
    });

    // Sau khi login thành công, khởi tạo lại client với Access Token
    matrixClient = sdk.createClient({
      baseUrl: MATRIX_BASE_URL,
      accessToken: response.access_token,
      userId: response.user_id,
    });

    return response;
  } catch (error) {
    console.log("Matrix Login Error:", error);
    throw error;
  }
};

/**
 * Bắt đầu quá trình đồng bộ (nhận tin nhắn, danh sách phòng...)
 */
export const startMatrixSync = () => {
  if (!matrixClient.getAccessToken()) {
    console.warn("Chưa có Access Token, không thể sync!");
    return;
  }


  matrixClient.once('sync' as any, (state: string) => {
    if (state === 'PREPARED') {
      console.log("Matrix Client is synced and ready!");
    }
  });

  matrixClient.startClient({ initialSyncLimit: 10 });
};
