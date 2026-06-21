import { Buffer } from 'buffer';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform, Share, Alert, AppState } from 'react-native';

import { currentActiveRoomId, matrixService } from '../screens/matrix';

// Tên Background Task
const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

// Định nghĩa Task chạy dưới background
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('❌ Lỗi Background Task:', error);
    return;
  }
  if (data) {
    const payload = (data as any).notification;
    console.log('📬 Nhận Push dưới background/tắt màn hình:', payload);

    // Sygnal (Matrix) thường gửi Data-only push (không có alert body) để bảo mật.
    // Khi nhận được Data-only push dưới background, OS sẽ KHÔNG tự hiện thông báo.
    // Ta cần tự tạo Local Notification để báo cho người dùng biết.
    const roomId = payload?.data?.room_id || payload?.room_id;
    const eventId = payload?.data?.event_id || payload?.event_id;
    const sender = payload?.data?.sender || payload?.sender || 'Ai đó';

    // Tạo local notification nếu đây là tin nhắn gửi đến (không có nội dung chữ trong push)
    if (AppState.currentState !== 'active' && roomId && !payload?.request?.content?.body) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Tin nhắn mới',
          body: `${sender} đã gửi một tin nhắn.`,
          data: { room_id: roomId, event_id: eventId },
          categoryIdentifier: 'MATRIX_MESSAGE',
          sound: true,
        },
        trigger: null, // Hiện ngay lập tức
      });
    }

    // Ở đây ta có thể gọi Matrix SDK fetch() ngầm (giống NotificationService.swift) 
    // Tuy nhiên React Native background fetch bị giới hạn thời gian (vài giây).
  }
});

// Đăng ký Task ngay từ Global Scope
Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch((err) => {
  console.warn('Không thể đăng ký Background Task:', err);
});

// Cấu hình category cho Quick Reply (giống Element)
export async function setupNotificationCategories() {
  try {
    await Notifications.setNotificationCategoryAsync('MATRIX_MESSAGE', [
      {
        identifier: 'inline-reply',
        buttonTitle: 'Trả lời',
        textInput: {
          submitButtonTitle: 'Gửi',
          placeholder: 'Nhập tin nhắn...',
        },
        options: {
          opensAppToForeground: false, // Gửi ngầm (background)
        },
      },
    ]);
  } catch (error) {
    console.warn('Lỗi khi thiết lập Notification Category:', error);
  }
}

// Cấu hình cách thông báo hiển thị khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Lấy roomId từ payload của thông báo (phụ thuộc vào payload từ Sygnal/Push Gateway)
    const roomId = notification.request.content.data?.room_id as string | undefined;

    // Giống Element: Không hiện thông báo đẩy nếu người dùng đang ở trong chính phòng chat đó
    if (roomId && currentActiveRoomId === roomId) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});

export function setupNotificationListeners(onNavigateToRoom: (roomId: string) => void) {
  // Khi nhận được thông báo (lúc app đang mở hoặc dưới background nhưng app chưa chết hẳn)
  const receivedListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📬 Đã nhận thông báo:', notification.request.content);

    // Giống Element: Có thể gọi background sync nếu cần
    // Mặc định matrix-js-sdk tự sync nếu app đang active.
    // Nếu app ở background, có thể cần cơ chế background fetch riêng.
  });

  // Khi người dùng tương tác với thông báo (Bấm vào, hoặc Quick Reply)
  const responseListener = Notifications.addNotificationResponseReceivedListener(async response => {
    const actionIdentifier = response.actionIdentifier;
    const data = response.notification.request.content.data;
    const roomId = data?.room_id as string | undefined;

    if (!roomId) return;

    if (actionIdentifier === 'inline-reply') {
      // Người dùng bấm trả lời nhanh (Quick Reply)
      const userText = (response as Notifications.NotificationResponse & { userText?: string }).userText;
      if (userText && matrixService.client) {
        console.log(`✉️ Gửi Quick Reply tới phòng ${roomId}: ${userText}`);
        try {
          await matrixService.sendMessage(roomId, userText);
        } catch (error) {
          console.error('❌ Lỗi khi gửi Quick Reply:', error);
        }
      }
    } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      // Người dùng bấm vào thông báo để mở app
      console.log(`🚪 Chuyển hướng người dùng vào phòng chat: ${roomId}`);
      onNavigateToRoom(roomId);
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(receivedListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Không được cấp quyền thông báo đẩy!');
      return null;
    }

    try {
      // Vì Matrix Sygnal cấu hình trực tiếp bằng APNs (.p8),
      // nên trên iOS chúng ta cần lấy DevicePushToken gốc của Apple
      // thay vì lấy token của Expo (Expo Push Token).
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      let rawToken = deviceToken.data;
      console.log('📱 Raw Token từ Expo:', rawToken);

      if (Platform.OS === 'ios' && typeof rawToken === 'string') {
        // Kiểm tra nếu là chuỗi Hex (64 ký tự bao gồm chữ từ a-f và số)
        if (/^[0-9a-fA-F]{64}$/.test(rawToken)) {
          // 🌟 GIẢI PHÁP THUẦN JAVASCRIPT AN TOÀN TUYỆT ĐỐI CHO REACT NATIVE
          const hexToBase64 = (hexString: string) => {
            const match = hexString.match(/\w{2}/g);
            if (!match) return hexString;

            const byteArray = match.map((a) => parseInt(a, 16));
            const charString = String.fromCharCode.apply(null, byteArray);

            // Dùng btoa nếu môi trường có sẵn, nếu không sẽ dùng Buffer fallback an toàn
            return typeof btoa !== 'undefined' ? btoa(charString) : Buffer.from(byteArray).toString('base64');
          };

          token = hexToBase64(rawToken);
          console.log('✅ Đã convert iOS Hex sang Base64 thuần chuẩn 100%:', token);
        } else {
          token = rawToken;
        }
      } else {
        token = rawToken; // Android giữ nguyên
      }
    } catch (e) {
      console.error('Lỗi khi lấy Device Push Token:', e);
    }
  } else {
    console.warn('Phải sử dụng thiết bị thật để nhận Push Notifications (Simulator không hỗ trợ).');
  }

  return token;
}
