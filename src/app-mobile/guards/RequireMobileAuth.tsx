import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMobileAuth } from "../hooks/useMobileAuth";

const buildAuthRedirect = (path: string, search: string) => {
  const target = `${path}${search || ""}`;
  try {
    sessionStorage.setItem("waouh_post_auth_redirect", target);
  } catch {}
  return "/app/auth/email?tab=login";
};

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

  if (!user) {
    return (
      <Navigate
        to={buildAuthRedirect(location.pathname, location.search)}
        replace
        state={{ from: `${location.pathname}${location.search || ""}` }}
      />
    );
  }

  return <>{children}</>;
};

export default RequireMobileAuth;
