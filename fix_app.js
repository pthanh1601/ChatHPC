const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Add slideAnim3 and panResponder3
code = code.replace(
  "const slideAnim = useRef(new Animated.Value(width)).current; // Khởi tạo vị trí trượt mặc định ở ngoài rìa phải",
  "const slideAnim = useRef(new Animated.Value(width)).current;\n  const slideAnim3 = useRef(new Animated.Value(width)).current;"
);

// 2. Rewrite handleSetScreen
const handleSetScreenRegex = /const handleSetScreen = \(screen: AppScreen\) => \{[\s\S]*?\n  \};\n/m;
const newHandleSetScreen = `const handleSetScreen = (screen: AppScreen) => {
    const isLevel3 = ['room_details', 'invite_members'].includes(screen);
    const wasLevel3 = ['room_details', 'invite_members'].includes(currentScreenRef.current);
    const isDetail = ['chat_single', 'chat_group', 'create_room', 'invites', 'explore_rooms'].includes(screen);
    const wasDetail = ['chat_single', 'chat_group', 'create_room', 'invites', 'explore_rooms'].includes(currentScreenRef.current);

    if (isLevel3 && !wasLevel3) {
      currentScreenRef.current = screen;
      setCurrentScreen(screen);
      slideAnim3.setValue(width);
      Animated.spring(slideAnim3, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
    } else if (!isLevel3 && wasLevel3) {
      Animated.timing(slideAnim3, { toValue: width, duration: 250, useNativeDriver: true }).start(() => {
        currentScreenRef.current = screen;
        setCurrentScreen(screen);
        if (!isDetail && !isLevel3) {
           if (['chat_list', 'calls', 'profile', 'search', 'contacts'].includes(screen)) {
             baseScreenRef.current = screen;
             setBaseScreen(screen);
           }
        }
      });
      // Nếu nhảy thẳng từ Level3 về Base (ví dụ xoá phòng xong văng ra list)
      if (!isDetail) {
         Animated.timing(slideAnim, { toValue: width, duration: 250, useNativeDriver: true }).start();
      }
    } else if (isDetail && !wasDetail && !wasLevel3) {
      currentScreenRef.current = screen;
      setCurrentScreen(screen);
      setDelayedDetailScreen(null);
      slideAnim.setValue(width);
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 20 }).start();
      requestAnimationFrame(() => setDelayedDetailScreen(screen));
    } else if (!isDetail && (wasDetail || wasLevel3)) {
      Animated.timing(slideAnim, { toValue: width, duration: 250, useNativeDriver: true }).start(() => {
        currentScreenRef.current = screen;
        setCurrentScreen(screen);
        if (['chat_list', 'calls', 'profile', 'search', 'contacts'].includes(screen)) {
          baseScreenRef.current = screen;
          setBaseScreen(screen);
        }
      });
      if (wasLevel3) {
        Animated.timing(slideAnim3, { toValue: width, duration: 250, useNativeDriver: true }).start();
      }
    } else {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      currentScreenRef.current = screen;
      setCurrentScreen(screen);
      if (['chat_list', 'calls', 'profile', 'search', 'contacts'].includes(screen)) {
        baseScreenRef.current = screen;
        setBaseScreen(screen);
      }
      if (isDetail && !isLevel3) {
        setDelayedDetailScreen(screen);
      }
    }
  };
`;
code = code.replace(handleSetScreenRegex, newHandleSetScreen + '\n');


