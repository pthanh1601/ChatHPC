import { NativeModule, requireNativeModule } from 'expo';

declare class NativeMatrixCryptoModule extends NativeModule<{}> {
  encryptFile(inputPath: string, outputPath: string): Promise<{ key: string; iv: string; sha256: string }>;
}

export default requireNativeModule<NativeMatrixCryptoModule>('NativeMatrixCrypto');
