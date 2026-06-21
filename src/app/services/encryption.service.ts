import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  private readonly secretKey = 'apexfit_attendance_secret_key_token';

  encrypt(text: string): string {
    if (!text) return '';
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ this.secretKey.charCodeAt(i % this.secretKey.length);
      result += String.fromCharCode(charCode);
    }
    // Encode to base64 safely supporting Unicode characters
    return btoa(encodeURIComponent(result));
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return '';
    try {
      const decoded = decodeURIComponent(atob(encryptedText));
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ this.secretKey.charCodeAt(i % this.secretKey.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (e) {
      console.error('Decryption failed:', e);
      return '';
    }
  }
}
