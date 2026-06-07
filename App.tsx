import 'react-native-get-random-values';
// Polyfill for Buffer, required by matrix-js-sdk
import { Buffer } from 'buffer';
declare var global: any;
global.Buffer = Buffer;

import React from 'react';
import MainApp from './src/App';

export default function App() {
  return <MainApp />;
}
