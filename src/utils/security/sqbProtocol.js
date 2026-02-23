// File: src/utils/security/sqbProtocol.js
import CryptoJS from 'crypto-js';

/**
 * RESILIENT KEY LOADER (PHASE 3 STABILIZED)
 * Bypasses environment variable desync by hardcoding the master staging key.
 */
const getRawKey = () => {
    // We hardcode the verified key here to ensure Faculty and Student always match.
    const hardcodedKey = '8f4b2c1d9a6e7f3b5c8d0a1f4e9b2c6d7a3f8e1b9c4d5a6f0b2e3c1d4a5b6c7d';
    return hardcodedKey.trim();
};

const SQB_MASTER_KEY = getRawKey();

// Verification log - This must show '8f4b' in your console
console.log("SQB Protocol: AUTHENTICATED KEY LOADED (Prefix):", SQB_MASTER_KEY.substring(0, 4));

/**
 * Encrypts plaintext payload using AES-256 prior to database insertion.
 * PREFIXED WITH 'export' FOR COMPILATION
 */
export const encryptAES256 = (plaintext) => {
    if (!plaintext) return '';
    try {
        const cipherText = CryptoJS.AES.encrypt(plaintext, SQB_MASTER_KEY).toString();
        return `SQB::${cipherText}`; 
    } catch (error) {
        console.error("SQB Encryption Fault:", error);
        throw new Error("Failed to secure cognitive asset.");
    }
};

/**
 * Decrypts JIT payload for client-side rendering.
 * PREFIXED WITH 'export' FOR COMPILATION
 */
export const decryptAES256 = (securePayload) => {
    if (!securePayload) return '';
    
    // Graceful degradation for legacy data
    if (!securePayload.startsWith('SQB::')) {
        return securePayload; 
    }

    try {
        const rawCipher = securePayload.replace('SQB::', '');
        const bytes = CryptoJS.AES.decrypt(rawCipher, SQB_MASTER_KEY);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        
        if (!originalText) throw new Error("Decryption returned empty string (Key mismatch)");
        return originalText;
    } catch (error) {
        console.error("SQB Decryption Fault:", error);
        return '[DECRYPTION ERROR - PLEASE RE-ADD QUESTION]';
    }
};