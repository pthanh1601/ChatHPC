// Giữ lại các polyfill nền tảng khác
import 'react-native-get-random-values';

// Polyfill cho Buffer
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Polyfill cho TextEncoder/TextDecoder
const TextEncodingPolyfill = require('text-encoding');
Object.assign(global, { TextEncoder: TextEncodingPolyfill.TextEncoder, TextDecoder: TextEncodingPolyfill.TextDecoder });

// Polyfill IndexedDB
import 'fake-indexeddb/auto';
