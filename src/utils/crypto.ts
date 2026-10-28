import { md5 } from './md5';

export async function calculateHash(fileOrString: File | string, algorithm: 'SHA-256' | 'SHA-512' | 'MD5'): Promise<string> {
  if (algorithm === 'MD5') {
    if (typeof fileOrString === 'string') {
      return md5(fileOrString);
    } else {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(md5(reader.result as string));
        reader.onerror = reject;
        reader.readAsBinaryString(fileOrString);
      });
    }
  }

  let buffer: BufferSource;
  
  if (typeof fileOrString === 'string') {
    const encoder = new TextEncoder();
    buffer = encoder.encode(fileOrString);
  } else {
    buffer = await fileOrString.arrayBuffer();
  }
  
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

export function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeBase64(input: string): string {
  const binary = atob(input.replace(/\s+/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeFileBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
