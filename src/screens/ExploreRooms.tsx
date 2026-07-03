import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { ChevronLeft, Search } from 'lucide-react-native';
import { AppScreen } from '../data';
import { getMatrixClient, setCurrentActiveRoomId, setPreviewRoomInfo } from '../services/MatrixService';
import { getAvatarColor } from './ChatList';

interface ExploreRoomsProps {
  setScreen: (screen: AppScreen) => void;
}

export function ExploreRooms({ setScreen }: ExploreRoomsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [nextBatch, setNextBatch] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const FORBIDDEN_TERMS = ['nsfw', '18\\\\+'];
  const forbiddenRegex = new RegExp(`\\\\b(${FORBIDDEN_TERMS.join('|')})\\\\b`, 'i');

  const fetchRooms = async (isPagination = false) => {
    const client = getMatrixClient();
    if (!client) return;

    if (isPagination && !nextBatch) return;

    if (isPagination) {
      setIsPaginating(true);
    } else {
      setIsLoading(true);
      setRooms([]);
      setNextBatch(null);
    }

    try {
      const opts: any = { limit: 50 };
      if (isPagination && nextBatch) opts.since = nextBatch;
      if (searchQuery.trim()) {
        opts.filter = { generic_search_term: searchQuery.trim() };
      }

      const response = await client.publicRooms(opts);
      
      const filteredRooms = (response.chunk || []).filter((room: any) => {
        let shouldAllow = true;
        if (room.name) {
          shouldAllow = shouldAllow && !forbiddenRegex.test(room.name);
        }
        if (room.topic) {
          shouldAllow = shouldAllow && !forbiddenRegex.test(room.topic);
        }
        return shouldAllow;
      });

      const formattedRooms = filteredRooms.map((room: any) => ({
        id: room.room_id,
        name: room.name || room.canonical_alias || 'Phòng không tên',
        topic: room.topic || 'Không có mô tả',
        memberCount: room.num_joined_members || 0,
        avatar: room.avatar_url ? client.mxcUrlToHttp(room.avatar_url, 96, 96, 'crop') : null,
      }));

      if (isPagination) {
        setRooms(prev => [...prev, ...formattedRooms]);
      } else {
        setRooms(formattedRooms);
      }
      
      setNextBatch(response.next_batch || null);
    } catch (error: any) {
      console.log('Lỗi lấy danh sách phòng công khai:', error);
    } finally {
      setIsLoading(false);
      setIsPaginating(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchRooms(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleJoin = async (roomId: string) => {
    const client = getMatrixClient();
    if (!client) return;
    setProcessingId(roomId);
    
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

  const handlePreview = async (item: any) => {
    const client = getMatrixClient();
    if (!client) return;
    setProcessingId(item.id);
    
    // Lưu thông tin phòng để hiển thị tạm trước khi tải được lịch sử
    setPreviewRoomInfo(item);
    
    try {
      await client.peekInRoom(item.id);
      setCurrentActiveRoomId(item.id);
      setScreen('chat_single');
    } catch (error: any) {
      console.log('Peek failed, maybe not world readable, but navigating anyway:', error);
      // Vẫn chuyển hướng để UI xử lý "Tham gia phòng" dù không thể load lịch sử.
      setCurrentActiveRoomId(item.id);
      setScreen('chat_single');
    } finally {
      setProcessingId(null);
    }
  };

  const renderRoom = ({ item }: { item: any }) => {
    const isProcessing = processingId === item.id;
    return (
      <TouchableOpacity 
        onPress={() => handlePreview(item)}
        disabled={isProcessing}
        className="flex-row items-center justify-between p-4 bg-card rounded-2xl mb-3 border border-white/5 mx-4"
      >
        <View className="flex-row items-center flex-1 mr-4">
          <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center border border-white/10" style={{ backgroundColor: getAvatarColor(item.id) }}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} className="w-full h-full" />
            ) : (
              <Text className="text-white text-xl font-bold">{item.name.charAt(0)}</Text>
            )}
          </View>
          <View className="ml-3 flex-1">
            <Text className="text-white font-bold text-[16px] mb-1" numberOfLines={1}>{item.name}</Text>
            <Text className="text-gray-400 text-[13px] mb-1" numberOfLines={1}>{item.topic}</Text>
            <Text className="text-gray-500 text-[11px]">{item.memberCount} thành viên</Text>
          </View>
        </View>
        <TouchableOpacity
          disabled={isProcessing}
          onPress={() => handleJoin(item.id)}
          className={`py-2 px-4 rounded-xl items-center justify-center shadow-lg shadow-primary/20 ${isProcessing ? 'bg-primary/50' : 'bg-primary'}`}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#22262E" />
          ) : (
            <Text className="text-[#22262E] font-bold text-sm">Tham gia</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-14 pb-4 border-b border-white/5 bg-background z-10 flex-row items-center">
        <TouchableOpacity
          onPress={() => setScreen('chat_list')}
          className="w-10 h-10 items-center justify-center rounded-full bg-surface"
        >
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">Khám phá phòng</Text>
      </View>

      <View className="px-4 py-3 bg-background">
        <View className="flex-row items-center bg-surface px-4 py-2.5 rounded-full border border-white/10">
          <Search color="#9ca3af" size={20} />
          <TextInput
            className="flex-1 text-white ml-2"
            placeholder="Tìm kiếm phòng..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#03b381" />
        </View>
      ) : (
        <FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          onEndReached={() => fetchRooms(true)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center mt-20">
              <Text className="text-gray-400">Không tìm thấy phòng nào.</Text>
            </View>
          }
          ListFooterComponent={
            isPaginating ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#03b381" />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
