import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowLeft, Camera, Hash, Type, Lock, Globe, Check, UserPlus } from 'lucide-react-native';
import { AppScreen } from '../data';
import { getMatrixClient } from '../services/MatrixService';
import { Header } from '../components/Header';
import { SuccessPopup } from '../components/SuccessPopup';
import { ErrorPopup } from '../components/ErrorPopup';

export function CreateRoom({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [roomName, setRoomName] = useState('');
  const [topic, setTopic] = useState('');
  const [invitees, setInvitees] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blurIntensity, setBlurIntensity] = useState(0);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      setPopupMessage('Vui lòng nhập tên phòng chat.');
      setErrorVisible(true);
      return;
    }

    setIsLoading(true);

    // Phân tách và tự động định dạng ID thành Matrix ID chuẩn
    const inviteList = invitees
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0)
      .map(id => {
        let formattedId = id;
        if (!formattedId.startsWith('@')) {
          formattedId = '@' + formattedId;
        }
        if (!formattedId.includes(':')) {
          formattedId = formattedId + ':matrix.5hpc.com'; // Tự động thêm domain
        }
        return formattedId;
      });

    try {
      const client = getMatrixClient();
      if (!client) throw new Error("Chưa kết nối đến Matrix Server");

      // API tạo phòng của Matrix JS SDK
      await client.createRoom({
        name: roomName,
        topic: topic,
        visibility: isPublic ? 'public' : 'private',
        preset: isPublic ? 'public_chat' : 'private_chat',
        invite: inviteList.length > 0 ? inviteList : undefined,
      });

      setPopupMessage('Đã khởi tạo không gian chat thành công!');
      setSuccessVisible(true);
      setTimeout(() => setScreen('chat_list'), 1500);
    } catch (err: any) {
      console.log("Lỗi tạo phòng:", err);
      setPopupMessage(err.message || 'Có lỗi xảy ra khi tạo phòng. Vui lòng thử lại.');
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SuccessPopup visible={successVisible} message={popupMessage} onClose={() => setSuccessVisible(false)} />
      <ErrorPopup visible={errorVisible} message={popupMessage} onClose={() => setErrorVisible(false)} />

      <Header blurIntensity={blurIntensity}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => setScreen('chat_list')} className="w-10 h-10 items-center justify-center bg-surface/50 rounded-full border border-white/10 mr-4">
            <ArrowLeft size={22} color="#dcb8ff" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-primary">Tạo phòng mới</Text>
        </View>
      </Header>

      <ScrollView 
        className="flex-1 px-5"
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-[100px] pb-8">
          {/* Upload Avatar */}
          <View className="items-center mb-8">
            <TouchableOpacity className="w-28 h-28 bg-surface rounded-full flex items-center justify-center border-2 border-dashed border-white/20 relative overflow-hidden">
              <View className="absolute inset-0 bg-primary/5" />
              <Camera size={32} color="#a0a0a0" />
              <Text className="text-[10px] text-gray-400 font-medium mt-2">Thêm ảnh</Text>
            </TouchableOpacity>
          </View>

          {/* Form Inputs */}
          <View className="flex-col gap-5 mb-8">
            <View className="bg-card rounded-2xl p-1.5 flex-row items-center border border-white/10 h-14 shadow-sm">
              <View className="w-12 h-12 flex items-center justify-center">
                <Type size={20} color="#a0a0a0" />
              </View>
              <TextInput
                placeholder="Tên phòng chat (Bắt buộc)"
                placeholderTextColor="#6b7280"
                className="flex-1 text-base text-white h-full px-2"
                value={roomName}
                onChangeText={(text) => { setRoomName(text); setErrorVisible(false); }}
              />
            </View>

            <View className="bg-card rounded-2xl p-1.5 flex-row items-center border border-white/10 h-14 shadow-sm">
              <View className="w-12 h-12 flex items-center justify-center">
                <Hash size={20} color="#a0a0a0" />
              </View>
              <TextInput
                placeholder="Chủ đề (Không bắt buộc)"
                placeholderTextColor="#6b7280"
                className="flex-1 text-base text-white h-full px-2"
                value={topic}
                onChangeText={setTopic}
              />
            </View>

            <View className="bg-card rounded-2xl p-1.5 flex-row items-center border border-white/10 h-14 shadow-sm">
              <View className="w-12 h-12 flex items-center justify-center">
                <UserPlus size={20} color="#a0a0a0" />
              </View>
              <TextInput
                placeholder="Mời bạn bè..."
                placeholderTextColor="#6b7280"
                className="flex-1 text-base text-white h-full px-2"
                value={invitees}
                onChangeText={setInvitees}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Room Visibility */}
          <Text className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 ml-1">Quyền riêng tư</Text>
          <View className="flex-col gap-3">
            {/* Private Toggle */}
            <TouchableOpacity 
              onPress={() => setIsPublic(false)} 
              className={`p-4 rounded-2xl border ${!isPublic ? 'border-primary bg-primary/5' : 'border-white/5 bg-card'} flex-row items-center`}
            >
              <View className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${!isPublic ? 'bg-primary/20' : 'bg-surface'}`}>
                <Lock size={22} color={!isPublic ? '#dcb8ff' : '#a0a0a0'} />
              </View>
              <View className="flex-1">
                <Text className={`text-base font-semibold ${!isPublic ? 'text-primary' : 'text-white'}`}>Phòng riêng tư</Text>
                <Text className="text-xs text-gray-400 mt-1">Chỉ những thành viên được mời mới có thể xem và tham gia trò chuyện</Text>
              </View>
              {!isPublic && <Check size={20} color="#dcb8ff" />}
            </TouchableOpacity>

            {/* Public Toggle */}
            <TouchableOpacity 
              onPress={() => setIsPublic(true)} 
              className={`p-4 rounded-2xl border ${isPublic ? 'border-secondary bg-secondary/5' : 'border-white/5 bg-card'} flex-row items-center`}
            >
              <View className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${isPublic ? 'bg-secondary/20' : 'bg-surface'}`}>
                <Globe size={22} color={isPublic ? '#00fbfb' : '#a0a0a0'} />
              </View>
              <View className="flex-1">
                <Text className={`text-base font-semibold ${isPublic ? 'text-secondary' : 'text-white'}`}>Phòng công khai</Text>
                <Text className="text-xs text-gray-400 mt-1">Bất kỳ ai trên máy chủ cũng có thể tìm thấy và tham gia phòng này</Text>
              </View>
              {isPublic && <Check size={20} color="#00fbfb" />}
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Floating Submit Button */}
      <View className="px-5 pb-8 pt-4 bg-background">
        <TouchableOpacity 
          onPress={handleCreateRoom}
          disabled={isLoading}
          className={`h-14 bg-primary rounded-2xl flex-row items-center justify-center shadow-lg shadow-primary/30 ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? <ActivityIndicator color="#1a1f2e" /> : <Text className="text-[#1a1f2e] text-lg font-bold tracking-wide">TẠO PHÒNG</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
