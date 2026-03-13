import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

interface TabItem {
  label: string;
  path: string;
  permission: string;
}

const TAB_ITEMS: TabItem[] = [
  { label: "SCM", path: "/scm", permission: "scm:read" },
  { label: "P&L", path: "/pnl", permission: "pnl:read" },
  { label: "업로드", path: "/upload", permission: "upload:access" },
  { label: "설정", path: "/settings", permission: "admin:manage" },
  { label: "관리", path: "/admin", permission: "admin:manage" },
];

export default function MobileTabBar() {
  const location = useLocation();
  const permissions = useAuthStore((s) => s.permissions);

  const visibleTabs = TAB_ITEMS.filter((tab) => permissions.includes(tab.permission));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white md:hidden">
      <div className="flex h-14 items-center justify-around">
        {visibleTabs.map((tab) => {
          const isActive = location.pathname.startsWith(tab.path);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex h-full flex-1 items-center justify-center text-xs font-medium ${
                isActive ? "border-t-2 border-blue-600 text-blue-600" : "text-gray-400"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
