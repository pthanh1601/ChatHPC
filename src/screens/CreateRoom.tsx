import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Keyboard, Switch } from 'react-native';
import { Camera, Check } from 'lucide-react-native';
import { AppScreen } from '../data';
import { getMatrixClient } from '../services/MatrixService';
import { SuccessPopup } from '../components/SuccessPopup';
import { ErrorPopup } from '../components/ErrorPopup';

interface CreateRoomProps {
  setScreen: (screen: AppScreen) => void;
}

export function CreateRoom({ setScreen }: CreateRoomProps) {
  const [roomName, setRoomName] = useState('');
  const [topic, setTopic] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isEncrypted, setIsEncrypted] = useState(true);
  const [roomAlias, setRoomAlias] = useState('');
  const [showInDirectory, setShowInDirectory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const handleCreateRoom = async () => {
    Keyboard.dismiss(); // Ẩn bàn phím ngay lập tức để tránh UI bị kẹt

    if (!roomName.trim()) {
      return; // Khóa nút Tạo mới nếu chưa có tên
    }

    setIsLoading(true);

    try {
      const client = getMatrixClient();
      if (!client) throw new Error("Chưa kết nối đến Matrix Server");

      // Thiết lập mã hóa theo thiết lập của người dùng
      const initialState = isEncrypted ? [
        { type: "m.room.encryption", state_key: "", content: { algorithm: "m.megolm.v1.aes-sha2" } }
      ] : undefined;

      // API tạo phòng của Matrix JS SDK, bọc trong Promise.race để chống treo API
      const createPromise = client.createRoom({
        name: roomName.trim(),
        topic: topic.trim() || undefined, // Bỏ qua nếu rỗng
        room_alias_name: isPublic && roomAlias.trim() ? roomAlias.trim() : undefined,
        visibility: (isPublic && showInDirectory) ? 'public' : 'private',
        preset: isPublic ? 'public_chat' : 'private_chat',
        initial_state: initialState,
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Yêu cầu tạo phòng quá hạn (Server không phản hồi)")), 10000)
      );

      await Promise.race([createPromise, timeoutPromise]);

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

  const isFormValid = roomName.trim().length > 0;

  return (
    <KeyboardAvoidingView className="flex-1 bg-[#15191E]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SuccessPopup visible={successVisible} message={popupMessage} onClose={() => setSuccessVisible(false)} />
      <ErrorPopup visible={errorVisible} message={popupMessage} onClose={() => setErrorVisible(false)} />

      {/* Header phong cách Element */}
      <View className="pt-14 pb-4 px-4 flex-row items-center justify-between border-b border-white/5 bg-[#1A1D20]">
        <TouchableOpacity onPress={() => setScreen('chat_list')} className="w-20">
          <Text className="text-[#0DBD8B] text-[17px]">Huỷ</Text>
        </TouchableOpacity>

        <Text className="text-[17px] font-bold text-white flex-1 text-center">Phòng mới</Text>

        <TouchableOpacity
          onPress={handleCreateRoom}
          disabled={!isFormValid || isLoading}
          className="w-20 items-end"
        >
          {isLoading ? (
            <ActivityIndicator color="#0DBD8B" size="small" />
          ) : (
            <Text className={`text-[17px] ${isFormValid ? 'text-[#0DBD8B]' : 'text-gray-500'}`}>Tạo mới</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="pb-10 pt-6">
          {/* Upload Avatar */}
          <View className="items-center mb-6">
            <TouchableOpacity className="w-24 h-24 bg-[#1C1C1E] rounded-full flex items-center justify-center relative overflow-hidden shadow-lg shadow-black/20 border border-white/5">
              <Camera size={32} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Tên phòng */}
          <Text className="text-[13px] text-gray-400 ml-4 mb-2 mt-4">Tên phòng</Text>
          <View className="bg-[#1C1C1E] px-4 mx-4 rounded-xl border border-white/5">
            <TextInput
              placeholder="Tên"
              placeholderTextColor="#6b7280"
              className="text-[17px] text-white h-12"
              value={roomName}
              onChangeText={(text) => { setRoomName(text); setErrorVisible(false); }}
            />
          </View>

          {/* Chủ đề phòng */}
          <Text className="text-[13px] text-gray-400 ml-4 mb-2 mt-6">Chủ đề phòng (tùy chọn)</Text>
          <View className="bg-[#1C1C1E] px-4 mx-4 rounded-xl border border-white/5">
            <TextInput
              placeholder="Chủ đề"
              placeholderTextColor="#6b7280"
              className="text-[17px] text-white h-12"
              value={topic}
              onChangeText={setTopic}
            />
          </View>

          {/* Mã hóa phòng */}
          <Text className="text-[13px] text-gray-400 ml-4 mb-2 mt-6">Mã hóa phòng</Text>
          <View className="bg-[#1C1C1E] px-4 mx-4 py-1.5 rounded-xl border border-white/5 flex-row items-center min-h-[48px]">
            <Text className="text-[17px] text-white flex-1 mr-4">Bật mã hóa</Text>
            <Switch
              value={isEncrypted}
              onValueChange={setIsEncrypted}
              trackColor={{ true: "#0DBD8B" }}
            />
          </View>
          <Text className="text-[13px] text-gray-500 ml-4 mt-2">Mã hóa không thể tắt sau này.</Text>

          {/* Loại phòng */}
          <Text className="text-[13px] text-gray-400 ml-4 mb-2 mt-6">Loại phòng</Text>
          <View className="bg-[#1C1C1E] mx-4 rounded-xl overflow-hidden border border-white/5">
            <TouchableOpacity
              onPress={() => setIsPublic(false)}
              className="px-4 py-3.5 flex-row justify-between items-center border-b border-white/5"
            >
              <Text className="text-[17px] text-white">Phòng riêng</Text>
              {!isPublic && <Check size={20} color="#0DBD8B" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsPublic(true)}
              className="px-4 py-3.5 flex-row justify-between items-center"
            >
              <Text className="text-[17px] text-white">Phòng công cộng</Text>
              {isPublic && <Check size={20} color="#0DBD8B" />}
            </TouchableOpacity>
          </View>
          <Text className="text-[13px] text-gray-500 ml-4 mt-2 mb-4">
            {!isPublic ? "Only people invited can find and join." : "Only people invited can find and join, not just people in Space name."}
          </Text>

          {/* Cài đặt riêng cho Phòng công cộng */}
          {isPublic && (
            <>
              <Text className="text-[13px] text-gray-400 ml-4 mb-2 mt-4 uppercase">PROMOTION</Text>
              <View className="bg-[#1C1C1E] px-4 mx-4 py-1.5 rounded-xl border border-white/5 flex-row items-center min-h-[48px]">
                <Text className="text-[17px] text-white flex-1 mr-4" numberOfLines={2}>Hiển thị phòng trong thư mục</Text>
                <Switch
                  value={showInDirectory}
                  onValueChange={setShowInDirectory}
                  trackColor={{ true: "#0DBD8B" }}
                />
              </View>
              <Text className="text-[13px] text-gray-500 ml-4 mt-2">This will help people find and join.</Text>

              <Text className="text-[13px] text-gray-400 ml-4 mb-2 mt-6">Địa chỉ phòng</Text>
              <View className="bg-[#1C1C1E] px-4 mx-4 rounded-xl border border-white/5 h-12 justify-center">
                <View className="flex-row items-center">
                  <Text className="text-gray-400 text-[17px] mr-1">#</Text>
                  <TextInput
                    placeholder="ten-phong"
                    placeholderTextColor="#6b7280"
                    className="text-[17px] text-white flex-1"
                    value={roomAlias}
                    onChangeText={(text) => setRoomAlias(text.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    autoCapitalize="none"
                  />
                  <Text className="text-gray-400 text-[17px] ml-1">:matrix.org</Text>
                </View>
              </View>

              <View className="mb-10" />
            </>
          )}

          {!isPublic && <View className="mb-10" />}

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
