import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar } from 'react-native';
import { Search, Plus, CheckCheck, MessageSquarePlus } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { AppScreen, CONTACTS, USER_AVATAR } from '../data';

export function ChatList({ setScreen }: { setScreen: (s: AppScreen) => void }) {
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
              <Text className="text-2xl font-bold text-primary">Luminous</Text>
            </View>
            <TouchableOpacity>
              <Search size={24} color="#dcb8ff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView 
        className="flex-1 px-5" 
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        <View className="relative mb-8">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-4 pb-2">
            <View className="flex-col items-center gap-2 mr-4">
              <View className="w-16 h-16 rounded-full p-[2px]">
                <View className="w-full h-full rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center">
                  <Plus size={24} color="#a0a0a0" />
                </View>
              </View>
              <Text className="text-xs font-medium text-gray-400">Your Story</Text>
            </View>

            {[CONTACTS.aria, CONTACTS.kael, CONTACTS.zenix].map((contact, i) => (
              <TouchableOpacity key={i} className="flex-col items-center gap-2 mr-4" onPress={() => setScreen('chat_single')}>
                <View className="w-16 h-16 rounded-full p-[2px] bg-primary">
                  <View className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                    <Image source={{ uri: contact.avatar }} className="w-full h-full" />
                  </View>
                </View>
                <Text className="text-xs font-medium text-primary">{contact.name.split(' ')[0]}</Text>
              </TouchableOpacity>
            ))}
            
            <TouchableOpacity className="flex-col items-center gap-2 opacity-80 mr-4">
              <View className="w-16 h-16 rounded-full p-[2px] bg-gray-600">
                <View className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                  <Image source={{ uri: CONTACTS.nova.avatar }} className="w-full h-full opacity-50" />
                </View>
              </View>
              <Text className="text-xs font-medium text-gray-400">Nova</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View className="flex-row p-1 bg-surface rounded-xl border border-white/5 mb-8">
          <TouchableOpacity className="flex-1 py-2 rounded-lg bg-primary items-center">
            <Text className="text-sm font-semibold text-surface">Direct</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 py-2 rounded-lg items-center" onPress={() => setScreen('chat_group')}>
            <Text className="text-sm font-semibold text-gray-400">Groups</Text>
          </TouchableOpacity>
        </View>

        <View className="gap-4 pb-20">
          {/* Chat Card 1 */}
          <TouchableOpacity onPress={() => setScreen('chat_single')} className="bg-card rounded-2xl p-4 flex-row items-center gap-3 relative overflow-hidden border border-white/5">
            <View className="absolute top-0 left-0 w-1 h-full bg-secondary"></View>
            <View className="relative">
              <View className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                <Image source={{ uri: CONTACTS.aria.avatar }} className="w-full h-full" />
              </View>
              <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-background"></View>
            </View>
            <View className="flex-1 justify-center ml-1">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="font-bold text-[15px] text-white" style={{ includeFontPadding: false }}>{CONTACTS.aria.name}</Text>
                <Text className="text-[11px] text-primary font-semibold" style={{ includeFontPadding: false }}>12:45 PM</Text>
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <Text className="flex-1 text-sm text-gray-400" numberOfLines={1} style={{ includeFontPadding: false }}>The neural link is established. Ready for transmission?</Text>
                <View className="bg-[#c40060] px-1.5 h-5 min-w-[20px] rounded-full flex items-center justify-center">
                  <Text className="text-[10px] text-white font-bold" style={{ includeFontPadding: false }}>3</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {/* Chat Card 2 */}
          <TouchableOpacity onPress={() => setScreen('chat_single')} className="bg-card rounded-2xl p-4 flex-row items-center gap-3 relative border border-white/5">
            <View className="relative">
              <View className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                <Image source={{ uri: CONTACTS.kael.avatar }} className="w-full h-full" />
              </View>
            </View>
            <View className="flex-1 justify-center ml-1">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="font-bold text-[15px] text-white" style={{ includeFontPadding: false }}>{CONTACTS.kael.name}</Text>
                <Text className="text-[11px] text-gray-500 font-semibold" style={{ includeFontPadding: false }}>09:12 AM</Text>
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <Text className="flex-1 text-sm text-gray-400" numberOfLines={1} style={{ includeFontPadding: false }}>That design iteration looks sharp. Let's sync later.</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Chat Card 3 */}
          <TouchableOpacity className="bg-card rounded-2xl p-4 flex-row items-center gap-3 relative border border-white/5">
            <View className="relative">
              <View className="w-14 h-14 rounded-full overflow-hidden border border-white/10">
                <Image source={{ uri: CONTACTS.zenix.avatar }} className="w-full h-full" />
              </View>
              <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-secondary rounded-full border-2 border-background"></View>
            </View>
            <View className="flex-1 justify-center ml-1">
              <View className="flex-row justify-between items-center mb-1.5">
                <Text className="font-bold text-[15px] text-white" style={{ includeFontPadding: false }}>{CONTACTS.zenix.name}</Text>
                <Text className="text-[11px] text-gray-500 font-semibold" style={{ includeFontPadding: false }}>Yesterday</Text>
              </View>
              <View className="flex-row items-center justify-between gap-4">
                <View className="flex-1 flex-row items-center gap-1.5">
                  <CheckCheck size={14} color="#00fbfb" />
                  <Text className="flex-1 text-sm text-gray-400" numberOfLines={1} style={{ includeFontPadding: false }}>Sent the encrypted file to your vault.</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <TouchableOpacity onPress={() => setScreen('chat_group')} className="absolute bottom-28 right-6 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center z-40 shadow-xl">
        <MessageSquarePlus size={28} color="#1a1f2e" />
      </TouchableOpacity>
    </View>
  );
}
