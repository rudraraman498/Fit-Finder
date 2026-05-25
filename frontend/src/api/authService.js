import { encryptField } from './cryptoService';

const BASE = process.env.REACT_APP_COMMERCE_URL || 'http://localhost:8080';

const json = async r => {
  if (!r.ok) {
    const err = await r.json().catch(() => ({ error: r.statusText }));
    throw new Error(err.error || r.statusText);
  }
  return r.json();
};

export const register = async (name, email, password) => {
  const [encEmail, encPassword] = await Promise.all([
    encryptField(email),
    encryptField(password),
  ]);
  return fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email: encEmail, password: encPassword }),
  }).then(json);
};

export const login = async (email, password) => {
  const [encEmail, encPassword] = await Promise.all([
    encryptField(email),
    encryptField(password),
  ]);
  return fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: encEmail, password: encPassword }),
  }).then(json);
};

export const mergeCart = (token, items) =>
  fetch(`${BASE}/auth/merge-cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ items }),
  }).then(json);
