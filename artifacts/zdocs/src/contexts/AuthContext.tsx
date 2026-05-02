import { createContext, useContext, ReactNode } from "react";
import { useAuth as useReplitAuth } from "@workspace/replit-auth-web";

interface AuthContextType {
  user: { id: string; email?: string; displayName?: string } | null;
  userId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signIn: () => void;
  // Backwards-compat shim. Cookies handle auth, so this always resolves to null.
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: replitUser, isLoading, login, logout } = useReplitAuth();

  const user = replitUser
    ? {
        id: replitUser.id,
        email: replitUser.email ?? undefined,
        displayName:
          [replitUser.firstName, replitUser.lastName]
            .filter(Boolean)
            .join(" ") ||
          replitUser.email ||
          "User",
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.id ?? null,
        loading: isLoading,
        signOut: async () => logout(),
        signIn: login,
        getToken: async () => null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
