import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { AlertOctagon, X } from 'lucide-react-native';

interface PopupProps {
  visible: boolean;
  message: string;
  onClose: () => void;
}

export function ErrorPopup({ visible, message, onClose }: PopupProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 60,
          useNativeDriver: true,
          bounciness: 12,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();

      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      // Thực hiện animation trượt lên đóng popup khi bị set false (kể cả khi gõ phím)
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: -100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
      scaleAnim.setValue(1);
    }
  }, [visible]);

  return (
    <Animated.View 
      style={{
        position: 'absolute', top: 0, left: 20, right: 20, zIndex: 9999,
        transform: [{ translateY: slideAnim }], opacity: opacityAnim,
      }}
      pointerEvents={visible ? "auto" : "none"}
    >
      <View className="bg-card flex-row items-center p-4 rounded-2xl border border-[#ef4444]/30 shadow-lg shadow-[#ef4444]/20">
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }} className="w-10 h-10 rounded-full bg-[#ef4444]/20 flex items-center justify-center mr-3">
          <AlertOctagon size={24} color="#ef4444" />
        </Animated.View>
        <View className="flex-1">
          <Text className="text-base font-bold text-white">Thất bại</Text>
          <Text className="text-sm text-gray-400 mt-0.5">{message}</Text>
        </View>
        <TouchableOpacity onPress={onClose} className="p-1">
          <X size={20} color="#a0a0a0" />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
