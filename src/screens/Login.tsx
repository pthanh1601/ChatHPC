import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { User, Lock, LogIn } from 'lucide-react-native';
import { AppScreen } from '../data';
import { loginToMatrix, startMatrixSync } from '../services/MatrixService';
import { SuccessPopup } from '../components/SuccessPopup';
import { ErrorPopup } from '../components/ErrorPopup';

export function Login({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorVisible, setErrorVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setPopupMessage('Vui lòng nhập tên tài khoản và mật khẩu.');
      setErrorVisible(true);
      return;
    }

    setIsLoading(true);

    try {
      await loginToMatrix(username, password);
      startMatrixSync();
      setPopupMessage('Đăng nhập thành công!');
      setSuccessVisible(true);
      setTimeout(() => setScreen('chat_list'), 1500); // Trì hoãn một chút để hiển thị animation thành công
    } catch (err) {
      console.log("Lỗi đăng nhập:", err);
      setPopupMessage('Đăng nhập thất bại. Kiểm tra lại thông tin.');
      setErrorVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <SuccessPopup visible={successVisible} message={popupMessage} onClose={() => setSuccessVisible(false)} />
      <ErrorPopup visible={errorVisible} message={popupMessage} onClose={() => setErrorVisible(false)} />

      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center border border-primary/40 mb-6 shadow-xl">
              <LogIn size={40} color="#dcb8ff" />
            </View>
            <Text className="text-4xl font-extrabold text-white tracking-widest uppercase">Luminous</Text>
            <Text className="text-sm text-secondary/80 mt-2 font-medium tracking-widest uppercase">Establish Neural Link</Text>
          </View>

          {/* Input Form */}
          <View className="flex-col gap-4">
            <View className="bg-card rounded-2xl p-1.5 flex-row items-center border border-white/10 h-14">
              <View className="w-12 h-12 flex items-center justify-center">
                <User size={22} color="#a0a0a0" />
              </View>
              <TextInput
                placeholder="Username"
                placeholderTextColor="#a0a0a0"
                className="flex-1 text-base text-white h-full px-2"
                value={username}
                onChangeText={(text) => { setUsername(text); setErrorVisible(false); }}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View className="bg-card rounded-2xl p-1.5 flex-row items-center border border-white/10 h-14">
              <View className="w-12 h-12 flex items-center justify-center">
                <Lock size={22} color="#a0a0a0" />
              </View>
              <TextInput
                placeholder="Password"
                placeholderTextColor="#a0a0a0"
                className="flex-1 text-base text-white h-full px-2"
                value={password}
                onChangeText={(text) => { setPassword(text); setErrorVisible(false); }}
                secureTextEntry
              />
            </View>
          </View>

          {/* Login Button */}
          <TouchableOpacity 
            onPress={handleLogin} 
            disabled={isLoading}
            className={`w-full h-14 bg-primary rounded-2xl flex-row items-center justify-center mt-8 shadow-lg ${isLoading ? 'opacity-70' : ''}`}
          >
            {isLoading ? <ActivityIndicator color="#1a1f2e" /> : <Text className="text-[#1a1f2e] text-lg font-bold tracking-wide">ĐĂNG NHẬP</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
