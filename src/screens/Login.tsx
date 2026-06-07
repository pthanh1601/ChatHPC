import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { User, Lock, LogIn } from 'lucide-react-native';
import { AppScreen } from '../data';
import { loginToMatrix, startMatrixSync } from './matrix';

export function Login({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập tên tài khoản và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await loginToMatrix(username, password);
      startMatrixSync();
      setScreen('chat_list'); // Chuyển sang màn hình chat sau khi đăng nhập thành công
    } catch (err) {
      console.error(err);
      setError('Đăng nhập thất bại. Kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        className="flex-1 px-8 justify-center" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
              onChangeText={(text) => { setUsername(text); setError(''); }}
              autoCapitalize="none"
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
              onChangeText={(text) => { setPassword(text); setError(''); }}
              secureTextEntry
            />
          </View>
        </View>

        {/* Error Message */}
        {error ? <Text className="text-[#c40060] text-sm text-center mt-4 font-semibold">{error}</Text> : null}

        {/* Login Button */}
        <TouchableOpacity 
          onPress={handleLogin} 
          disabled={isLoading}
          className={`w-full h-14 bg-primary rounded-2xl flex-row items-center justify-center mt-8 shadow-lg ${isLoading ? 'opacity-70' : ''}`}
        >
          {isLoading ? <ActivityIndicator color="#1a1f2e" /> : <Text className="text-[#1a1f2e] text-lg font-bold tracking-wide">CONNECT</Text>}
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
