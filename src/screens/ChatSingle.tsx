import { useState, useEffect, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { ArrowLeft, Phone, Video, CheckCheck, Plus, Mic, Send } from 'lucide-react-native';
import { AppScreen, CONTACTS, MEDIA } from '../data';
import { getMatrixClient, currentActiveRoomId } from './matrix';
import { Header } from '../components/Header';

export function ChatSingle({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [roomInfo, setRoomInfo] = useState({ name: 'Đang tải...', avatar: CONTACTS.kael.avatar, members: 0 });
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const client = getMatrixClient();
    if (!client || !currentActiveRoomId) return;

    const room = client.getRoom(currentActiveRoomId);
    if (!room) return;

    // Load thông tin phòng
    let avatar = room.getAvatarUrl(client.getHomeserverUrl(), 96, 96, 'crop', false, false);
    setRoomInfo({
      name: room.name || 'Phòng chat',
      avatar: avatar || CONTACTS.kael.avatar,
      members: room.getJoinedMemberCount()
    });

    const updateMessages = () => {
      const myUserId = client.getUserId();
      const timeline = room.timeline;
      
      const msgs = timeline
        .filter(e => e.getType() === 'm.room.message')
        .map(e => {
          const date = new Date(e.getTs());
          const time = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
          return {
            id: e.getId(),
            sender: e.getSender(),
            isMe: e.getSender() === myUserId,
            text: e.getContent().body,
            time: time,
            senderName: room.getMember(e.getSender())?.name || e.getSender()
          };
        });

      setMessages(msgs);
      // Tự động cuộn xuống cuối khi có tin nhắn mới
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    updateMessages();

    // Lắng nghe tin nhắn mới theo thời gian thực
    client.on('Room.timeline' as any, updateMessages);

    // Đánh dấu đã đọc nếu có tin nhắn mới nhất
    if (room.timeline.length > 0) {
      client.sendReadReceipt(room.timeline[room.timeline.length - 1]);
    }

    return () => {
      client.removeListener('Room.timeline' as any, updateMessages);
    };
  }, []);

  const handleSend = () => {
    const client = getMatrixClient();
    if (!inputText.trim() || !client || !currentActiveRoomId) return;

    client.sendTextMessage(currentActiveRoomId, inputText);
    setInputText('');
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background relative" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header blurIntensity={blurIntensity}>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => setScreen('chat_list')}>
            <ArrowLeft size={24} color="#dcb8ff" />
          </TouchableOpacity>
          <View className="flex-row items-center gap-3">
            <View className="relative">
              <View className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary">
                <Image source={{ uri: roomInfo.avatar }} className="w-full h-full" />
              </View>
              <View className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-background"></View>
            </View>
            <View>
              <Text className="text-xl font-bold text-primary">{roomInfo.name}</Text>
              <Text className="text-xs font-medium text-secondary/80">{roomInfo.members} thành viên</Text>
            </View>
          </View>
        </View>
        <View className="flex-row items-center gap-6">
          <TouchableOpacity>
            <Phone size={24} color="#a0a0a0" />
          </TouchableOpacity>
          <TouchableOpacity>
            <Video size={24} color="#a0a0a0" />
          </TouchableOpacity>
        </View>
      </Header>

      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        <View className="flex-col gap-6 pt-[120px] pb-4">
          {messages.map((msg, index) => {
            return msg.isMe ? (
              <View key={msg.id || index} className="flex-col items-end max-w-[85%] self-end mb-2">
                <View className="bg-bubble rounded-xl rounded-tr-none p-4 shadow-lg">
                  <Text className="text-base text-white" style={{ includeFontPadding: false }}>{msg.text}</Text>
                </View>
                <View className="flex-row items-center gap-1 mt-1 mr-1">
                  <Text className="text-[10px] text-gray-500">{msg.time}</Text>
                  <CheckCheck size={14} color="#00fbfb" />
                </View>
              </View>
            ) : (
              <View key={msg.id || index} className="flex-col items-start max-w-[85%] mb-2">
                <Text className="text-xs text-gray-400 mb-1 ml-1">{msg.senderName}</Text>
                <View className="bg-card rounded-xl rounded-tl-none p-4 shadow-sm border border-white/5">
                  <Text className="text-base text-white" style={{ includeFontPadding: false }}>{msg.text}</Text>
                </View>
                <Text className="text-[10px] mt-1 text-gray-500 ml-1">{msg.time}</Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View className="w-full z-50 px-5 pb-6 pt-4 bg-background/90">
        <View className="bg-card rounded-full p-1.5 flex-row items-center border border-white/10">
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center">
            <Plus size={28} color="#dcb8ff" />
          </TouchableOpacity>
          <View className="flex-1 h-12 bg-background/50 rounded-full justify-center px-4 mx-1">
            <TextInput 
              placeholder="Nhập tin nhắn..." 
              placeholderTextColor="#a0a0a0" 
              value={inputText}
              onChangeText={setInputText}
              className="w-full text-base text-white p-0" 
              style={{ 
                includeFontPadding: false, 
                textAlignVertical: 'center',
                paddingVertical: 0,
                marginTop: -4
              }}
            />
          </View>
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center mr-1">
            <Mic size={24} color="#00fbfb" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSend} className="w-12 h-12 flex items-center justify-center rounded-full bg-bubble">
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
