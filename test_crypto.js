const crypto = require('crypto');
const CryptoJS = require('crypto-js');

async function test() {
    const keyBuffer = crypto.randomBytes(32);
    const ivBuffer = crypto.randomBytes(16);
    ivBuffer[8] &= 0x7f; 

    const plaintextStr = "Hello World! This is a test string to see if the ciphertext matches exactly.";
    const plaintextBuffer = Buffer.from(plaintextStr, 'utf8');

    // 1. WebCrypto (Node.js crypto)
    const cipher = crypto.createCipheriv('aes-256-ctr', keyBuffer, ivBuffer);
    const expectedCiphertext = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);

    // 2. CryptoJS
    const keyWordArray = CryptoJS.lib.WordArray.create(keyBuffer);
    const ivWordArray = CryptoJS.lib.WordArray.create(ivBuffer);
    const encryptor = CryptoJS.algo.AES.createEncryptor(keyWordArray, { iv: ivWordArray, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding });
    
    const plaintextWordArray = CryptoJS.lib.WordArray.create(plaintextBuffer);
    const encryptedChunk = encryptor.process(plaintextWordArray);
    const finalChunk = encryptor.finalize();
    
    const finalWordArray = encryptedChunk.clone();
    if (finalChunk && finalChunk.sigBytes > 0) finalWordArray.concat(finalChunk);
    
    const actualBase64 = finalWordArray.toString(CryptoJS.enc.Base64);
    
    const actualCiphertext = Buffer.from(actualBase64, 'base64');

    console.log("Expected length:", expectedCiphertext.length);
    console.log("Actual length:", actualCiphertext.length);
    console.log("Expected hex:", expectedCiphertext.toString('hex'));
    console.log("Actual hex:", actualCiphertext.toString('hex'));
    console.log("Match:", expectedCiphertext.equals(actualCiphertext));
}

test();
