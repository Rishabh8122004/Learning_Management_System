import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../context/useAuth";
import PageLoading from "./PageLoading";

// Convenience only: the real protection is on the server (adminMiddleware).
function AdminRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
