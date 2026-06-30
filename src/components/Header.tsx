import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, SafeAreaView, Platform, StatusBar, Modal, Pressable, LayoutAnimation } from 'react-native';
import { BlurView } from 'expo-blur';
import { Plus, X, MessageSquarePlus, List } from 'lucide-react-native';
import { AppScreen, USER_AVATAR } from '../data';

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
              <TouchableOpacity 
                className="bg-card p-4 rounded-2xl flex-row items-center border border-white/5"
                onPress={() => {
                  setModalVisible(false);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  if (setScreen) setTimeout(() => setScreen('create_room' as AppScreen), 50);
                }}
              >
                <View className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mr-4">
                  <MessageSquarePlus size={24} color="#0DBD8B" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">Tạo phòng mới</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Bắt đầu một cuộc trò chuyện nhóm mới</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                className="bg-card p-4 rounded-2xl flex-row items-center border border-white/5"
                onPress={() => {
                  setModalVisible(false);
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  if (setScreen) setTimeout(() => setScreen('chat_list'), 50);
                }}
              >
                <View className="w-12 h-12 bg-secondary/20 rounded-full flex items-center justify-center mr-4">
                  <List size={24} color="#03B381" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-semibold text-white">Danh sách phòng</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Xem tất cả các phòng hiện có</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}
