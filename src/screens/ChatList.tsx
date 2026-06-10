import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Plus, CheckCheck, MessageSquarePlus } from 'lucide-react-native';
import { AppScreen, CONTACTS } from '../data';
import { getMatrixClient, setCurrentActiveRoomId } from './matrix';
import { Header } from '../components/Header';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function ChatList({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);

  const getInitialChats = () => {
    const client = getMatrixClient();
    if (!client) return [];
    const rooms = client.getVisibleRooms();

    const chatData = rooms.map(room => {
      const timeline = room.timeline;
      const lastEvent = timeline.length > 0 ? timeline[timeline.length - 1] : null;
      const isInvite = room.getMyMembership() === 'invite';
      
      let lastMessage = 'Chưa có tin nhắn';
      let time = '';

      if (lastEvent) {
        if (lastEvent.getType() === 'm.room.message') {
          lastMessage = lastEvent.getContent().body || 'Tin nhắn mới';
        } else {
          lastMessage = 'Sự kiện hệ thống';
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
      if (!avatar) avatar = CONTACTS.aria.avatar; 

      // Lấy số lượng tin nhắn chưa đọc (Bao gồm cả thông báo tag/highlight)
      const unreadCount = room.getUnreadNotificationCount('total') || room.getUnreadNotificationCount('highlight') || 0;

      return {
        id: room.roomId,
        name: room.name || 'Phòng chat',
        avatar,
        lastMessage,
        time,
        unread: isInvite ? 1 : unreadCount,
        timestamp: lastEvent ? lastEvent.getTs() : (isInvite ? Date.now() : 0),
        isInvite
      };
    });

    chatData.sort((a, b) => b.timestamp - a.timestamp);
    return chatData;
  };

  // Khởi tạo state ngay từ đầu để tránh màn hình bị nháy trống trơn lúc mới load
  const [chats, setChats] = useState<any[]>(getInitialChats);

  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    const updateChats = () => {
      setChats(getInitialChats());
    };

    client.on('Room.timeline' as any, updateChats);
    client.on('sync' as any, updateChats);
    
    updateChats();

    return () => {
      client.removeListener('Room.timeline' as any, updateChats);
      client.removeListener('sync' as any, updateChats);
    };
  }, []);

  const handleAcceptInvite = async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    try {
      await client.joinRoom(roomId);
      // Matrix sẽ tự động đồng bộ (sync) và chuyển nhóm này thành nhóm chính thức
    } catch (error) {
      console.log("Lỗi tham gia phòng:", error);
    }
  };

  const handleRejectInvite = async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    try {
      await client.leave(roomId);
    } catch (error) {
      console.log("Lỗi từ chối phòng:", error);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="Tin nhắn" blurIntensity={blurIntensity} setScreen={setScreen} />

      <ScrollView 
        className="flex-1 px-5" 
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        <View className="relative mb-8">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4 pb-2">
            <View className="flex-col items-center gap-2 mr-4">
              <View className="w-16 h-16 rounded-full p-[2px]">
                <View className="w-full h-full rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center">
                  <Plus size={24} color="#a0a0a0" />
                </View>
              </View>
              <Text className="text-xs font-medium text-gray-400">Your Story</Text>
            </View>

            {[CONTACTS.aria, CONTACTS.kael, CONTACTS.zenix].map((contact, i) => (
              <TouchableOpacity key={i} className="flex-col items-center gap-2 mr-4" onPress={() => {
                setCurrentActiveRoomId(null);
                // Thêm animation mượt mà khi chuyển màn hình
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setScreen('chat_single');
              }}>
                <View className="w-16 h-16 rounded-full p-[2px] bg-primary">
                  <View className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                    <Image source={{ uri: contact.avatar }} className="w-full h-full" />
                  </View>
                </View>
                <Text className="text-xs font-medium text-primary">{contact.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity className="flex-col items-center gap-2 opacity-80 mr-4">
              <View className="w-16 h-16 rounded-full p-[2px] bg-gray-600">
                <View className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                  <Image source={{ uri: CONTACTS.nova.avatar }} className="w-full h-full opacity-50" />
                </View>
              </View>
              <Text className="text-xs font-medium text-gray-400">Nova</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View className="flex-row p-1 bg-surface rounded-xl border border-white/5 mb-8">
          <TouchableOpacity className="flex-1 py-2 rounded-lg bg-primary items-center">
            <Text className="text-sm font-semibold text-surface">Direct</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 py-2 rounded-lg items-center" onPress={() => setScreen('chat_group')}>
            <Text className="text-sm font-semibold text-gray-400">Groups</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-4 pb-20">
          {chats.map((chat) => (
            <TouchableOpacity 
              key={chat.id} 
              onPress={() => {
                if (!chat.isInvite) {
                  setCurrentActiveRoomId(chat.id);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
                  <View className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                    <Image source={{ uri: chat.avatar }} className="w-full h-full" />
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

              {/* Các nút hành động nếu đây là lời mời */}
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
                    <Text className="text-[#1a1f2e] font-bold text-sm tracking-wide">Tham gia</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
          
          {chats.length === 0 && (
            <Text className="text-gray-500 text-center mt-4 text-sm font-medium">Chưa có tin nhắn nào</Text>
          )}
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => setScreen('chat_group')} className="absolute bottom-28 right-6 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center z-40 shadow-xl">
        <MessageSquarePlus size={28} color="#1a1f2e" />
      </TouchableOpacity>
    </View>
  );
}
