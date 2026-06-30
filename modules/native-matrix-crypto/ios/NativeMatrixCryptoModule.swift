import ExpoModulesCore
import Foundation
import CommonCrypto

public class NativeMatrixCryptoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NativeMatrixCrypto")

    AsyncFunction("encryptFile") { (inputPath: String, outputPath: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        do {
          let result = try self.encryptFileInternal(inputPath: inputPath, outputPath: outputPath)
          promise.resolve(result)
        } catch {
          promise.reject("ENCRYPTION_ERROR", error.localizedDescription)
        }
      }
    }
  }

  private func encryptFileInternal(inputPath: String, outputPath: String) throws -> [String: String] {
    let cleanInputPath = inputPath.replacingOccurrences(of: "file://", with: "")
    let cleanOutputPath = outputPath.replacingOccurrences(of: "file://", with: "")

    guard let inputStream = InputStream(fileAtPath: cleanInputPath) else {
      throw NSError(domain: "NativeMatrixCrypto", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot open input file"])
    }
    
    let fm = FileManager.default
    let destURL = URL(fileURLWithPath: cleanOutputPath)
    try? fm.createDirectory(at: destURL.deletingLastPathComponent(), withIntermediateDirectories: true, attributes: nil)
    
    guard let outputStream = OutputStream(toFileAtPath: cleanOutputPath, append: false) else {
      throw NSError(domain: "NativeMatrixCrypto", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot open output file"])
    }

    var keyData = Data(count: 32)
    var ivData = Data(count: 16)
    
    let keyResult = keyData.withUnsafeMutableBytes {
      SecRandomCopyBytes(kSecRandomDefault, 32, $0.baseAddress!)
    }
    let ivResult = ivData.withUnsafeMutableBytes {
      SecRandomCopyBytes(kSecRandomDefault, 16, $0.baseAddress!)
    }
    
    if keyResult != errSecSuccess || ivResult != errSecSuccess {
      throw NSError(domain: "NativeMatrixCrypto", code: 3, userInfo: [NSLocalizedDescriptionKey: "Random generation failed"])
    }
    
    // Matrix MSC1767 specification: the last 8 bytes of the IV MUST be 0
    var ivBytes = [UInt8](ivData)
    for i in 8..<16 {
      ivBytes[i] = 0
    }
    ivData = Data(ivBytes)

    var cryptor: CCCryptorRef?
    
    let status = keyData.withUnsafeBytes { keyPtr in
      ivData.withUnsafeBytes { ivPtr in
        CCCryptorCreateWithMode(
          CCOperation(kCCEncrypt),
          CCMode(kCCModeCTR),
          CCAlgorithm(kCCAlgorithmAES),
          CCPadding(ccNoPadding),
          ivPtr.baseAddress,
          keyPtr.baseAddress,
          keyData.count,
          nil,
          0,
          0,
          CCModeOptions(kCCModeOptionCTR_BE),
          &cryptor
        )
      }
    }
    
    guard status == kCCSuccess, let cryptorRef = cryptor else {
      throw NSError(domain: "NativeMatrixCrypto", code: 4, userInfo: [NSLocalizedDescriptionKey: "CCCryptorCreateWithMode failed"])
    }
    
    defer {
      CCCryptorRelease(cryptorRef)
    }

    var hashCtx = CC_SHA256_CTX()
    CC_SHA256_Init(&hashCtx)

    inputStream.open()
    outputStream.open()
    
    defer {
      inputStream.close()
      outputStream.close()
    }

    let bufferSize = 1024 * 1024 // 1MB chunk size
    let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize)
    // For CTR mode without padding, output length is always <= input length
    let cipherBuffer = UnsafeMutablePointer<UInt8>.allocate(capacity: bufferSize + CCCryptorGetOutputLength(cryptorRef, 0, true))
    
    defer {
      buffer.deallocate()
      cipherBuffer.deallocate()
    }

    while inputStream.hasBytesAvailable {
      let bytesRead = inputStream.read(buffer, maxLength: bufferSize)
      if bytesRead < 0 {
        throw NSError(domain: "NativeMatrixCrypto", code: 5, userInfo: [NSLocalizedDescriptionKey: "Read error"])
      }
      if bytesRead == 0 {
        break
      }
      
      var dataOutMoved: Int = 0
      let cryptStatus = CCCryptorUpdate(
        cryptorRef,
        buffer,
        bytesRead,
        cipherBuffer,
        bufferSize + CCCryptorGetOutputLength(cryptorRef, 0, true),
        &dataOutMoved
      )
      
      if cryptStatus != kCCSuccess {
        throw NSError(domain: "NativeMatrixCrypto", code: 6, userInfo: [NSLocalizedDescriptionKey: "CCCryptorUpdate failed"])
      }
      
      if dataOutMoved > 0 {
        CC_SHA256_Update(&hashCtx, cipherBuffer, CC_LONG(dataOutMoved))
        
        var bytesWritten = 0
        while bytesWritten < dataOutMoved {
          let written = outputStream.write(cipherBuffer + bytesWritten, maxLength: dataOutMoved - bytesWritten)
          if written < 0 {
            throw NSError(domain: "NativeMatrixCrypto", code: 7, userInfo: [NSLocalizedDescriptionKey: "Write error"])
          }
          bytesWritten += written
        }
      }
    }
    
    var finalDataOutMoved: Int = 0
    let finalStatus = CCCryptorFinal(
      cryptorRef,
      cipherBuffer,
      bufferSize + CCCryptorGetOutputLength(cryptorRef, 0, true),
      &finalDataOutMoved
    )
    
    if finalStatus == kCCSuccess && finalDataOutMoved > 0 {
      CC_SHA256_Update(&hashCtx, cipherBuffer, CC_LONG(finalDataOutMoved))
      var bytesWritten = 0
      while bytesWritten < finalDataOutMoved {
        let written = outputStream.write(cipherBuffer + bytesWritten, maxLength: finalDataOutMoved - bytesWritten)
        if written < 0 { break }
        bytesWritten += written
      }
    }

    var hashBytes = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    CC_SHA256_Final(&hashBytes, &hashCtx)
    
    let sha256Data = Data(hashBytes)
    
    // Matrix requires unpadded base64url for key
    let keyBase64Url = keyData.base64EncodedString()
        .replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_")
        .replacingOccurrences(of: "=", with: "")
        
    let ivBase64 = ivData.base64EncodedString()
    let sha256Base64 = sha256Data.base64EncodedString()

    return [
      "key": keyBase64Url,
      "iv": ivBase64,
      "sha256": sha256Base64
    ]
  }
}
