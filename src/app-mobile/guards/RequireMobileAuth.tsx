import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMobileAuth } from "../hooks/useMobileAuth";

export const RequireMobileAuth = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useMobileAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="h-10 w-10 rounded-full border-4 border-[hsl(165_91%_25%)] border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/app/auth" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
};

export default RequireMobileAuth;
