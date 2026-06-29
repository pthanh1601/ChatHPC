import Foundation
import CommonCrypto

func pad(_ s: String) -> String {
    let padding = (4 - s.count % 4) % 4
    return s + String(repeating: "=", count: padding)
}
func base64urlToBase64(_ s: String) -> String {
    let b = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    return pad(b)
}

let keyBase64Url = "5vDSxkrtBYm8YJsutdCZla8aOm6WfbvMncgDGipCbNs"
let ivBase64Unpadded = "alfXfnZUW0gAAAAAAAAAAA"
let sha256HashUnpadded = "MSoHk3svIK1dslKTpguN/2WPVtKP0Inm9zbmNBuZ1ko"
let ciphertextBase64 = "b1sCMrIZ9VZLb3uJGbiRIi5j+C/3fSXQ"

let keyData = Data(base64Encoded: base64urlToBase64(keyBase64Url))!
let ivData = Data(base64Encoded: pad(ivBase64Unpadded))!
let expectedHashData = Data(base64Encoded: pad(sha256HashUnpadded))!
let cipherData = Data(base64Encoded: ciphertextBase64)!

var hashBytes = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
cipherData.withUnsafeBytes { buffer in
    _ = CC_SHA256(buffer.baseAddress, CC_LONG(cipherData.count), &hashBytes)
}
let computedHashData = Data(hashBytes)
print("Hash Match: \(computedHashData == expectedHashData)")

var cryptor: CCCryptorRef? = nil
let status = CCCryptorCreateWithMode(
    CCOperation(kCCEncrypt),
    CCMode(kCCModeCTR),
    CCAlgorithm(kCCAlgorithmAES),
    CCPadding(ccNoPadding),
    ivData.withUnsafeBytes { $0.baseAddress },
    keyData.withUnsafeBytes { $0.baseAddress },
    keyData.count,
    nil, 0, 0,
    CCModeOptions(kCCModeOptionCTR_BE),
    &cryptor
)

var plainData = Data(count: cipherData.count)
var outLen: Int = 0
let updateStatus = CCCryptorUpdate(
    cryptor,
    cipherData.withUnsafeBytes { $0.baseAddress },
    cipherData.count,
    plainData.withUnsafeMutableBytes { $0.baseAddress },
    plainData.count,
    &outLen
)

if let plainString = String(data: plainData, encoding: .utf8) {
    print("Decrypted String: \(plainString)")
} else {
    print("Failed to decode string")
}
