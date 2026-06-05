import React from 'react';
import { View, StatusBar } from 'react-native';

export function SafeScreen({ children }: { children: React.ReactNode }) {
  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {children}
    </View>
  );
}
