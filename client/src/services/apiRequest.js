import { API_BASE_URL } from "../config/api";

export async function apiRequest(endpoint, options = {}) {
  const { skipAuthExpired, headers: customHeaders, ...fetchOptions } = options;
  const token = localStorage.getItem("trackly-token");

  const headers = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.status === 401 && !skipAuthExpired) {
    localStorage.removeItem("trackly-token");

    window.dispatchEvent(new Event("trackly-auth-expired"));

    throw Object.assign(new Error(data?.message || "Your session has expired."), {
      status: response.status,
    });
  }

  if (!response.ok) {
    throw Object.assign(new Error(data?.message || "Something went wrong."), {
      status: response.status,
      code: data?.code,
    });
  }

  return data;
}

export { API_BASE_URL };