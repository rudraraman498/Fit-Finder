const BASE = process.env.REACT_APP_COMMERCE_URL || 'http://localhost:8080';

const json = async r => {
  if (!r.ok) {
    let message = r.statusText;
    try {
      const body = await r.json();
      if (body?.error) message = body.error;
      else if (body?.fields) {
        // validation_error: flatten field messages into one string
        message = Object.values(body.fields).join(', ');
      }
    } catch (_) {}
    throw new Error(message);
  }
  return r.json();
};

const authHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const get = url =>
  fetch(`${BASE}${url}`, {
    credentials: 'include',
    headers: { ...authHeader() },
  }).then(json);

const post = (url, body) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(json);

const del = url =>
  fetch(`${BASE}${url}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...authHeader() },
  }).then(json);

export const getProducts = (page = 0, size = 20, category, gender) => {
  const params = new URLSearchParams({ page, size });
  if (category) params.append('category', category);
  if (gender) params.append('gender', gender);
  return get(`/products?${params}`);
};

export const getProduct = id => get(`/products/${id}`);

export const getCart = () => get('/cart');

export const addToCart = (productId, quantity, size) =>
  post('/cart', { productId, quantity, size: size || null });

export const removeFromCart = (productId, size) => {
  const params = size ? `?size=${encodeURIComponent(size)}` : '';
  return del(`/cart/${productId}${params}`);
};

export const placeOrder = (shippingInfo) => post('/orders', shippingInfo);

export const getOrders = () => get('/orders');

export const getOrder = (id) => get(`/orders/${id}`);
