const BASE = process.env.REACT_APP_COMMERCE_URL || 'http://localhost:8080';

let cachedKey = null;

async function getPublicKey() {
  if (cachedKey) return cachedKey;
  const res = await fetch(`${BASE}/auth/public-key`);
  if (!res.ok) throw new Error('Failed to fetch public key');
  const { publicKey } = await res.json();

  const binaryDer = Uint8Array.from(atob(publicKey), c => c.charCodeAt(0));
  cachedKey = await crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    false,
    ['encrypt']
  );
  return cachedKey;
}

export async function encryptField(plaintext) {
  const key = await getPublicKey();
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, encoded);
  // Use a loop instead of spread to safely handle any buffer size
  const bytes = new Uint8Array(encrypted);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
