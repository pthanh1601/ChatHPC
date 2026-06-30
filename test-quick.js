const crypto = require('react-native-quick-crypto');
const iv = crypto.randomBytes(16);
console.log(iv);
