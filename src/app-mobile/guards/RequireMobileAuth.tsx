import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useMobileAuth } from "../hooks/useMobileAuth";
import { buildWaouhAuthRedirect, normalizeWaouhRedirect } from "@/lib/waouhAccessPolicy";

const buildAuthRedirect = (path: string, search: string) => {
  const target = normalizeWaouhRedirect(`${path}${search || ""}`);
  try {
    sessionStorage.setItem("waouh_post_auth_redirect", target);
  } catch {}
  return buildWaouhAuthRedirect(target);
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
