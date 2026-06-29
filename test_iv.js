const CryptoJS = require("crypto-js");
const key = CryptoJS.lib.WordArray.random(32);
const iv = CryptoJS.lib.WordArray.create([1, 2, 0, 0], 16);
console.log("Before:", iv.words.join(","));
const encryptor = CryptoJS.algo.AES.createEncryptor(key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
});
const chunk = CryptoJS.lib.WordArray.random(1000);
encryptor.process(chunk);
console.log("After:", iv.words.join(","));
