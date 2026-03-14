import { type ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { timeGrainLabel } from "../../lib/timeGrain";
import { useAuthStore } from "../../store/authStore";
import { useFilterStore } from "../../store/filterStore";
import MobileTabBar from "./MobileTabBar";

interface NavItem {
  label: string;
  path: string;
  permission: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  scm: "SCM",
  pnl: "P&L",
  ops: "운영",
  readonly: "조회 전용",
};

const NAV_ITEMS: NavItem[] = [
  { label: "SCM", path: "/scm", permission: "scm:read" },
  { label: "P&L", path: "/pnl", permission: "pnl:read" },
  { label: "업로드", path: "/upload", permission: "upload:access" },
  { label: "설정", path: "/settings", permission: "admin:manage" },
  { label: "관리", path: "/admin", permission: "admin:manage" },
];

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, role, permissions, signOut } = useAuthStore();
  const period = useFilterStore((s) => s.period);
  const timeGrain = useFilterStore((s) => s.timeGrain);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => permissions.includes(item.permission));

  return (
    <div className="app-shell flex h-screen">
      <aside
        className={`app-sidebar hidden transition-all duration-200 md:flex md:flex-col ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          {!sidebarCollapsed && (
            <div>
              <p className="eyebrow">운영 대시보드</p>
              <h1 className="mt-1 text-base font-bold text-white">시그널 데스크</h1>
              <p className="text-xs text-slate-300">SCM · P&amp;L 통합 화면</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="rounded-xl p-1 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
            title={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {sidebarCollapsed ? "\u25B6" : "\u25C0"}
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {visibleNav.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`app-sidebar-link flex items-center ${isActive ? "app-sidebar-link-active font-medium" : ""}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="app-header flex h-16 items-center justify-between border-b border-black/5 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-gray-900 md:hidden">시그널 데스크</span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-sm text-gray-500 shadow-sm">
              기준월: <strong className="text-gray-800">{period}</strong> · <strong className="text-gray-800">{timeGrainLabel(timeGrain)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {user && (
              <span className="text-xs text-gray-600 md:text-sm">
                <span className="hidden sm:inline">{user.name} </span>
                <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-500 shadow-sm">
                  {role ? ROLE_LABELS[role] ?? role : ""}
                </span>
              </span>
            )}
            <button
              onClick={() => signOut()}
              className="rounded-full bg-white px-3 py-1.5 text-xs text-gray-500 shadow-sm transition-colors hover:text-gray-900 md:text-sm"
            >
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-3 pb-16 md:p-6 md:pb-6">{children}</main>
      </div>

      <MobileTabBar />
    </div>
  );
}
