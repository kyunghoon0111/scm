import { type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

function AccessDenied() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="p-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-gray-800">접근 권한이 없습니다</h2>
        <p className="text-gray-500">이 페이지가 필요하면 관리자에게 권한을 요청해 주세요.</p>
      </div>
    </div>
  );
}

interface AuthGuardProps {
  permission: string;
  children: ReactNode;
}

export default function AuthGuard({ permission, children }: AuthGuardProps) {
  const { permissions, user } = useAuthStore((s) => ({ permissions: s.permissions, user: s.user }));
  const hydrated = useAuthStore.persist?.hasHydrated?.() ?? true;

  if (!hydrated) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!permissions.includes(permission)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
