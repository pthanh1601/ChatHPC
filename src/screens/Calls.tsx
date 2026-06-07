import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { AppScreen, CONTACTS, USER_AVATAR } from '../data';

export function Calls({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);

  return (
    <View className="flex-1 bg-background">
      <BlurView intensity={blurIntensity} tint="dark" className="absolute top-0 left-0 w-full z-50">
        <SafeAreaView>
          <View className="flex-row items-center justify-between px-5 py-3" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity className="w-10 h-10 rounded-full border-2 border-primary/30 overflow-hidden" onPress={() => setScreen('profile')}>
                <Image source={{ uri: USER_AVATAR }} className="w-full h-full" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-primary">Cuộc gọi</Text>
            </View>
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView 
        className="flex-1 px-5" 
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        <Text className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Gần đây</Text>
        
        <View className="gap-4">
          {/* Missed Call */}
          <TouchableOpacity className="bg-card rounded-2xl p-4 pt-2 flex-row items-center gap-3 relative overflow-hidden border border-white/5">
            <View className="relative">
              <View className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                <Image source={{ uri: CONTACTS.aria.avatar }} className="w-full h-full" />
              </View>
            </View>
            <View className="flex-1 justify-center ml-1">
              <Text className="font-bold text-[15px] text-[#ef4444] mb-1" style={{ includeFontPadding: false }}>{CONTACTS.aria.name}</Text>
              <View className="flex-row items-center gap-1.5">
                <PhoneMissed size={14} color="#ef4444" />
                <Text className="text-sm text-gray-400" style={{ includeFontPadding: false }}>Hôm nay, 14:30</Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/5">
              <Phone size={18} color="#dcb8ff" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Outgoing Video Call */}
          <TouchableOpacity className="bg-card rounded-2xl p-4 flex-row items-center gap-3 relative border border-white/5">
            <View className="relative">
              <View className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                <Image source={{ uri: CONTACTS.kael.avatar }} className="w-full h-full" />
              </View>
            </View>
            <View className="flex-1 justify-center ml-1">
              <Text className="font-bold text-[15px] text-white mb-1" style={{ includeFontPadding: false }}>{CONTACTS.kael.name}</Text>
              <View className="flex-row items-center gap-1.5">
                <PhoneOutgoing size={14} color="#a0a0a0" />
                <Text className="text-sm text-gray-400" style={{ includeFontPadding: false }}>Hôm qua, 09:15</Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/5">
              <Video size={18} color="#00fbfb" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Incoming Call */}
          <TouchableOpacity className="bg-card rounded-2xl p-4 flex-row items-center gap-3 relative border border-white/5">
            <View className="relative">
              <View className="w-12 h-12 rounded-full overflow-hidden border border-white/10">
                <Image source={{ uri: CONTACTS.zenix.avatar }} className="w-full h-full" />
              </View>
            </View>
            <View className="flex-1 justify-center ml-1">
              <Text className="font-bold text-[15px] text-white mb-1" style={{ includeFontPadding: false }}>{CONTACTS.zenix.name}</Text>
              <View className="flex-row items-center gap-1.5">
                <PhoneIncoming size={14} color="#a0a0a0" />
                <Text className="text-sm text-gray-400" style={{ includeFontPadding: false }}>Thứ 3, 11:20</Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-white/5">
              <Phone size={18} color="#dcb8ff" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
