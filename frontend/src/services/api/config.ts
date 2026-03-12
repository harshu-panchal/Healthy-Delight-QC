import axios, { AxiosInstance, InternalAxiosRequestConfig } from "axios";

// -------- Role-aware auth storage helpers --------
export type UserRole = "Admin" | "Seller" | "Customer" | "Delivery";

// Derive role for the current tab from the URL path
export const getCurrentRoleFromPath = (): UserRole => {
  const path = window.location.pathname || "";
  if (path.startsWith("/admin")) return "Admin";
  if (path.startsWith("/seller")) return "Seller";
  if (path.startsWith("/delivery")) return "Delivery";
  // Default web app user
  return "Customer";
};

const getTokenStorageKey = (role: UserRole) =>
  `authToken_${role.toLowerCase()}`;

const getUserStorageKey = (role: UserRole) =>
  `userData_${role.toLowerCase()}`;

// Base API URL - adjust based on your backend URL
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// Socket.io base URL - extract from API_BASE_URL by removing /api/v1
// Socket connections need the base server URL without the API path
export const getSocketBaseURL = (): string => {
  // Use VITE_API_URL or VITE_API_BASE_URL
  const apiBaseUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api/v1";

  // Remove /api/v1 or /api and any trailing slash from the end
  const socketUrl = apiBaseUrl.replace(/\/api\/v\d+\/?$|\/api\/?$|\/$/, "");

  return socketUrl || "http://localhost:5000";
};

// Log the API base URL for debugging (only in development or if there's an issue)
if (import.meta.env.DEV || !import.meta.env.VITE_API_BASE_URL) {
  console.log("[API Config] Base URL:", API_BASE_URL);
  console.log(
    "[API Config] VITE_API_BASE_URL:",
    import.meta.env.VITE_API_BASE_URL
  );
  console.log("[API Config] Socket Base URL:", getSocketBaseURL());
  console.log(
    "[API Config] Secure Context:",
    window.isSecureContext ? "✅ Yes" : "❌ No (FCM will fail on mobile)"
  );
}

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add role-specific token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const role = getCurrentRoleFromPath();
    const token =
      localStorage.getItem(getTokenStorageKey(role)) ||
      // Fallback to legacy key if still present
      localStorage.getItem("authToken");

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: any) => {
    // Only handle 401 (Unauthorized) for auto-logout
    // 403 (Forbidden) means user is authenticated but doesn't have permission - DO NOT LOGOUT
    if (error.response?.status === 401) {
      // Check if this is an authentication endpoint (OTP verification, etc.)
      // Don't redirect for auth endpoints - let the component handle the error
      const isAuthEndpoint = error.config?.url?.includes("/auth/");

      // Check if there was a token in the request (meaning user was logged in)
      const hadToken = error.config?.headers?.Authorization;

      // Only redirect if:
      // 1. It's not an auth endpoint
      // 2. There was a token in the request (user was logged in but token expired)
      // 3. User is not already on login/signup pages
      if (!isAuthEndpoint && hadToken) {
        const currentPath = window.location.pathname;

        // Skip redirect if already on public auth pages (login/signup)
        if (currentPath.includes("/login") || currentPath.includes("/signup")) {
          return Promise.reject(error);
        }

        // Token expired or invalid - clear token and redirect to appropriate login
        // Determine which login page based on the Current URL or API endpoint
        const apiUrl = error.config?.url || "";
        let redirectPath = "/login";

        if (currentPath.includes("/admin/") || apiUrl.includes("/admin/")) {
          redirectPath = "/admin/login";
        } else if (
          currentPath.includes("/seller/") ||
          apiUrl.includes("/seller/") ||
          apiUrl.includes("/sellers")
        ) {
          redirectPath = "/seller/login";
        } else if (
          currentPath.includes("/delivery/") ||
          apiUrl.includes("/delivery/")
        ) {
          redirectPath = "/delivery/login";
        }

        const role = getCurrentRoleFromPath();
        // Clear only the token for the current role
        localStorage.removeItem(getTokenStorageKey(role));
        localStorage.removeItem(getUserStorageKey(role));
        window.location.href = redirectPath;
      }
      // If no token was present, user is just browsing as guest - don't redirect
      // Just reject the promise so the component can handle it gracefully
    }
    // For 403 and other errors, just reject the promise so the UI can handle it
    return Promise.reject(error);
  }
);

// Token management helpers (role-aware)
export const setAuthToken = (token: string, role?: UserRole) => {
  const effectiveRole = role ?? getCurrentRoleFromPath();
  localStorage.setItem(getTokenStorageKey(effectiveRole), token);
};

export const getAuthToken = (role?: UserRole): string | null => {
  const effectiveRole = role ?? getCurrentRoleFromPath();
  return (
    localStorage.getItem(getTokenStorageKey(effectiveRole)) ||
    // Fallback to legacy key if needed
    localStorage.getItem("authToken")
  );
};

export const removeAuthToken = (role?: UserRole) => {
  if (role) {
    localStorage.removeItem(getTokenStorageKey(role));
    localStorage.removeItem(getUserStorageKey(role));
  } else {
    // Clear all roles (used rarely – e.g. full app reset)
    (["Admin", "Seller", "Customer", "Delivery"] as UserRole[]).forEach(
      (r) => {
        localStorage.removeItem(getTokenStorageKey(r));
        localStorage.removeItem(getUserStorageKey(r));
      }
    );
  }
  localStorage.removeItem("fcm_token_web"); // Clear FCM registration cache on logout
};

// Export storage key helpers for AuthContext and services
export const getUserStorageKeyForRole = (role: UserRole) =>
  getUserStorageKey(role);

export default api;
