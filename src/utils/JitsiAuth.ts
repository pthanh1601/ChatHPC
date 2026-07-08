import CryptoJS from 'crypto-js';

// Base32 encoding without padding (RFC 4648)
export function base32Encode(str: string): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < str.length; i++) {
        value = (value << 8) | str.charCodeAt(i);
        bits += 8;
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
}

export function generateJitsiJWT(
    openIdToken: { access_token: string, matrix_server_name: string },
    roomId: string,
    serverDomain: string,
    userDisplayName: string,
    userAvatarUrl: string
): string {
    const header = {
        alg: "HS256",
        typ: "JWT"
    };

    const payload = {
        iss: serverDomain,
        sub: serverDomain,
        aud: `https://${serverDomain}`,
        room: "*",
        context: {
            matrix: {
                token: openIdToken.access_token,
                roomId: roomId,
                serverName: openIdToken.matrix_server_name
            },
            user: {
                avatar: userAvatarUrl,
                name: userDisplayName
            }
        }
    };

    const base64UrlEncode = (obj: any) => {
        const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
        return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(str))
            .replace(/=+$/, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    
    // Sign with dummy secret "notused" as expected by prosody-mod-auth-matrix-user-verification
    const signature = CryptoJS.HmacSHA256(`${encodedHeader}.${encodedPayload}`, "notused");
    const encodedSignature = CryptoJS.enc.Base64.stringify(signature)
        .replace(/=+$/, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}
