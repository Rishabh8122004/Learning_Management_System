import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../context/useAuth";
import PageLoading from "./PageLoading";

function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoading />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;