import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard, Modal, SafeAreaView, StatusBar } from 'react-native';
import { Search, X, Plus, ChevronDown, Users } from 'lucide-react-native';
import { AppScreen } from '../data';
import { getMatrixClient, currentActiveRoomId, setCurrentActiveRoomId, matrixService } from '../services/MatrixService';
import { SuccessPopup } from '../components/SuccessPopup';
import { ErrorPopup } from '../components/ErrorPopup';

interface InviteMembersProps {
  setScreen: (screen: AppScreen) => void;
}

export function InviteMembers({ setScreen }: InviteMembersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = (term: string) => {
    setSearchQuery(term);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const client = getMatrixClient();
        if (!client) throw new Error("Chưa kết nối đến máy chủ");
        
        const response = await client.searchUserDirectory({ term: term.trim(), limit: 20 });
        setSearchResults(response.results || []);
      } catch (e) {
        console.log("Lỗi tìm kiếm user:", e);
      } finally {
        setIsSearching(false);
      }
    }, 600); // 600ms debounce
  };

  const handleAddUser = async (userId: string) => {
    Keyboard.dismiss();
    setIsLoading(true);
    try {
      const client = getMatrixClient();
      if (!client) throw new Error("Chưa kết nối đến Matrix Server");

      const roomId = currentActiveRoomId;
      if (roomId) {
        // Mời vào phòng hiện tại
        await client.invite(roomId, userId);
        setPopupMessage(`Đã gửi lời mời đến ${userId}`);
        setSuccessVisible(true);
        setTimeout(() => setScreen('chat_single'), 1500);
      } else {
        // Tạo phòng chat 1-1 (Direct Message) mới
        const res = await client.createRoom({
          is_direct: true,
          invite: [userId],
          preset: 'trusted_private_chat'
        });
        setCurrentActiveRoomId(res.room_id);
        setPopupMessage('Đã tạo cuộc trò chuyện!');
        setSuccessVisible(true);
        setTimeout(() => setScreen('chat_single'), 1500);
      }
    } catch (err: any) {
      setPopupMessage(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#15191E]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SuccessPopup visible={successVisible} message={popupMessage} onClose={() => setSuccessVisible(false)} />
      <ErrorPopup visible={errorVisible} message={popupMessage} onClose={() => setErrorVisible(false)} />

      {/* Header Search Bar */}
      <SafeAreaView className="bg-[#15191E]">
        <View className="pt-4 pb-2 px-4 flex-row items-center" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 16 }}>
          <View className="flex-1 bg-[#1C1C1E] border border-white/5 flex-row items-center px-3 h-[42px] rounded-xl mr-3">
            <Search size={18} color="#8e8e93" />
            <TextInput
              className="flex-1 ml-2 text-[17px] text-white"
              placeholder="Tìm / mời bằng ID Người dùng..."
              placeholderTextColor="#8e8e93"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')} className="p-1">
                <X size={18} color="#8e8e93" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={() => setScreen(currentActiveRoomId ? 'chat_single' : 'chat_list')}>
            <Text className="text-[#0DBD8B] text-[17px]">Hủy</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        {searchQuery.length > 0 && (
          <View className="px-4 py-4">
            <View className="flex-row items-center mb-4">
              <Text className="text-gray-400 text-[13px] font-bold mr-1">DANH MỤC NGƯỜI DÙNG {searchResults.length}</Text>
              <ChevronDown size={16} color="#a0a0a0" />
            </View>
            
            {isSearching ? (
              <ActivityIndicator color="#0DBD8B" className="mt-4" />
            ) : (
              searchResults.map((user) => {
                const client = getMatrixClient();
                const avatarUrl = user.avatar_url && client ? client.mxcUrlToHttp(user.avatar_url, 96, 96, 'crop') : null;
                const displayName = user.display_name || user.user_id.split(':')[0].replace('@', '');
                
                return (
                  <View key={user.user_id} className="flex-row items-center justify-between mb-5">
                    <View className="flex-row items-center flex-1">
                      {avatarUrl ? (
                        <View className="w-12 h-12 rounded-full bg-[#1C1C1E] overflow-hidden">
                           <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%' }} />
                        </View>
                      ) : (
                        <View className="w-12 h-12 rounded-full bg-[#0DBD8B] items-center justify-center">
                          <Text className="text-white text-xl font-semibold">{displayName[0]?.toUpperCase()}</Text>
                        </View>
                      )}
                      <View className="ml-3 flex-1 mr-2">
                        <Text className="text-white text-[17px] font-semibold" numberOfLines={1}>
                          {displayName} <Text className="text-gray-400 font-normal">({user.user_id})</Text>
                        </Text>
                        {(() => {
                          const matrixUser = client?.getUser(user.user_id);
                          if (!matrixUser || !matrixUser.presence || matrixUser.presence === 'unknown') return null;

                          let presenceText = '';
                          if (matrixUser.presence === 'online') presenceText = 'Trực tuyến';
                          else if (matrixUser.presence === 'unavailable') presenceText = 'Nhàn rỗi';
                          else if (matrixUser.presence === 'offline') presenceText = 'Ngoại tuyến';
                          else return null;

                          let timeStr = '';
                          if (matrixUser.currentlyActive) {
                            timeStr = 'bây giờ';
                          } else if (matrixUser.lastActiveAgo && matrixUser.lastActiveAgo > 0) {
                            const seconds = Math.floor(matrixUser.lastActiveAgo / 1000);
                            if (seconds < 60) timeStr = `${seconds}s trước`;
                            else {
                              const mins = Math.floor(seconds / 60);
                              if (mins < 60) timeStr = `${mins} phút trước`;
                              else {
                                const hrs = Math.floor(mins / 60);
                                if (hrs < 24) timeStr = `${hrs} giờ trước`;
                                else timeStr = `${Math.floor(hrs / 24)} ngày trước`;
                              }
                            }
                          }

                          return (
                            <Text className="text-gray-400 text-sm mt-0.5">
                              {timeStr ? `${presenceText} ${timeStr}` : presenceText}
                            </Text>
                          );
                        })()}
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => handleAddUser(user.user_id)} disabled={isLoading} className="p-2">
                      <Plus size={24} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
            {!isSearching && searchResults.length === 0 && (
               <Text className="text-gray-500 text-center mt-10">Không tìm thấy kết quả phù hợp</Text>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
