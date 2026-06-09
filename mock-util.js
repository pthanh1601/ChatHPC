// Giả lập module 'util' của Node.js để triệt tiêu lỗi load TextEncoder của matrix-js-sdk
module.exports = {
  TextEncoder: global.TextEncoder,
  TextDecoder: global.TextDecoder,
  inspect: function(obj) { return String(obj); }
};
