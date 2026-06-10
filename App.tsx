import React from 'react';
import { LogBox } from 'react-native';
import MainApp from './src/App';

// Chặn toàn bộ popup cảnh báo và lỗi (LogBox) hiện lên màn hình thiết bị
LogBox.ignoreAllLogs(true);

export default function App() {
  return <MainApp />;
}
