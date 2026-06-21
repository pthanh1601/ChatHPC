import { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Sparkles, Bell, Shield, Palette, LogOut, ChevronRight } from 'lucide-react-native';
import { AppScreen, HERO_AVATAR } from '../data';
import { Header } from '../components/Header';
import { matrixService } from './matrix';

export function Profile({ setScreen }: { setScreen: (s: AppScreen) => void }) {
  const [blurIntensity, setBlurIntensity] = useState(0);

  return (
    <View className="flex-1 bg-background">
      <Header title="Profile" blurIntensity={blurIntensity} />

      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingTop: 120, paddingBottom: 120 }}
        onScroll={(e) => setBlurIntensity(Math.min(100, Math.max(0, e.nativeEvent.contentOffset.y)))}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <View className="flex-col items-center mb-8">
          <View className="relative p-1 bg-primary rounded-full mb-6 shadow-lg">
            <View className="w-32 h-32 rounded-full overflow-hidden border-4 border-background">
              <Image source={{ uri: HERO_AVATAR }} className="w-full h-full" />
            </View>
          </View>
          <Text className="text-[28px] font-bold mb-1 text-white tracking-tight">Alex Vanguard</Text>
          <Text className="text-base text-gray-400 opacity-80">Digital Architect & Visionary</Text>
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
                  <Sparkles size={20} color="#dcb8ff" />
                </View>
                <Text className="text-base text-white">Glow Intensity</Text>
              </View>
              <Switch value={true} trackColor={{ false: "#767577", true: "#dcb8ff" }} thumbColor={"#f4f3f4"} />
            </View>

            {/* Notifications */}
            <TouchableOpacity className="w-full flex-row items-center justify-between p-4 border-b border-white/5">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center mr-4">
                  <Bell size={20} color="#00fbfb" />
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
                  <Palette size={20} color="#dcb8ff" />
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
    </View>
  );
}
