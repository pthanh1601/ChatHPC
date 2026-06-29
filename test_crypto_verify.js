const CryptoJS = require('crypto-js');

// 1. Setup
const plaintextString = "Hello Matrix Encryption!";
const wordArrays = CryptoJS.enc.Utf8.parse(plaintextString);

const randomKeyWords = CryptoJS.lib.WordArray.random(32).words;
const key = CryptoJS.lib.WordArray.create(randomKeyWords, 32);

const randomWords = CryptoJS.lib.WordArray.random(8).words;
const iv = CryptoJS.lib.WordArray.create([randomWords[0], randomWords[1], 0, 0], 16);

// 2. Encrypt
const encrypted = CryptoJS.AES.encrypt(wordArrays, key, {
    iv: iv,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
});

// 3. Hash
const sha256HashUnpadded = CryptoJS.SHA256(encrypted.ciphertext).toString(CryptoJS.enc.Base64).replace(/=+$/, '');
const finalBase64Data = CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
const ivBase64Unpadded = CryptoJS.enc.Base64.stringify(iv).replace(/=+$/, '');
const keyBase64Url = key.toString(CryptoJS.enc.Base64).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

console.log(JSON.stringify({
    keyBase64Url,
    ivBase64Unpadded,
    sha256HashUnpadded,
    ciphertextBase64: finalBase64Data
}, null, 2));
