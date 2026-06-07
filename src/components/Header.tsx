import React from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus } from 'lucide-react-native';
import { AppScreen, USER_AVATAR } from '../data';

interface HeaderProps {
  title?: string;
  blurIntensity: number;
  setScreen?: (screen: AppScreen) => void;
  children?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

export function Header({ title, blurIntensity, setScreen, children, rightComponent }: HeaderProps) {
  return (
    <BlurView intensity={blurIntensity} tint="dark" className="absolute top-0 left-0 w-full z-50">
      <SafeAreaView>
        <View className="flex-row items-center justify-between px-5 py-3 min-h-[60px]" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
          {children ? children : (
            <>
              <View className="flex-1 items-start justify-center">
                {setScreen ? (
                  <TouchableOpacity className="w-10 h-10 rounded-full border-2 border-primary/30 overflow-hidden" onPress={() => setScreen('profile')}>
                    <Image source={{ uri: USER_AVATAR }} className="w-full h-full" />
                  </TouchableOpacity>
                ) : (
                  <View className="w-10 h-10 rounded-full border-2 border-primary/30 overflow-hidden">
                    <Image source={{ uri: USER_AVATAR }} className="w-full h-full" />
                  </View>
                )}
              </View>

              <View className="flex-[2] items-center justify-center">
                {title && <Text className="text-xl font-bold text-primary">{title}</Text>}
              </View>

              <View className="flex-1 items-end justify-center">
                {rightComponent ? rightComponent : (
                  <TouchableOpacity className="w-10 h-10 bg-surface/50 rounded-full flex items-center justify-center border border-white/10">
                    <Plus size={22} color="#dcb8ff" />
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </BlurView>
  );
}
