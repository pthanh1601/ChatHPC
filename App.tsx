import 'react-native-get-random-values';
// Polyfill for Buffer, required by matrix-js-sdk
import { Buffer } from 'buffer';
declare var global: any;
global.Buffer = Buffer;

import React from 'react';
import { LogBox } from 'react-native';
import MainApp from './src/App';

// Ẩn cảnh báo bóng đổ (shadow) cụ thể
LogBox.ignoreLogs([
  'RCTView has a shadow set but cannot calculate shadow efficiently',
]);

// Ẩn toàn bộ cảnh báo (LogBox màu vàng) và màn hình lỗi ra khỏi giao diện
LogBox.ignoreAllLogs(true);

// Ẩn hoàn toàn màn hình đỏ (RedBox) của React Native khi có lỗi nghiêm trọng chưa được bắt
if (global.ErrorUtils) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log("Đã ẩn một lỗi hệ thống ngầm:", error);
  });
}

export default function App() {
  return <MainApp />;
}
