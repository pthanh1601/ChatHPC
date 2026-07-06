import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView, Alert, LayoutAnimation, ActivityIndicator } from 'react-native';
import { ChevronLeft, Bell, Search, LogOut, MoreHorizontal, UserPlus } from 'lucide-react-native';
import { getMatrixClient, currentActiveRoomId } from '../services/MatrixService';
import { AppScreen } from '../data';
import { getAvatarColor } from './ChatList';

export function RoomDetails({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [roomInfo, setRoomInfo] = useState<{
    name: string;
    avatar: string | null;
    membersCount: number;
    isEncrypted: boolean;
  } | null>(null);

  const [members, setMembers] = useState<any[]>([]);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const client = getMatrixClient();
    const roomId = currentActiveRoomId;

    if (client && roomId) {
      const room = client.getRoom(roomId);
      if (room) {
        let avatarUrl = room.getAvatarUrl(client.getHomeserverUrl(), 120, 120, 'crop', false, false);
        const name = room.name || 'Unnamed Room';
        const membersCount = room.getJoinedMemberCount();
        const isEncrypted = client.isRoomEncrypted(roomId);

        setRoomInfo({ name, avatar: avatarUrl, membersCount, isEncrypted });

        const updateMembersList = () => {
          const joinedMembers = room.getMembersWithMembership('join');
          const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
          const powerLevels = powerLevelsEvent ? powerLevelsEvent.getContent().users : {};
          
          const memberList = joinedMembers.map((m: any) => {
            const user = client.getUser(m.userId);
            let mAvatar = user?.avatarUrl;
            if (!mAvatar && m.getMxcAvatarUrl) mAvatar = m.getMxcAvatarUrl();
            if (mAvatar) mAvatar = client.mxcUrlToHttp(mAvatar, 80, 80, 'crop', false, false);
            
            return {
              userId: m.userId,
              name: user?.displayName || m.name || m.userId.split(':')[0],
              avatar: mAvatar,
              powerLevel: powerLevels[m.userId] || 0
            };
          });
          
          setMembers(memberList.sort((a: any, b: any) => b.powerLevel - a.powerLevel));
        };

        // Render initially with whatever is cached
        updateMembersList();

        // Fetch full list from homeserver in background to overcome Lazy Loading
        client.members(roomId).then((res: any) => {
          if (res && res.chunk) {
            const powerLevelsEvent = room.currentState.getStateEvents('m.room.power_levels', '');
            const powerLevels = powerLevelsEvent ? powerLevelsEvent.getContent().users : {};
            
            // Only keep members who are currently 'join'
            const joinedChunk = res.chunk.filter((evt: any) => evt.content?.membership === 'join');

            const fullMemberList = joinedChunk.map((evt: any) => {
              const userId = evt.state_key;
              const content = evt.content || {};
              let mAvatar = content.avatar_url;
              if (mAvatar) mAvatar = client.mxcUrlToHttp(mAvatar, 80, 80, 'crop', false, false);
              
              return {
                userId: userId,
                name: content.displayname || userId.split(':')[0],
                avatar: mAvatar,
                powerLevel: powerLevels[userId] || 0
              };
            });
            
            setMembers(fullMemberList.sort((a: any, b: any) => b.powerLevel - a.powerLevel));
          } else {
            updateMembersList(); // Fallback
          }
        }).catch((err: any) => {
          console.log("Error fetching full members list:", err);
          updateMembersList(); // Fallback on error
        });
      }
    }
  }, []);

  const handleLeaveRoom = () => {
    Alert.alert(
      "Rời phòng",
      "Bạn có chắc chắn muốn rời phòng này không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Rời",
          style: "destructive",
          onPress: async () => {
            const client = getMatrixClient();
            const roomId = currentActiveRoomId;
            if (client && roomId) {
              setIsLeaving(true);
              try {
                await client.leave(roomId);
                setScreen('chat_list');
              } catch (error) {
                console.error("Error leaving room:", error);
                Alert.alert("Lỗi", "Không thể rời phòng. Vui lòng thử lại.");
                setIsLeaving(false);
              }
            }
          }
        }
      ]
    );
  };

  const handlePlaceholder = () => {
    Alert.alert("Đang phát triển", "Tính năng này sẽ sớm ra mắt!");
  };

  return (
    <View className="flex-1 bg-black pt-12">
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 mb-2">
        <TouchableOpacity 
          className="w-10 h-10 rounded-full bg-[#1c1c1e] items-center justify-center"
          onPress={() => {
            setScreen('chat_single');
          }}
        >
          <ChevronLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <TouchableOpacity className="px-4 py-2 bg-[#1c1c1e] rounded-full">
          <Text className="text-white font-semibold">Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {!roomInfo ? (
          <View className="flex-1 items-center justify-center mt-20">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <>
            {/* Hero Section */}
            <View className="items-center mt-2 mb-6">
              <View className="w-[84px] h-[84px] rounded-full overflow-hidden bg-[#1c1c1e] items-center justify-center mb-3">
                {roomInfo.avatar ? (
                  <Image
                    source={getMatrixClient()?.getAccessToken() && roomInfo.avatar.includes('_matrix')
                      ? { uri: roomInfo.avatar, headers: { Authorization: `Bearer ${getMatrixClient()?.getAccessToken()}` } }
                      : { uri: roomInfo.avatar }}
                    className="w-full h-full"
                  />
                ) : (
                  <View className="w-full h-full flex items-center justify-center" style={{ backgroundColor: getAvatarColor(currentActiveRoomId || '') }}>
                    <Text className="text-[#17191C] text-3xl font-bold" style={{ includeFontPadding: false, textAlignVertical: 'center' }}>
                      {roomInfo.name ? roomInfo.name.charAt(0).toUpperCase() : '?'}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-white text-[22px] font-bold mb-1">{roomInfo.name}</Text>
              <Text className="text-[#8e8e93] text-sm">{roomInfo.membersCount} members</Text>
            </View>

            {/* Quick Actions Row */}
            <View className="flex-row justify-between px-4 mb-6">
              <TouchableOpacity className="flex-1 bg-[#1c1c1e] rounded-[16px] py-3 items-center mx-1" onPress={handlePlaceholder}>
                <Bell size={22} color="#3b82f6" />
                <Text className="text-[#3b82f6] text-xs mt-1 font-medium">mute</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-[#1c1c1e] rounded-[16px] py-3 items-center mx-1" onPress={handlePlaceholder}>
                <Search size={22} color="#3b82f6" />
                <Text className="text-[#3b82f6] text-xs mt-1 font-medium">search</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-[#1c1c1e] rounded-[16px] py-3 items-center mx-1" onPress={handleLeaveRoom}>
                <LogOut size={22} color="#3b82f6" />
                <Text className="text-[#3b82f6] text-xs mt-1 font-medium">leave</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-[#1c1c1e] rounded-[16px] py-3 items-center mx-1" onPress={handlePlaceholder}>
                <MoreHorizontal size={22} color="#3b82f6" />
                <Text className="text-[#3b82f6] text-xs mt-1 font-medium">more</Text>
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View className="flex-row justify-center mb-6">
              <View className="bg-[#1c1c1e] rounded-full flex-row p-0.5">
                <TouchableOpacity className="px-5 py-2 bg-[#4a4a4c] rounded-full">
                  <Text className="text-white font-semibold text-sm">Members</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-5 py-2 rounded-full" onPress={handlePlaceholder}>
                  <Text className="text-white font-semibold text-sm">Media</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-5 py-2 rounded-full" onPress={handlePlaceholder}>
                  <Text className="text-white font-semibold text-sm">Files</Text>
                </TouchableOpacity>
                <TouchableOpacity className="px-5 py-2 rounded-full" onPress={handlePlaceholder}>
                  <Text className="text-white font-semibold text-sm">Links</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Members List */}
            <View className="bg-[#1c1c1e] rounded-[24px] overflow-hidden mb-8">
              <TouchableOpacity className="flex-row items-center px-4 py-3 border-b border-white/5" onPress={() => setScreen('invite_members')}>
                <View className="w-12 h-12 items-center justify-center mr-3">
                  <UserPlus size={24} color="#3b82f6" />
                </View>
                <Text className="text-[#3b82f6] text-[17px]">Add Members</Text>
              </TouchableOpacity>

              {members.map((member, index) => (
                <View key={member.userId} className="flex-row items-center px-4 py-2 border-b border-white/5">
                  <View className="w-11 h-11 rounded-full overflow-hidden mr-3 bg-surface items-center justify-center">
                    {member.avatar ? (
                      <Image source={{ uri: member.avatar }} className="w-full h-full" />
                    ) : (
                      <View className="w-full h-full flex items-center justify-center" style={{ backgroundColor: getAvatarColor(member.userId) }}>
                        <Text className="text-[#17191C] text-lg font-bold" style={{ includeFontPadding: false, textAlignVertical: 'center' }}>
                          {member.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View className="flex-1 justify-center">
                    <Text className="text-white text-[17px] font-medium leading-5" numberOfLines={1}>
                      {member.name}
                    </Text>
                    <Text className="text-[#8e8e93] text-[13px] leading-4" numberOfLines={1}>
                      {member.userId.split(':')[0]}
                    </Text>
                  </View>
                  {member.powerLevel >= 100 && (
                    <View className="bg-[#3a284e] px-2 py-0.5 rounded ml-2">
                      <Text className="text-[#a855f7] text-[11px] font-medium">owner</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
