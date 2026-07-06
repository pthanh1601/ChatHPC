import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput, SectionList, Image, ActivityIndicator, Keyboard, Platform, Linking, DeviceEventEmitter } from 'react-native';
import { Search as SearchIcon, MessageSquare } from 'lucide-react-native';
import { AppScreen } from '../data';
import { getMatrixClient, setCurrentActiveRoomId } from '../services/MatrixService';
import { persistentLocalStorage } from '../services/StorageService';
import { Header } from '../components/Header';
import theme from '../theme';

export const getInitialContacts = () => {
  const client = getMatrixClient();
  if (!client) return [];
  
  const currentUserId = client.getUserId();
  const rooms = client.getRooms();
  const dmUsersMap = new Map();

  for (const room of rooms) {
    const joinedMembers = room.getJoinedMembers();
    if (joinedMembers.length === 2 && !room.isSpaceRoom()) {
      const otherMember = joinedMembers.find((m: any) => m.userId !== currentUserId);
      if (otherMember) {
        const user = client.getUser(otherMember.userId);
        let avatarUrl = user?.avatarUrl;
        if (!avatarUrl && otherMember.getMxcAvatarUrl) {
          avatarUrl = otherMember.getMxcAvatarUrl();
        }
        
        dmUsersMap.set(otherMember.userId, {
          user_id: otherMember.userId,
          display_name: user?.displayName || otherMember.name || otherMember.userId,
          avatar_url: avatarUrl
        });
      }
    }
  }
  
  const formattedUsers = Array.from(dmUsersMap.values());
  
  // Đổ vào danh sách syncedContacts
  return formattedUsers.map((u: any) => ({
    id: u.user_id,
    name: u.display_name || u.user_id,
    matrixUser: u
  }));
};

