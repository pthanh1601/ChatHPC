import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { AppScreen } from '../data';
import { getMatrixClient, setCurrentActiveRoomId, joinedRoomsLocal, leftRoomsLocal, matrixService } from '../services/MatrixService';
import { getAvatarColor } from './ChatList'; // Tái sử dụng hàm lấy màu ngẫu nhiên

export function Invites({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [invites, setInvites] = useState<any[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadInvites = () => {
    const client = getMatrixClient();
    if (!client) return;
    const rooms = client.getVisibleRooms().filter(room => 
      room.getMyMembership() === 'invite' && 
      !joinedRoomsLocal.has(room.roomId) && 
      !leftRoomsLocal.has(room.roomId)
    );

    const inviteData = rooms.map(room => {
      let avatar = room.getAvatarUrl(client.getHomeserverUrl(), 96, 96, 'crop', false, false);
      if (avatar) {
        avatar = avatar.replace(/\/_matrix\/media\/(r0|v3)\/(download|thumbnail)\//, '/_matrix/client/v1/media/$2/');
      }

      // Lấy người mời
      const me = room.getMember(client.getUserId()!);
      const inviterId = me?.events?.member?.getSender() || 'Ai đó';

      return {
        id: room.roomId,
        name: room.name || 'Phòng chat',
        avatar,
        inviterId,
        timestamp: me?.events?.member?.getTs() || Date.now(),
      };
    });

    inviteData.sort((a, b) => b.timestamp - a.timestamp);
    setInvites(inviteData);
  };

  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    loadInvites();

    const onRoomTimeline = () => loadInvites();
    const onSync = () => loadInvites();

    client.on('Room.timeline' as any, onRoomTimeline);
    client.on('sync' as any, onSync);
    client.on('Room.myMembership' as any, onSync);

    return () => {
      client.removeListener('Room.timeline' as any, onRoomTimeline);
      client.removeListener('sync' as any, onSync);
      client.removeListener('Room.myMembership' as any, onSync);
    };
  }, []);

  const handleAccept = async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    setProcessingId(roomId);
    
    // Đánh dấu local để ẩn ngay khỏi danh sách lời mời
    joinedRoomsLocal.add(roomId);
    loadInvites();
    matrixService.emit('force_chat_refresh');

    try {
      await client.joinRoom(roomId);
      setCurrentActiveRoomId(roomId);
      setScreen('chat_single');
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể tham gia phòng: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    setProcessingId(roomId);

    // Đánh dấu local để ẩn ngay khỏi danh sách
    leftRoomsLocal.add(roomId);
    loadInvites();
    matrixService.emit('force_chat_refresh');

    try {
      await client.leave(roomId);
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể từ chối phòng: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View className="mb-6">
      <View className="flex-row items-center mb-3 px-5">
        <View className="mr-3">
          {item.avatar ? (
            <Image 
              source={getMatrixClient()?.getAccessToken() && item.avatar.includes('_matrix')
                ? { uri: item.avatar, headers: { Authorization: `Bearer ${getMatrixClient()?.getAccessToken()}` } }
                : { uri: item.avatar }} 
              className="w-12 h-12 rounded-full border border-white/10" 
            />
          ) : (
            <View 
              className="w-12 h-12 rounded-full flex items-center justify-center border border-white/10"
              style={{ backgroundColor: getAvatarColor(item.id) }}
            >
              <Text className="text-[#17191C] text-lg font-bold">{item.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-bold" numberOfLines={1}>{item.name}</Text>
          <Text className="text-gray-400 text-xs italic" numberOfLines={1}>{item.inviterId} invited you</Text>
        </View>
        <ChevronLeft size={20} color="#a0a0a0" style={{ transform: [{ rotate: '180deg' }] }} />
      </View>
      <View className="flex-row items-center justify-end px-5 space-x-3">
        <TouchableOpacity 
          className="border border-red-500/50 rounded-lg py-2 px-6"
          onPress={() => handleReject(item.id)}
          disabled={processingId === item.id}
        >
          <Text className="text-red-400 font-medium">Từ chối</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          className="bg-primary rounded-lg py-2 px-6 ml-3"
          onPress={() => handleAccept(item.id)}
          disabled={processingId === item.id}
        >
          {processingId === item.id ? (
            <ActivityIndicator size="small" color="#1C1C1E" />
          ) : (
            <Text className="text-[#1C1C1E] font-bold">Chấp nhận</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-background pt-14">
      <View className="flex-row items-center px-4 mb-4">
        <TouchableOpacity onPress={() => setScreen('chat_list')} className="flex-row items-center p-2">
          <ChevronLeft size={24} color="#0DBD8B" />
          <Text className="text-primary text-lg ml-1 font-medium">All chats</Text>
        </TouchableOpacity>
      </View>
      <Text className="text-white text-3xl font-bold px-6 mb-6">Mời</Text>
      
      <FlatList
        data={invites}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={() => (
          <Text className="text-gray-500 text-center mt-10">Không có lời mời nào</Text>
        )}
      />
    </View>
  );
}
