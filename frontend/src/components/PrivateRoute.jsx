import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PrivateRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400 font-light text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/role-select" replace />;
  }

  if (requiredRole && role && role !== requiredRole) {
    return <Navigate to={role === "recruiter" ? "/recruiter" : "/student"} replace />;
  }

  return children;
}

export function AuthRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400 font-light text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-zinc-700 border-t-zinc-200 rounded-full animate-spin" />
          Loading...
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to={role === "recruiter" ? "/recruiter" : "/student"} replace />;
  }

  return children;
}