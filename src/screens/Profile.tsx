import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Switch, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, DeviceEventEmitter, Alert } from 'react-native';
import { Sparkles, Bell, Shield, Palette, LogOut, ChevronRight, Phone, Edit2, Check, User } from 'lucide-react-native';
import { AppScreen, HERO_AVATAR } from '../data';
import { getMatrixClient } from '../services/MatrixService';
import { Header } from '../components/Header';
import { matrixService } from '../services/MatrixService';

export function Profile({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);
  
  const [displayName, setDisplayName] = useState('Loading...');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(HERO_AVATAR);
  const [userId, setUserId] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneValue, setEditPhoneValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('focus_search', (screen) => {
      if (screen === 'profile') {
        Alert.alert("Tìm kiếm", "Tính năng tìm kiếm cài đặt đang được phát triển.");
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const client = getMatrixClient();
    if (!client) return;

    const loadProfile = async () => {
      try {
        const uid = client.getUserId();
        setUserId(uid);
        
        const profile = await client.getProfileInfo(uid);
        
        let name = profile.displayname || uid;
        let phone = '';
        
        // Parse format "Name [Phone]"
        let match = name.match(/(.+?)\s*\[(\d+)\]\s*$/);
        if (match) {
          name = match[1].trim();
          phone = match[2].trim();
          
          // Dọn dẹp lỗi kẹt nhiều số điện thoại cũ (ví dụ: Thanh [123] [456])
          while ((match = name.match(/(.+?)\s*\[(\d+)\]\s*$/))) {
            name = match[1].trim();
          }
        }

        setDisplayName(name);
        setPhoneNumber(phone);
        setEditPhoneValue(phone);

        if (profile.avatar_url) {
          setAvatarUrl(client.mxcUrlToHttp(profile.avatar_url, 256, 256, 'crop') || HERO_AVATAR);
        }
      } catch (err) {
        console.log("Error loading profile", err);
      }
    };
    loadProfile();
  }, []);

  const handleSavePhone = async () => {
    const client = getMatrixClient();
    if (!client) return;
    
    setIsSaving(true);
    try {
      const cleanPhone = editPhoneValue.replace(/\\D/g, '');
      const newDisplay = cleanPhone ? `${displayName} [${cleanPhone}]` : displayName;
      
      await client.setDisplayName(newDisplay);
      setPhoneNumber(cleanPhone);
      setIsEditingPhone(false);
    } catch (err) {
      console.log("Error saving profile", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <Header title="Trang cá nhân" blurIntensity={blurIntensity} setScreen={setScreen} />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Section */}
        <View className="flex-col items-center mb-8">
          <View className="relative p-1 bg-primary rounded-full mb-6 shadow-lg">
            <View className="w-32 h-32 rounded-full overflow-hidden border-4 border-background bg-surface items-center justify-center">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="w-full h-full" />
              ) : (
                <User size={48} color="#9ca3af" />
              )}
            </View>
          </View>
          <Text className="text-[24px] font-bold mb-1 text-white tracking-tight text-center">{displayName}</Text>
          <Text className="text-sm text-gray-400 opacity-80 mb-6">{userId}</Text>
          
          {/* 
          // Ẩn tạm thời tính năng cập nhật số điện thoại
          <View className="w-full bg-surface rounded-2xl p-4 border border-white/5">
            <Text className="text-muted text-xs uppercase font-bold tracking-wider mb-3">Thông tin liên hệ</Text>
            
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center mr-3">
                  <Phone size={18} color="#0DBD8B" />
                </View>
                
                {isEditingPhone ? (
                  <TextInput
                    className="flex-1 text-white text-base py-2 border-b border-primary/50"
                    value={editPhoneValue}
                    onChangeText={setEditPhoneValue}
                    placeholder="Nhập số điện thoại..."
                    placeholderTextColor="#6b7280"
                    keyboardType="phone-pad"
                    autoFocus
                  />
                ) : (
                  <View className="flex-1">
                    <Text className="text-white text-base">{phoneNumber || 'Chưa cập nhật'}</Text>
                    <Text className="text-muted text-xs mt-0.5">Dùng để đồng bộ danh bạ</Text>
                  </View>
                )}
              </View>

              {isEditingPhone ? (
                <TouchableOpacity 
                  onPress={handleSavePhone}
                  disabled={isSaving}
                  className="w-10 h-10 bg-primary rounded-full items-center justify-center ml-2"
                >
                  {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={18} color="#fff" />}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => setIsEditingPhone(true)}
                  className="w-10 h-10 bg-surface border border-white/10 rounded-full items-center justify-center ml-2"
                >
                  <Edit2 size={16} color="#0DBD8B" />
                </TouchableOpacity>
              )}
            </View>
          */}
        </View>

        {/* Stats Grid */}
        <View className="flex-row gap-4 mb-8 justify-between">
          <View className="bg-card p-4 rounded-xl flex-1 items-center justify-center text-center border border-white/5">
            <Text className="text-2xl font-semibold text-secondary mb-1">842</Text>
            <Text className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Friends</Text>
          </View>
          <View className="bg-card p-4 rounded-xl flex-1 items-center justify-center text-center border border-white/5">
            <Text className="text-2xl font-semibold text-primary mb-1">24</Text>
            <Text className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Groups</Text>
          </View>
          <View className="bg-card p-4 rounded-xl flex-1 items-center justify-center text-center border border-white/5">
            <Text className="text-2xl font-semibold text-tertiary mb-1">1.2k</Text>
            <Text className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Photos</Text>
          </View>
        </View>

        {/* Settings Menu */}
        <View className="space-y-4 relative z-10">
          <View className="bg-card rounded-2xl overflow-hidden border border-white/5">

            {/* Glow Toggle */}
            <View className="flex-row items-center justify-between p-4 border-b border-white/5">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-4">
                  <Sparkles size={20} color="#0DBD8B" />
                </View>
                <Text className="text-base text-white">Glow Intensity</Text>
              </View>
              <Switch value={true} trackColor={{ false: "#767577", true: "#0DBD8B" }} thumbColor={"#f4f3f4"} />
            </View>

            {/* Notifications */}
            <TouchableOpacity className="w-full flex-row items-center justify-between p-4 border-b border-white/5">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mr-4">
                  <Bell size={20} color="#03B381" />
                </View>
                <Text className="text-base text-white">Notifications</Text>
              </View>
              <ChevronRight size={20} color="#a0a0a0" />
            </TouchableOpacity>

            {/* Privacy */}
            <TouchableOpacity className="w-full flex-row items-center justify-between p-4 border-b border-white/5">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center mr-4">
                  <Shield size={20} color="#ffb1c4" />
                </View>
                <Text className="text-base text-white">Privacy</Text>
              </View>
              <ChevronRight size={20} color="#a0a0a0" />
            </TouchableOpacity>

            {/* Appearance */}
            <TouchableOpacity className="w-full flex-row items-center justify-between p-4 border-b border-white/5">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-4">
                  <Palette size={20} color="#0DBD8B" />
                </View>
                <Text className="text-base text-white">Appearance</Text>
              </View>
              <ChevronRight size={20} color="#a0a0a0" />
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity 
              onPress={async () => {
                await matrixService.clearCache();
                setScreen('login');
              }}
              className="w-full flex-row items-center justify-between p-4"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center mr-4">
                  <LogOut size={20} color="#ef4444" />
                </View>
                <Text className="text-base text-red-500">Logout</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8 items-center pb-24">
          <Text className="text-xs font-medium text-gray-500 opacity-40">Luminous v2.4.0-pro</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
