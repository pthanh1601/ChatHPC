import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, Modal, Pressable, LayoutAnimation } from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus, X, MessageSquarePlus, List, User, Hash } from 'lucide-react-native';
import { AppScreen, USER_AVATAR } from '../data';
import { setCurrentActiveRoomId } from '../services/MatrixService';

interface HeaderProps {
  title?: string;
  blurIntensity: number;
  setScreen?: (screen: AppScreen) => void;
  children?: React.ReactNode;
  rightComponent?: React.ReactNode;
}

export function Header({ title, blurIntensity, setScreen, children, rightComponent }: HeaderProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <BlurView intensity={blurIntensity} tint="dark" className="absolute top-0 left-0 w-full z-50">
        <SafeAreaView>
          <View className="flex-row items-center justify-between px-5 py-3 min-h-[60px]" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
            {children ? children : (
              <>
                <View className="flex-1 items-start justify-center">
                  {setScreen ? (
                    <TouchableOpacity className="w-10 h-10 rounded-full border-2 border-primary/30 overflow-hidden" onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setScreen('profile');
                    }}>
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
                    <TouchableOpacity
                      className="w-10 h-10 bg-surface/50 rounded-full flex items-center justify-center border border-white/10"
                      onPress={() => setModalVisible(true)}
                    >
                      <Plus size={22} color="#0DBD8B" />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </BlurView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={() => setModalVisible(false)}
        >
          <View onStartShouldSetResponder={() => true} className="bg-background rounded-t-3xl pt-5 pb-10 px-5 border-t border-white/10 shadow-2xl">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-white">Bắt đầu trò chuyện</Text>
              <TouchableOpacity
                className="w-8 h-8 bg-surface rounded-full items-center justify-center border border-white/10"
                onPress={() => setModalVisible(false)}
              >
                <X size={20} color="#a0a0a0" />
              </TouchableOpacity>
            </View>

            <View className="gap-4">

              {/* Bắt đầu chat */}
              <TouchableOpacity
                className="bg-card p-4 rounded-2xl flex-row items-center border border-white/5"
                onPress={() => {
                  setModalVisible(false);
                  setCurrentActiveRoomId(null); // Clear active room so we create a new DM
                  setScreen('invite_members');
                }}
              >
                <View className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mr-4">
                  <User size={24} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">Bắt đầu chat</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Trò chuyện trực tiếp 1-1</Text>
                </View>
              </TouchableOpacity>

              {/* Tạo phòng */}
              <TouchableOpacity
                className="bg-card p-4 rounded-2xl flex-row items-center border border-white/5"
                onPress={() => {
                  setModalVisible(false);
                  if (setScreen) {
                    setTimeout(() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setScreen('create_room' as AppScreen);
                    }, 400);
                  }
                }}
              >
                <View className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                  <Hash size={24} color="#0DBD8B" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">Tạo phòng</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Tạo không gian trò chuyện nhóm</Text>
                </View>
              </TouchableOpacity>

              {/* Khám phá phòng */}
              <TouchableOpacity
                className="bg-card p-4 rounded-2xl flex-row items-center border border-white/5"
                onPress={() => {
                  setModalVisible(false);
                  // Thêm tính năng Khám phá phòng sau
                }}
              >
                <View className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mr-4">
                  <List size={24} color="#a855f7" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">Khám phá phòng</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Tìm kiếm các phòng công khai</Text>
                </View>
              </TouchableOpacity>

            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
