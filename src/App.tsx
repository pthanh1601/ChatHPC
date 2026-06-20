/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useRef } from 'react';
import { View, PanResponder, LayoutAnimation, Platform, UIManager, BackHandler, Animated, Dimensions, TouchableOpacity, Text } from 'react-native';
import { Phone, Video, Mic } from 'lucide-react-native';
import { AppScreen } from './data';
import { loginToMatrix, startMatrixSync, matrixService, setCurrentActiveRoomId } from './screens/matrix';
import { setupNotificationCategories, setupNotificationListeners } from './services/notifications';
import { BottomNav } from './components/BottomNav';
import { Login } from './screens/Login';
import { ChatList } from './screens/ChatList';
import { ChatSingle } from './screens/ChatSingle';
import { ChatGroup } from './screens/ChatGroup';
import { CallScreen } from './screens/CallScreen';
import { Profile } from './screens/Profile';
import { Calls } from './screens/Calls';
import { Search } from './screens/Search';
import { SafeScreen } from './components/SafeScreen';
import { CreateRoom } from './screens/CreateRoom';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('login');
  const [baseScreen, setBaseScreen] = useState<AppScreen>('chat_list');
  const [activeCall, setActiveCall] = useState<any>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef<number | null>(null);

  // Dùng ref để PanResponder và BackHandler luôn lấy được state mới nhất
  const currentScreenRef = useRef<AppScreen>(currentScreen);
  const baseScreenRef = useRef<AppScreen>(baseScreen);
  const slideAnim = useRef(new Animated.Value(width)).current; // Khởi tạo vị trí trượt mặc định ở ngoài rìa phải
  const bubblePan = useRef(new Animated.ValueXY()).current; // Lưu toạ độ kéo thả của bong bóng thu nhỏ

  const handleSetScreen = (screen: AppScreen) => {
    const isDetail = ['chat_single', 'chat_group', 'create_room'].includes(screen);
    const wasDetail = ['chat_single', 'chat_group', 'create_room'].includes(currentScreenRef.current);

    if (isDetail && !wasDetail) {
      // Mở trang chi tiết: Render sẵn ngoài màn hình rồi kéo lò xo trượt vào (Cực mượt)
      currentScreenRef.current = screen;
      setCurrentScreen(screen);
      slideAnim.setValue(width);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
    } else if (!isDetail && wasDetail) {
      // Đóng trang chi tiết: Trượt thẳng ra ngoài màn hình trước rồi mới unmount để thấy lớp nền bên dưới
      Animated.timing(slideAnim, { toValue: width, duration: 250, useNativeDriver: true }).start(() => {
        currentScreenRef.current = screen;
        setCurrentScreen(screen);
        if (['chat_list', 'calls', 'profile', 'search'].includes(screen)) {
          baseScreenRef.current = screen;
          setBaseScreen(screen);
        }
      });
    } else {
      // Chuyển tab ngang hàng ở lớp nền: Dùng LayoutAnimation mờ dần (Fade)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      currentScreenRef.current = screen;
      setCurrentScreen(screen);
      if (['chat_list', 'calls', 'profile', 'search'].includes(screen)) {
        baseScreenRef.current = screen;
        setBaseScreen(screen);
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const isDetail = ['chat_single', 'chat_group', 'create_room'].includes(currentScreenRef.current);
        const isEdgeSwipe = evt.nativeEvent.pageX < 45;
        const isSwipingRight = gestureState.dx > 10 && Math.abs(gestureState.dy) < 25; // Chặn nhầm khi đang cuộn dọc
        return isDetail && isEdgeSwipe && isSwipingRight;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Thay đổi tọa độ X màn hình bám sát theo ngón tay người dùng (Cảm giác native)
        if (gestureState.dx > 0) {
          slideAnim.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > width * 0.3 || gestureState.vx > 1) {
          // Vuốt đủ lực hoặc quá 1/3 màn hình -> Đóng luôn
          Animated.timing(slideAnim, { toValue: width, duration: 200, useNativeDriver: true }).start(() => {
            handleSetScreen(baseScreenRef.current);
          });
        } else {
          // Vuốt chưa tới lực -> Bật lò xo trả lại trạng thái đang mở
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      }
    })
  ).current;

  // Bộ xử lý sự kiện kéo thả cho bong bóng gọi điện
  const bubblePanResponder = useRef(
    PanResponder.create({
      // Chỉ kích hoạt chế độ Kéo nếu ngón tay di chuyển lớn hơn 5 pixel (tránh nhầm với thao tác Nhấp / Tap)
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        bubblePan.extractOffset(); // Khóa vị trí hiện tại lại làm gốc kéo mới
      },
      onPanResponderMove: Animated.event(
        [null, { dx: bubblePan.x, dy: bubblePan.y }],
        { useNativeDriver: false } // ValueXY bắt buộc chạy trên luồng JS
      ),
      onPanResponderRelease: () => {
        bubblePan.flattenOffset(); // Gộp giá trị kéo mới vào vị trí gốc
      }
    })
  ).current;

  // Tích hợp thêm nút Back vật lý trên hệ điều hành Android
  useEffect(() => {
    const backAction = () => {
      const screen = currentScreenRef.current;
      if (['chat_single', 'chat_group', 'create_room'].includes(screen)) {
        handleSetScreen(baseScreenRef.current);
        return true; // Chặn hành động đóng app mặc định
      }
      return false; // Cho phép đóng app nếu đang ở trang chủ (login/chat_list)
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const onCallUpdate = (callData: any) => {
      setActiveCall(callData);
      if (!callData) setIsCallMinimized(false);
    };
    matrixService.on('call.update', onCallUpdate);
    return () => {
      matrixService.removeListener('call.update', onCallUpdate);
    };
  }, []);

  // Khởi tạo và lắng nghe Push Notifications
  useEffect(() => {
    setupNotificationCategories();

    const unsubscribe = setupNotificationListeners((roomId) => {
      // Khi bấm vào thông báo, chuyển hướng tới phòng chat
      setCurrentActiveRoomId(roomId);
      handleSetScreen('chat_single');
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeCall?.state === 'connected' || activeCall?.state === 'connecting') {
        const start = activeCall.startTime || callStartTimeRef.current || Date.now();
        if (!callStartTimeRef.current) callStartTimeRef.current = start;
        
        interval = setInterval(() => {
            setCallDuration(Math.max(0, Math.floor((Date.now() - start) / 1000)));
        }, 1000);
    } else {
        callStartTimeRef.current = null;
        setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeCall?.state, activeCall?.startTime]);

  const formatBubbleDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isDetailActive = ['chat_single', 'chat_group', 'create_room'].includes(currentScreen);
  const activeBaseScreen = isDetailActive ? baseScreen : currentScreen;

  return (
    <View className="flex-1 bg-background">
      {/* LỚP 1: Lớp Nền (Các tab chính) - Vẫn giữ nguyên lúc đang mở chat để không bị chớp đen */}
      <View className="flex-1 absolute w-full h-full">
        <SafeScreen>
          {activeBaseScreen === 'login' && <Login setScreen={handleSetScreen} />}
          {activeBaseScreen === 'chat_list' && <ChatList setScreen={handleSetScreen} />}
          {activeBaseScreen === 'profile' && <Profile setScreen={handleSetScreen} />}
          {activeBaseScreen === 'calls' && <Calls setScreen={handleSetScreen} />}
          {activeBaseScreen === 'search' && <Search setScreen={handleSetScreen} />}
          
          {activeBaseScreen !== 'login' && <BottomNav currentScreen={activeBaseScreen} setScreen={handleSetScreen} />}
        </SafeScreen>
      </View>

      {/* LỚP 2: Lớp Chi Tiết (Phòng chat, Tạo nhóm...) trượt đè lên trên lớp nền */}
      {isDetailActive && (
        <Animated.View 
          style={{ flex: 1, transform: [{ translateX: slideAnim }] }} 
          className="absolute w-full h-full bg-background shadow-2xl shadow-black/50 elevation-24 border-l border-white/5"
          {...panResponder.panHandlers}
        >
          <SafeScreen>
            {currentScreen === 'chat_single' && <ChatSingle setScreen={handleSetScreen} />}
            {currentScreen === 'chat_group' && <ChatGroup setScreen={handleSetScreen} />}
            {currentScreen === 'create_room' && <CreateRoom setScreen={handleSetScreen} />}
          </SafeScreen>
        </Animated.View>
      )}

      {/* LỚP 3: Màn hình Gọi điện WebRTC */}
      {activeCall && !isCallMinimized && (
        <CallScreen activeCall={activeCall} onMinimize={() => setIsCallMinimized(true)} />
      )}

      {/* Nút Bong bóng thu nhỏ khi đang gọi điện */}
      {activeCall && isCallMinimized && (
        <Animated.View 
          style={{
            transform: bubblePan.getTranslateTransform(),
            position: 'absolute',
            top: 64,    // top-16
            right: 20,  // right-5
            zIndex: 9999,
          }}
          {...bubblePanResponder.panHandlers}
        >
          <TouchableOpacity 
            onPress={() => setIsCallMinimized(false)}
            className="bg-card rounded-full flex-row items-center justify-center shadow-2xl border border-white/20 px-3"
            style={{ height: 56, minWidth: 56 }}
          >
            {(activeCall.state === 'connected' || activeCall.state === 'connecting') && callDuration > 0 ? (
              <Text className="text-white font-bold mx-1">{formatBubbleDuration(callDuration)}</Text>
            ) : (
              activeCall.type === 'video' ? <Video size={24} color="#00fbfb" /> : <Phone size={24} color="#dcb8ff" />
            )}
            <View className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}
