// AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export type UserRole = "admin" | "staff" | "student";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  position?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  isInitialized: boolean; // ✅ New
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false); // ✅ New
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("nascomsoft-user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsInitialized(true); // ✅ Mark done checking on mount 
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    const storedUser = localStorage.getItem("nascomsoft-user");
    const resolvedEmail =
      email || (storedUser ? JSON.parse(storedUser)?.email : null);

    if (!email) {
      console.error("Email not available. First login must include email.");
      setIsLoading(false);
      return false;
    }

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        {
          email,
          password,
        },
        {
          headers: resolvedEmail
            ? {}
            : {
                "x-stamped-email": email,
              },
        }
      );

      const { user: loggedInUser, token } = response.data;
       console.log("Logged in user:", loggedInUser);

      localStorage.setItem("nascomsoft-user", JSON.stringify(loggedInUser));
      localStorage.setItem("nascomsoft-token", token);
      localStorage.setItem("userRole", loggedInUser.role);
      setUser(loggedInUser);

      if (loggedInUser.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/attendance");
      }

      return true;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("nascomsoft-user");
    localStorage.removeItem("nascomsoft-token");
    navigate("/");
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isLoading, isInitialized }} // ✅ Added `isInitialized`
    >
      {children}
    </AuthContext.Provider>
  );
}
