export declare function hash(message: string): Promise<string>;
export declare function generateKeys(): Promise<CryptoKeyPair>;
export declare function loadPubKey(pubKey: JsonWebKey): Promise<CryptoKey>;
export declare function loadKeys(pubKey: JsonWebKey, privKey: JsonWebKey): Promise<[CryptoKey, CryptoKey]>;
export declare function sign(data: string, privKey: CryptoKey): Promise<Uint8Array>;
export declare function verify(data: string, signature: Uint8Array, pubKey: CryptoKey): Promise<boolean>;
