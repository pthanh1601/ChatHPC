import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from 'lucide-react-native';
import { AppScreen, CONTACTS } from '../data';
import { getMatrixClient } from './matrix';
import { Header } from '../components/Header';

export function Calls({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [callHistory, setCallHistory] = useState<any[]>([]);

  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    const updateCalls = () => {
      const rooms = client.getVisibleRooms();
      let history: any[] = [];

      rooms.forEach(room => {
        // Chỉ lọc các event liên quan đến gọi điện
        const callEvents = room.timeline.filter(e => e.getType().startsWith('m.call.'));
        const invites = callEvents.filter(e => e.getType() === 'm.call.invite');

        invites.forEach(invite => {
          const date = new Date(invite.getTs());
          const time = date.getHours().toString().padStart(2, '0') + ':' + date.getMinutes().toString().padStart(2, '0');
          
          const isOutgoing = invite.getSender() === client.getUserId();
          const callId = invite.getContent().call_id;
          const answered = callEvents.some(e => e.getType() === 'm.call.answer' && e.getContent().call_id === callId);

          let type = 'missed';
          if (isOutgoing) type = 'outgoing';
          else if (answered) type = 'incoming';

          const answerEvent = callEvents.find(e => e.getType() === 'm.call.answer' && e.getContent().call_id === callId);
          const hangupEvent = callEvents.find(e => e.getType() === 'm.call.hangup' && e.getContent().call_id === callId);
          
          let durationText = '';
          if (answerEvent && hangupEvent) {
            const durationSec = Math.max(0, Math.floor((hangupEvent.getTs() - answerEvent.getTs()) / 1000));
            durationText = ` (${Math.floor(durationSec / 60).toString().padStart(2, '0')}:${(durationSec % 60).toString().padStart(2, '0')})`;
          }

          let avatar = room.getAvatarUrl(client.getHomeserverUrl(), 56, 56, 'crop', false, false);
          if (!avatar) avatar = CONTACTS.aria.avatar; // Fallback ảnh

          history.push({
            id: invite.getId(),
            roomId: room.roomId,
            name: room.name || 'Người dùng',
            avatar,
            time,
            durationText,
            type,
            timestamp: invite.getTs()
          });
        });
      });

      history.sort((a, b) => b.timestamp - a.timestamp);
      setCallHistory(history);
    };

    client.on('Room.timeline' as any, updateCalls);
    client.on('sync' as any, updateCalls);
    updateCalls();

    return () => {
      client.removeListener('Room.timeline' as any, updateCalls);
      client.removeListener('sync' as any, updateCalls);
    };
  }, []);

  return (
    <View className="flex-1 bg-background">
      <Header title="Cuộc gọi" blurIntensity={blurIntensity} setScreen={setScreen} />

      <ScrollView 
        className="flex-1 px-5" 
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Gần đây</Text>
        
        <View className="gap-4">
          {callHistory.map((call) => (
            <TouchableOpacity key={call.id} className="bg-card rounded-2xl p-4 flex-row items-center relative overflow-hidden border border-white/5">
              <View className="relative mr-3">
                <View className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                  <Image source={{ uri: call.avatar }} className="w-full h-full" />
                </View>
              </View>
              <View className="flex-1 justify-center ml-1">
                <Text className={`font-bold text-[15px] mb-1 ${call.type === 'missed' ? 'text-[#ef4444]' : 'text-white'}`} style={{ includeFontPadding: false }}>{call.name}</Text>
                <View className="flex-row items-center gap-1.5">
                  {call.type === 'missed' && <PhoneMissed size={14} color="#ef4444" />}
                  {call.type === 'outgoing' && <PhoneOutgoing size={14} color="#a0a0a0" />}
                  {call.type === 'incoming' && <PhoneIncoming size={14} color="#a0a0a0" />}
                  <Text className="text-sm text-gray-400" style={{ includeFontPadding: false }}>{call.time}{call.durationText}</Text>
                </View>
              </View>
              <TouchableOpacity className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/5">
                <Phone size={18} color="#dcb8ff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}

          {callHistory.length === 0 && (
            <Text className="text-gray-500 text-center mt-4 text-sm font-medium">Chưa có lịch sử cuộc gọi</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
