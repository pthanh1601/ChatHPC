import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar } from 'react-native';
import { ArrowLeft, Phone, Video, CheckCheck, Plus, Mic, Send } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { AppScreen, CONTACTS, MEDIA } from '../data';

export function ChatSingle({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);

  return (
    <KeyboardAvoidingView className="flex-1 bg-background relative" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <BlurView intensity={blurIntensity} tint="dark" className="absolute top-0 left-0 w-full z-50">
        <SafeAreaView>
          <View className="flex-row items-center justify-between px-5 py-3" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
            <View className="flex-row items-center gap-4">
              <TouchableOpacity onPress={() => setScreen('chat_list')}>
                <ArrowLeft size={24} color="#dcb8ff" />
              </TouchableOpacity>
              <View className="flex-row items-center gap-3">
                <View className="relative">
                  <View className="w-10 h-10 rounded-full overflow-hidden border-2 border-secondary">
                    <Image source={{ uri: CONTACTS.kael.avatar }} className="w-full h-full" />
                  </View>
                  <View className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-background"></View>
                </View>
                <View>
                  <Text className="text-xl font-bold text-primary">{CONTACTS.kael.name}</Text>
                  <Text className="text-xs font-medium text-secondary/80">Active now</Text>
                </View>
              </View>
            </View>
            <View className="flex-row items-center gap-6">
              <TouchableOpacity>
                <Phone size={24} color="#a0a0a0" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Video size={24} color="#a0a0a0" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </BlurView>

      <ScrollView 
        className="flex-1 px-5" 
        showsVerticalScrollIndicator={false}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        <View className="flex-col gap-6 pt-[120px] pb-4">
        {/* Recipient Message */}
        <View className="flex-col items-start max-w-[85%]">
          <View className="bg-card rounded-xl rounded-tl-none p-4 shadow-sm border border-white/5">
            <Text className="text-base text-white">The nebula rendering engine is finally stable. Did you check the latest luminosity parameters?</Text>
          </View>
          <Text className="text-[10px] mt-1 text-gray-500 ml-1">14:02 PM</Text>
        </View>

        {/* User Message */}
        <View className="flex-col items-end max-w-[85%] self-end">
          <View className="bg-bubble rounded-xl rounded-tr-none p-4 shadow-lg">
            <Text className="text-base text-white">Not yet. Does it support the real-time ray-traced shadows on the glass textures?</Text>
          </View>
          <View className="flex-row items-center gap-1 mt-1 mr-1">
            <Text className="text-[10px] text-gray-500">14:05 PM</Text>
            <CheckCheck size={14} color="#00fbfb" />
          </View>
        </View>

        {/* Date Separator */}
        <View className="flex-row items-center justify-center gap-4 my-2 opacity-40">
          <View className="h-[1px] flex-1 bg-gray-500"></View>
          <Text className="text-xs font-medium uppercase tracking-widest text-gray-400">Today</Text>
          <View className="h-[1px] flex-1 bg-gray-500"></View>
        </View>

        {/* Recipient Message with Image */}
        <View className="flex-col items-start max-w-[85%] mb-4">
          <View className="bg-card rounded-xl rounded-tl-none p-4 shadow-sm border border-white/5">
            <Text className="text-base text-white">Yes. The light refraction index is buttery smooth. Check this out...</Text>
          </View>
          <View className="mt-2 bg-card rounded-xl p-1 border border-white/5 overflow-hidden w-full">
            <Image source={{ uri: MEDIA.abstract }} className="w-full h-48 rounded-lg" />
          </View>
          <Text className="text-[10px] mt-1 text-gray-500 ml-1">14:08 PM</Text>
        </View>

        {/* User Message */}
        <View className="flex-col items-end max-w-[85%] self-end mb-10">
          <View className="bg-bubble rounded-xl rounded-tr-none p-4 shadow-lg">
            <Text className="text-base text-white">That's insane! 🤯 Sending the sync key now.</Text>
          </View>
          <View className="flex-row items-center gap-1 mt-1 mr-1">
            <Text className="text-[10px] text-gray-500">14:10 PM</Text>
            <CheckCheck size={14} color="#00fbfb" />
          </View>
        </View>
        </View>
      </ScrollView>

      <View className="w-full z-50 px-5 pb-6 pt-4 bg-background/90">
        <View className="bg-card rounded-full p-1.5 flex-row items-center border border-white/10">
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center">
            <Plus size={28} color="#dcb8ff" />
          </TouchableOpacity>
          <View className="flex-1 h-12 bg-background/50 rounded-full justify-center px-4 mx-1">
            <TextInput 
              placeholder="Type your message..." 
              placeholderTextColor="#a0a0a0" 
              className="w-full text-base text-white p-0" 
              style={{ 
                includeFontPadding: false, 
                textAlignVertical: 'center',
                paddingVertical: 0,
                marginTop: -4
              }}
            />
          </View>
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center mr-1">
            <Mic size={24} color="#00fbfb" />
          </TouchableOpacity>
          <TouchableOpacity className="w-12 h-12 flex items-center justify-center rounded-full bg-bubble">
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
