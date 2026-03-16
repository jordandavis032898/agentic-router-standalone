import axios from 'axios';

export const BASE = 'https://coreagenticpipeline-production.up.railway.app';

const AUTH_STORAGE_KEY = 'agentic_router_auth';

let onUnauthorized = null;

export function setUnauthorizedHandler(cb) {
  onUnauthorized = cb;
}

function authHeaders() {
  const stored = getStoredAuth();
  if (stored?.token) return { Authorization: `Bearer ${stored.token}` };
  return {};
}

function handleUnauthorized(err) {
  if (err?.response?.status === 401 || err?.response?.status === 403) {
    clearAuthToken();
  }
  throw err;
}

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthToken(token, user) {
  if (!token || !user) return;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, user }));
  } catch {
    // ignore
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (typeof onUnauthorized === 'function') onUnauthorized();
}

function delay(ms = 200 + Math.random() * 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function health() {
  await delay();
  return {
    status: 'pretend-ok',
    service: 'mvp_demo_ui_stub',
  };
}

export async function signup(body) {
  const res = await axios.post(`${BASE}/auth/signup`, body);
  const data = res.data;
  if (data.access_token && data.user_id) {
    const user = {
      user_id: data.user_id,
      email: data.email,
      name: data.name,
      role: data.role,
      is_allowed: data.is_allowed,
    };
    setAuthToken(data.access_token, user);
  }
  return data;
}

export async function login(body) {
  const res = await axios.post(`${BASE}/auth/login`, body);
  const data = res.data;
  if (data.access_token && data.user_id) {
    const user = {
      user_id: data.user_id,
      email: data.email,
      name: data.name,
      role: data.role,
      is_allowed: data.is_allowed,
    };
    setAuthToken(data.access_token, user);
  }
  return data;
}

export async function listUsers() {
  try {
    const res = await axios.get(`${BASE}/auth/users`, { headers: authHeaders() });
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function setUserAccess(userId, isAllowed) {
  try {
    const res = await axios.patch(
      `${BASE}/auth/users/${userId}/access`,
      { is_allowed: isAllowed },
      { headers: authHeaders() }
    );
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function route(query, pdfUploaded = false) {
  try {
    const res = await axios.post(
      `${BASE}/route`,
      { query, pdf_uploaded: pdfUploaded },
      { headers: authHeaders(), timeout: 300000 }
    );
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function upload(file) {
  try {
    const form = new FormData();
    form.append('file', file);
    form.append('user_id', getStoredAuth()?.user?.email || 'anonymous');
    const res = await axios.post(`${BASE}/upload`, form, {
      headers: authHeaders(),
      timeout: 300000,
    });
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function status(fileId) {
  try {
    const res = await axios.get(`${BASE}/status/${fileId}`, {
      headers: authHeaders(),
    });
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function getPages(fileId) {
  try {
    const res = await axios.get(`${BASE}/pages/${fileId}`, {
      headers: authHeaders(),
    });
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function getPagePreview(fileId, pageIndex) {
  try {
    const res = await axios.get(`${BASE}/pages/${fileId}/${pageIndex}/preview`, {
      headers: authHeaders(),
      responseType: 'blob',
    });
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function getPagePreviewByNumber(fileId, pageNumber) {
  try {
    const res = await axios.get(`${BASE}/pages/${fileId}/preview-by-page/${pageNumber}`, {
      headers: authHeaders(),
      responseType: 'blob',
    });
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function extract(fileId, pageIndices) {
  try {
    const res = await axios.post(
      `${BASE}/extract`,
      { file_id: fileId, page_indices: pageIndices },
      { headers: authHeaders(), timeout: 300000 }
    );
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function query(fileId, question) {
  try {
    const res = await axios.post(
      `${BASE}/query`,
      { file_id: fileId, user_id: getStoredAuth()?.user?.email || 'anonymous', question },
      { headers: authHeaders(), timeout: 300000 }
    );
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export async function edgar(ticker, numYears = 3) {
  try {
    const res = await axios.get(`${BASE}/edgar/${ticker}`, {
      headers: authHeaders(),
      params: { num_years: numYears },
      timeout: 300000,
    });
    return res.data;
  } catch (err) {
    return handleUnauthorized(err);
  }
}

export function getErrorMessage(e, fallback = 'Request failed') {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  const respMsg =
    e?.response?.data?.detail?.message ||
    e?.response?.data?.message ||
    e?.response?.data?.detail;
  if (respMsg && typeof respMsg === 'string') return respMsg;
  if (e?.message) return e.message;
  return fallback;
}
