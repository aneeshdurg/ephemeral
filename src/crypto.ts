function stringToBuffer(data: string): Uint8Array {
    return new TextEncoder().encode(data); // encode as (utf-8) Uint8Array
}

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
async function digestMessage(message: string) {
    const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        stringToBuffer(message)
    ); // hash the message
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    return hashArray;
}

function padStart(input: string, count: number, char: string) {
    while (input.length < count) {
        input = char + input;
    }
    return input;
}

function byteArrayToB32Str(hashArray: number[]) {
    let hashHex = "";
    if (hashArray.length % 2 == 1) hashArray.push(0);
    for (let i = 0; i < hashArray.length; i += 2) {
        hashHex += padStart(
            (hashArray[i] * 256 + hashArray[i + 1]).toString(32),
            2,
            "0"
        );
    }
    return hashHex;
}

export async function hash(message: string) {
    return byteArrayToB32Str(await digestMessage(message));
}

const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: { name: "SHA-256" },
};

const keyParams = {
    ...algorithm,
    modulusLength: 1024,
    publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
};

export async function generateKeys(): Promise<CryptoKeyPair> {
    return <CryptoKeyPair>(
        await crypto.subtle.generateKey(keyParams, true, ["sign", "verify"])
    );
}

export async function loadPubKey(pubKey: JsonWebKey): Promise<CryptoKey> {
    return await crypto.subtle.importKey("jwk", pubKey, algorithm, true, [
        "verify",
    ]);
}

export async function loadKeys(
    pubKey: JsonWebKey,
    privKey: JsonWebKey
): Promise<[CryptoKey, CryptoKey]> {
    return [
        await loadPubKey(pubKey),
        await crypto.subtle.importKey("jwk", privKey, algorithm, true, [
            "sign",
        ]),
    ];
}

export async function sign(
    data: string,
    privKey: CryptoKey
): Promise<Uint8Array> {
    const dataBuffer = stringToBuffer(data);
    return new Uint8Array(
        await crypto.subtle.sign(algorithm, privKey, dataBuffer)
    );
}

export async function verify(
    data: string,
    signature: Uint8Array,
    pubKey: CryptoKey
): Promise<boolean> {
    const dataBuffer = stringToBuffer(data);
    return crypto.subtle.verify(algorithm, pubKey, signature, dataBuffer);
}
