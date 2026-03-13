import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/common/Layout";
import AuthGuard from "./components/common/AuthGuard";

const SCMDashboard = lazy(() => import("./pages/SCMDashboard"));
const PNLDashboard = lazy(() => import("./pages/PNLDashboard"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));

function PageLoading() {
  return <div className="p-8 text-center text-sm text-gray-500">Loading page...</div>;
}

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Navigate to="/scm" replace />} />
          <Route
            path="/scm/*"
            element={
              <AuthGuard permission="scm:read">
                <SCMDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/pnl/*"
            element={
              <AuthGuard permission="pnl:read">
                <PNLDashboard />
              </AuthGuard>
            }
          />
          <Route
            path="/upload"
            element={
              <AuthGuard permission="upload:access">
                <UploadPage />
              </AuthGuard>
            }
          />
          <Route
            path="/settings/*"
            element={
              <AuthGuard permission="admin:manage">
                <SettingsPage />
              </AuthGuard>
            }
          />
          <Route
            path="/admin/*"
            element={
              <AuthGuard permission="admin:manage">
                <AdminPanel />
              </AuthGuard>
            }
          />
        </Routes>
      </Suspense>
    </Layout>
  );
}