export function Contacts({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Initialize from cache to prevent empty screen on load
  const [syncedContacts, setSyncedContacts] = useState<any[]>(() => {
    const client = getMatrixClient();
    const syncState = client?.getSyncState();
    
    // Nếu client ĐÃ HOÀN TẤT ĐỒNG BỘ, lấy dữ liệu thật ngay lập tức để tránh nháy (jump)
    if (client && (syncState === 'PREPARED' || syncState === 'SYNCING')) {
      const initial = getInitialContacts();
      if (initial.length > 0) return initial;
    }

    const cached = persistentLocalStorage.getItem('cached_contact_list');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) { }
    }
    return getInitialContacts();
  });
  
  const [matrixContacts, setMatrixContacts] = useState<any[]>([]);
  const [isSearchingMatrix, setIsSearchingMatrix] = useState(false);

  // Load Server Friends
  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    let timeoutId: NodeJS.Timeout;
    let storageTimeoutId: NodeJS.Timeout;

    const loadFriends = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const fakeSynced = getInitialContacts();
        
        setSyncedContacts(fakeSynced);

        // Lưu vào ổ đĩa sau 5 giây để tránh giật lag lúc mới vào màn hình
        clearTimeout(storageTimeoutId);
        storageTimeoutId = setTimeout(() => {
          if (fakeSynced.length > 0 || client.getSyncState() === 'PREPARED') {
            persistentLocalStorage.setItem('cached_contact_list', JSON.stringify(fakeSynced));
          }
        }, 5000);
      }, 500);
    };

    loadFriends();

    client.on('Room' as any, loadFriends);
    client.on('RoomState.members' as any, loadFriends);
    client.on('sync' as any, loadFriends);

    return () => {
      clearTimeout(timeoutId);
      client.removeListener('Room' as any, loadFriends);
      client.removeListener('RoomState.members' as any, loadFriends);
      client.removeListener('sync' as any, loadFriends);
    };
  }, []);

  // Handle Search
  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    if (searchQuery.trim().length === 0) {
      setMatrixContacts([]);
      setIsSearchingMatrix(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingMatrix(true);
      try {
        const res = await client.searchUserDirectory({ term: searchQuery, limit: 50 });
        
        // CHỈ LÀM Ở NỘI BỘ: Lọc loại bỏ các user từ máy chủ khác (Toàn cầu) và loại bỏ chính mình
        const localDomain = client.getDomain();
        const currentUserId = client.getUserId();
        let internalUsers = (res.results || []).filter((u: any) => u.user_id.endsWith(':' + localDomain) && u.user_id !== currentUserId);
        
        // Tìm kiếm chính xác tên đăng nhập (Phá giới hạn Privacy của User Directory)
        const exactUsername = searchQuery.trim().toLowerCase();
        // Bỏ ký tự @ nếu người dùng gõ nhầm
        const cleanUsername = exactUsername.startsWith('@') ? exactUsername.substring(1) : exactUsername;
        const exactUserId = `@${cleanUsername}:${localDomain}`;
        
        if (cleanUsername.length > 0 && exactUserId !== currentUserId && !internalUsers.some((u: any) => u.user_id === exactUserId)) {
          try {
            const profile = await client.getProfileInfo(exactUserId);
            if (profile) {
              // Thêm kết quả chính xác lên đầu
              internalUsers.unshift({
                user_id: exactUserId,
                display_name: profile.displayname,
                avatar_url: profile.avatar_url
              });
            }
          } catch(e) {
            // Không tìm thấy user chính xác
          }
        }
        
        setMatrixContacts(internalUsers);
      } catch (err) {
        console.log("Error searching directory:", err);
      } finally {
        setIsSearchingMatrix(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchInputRef = React.useRef<TextInput>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('focus_search', (screen) => {
      if (screen === 'contacts') {
        searchInputRef.current?.focus();
      }
    });
    return () => sub.remove();
  }, []);

  const handleContactPress = async (matrixId: string) => {
    const client = getMatrixClient();
    if (!client) return;

    Keyboard.dismiss();
    setScreen('chat_list'); // Go back to base first or directly chat single

    try {
      // Find if we already have a DM with this user
      const rooms = client.getRooms();
      let existingRoomId = null;

      for (const room of rooms) {
        // Bỏ qua các phòng có đặt tên rõ ràng (group)
        const hasNameEvent = room.currentState.getStateEvents('m.room.name', '');
        if (hasNameEvent && hasNameEvent.getContent().name) {
          continue;
        }

        // Tìm xem user mục tiêu có trong phòng này không (đã join hoặc đang được invite)
        const targetMember = room.getMember(matrixId);
        if (targetMember && (targetMember.membership === 'join' || targetMember.membership === 'invite')) {
          // Đếm số lượng thành viên đang hoạt động (join + invite)
          const allMembers = room.getMembers();
          const activeMembers = allMembers.filter((m: any) => m.membership === 'join' || m.membership === 'invite');
          
          // Nếu chỉ có 2 người (mình và họ) thì đích thị là chat 1-1
          if (activeMembers.length <= 2) {
            existingRoomId = room.roomId;
            break;
          }
        }
      }

      if (existingRoomId) {
        setCurrentActiveRoomId(existingRoomId);
        setScreen('chat_single');
      } else {
        // Create new DM room
        const res = await client.createRoom({
          is_direct: true,
          invite: [matrixId],
          preset: 'trusted_private_chat'
        });
        setCurrentActiveRoomId(res.room_id);
        setScreen('chat_single');
      }
    } catch (error) {
      console.log("Error creating DM:", error);
    }
  };



  const filteredSyncedContacts = React.useMemo(() => {
    if (!searchQuery) return syncedContacts;
    const lowerQuery = searchQuery.toLowerCase();
    return syncedContacts.filter(c => c.name?.toLowerCase().includes(lowerQuery));
  }, [syncedContacts, searchQuery]);

  const sections = [];

  if (searchQuery.length > 0) {
    sections.push({
      title: 'Tìm kiếm máy chủ',
      data: isSearchingMatrix ? [] : matrixContacts,
      type: 'matrix'
    });
  }

  if (filteredSyncedContacts.length > 0) {
    sections.push({
      title: 'Bạn bè trên server',
      data: filteredSyncedContacts,
      type: 'synced'
    });
  }

  const renderMatrixContact = (item: any) => {
    const client = getMatrixClient();
    let avatarUrl = item.avatar_url;
    if (avatarUrl && client) {
      avatarUrl = client.mxcUrlToHttp(avatarUrl, 56, 56, 'crop');
    }

    const display = (item.display_name || item.user_id).replace(/(\s*\[.*?\])+\s*$/, '');
    const isFriend = syncedContacts.some(c => c.id === item.user_id);
    
    return (
      <TouchableOpacity 
        className="flex-row items-center py-3 border-b border-white/5"
        onPress={() => handleContactPress(item.user_id)}
      >
            <View className="w-12 h-12 rounded-full bg-surface items-center justify-center overflow-hidden mr-4 border border-white/10">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-full h-full" />
              ) : (
                <Text className="text-white text-lg font-bold">
                  {display.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-white text-base font-semibold" numberOfLines={1}>
                {display}
              </Text>
              <Text className="text-muted text-sm mt-0.5" numberOfLines={1}>
                {item.user_id.split(':')[0]}
              </Text>
            </View>
            <TouchableOpacity 
              className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary/30 ml-2"
              onPress={() => handleContactPress(item.user_id)}
            >
              <Text className="text-primary text-xs font-semibold">{isFriend ? 'Nhắn tin' : 'Kết bạn'}</Text>
            </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSyncedContact = (item: any) => {
    const client = getMatrixClient();
    let avatarUrl = item.matrixUser.avatar_url;
    if (avatarUrl && client) {
      avatarUrl = client.mxcUrlToHttp(avatarUrl, 56, 56, 'crop');
    }
    const matrixDisplay = (item.matrixUser.display_name || item.matrixUser.user_id).replace(/(\s*\[.*?\])+\s*$/, '');
    
    return (
      <TouchableOpacity 
        className="flex-row items-center py-3 border-b border-white/5" 
        activeOpacity={0.7}
        onPress={() => handleContactPress(item.matrixUser.user_id)}
      >
        <View className="w-12 h-12 rounded-full bg-surface items-center justify-center mr-4 border border-primary/30 overflow-hidden">
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} className="w-full h-full" />
          ) : (
            <Text className="text-primary text-lg font-bold">
              {matrixDisplay.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View className="flex-1">
          <Text className="text-white text-base font-semibold" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-primary/80 text-sm mt-0.5" numberOfLines={1}>
            Sử dụng ChatHPC
          </Text>
        </View>
        <TouchableOpacity 
          className="bg-primary/20 px-3 py-1.5 rounded-full border border-primary/30"
          onPress={() => handleContactPress(item.matrixUser.user_id)}
        >
          <Text className="text-primary text-xs font-semibold">Nhắn tin</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };



  return (
    <View className="flex-1 bg-background">
      <Header title="Danh bạ" blurIntensity={blurIntensity} setScreen={setScreen} />

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id || item.user_id || `item-${index}`}
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: Platform.OS === 'ios' ? 140 : 100, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View className="flex-row items-center bg-surface rounded-2xl px-4 py-2.5 mb-6 border border-white/5">
            <SearchIcon size={20} color={theme.colors.muted} />
            <TextInput 
              ref={searchInputRef}
              placeholder="Tìm kiếm danh bạ..." 
              placeholderTextColor={theme.colors.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white text-[17px] ml-2 h-full py-1"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View className="bg-background/90 py-2 mb-2">
            <Text className="text-muted font-bold text-[13px] uppercase tracking-wider">{section.title}</Text>
          </View>
        )}
        renderItem={({ item, section }) => {
          if (section.type === 'matrix') {
            return renderMatrixContact(item);
          } else if (section.type === 'synced') {
            return renderSyncedContact(item);
          }
          return null;
        }}
        ListEmptyComponent={() => {
          if (isSearchingMatrix) {
            return <ActivityIndicator size="small" color={theme.colors.primary} className="mt-8" />;
          }
          if (searchQuery) {
            return <Text className="text-muted text-center mt-8">Không tìm thấy người dùng nào</Text>;
          }

          return null;
        }}
        renderSectionFooter={({ section }) => {
          if (section.type === 'matrix' && isSearchingMatrix) {
            return <ActivityIndicator size="small" color={theme.colors.primary} className="my-4" />;
          }
          return null;
        }}
      />
    </View>
  );
}
