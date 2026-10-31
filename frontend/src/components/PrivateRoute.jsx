import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function PrivateRoute({ children, requiredRole }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
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
    return <div>Loading...</div>;
  }

  if (user) {
    return <Navigate to={role === "recruiter" ? "/recruiter" : "/student"} replace />;
  }

  return children;
}