import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean; // Nếu true, nút xác nhận sẽ có màu cảnh báo (đỏ)
}

export function ConfirmModal({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  isDanger = false
}: ConfirmModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      {/* Bấm ra ngoài vùng tối sẽ tự động đóng Modal */}
      <Pressable 
        className="flex-1 justify-center items-center bg-black/60 px-5"
        onPress={onCancel}
      >
        {/* Chặn sự kiện bấm (propagation) để không bị đóng khi người dùng thao tác trong bảng */}
        <Pressable 
          className="bg-card w-full rounded-3xl p-6 border border-white/10 shadow-2xl"
          onPress={(e) => e.stopPropagation()} 
        >
          <Text className="text-xl font-bold text-white mb-3">{title}</Text>
          <Text className="text-base text-gray-400 mb-8 leading-6">{message}</Text>
          
          <View className="flex-row justify-end items-center gap-3">
            <TouchableOpacity 
              className="px-5 py-2.5 rounded-xl bg-surface border border-white/5"
              onPress={onCancel}
            >
              <Text className="text-white font-medium">{cancelText}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              className={`px-5 py-2.5 rounded-xl ${isDanger ? 'bg-red-500/80' : 'bg-primary'}`}
              onPress={onConfirm}
            >
              <Text className={`font-bold ${isDanger ? 'text-white' : 'text-background'}`}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
