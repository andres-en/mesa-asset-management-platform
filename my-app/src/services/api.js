export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const CSRF_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getCsrfToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const csrfToken = CSRF_METHODS.has(method) ? getCsrfToken() : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
    ...options.headers,
  };

  let res;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: 'include' });
  } catch {
    throw new Error('Could not connect to the server');
  }

  if (res.status === 401) {
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    // Never expose internal server details to the UI — only validation messages (4xx) are user-facing.
    if (res.status >= 500) {
      throw new Error('Internal server error. Please try again.');
    }
    throw new Error(body.error || body.message || `Error ${res.status}`);
  }

  // PDF y otros blobs
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf')) {
    return res.blob();
  }

  return res.json();
}

export const api = {
  get: (endpoint) => request(endpoint, { method: 'GET' }),

  post: (endpoint, body) =>
    request(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  put: (endpoint, body) =>
    request(endpoint, { method: 'PUT', body: JSON.stringify(body) }),

  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
};
