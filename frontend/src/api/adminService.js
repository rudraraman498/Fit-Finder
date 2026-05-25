const BASE = process.env.REACT_APP_COMMERCE_URL || 'http://localhost:8080';

const json = async r => {
  if (!r.ok) {
    let message = r.statusText;
    try {
      const body = await r.json();
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch (_) {}
    throw new Error(message);
  }
  if (r.status === 204) return null;
  return r.json();
};

const adminHeader = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const get = url =>
  fetch(`${BASE}${url}`, {
    headers: { ...adminHeader() },
  }).then(json);

const post = (url, body) =>
  fetch(`${BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...adminHeader() },
    body: JSON.stringify(body),
  }).then(json);

const put = (url, body) =>
  fetch(`${BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...adminHeader() },
    body: JSON.stringify(body),
  }).then(json);

const del = url =>
  fetch(`${BASE}${url}`, {
    method: 'DELETE',
    headers: { ...adminHeader() },
  }).then(json);

export const adminLogin = (username, password) =>
  post('/admin/auth/login', { username, password });

export const getAdminStats = () => get('/admin/stats');

// Products
export const getAdminProducts = (page = 0, size = 20) =>
  get(`/admin/products?page=${page}&size=${size}`);

export const createAdminProduct = product => post('/admin/products', product);

export const updateAdminProduct = (id, data) => put(`/admin/products/${id}`, data);

export const deleteAdminProduct = id => del(`/admin/products/${id}`);

// Orders
export const getAdminOrders = (page = 0, size = 50) =>
  get(`/admin/orders?page=${page}&size=${size}`);

export const updateOrderStatus = (id, status) =>
  put(`/admin/orders/${id}/status`, { status });

// Users
export const getAdminUsers = (page = 0, size = 50) =>
  get(`/admin/users?page=${page}&size=${size}`);
