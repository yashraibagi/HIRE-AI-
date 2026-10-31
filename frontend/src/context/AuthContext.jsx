import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext(null);

const getStoredRole = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("hireai-role");
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRoleState] = useState(() => getStoredRole());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setRoleState(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("hireai-role");
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const setRole = (nextRole) => {
    setRoleState(nextRole);
    if (typeof window !== "undefined") {
      if (nextRole) {
        localStorage.setItem("hireai-role", nextRole);
      } else {
        localStorage.removeItem("hireai-role");
      }
    }
  };

  const signup = async (email, password, displayName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }

    return userCredential;
  };

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    await signOut(auth);
    setRole(null);
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      return await signInWithPopup(auth, provider);
    } catch (error) {
      if (error.code === "auth/popup-blocked") {
        return signInWithRedirect(auth, provider);
      }
      throw error;
    }
  };

  const value = {
    user,
    role,
    loading,
    login,
    logout,
    loginWithGoogle,
    signup,
    setRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
