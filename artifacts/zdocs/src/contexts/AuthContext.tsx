import { createContext, useContext, ReactNode } from "react";
import { useUser, useClerk, useAuth as useClerkAuth } from "@clerk/react";

interface AuthContextType {
  user: { id: string; email?: string; displayName?: string } | null;
  userId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user: clerkUser, isLoaded } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const { getToken } = useClerkAuth();

  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        displayName:
          clerkUser.fullName ||
          clerkUser.firstName ||
          clerkUser.primaryEmailAddress?.emailAddress ||
          "User",
      }
    : null;

  const userId = clerkUser?.id ?? null;

  const signOut = async () => {
    await clerkSignOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        loading: !isLoaded,
        signOut,
        getToken: () => getToken(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
