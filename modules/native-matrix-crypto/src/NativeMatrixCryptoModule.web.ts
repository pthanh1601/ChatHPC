import { registerWebModule, NativeModule } from 'expo';

// NativeMatrixCryptoModule is not available on the web platform.
class NativeMatrixCryptoModule extends NativeModule<{}> {}

export default registerWebModule(NativeMatrixCryptoModule, 'NativeMatrixCryptoModule');
