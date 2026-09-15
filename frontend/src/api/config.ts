const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim();

function normalizeApiBaseUrl(rawValue?: string) {
  if (!rawValue) {
    return "/api";
  }

  const trimmedValue = rawValue.replace(/\/$/, "");
  if (trimmedValue.startsWith("http://") || trimmedValue.startsWith("https://")) {
    try {
      const url = new URL(trimmedValue);
      const pathname = url.pathname.replace(/\/$/, "");
      // A bare deployed backend hostname is the most common Vercel setup.
      // Django's application endpoints live below /api.
      if (!pathname) {
        url.pathname = "/api";
        return url.toString().replace(/\/$/, "");
      }
      return trimmedValue;
    } catch {
      return trimmedValue;
    }
  }

  return trimmedValue.startsWith("/") ? trimmedValue : `/${trimmedValue}`;
}

export const API_BASE_URL = normalizeApiBaseUrl(RAW_API_BASE_URL);

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getResolvedApiBaseUrl() {
  if (API_BASE_URL.startsWith("http://") || API_BASE_URL.startsWith("https://")) {
    return API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.origin}${API_BASE_URL}`;
  }

  return `http://127.0.0.1:5173${API_BASE_URL}`;
}