// 3. Rewrite panResponder and add panResponder3
const panResponderRegex = /const panResponder = useRef\([\s\S]*?\.current;/m;
const newPanResponders = `const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const isLevel3 = ['room_details', 'invite_members'].includes(currentScreenRef.current);
        const isDetail = ['chat_single', 'chat_group', 'create_room', 'invites', 'explore_rooms'].includes(currentScreenRef.current);
        const isEdgeSwipe = evt.nativeEvent.pageX < 45;
        const isSwipingRight = gestureState.dx > 10 && Math.abs(gestureState.dy) < 25;
        return !isLevel3 && isDetail && isEdgeSwipe && isSwipingRight;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) slideAnim.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > width * 0.3 || gestureState.vx > 1) {
          Animated.timing(slideAnim, { toValue: width, duration: 200, useNativeDriver: true }).start(() => {
            handleSetScreen(baseScreenRef.current);
          });
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      }
    })
  ).current;

  const panResponder3 = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (evt, gestureState) => {
        const isLevel3 = ['room_details', 'invite_members'].includes(currentScreenRef.current);
        const isEdgeSwipe = evt.nativeEvent.pageX < 45;
        const isSwipingRight = gestureState.dx > 10 && Math.abs(gestureState.dy) < 25;
        return isLevel3 && isEdgeSwipe && isSwipingRight;
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dx > 0) slideAnim3.setValue(gestureState.dx);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx > width * 0.3 || gestureState.vx > 1) {
          Animated.timing(slideAnim3, { toValue: width, duration: 200, useNativeDriver: true }).start(() => {
            handleSetScreen('chat_single');
          });
        } else {
          Animated.spring(slideAnim3, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
        }
      }
    })
  ).current;`;

code = code.replace(panResponderRegex, newPanResponders);

// 4. Rewrite hardware back
const backActionRegex = /const backAction = \(\) => \{[\s\S]*?return false; \/\/ Cho phép đóng app nếu đang ở trang chủ \(login\/chat_list\)\n    \};/m;
const newBackAction = `const backAction = () => {
      const screen = currentScreenRef.current;
      if (['room_details', 'invite_members'].includes(screen)) {
        handleSetScreen('chat_single');
        return true;
      }
      if (['chat_single', 'chat_group', 'create_room', 'invites', 'explore_rooms'].includes(screen)) {
        handleSetScreen(baseScreenRef.current);
        return true;
      }
      return false; // Cho phép đóng app nếu đang ở trang chủ
    };`;
code = code.replace(backActionRegex, newBackAction);


// 5. Update render layer
const renderRegex = /\{delayedDetailScreen === 'room_details' && <RoomDetails setScreen=\{handleSetScreen\} \/>\}\n            \{!delayedDetailScreen && \(\n              <View className="flex-1 bg-background items-center justify-center">\n                <ActivityIndicator size="small" color="#0DBD8B" \/>\n              <\/View>\n            \)\}/m;

const newRender = `{!delayedDetailScreen && (
              <View className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="small" color="#0DBD8B" />
              </View>
            )}`;

code = code.replace(renderRegex, newRender);

const isDetailActiveRegex = /const isDetailActive = \['chat_single', 'chat_group', 'create_room', 'invite_members', 'invites', 'explore_rooms', 'room_details'\].includes\(currentScreen\);/m;
const newIsDetailActive = `const isDetailActive = ['chat_single', 'chat_group', 'create_room', 'invites', 'explore_rooms', 'room_details', 'invite_members'].includes(currentScreen);
  const isLevel3Active = ['room_details', 'invite_members'].includes(currentScreen);`;
code = code.replace(isDetailActiveRegex, newIsDetailActive);

// Insert Level 3 before LỚP 3: Màn hình Gọi điện WebRTC
const layer3Regex = /\{\/\* LỚP 3: Màn hình Gọi điện WebRTC \*\/\}/m;
const newLayer3 = `{/* LỚP 3: Lớp Chi Tiết Sâu (room_details, invite_members) */}
      {isLevel3Active && (
        <Animated.View
          style={{ flex: 1, transform: [{ translateX: slideAnim3 }] }}
          className="absolute w-full h-full bg-background shadow-2xl shadow-black/50 elevation-24 border-l border-white/5"
          {...panResponder3.panHandlers}
        >
          <SafeScreen>
            {currentScreen === 'room_details' && <RoomDetails setScreen={handleSetScreen} />}
            {currentScreen === 'invite_members' && <InviteMembers setScreen={handleSetScreen} />}
          </SafeScreen>
        </Animated.View>
      )}

      {/* LỚP 4: Màn hình Gọi điện WebRTC */}`;
code = code.replace(layer3Regex, newLayer3);

fs.writeFileSync('src/App.tsx', code);
console.log("Success");
