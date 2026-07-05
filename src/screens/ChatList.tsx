import React, { useState, useEffect, memo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager, FlatList, TextInput, Keyboard } from 'react-native';
import { Plus, CheckCheck, MessageSquarePlus, Search, X } from 'lucide-react-native';
import { AppScreen, CONTACTS } from '../data';
import { getMatrixClient, setCurrentActiveRoomId, getSystemMessageText, setSearchTarget, joinedRoomsLocal, leftRoomsLocal, matrixService } from '../services/MatrixService';
import { persistentLocalStorage } from '../services/StorageService';
import { Header } from '../components/Header';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const avatarColors = [
  '#03b381', // Element Green
  '#368bd6', // Element Blue
  '#ac3ba8'  // Element Purple
];

export const getAvatarColor = (id: string) => {
  if (!id) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const ChatItem = ({ chat, setScreen, handleAcceptInvite, handleRejectInvite }: any) => {
  return (
    <View className="mb-4">
      <TouchableOpacity
        onPress={() => {
          if (!chat.isInvite) {
            Keyboard.dismiss();
            setCurrentActiveRoomId(chat.id);
            if (chat.matchedEventId) {
              setSearchTarget(chat.matchedEventId, chat.searchQuery);
            } else {
              setSearchTarget(null, null);
            }

            // Xóa requestAnimationFrame để chuyển trang ngay lập tức (không chờ khung hình)
            setScreen('chat_single');
          }
        }}
        activeOpacity={chat.isInvite ? 1 : 0.7}
        className={`rounded-2xl p-4 flex-col relative overflow-hidden border ${chat.isInvite ? 'bg-card border-primary/50 shadow-lg shadow-primary/10' : (chat.unread > 0 ? 'bg-surface border-white/10' : 'bg-card border-white/5')}`}
      >
        <View className="flex-row items-center">
          {chat.unread > 0 && !chat.isInvite && (
            <View className="absolute top-0 left-0 w-1.5 h-full bg-primary rounded-r-full z-10" />
          )}
          <View className={`relative mr-3 ${chat.unread > 0 && !chat.isInvite ? 'ml-3' : ''}`}>
            <View className={`w-14 h-14 rounded-full overflow-hidden items-center justify-center ${chat.avatar ? 'border border-white/10' : ''}`}>
              {chat.avatar ? (
                <Image
                  source={chat.accessToken && chat.avatar?.includes('_matrix') ? { uri: chat.avatar, headers: { Authorization: `Bearer ${chat.accessToken}` } } : { uri: chat.avatar }}
                  className="w-full h-full"
                />
              ) : (
                <View className="w-full h-full flex items-center justify-center" style={{ backgroundColor: getAvatarColor(chat.id) }}>
                  <Text className="text-[#17191C] text-[22px] font-bold" style={{ includeFontPadding: false, textAlignVertical: 'center' }}>{chat.name ? chat.name.charAt(0).toUpperCase() : '?'}</Text>
                </View>
              )}
            </View>
          </View>
          <View className="flex-1 justify-center ml-1">
            <View className="flex-row justify-between items-center mb-1.5">
              <Text className={`text-[15px] ${chat.unread > 0 || chat.isInvite ? 'font-bold text-white' : 'font-semibold text-gray-300'}`} style={{ includeFontPadding: false }}>{chat.name}</Text>
              <Text className={`text-[11px] ${chat.unread > 0 || chat.isInvite ? 'font-bold text-primary' : 'font-medium text-gray-500'}`} style={{ includeFontPadding: false }}>{chat.time}</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className={`flex-1 text-sm mr-4 ${chat.isInvite ? 'text-primary font-bold' : (chat.unread > 0 ? 'text-white font-bold' : 'text-gray-400 font-normal')}`} numberOfLines={1} style={{ includeFontPadding: false }}>{chat.lastMessage}</Text>
              {chat.unread > 0 && !chat.isInvite && (
                <View className="bg-primary px-1.5 h-5 min-w-[20px] rounded-full flex items-center justify-center shadow-md shadow-primary/30">
                  <Text className="text-[10px] text-background font-bold" style={{ includeFontPadding: false }}>{chat.unread}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {chat.isInvite && (
          <View className="flex-row gap-3 mt-4 pt-4 border-t border-white/10">
            <TouchableOpacity
              onPress={() => handleRejectInvite(chat.id)}
              className="flex-1 py-2.5 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 items-center justify-center"
            >
              <Text className="text-[#ef4444] font-semibold text-sm">Từ chối</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAcceptInvite(chat.id)}
              className="flex-1 py-2.5 rounded-xl bg-primary items-center justify-center shadow-lg shadow-primary/20"
            >
              <Text className="text-[#22262E] font-bold text-sm tracking-wide">Tham gia</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const MemoizedChatItem = memo(ChatItem, (prevProps, nextProps) => {
  return (
    prevProps.chat.id === nextProps.chat.id &&
    prevProps.chat.lastMessage === nextProps.chat.lastMessage &&
    prevProps.chat.time === nextProps.chat.time &&
    prevProps.chat.unread === nextProps.chat.unread &&
    prevProps.chat.isInvite === nextProps.chat.isInvite
  );
});


export const getInitialChats = () => {
  const client = getMatrixClient();
  if (!client) return [];
  // Lấy tất cả phòng và tự lọc, tránh việc getVisibleRooms bỏ qua một số phòng
  const rooms = client.getRooms().filter(room => {
    const membership = room.getMyMembership();
    // Hiện cả phòng đang tham gia (join), đang mời (invite), đã rời/bị kick (leave), và bị cấm (ban) để xem lịch sử
    return (membership === 'join' || membership === 'invite' || membership === 'leave' || membership === 'ban') && 
           !leftRoomsLocal.has(room.roomId) && 
           !room.isSpaceRoom();
  });

  const chatData = rooms.map(room => {
    const timeline = room.timeline;
    const lastEvent = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    const isInvite = room.getMyMembership() === 'invite' && !joinedRoomsLocal.has(room.roomId);

    let lastMessage = 'Chưa có tin nhắn';
    let time = '';

    if (lastEvent) {
      const type = lastEvent.getType();
      if (type === 'm.room.message') {
        lastMessage = lastEvent.getContent().body || 'Tin nhắn';
      } else if (type === 'm.call.invite') {
        const isVideo = lastEvent.getContent()?.offer?.sdp?.includes('m=video');
        lastMessage = isVideo ? '📹 Cuộc gọi Video' : '📞 Cuộc gọi Thoại';
      } else if (type === 'm.call.hangup') {
        lastMessage = '📞 Cuộc gọi kết thúc';
      } else if (lastEvent.isEncrypted && lastEvent.isEncrypted()) {
        const clear = lastEvent.getClearContent();
        lastMessage = clear?.body || '🔒 Tin nhắn mã hóa';
      } else {
        const sysText = getSystemMessageText(lastEvent, room);
        if (sysText) {
          lastMessage = sysText;
        } else {
          lastMessage = 'Có sự kiện mới';
        }
      }
      const date = new Date(lastEvent.getTs());
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      time = `${hours}:${mins}`;
    }

    if (isInvite) {
      lastMessage = 'Bạn nhận được lời mời tham gia nhóm';
      time = time || 'Mới';
    }

    let avatar = room.getAvatarUrl(client.getHomeserverUrl(), 56, 56, 'crop', false, false);
    if (avatar) {
      avatar = avatar.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');
    }

    // Lấy số lượng tin nhắn chưa đọc (Bao gồm cả thông báo tag/highlight)
    const unreadCount = room.getUnreadNotificationCount('total') || room.getUnreadNotificationCount('highlight') || 0;

    return {
      id: room.roomId,
      name: room.name || 'Phòng chat',
      avatar,
      accessToken: client.getAccessToken(),
      lastMessage,
      lastEventId: lastEvent ? lastEvent.getId() : null,
      time,
      unread: isInvite ? 1 : unreadCount,
      timestamp: lastEvent ? lastEvent.getTs() : (isInvite ? Date.now() : 0),
      isInvite
    };
  });

  chatData.sort((a, b) => b.timestamp - a.timestamp);

  return chatData;
};

export function ChatList({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Khởi tạo state ngay từ đầu để tránh màn hình bị nháy trống trơn lúc mới load
  const [chats, setChats] = useState<any[]>(() => {
    const cached = persistentLocalStorage.getItem('cached_chat_list');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) { }
    }
    return getInitialChats();
  });

  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    let timeoutId: NodeJS.Timeout;
    let storageTimeoutId: NodeJS.Timeout;

    const updateChats = () => {
      clearTimeout(timeoutId);
      // Giới hạn tần suất xử lý để tránh đứng máy trong lúc Matrix đồng bộ lượng dữ liệu lớn
      timeoutId = setTimeout(() => {
        const newChats = getInitialChats();
        if (newChats.length === 0 && client.getSyncState() !== 'PREPARED') {
          return;
        }
        setChats(newChats);

        // Tách việc ghi file JSON vào ổ đĩa ra xa, chỉ lưu mỗi 5 giây 1 lần để không block JS Thread
        clearTimeout(storageTimeoutId);
        storageTimeoutId = setTimeout(() => {
          if (newChats.length > 0 || client.getSyncState() === 'PREPARED') {
            persistentLocalStorage.setItem('cached_chat_list', JSON.stringify(newChats));
          }
        }, 5000);
      }, 800);
    };

    client.on('Room' as any, updateChats);
    client.on('Room.timeline' as any, updateChats);
    client.on('sync' as any, updateChats);
    client.on('Room.myMembership' as any, updateChats);
    matrixService.on('force_chat_refresh', updateChats);

    updateChats();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(storageTimeoutId);
      client.removeListener('Room' as any, updateChats);
      client.removeListener('Room.timeline' as any, updateChats);
      client.removeListener('sync' as any, updateChats);
      client.removeListener('Room.myMembership' as any, updateChats);
      matrixService.removeListener('force_chat_refresh', updateChats);
    };
  }, []);

  const handleAcceptInvite = async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    joinedRoomsLocal.add(roomId);
    matrixService.emit('force_chat_refresh');
    try {
      await client.joinRoom(roomId);
    } catch (error) {
      console.log("Lỗi tham gia phòng:", error);
    }
  };

  const handleRejectInvite = async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    leftRoomsLocal.add(roomId);
    matrixService.emit('force_chat_refresh');
    try {
      await client.leave(roomId);
      // Gọi forget để server không trả về phòng này trong sync nữa (tránh hiện lại ở list)
      await client.forget(roomId);
    } catch (error) {
      console.log("Lỗi từ chối phòng:", error);
    }
  };

  const inviteChats = chats.filter(c => c.isInvite);
  const inviteCount = inviteChats.length;

  const filteredChats = React.useMemo(() => {
    return chats.filter(c => {
      if (c.isInvite) return false; // Không hiển thị invite ở list chính nữa

      return filter === 'all' || (filter === 'unread' && c.unread > 0);
    });
  }, [chats, filter]);

  return (
    <View className="flex-1 bg-background">
      <Header title="Tin nhắn" blurIntensity={blurIntensity} setScreen={setScreen} />

      <FlatList
        data={filteredChats}
        keyExtractor={item => item.id}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={5}
        keyboardShouldPersistTaps="always"
        ListHeaderComponent={(
          <>
            <View className="flex-row p-1 bg-surface rounded-xl border border-white/5 mb-8 mt-4">
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg items-center ${filter === 'all' ? 'bg-primary' : ''}`}
                onPress={() => setFilter('all')}
              >
                <Text className={`text-sm font-semibold ${filter === 'all' ? 'text-surface' : 'text-gray-400'}`}>Tất cả</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 py-2 rounded-lg items-center ${filter === 'unread' ? 'bg-primary' : ''}`}
                onPress={() => setFilter('unread')}
              >
                <Text className={`text-sm font-semibold ${filter === 'unread' ? 'text-surface' : 'text-gray-400'}`}>Chưa đọc</Text>
              </TouchableOpacity>
            </View>

            {inviteCount > 0 && (
              <TouchableOpacity 
                className="flex-row items-center justify-between py-4 border-b border-white/5 mb-2"
                onPress={() => setScreen('invites')}
              >
                <Text className="text-white text-lg font-bold">Mời</Text>
                <View className="bg-red-500 rounded-full w-6 h-6 items-center justify-center">
                  <Text className="text-white text-xs font-bold">{inviteCount}</Text>
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
        renderItem={({ item: chat }) => (
          <MemoizedChatItem
            chat={chat}
            setScreen={setScreen}
            handleAcceptInvite={handleAcceptInvite}
            handleRejectInvite={handleRejectInvite}
          />
        )}
        ListEmptyComponent={() => (
          <Text className="text-gray-500 text-center mt-4 text-sm font-medium">Chưa có tin nhắn nào</Text>
        )}
      />

      {/* <TouchableOpacity onPress={() => setScreen('chat_group')} className="absolute bottom-28 right-6 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center z-40 shadow-xl">
        <MessageSquarePlus size={28} color="#22262E" />
      </TouchableOpacity> */}
    </View>
  );
}
