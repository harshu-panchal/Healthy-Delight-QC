import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  getAuthToken,
  removeAuthToken,
  setAuthToken,
  getUserStorageKeyForRole,
  getCurrentRoleFromPath,
  UserRole,
} from "../services/api/config";

interface User {
  id: string;
  userType?: "Admin" | "Seller" | "Customer" | "Delivery";
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const role: UserRole = getCurrentRoleFromPath();
  const userStorageKey = getUserStorageKeyForRole(role);

  // Initialize state synchronously from localStorage (per-role)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const storedToken = getAuthToken(role);
    const storedUser = localStorage.getItem(userStorageKey);
    return !!(storedToken && storedUser);
  });

  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem(userStorageKey);
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        return userData;
      } catch (error) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return getAuthToken(role);
  });

  // Effect to sync state if localStorage changes externally or on mount validation
  useEffect(() => {
    const storedToken = getAuthToken(role);
    const storedUser = localStorage.getItem(userStorageKey);

    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        if (!isAuthenticated || token !== storedToken) {
          setToken(storedToken);
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        removeAuthToken(role);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    } else if (isAuthenticated) {
      // Logged out
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const login = (newToken: string, userData: User) => {
    const effectiveRole: UserRole =
      userData.userType === "Admin" ||
        userData.userType === "Seller" ||
        userData.userType === "Delivery" ||
        userData.userType === "Customer"
        ? userData.userType
        : role;

    const storageKey = getUserStorageKeyForRole(effectiveRole);

    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
    setAuthToken(newToken, effectiveRole);
    localStorage.setItem(storageKey, JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    removeAuthToken(role);
  };

  const updateUser = (userData: User) => {
    const effectiveRole: UserRole =
      userData.userType === "Admin" ||
        userData.userType === "Seller" ||
        userData.userType === "Delivery" ||
        userData.userType === "Customer"
        ? userData.userType
        : role;
    const storageKey = getUserStorageKeyForRole(effectiveRole);
    setUser(userData);
    localStorage.setItem(storageKey, JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        login,
        logout,
        updateUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
