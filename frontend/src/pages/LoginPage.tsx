import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import type { Role } from "../types/common";

const DEMO_ROLES: { role: Role; label: string; desc: string }[] = [
  { role: "admin", label: "관리자", desc: "모든 메뉴 접근 가능" },
  { role: "scm", label: "SCM", desc: "SCM 대시보드와 업로드 접근" },
  { role: "pnl", label: "P&L", desc: "P&L 대시보드와 업로드 접근" },
  { role: "readonly", label: "읽기 전용", desc: "조회만 가능" },
];

function getDefaultRoute(role: Role): string {
  if (role === "pnl") return "/pnl";
  return "/scm";
}

export default function LoginPage() {
  const { signIn, loginDemo } = useAuthStore();
  const navigate = useNavigate();

  const [tab, setTab] = useState<"login" | "demo">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>("admin");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      const role = useAuthStore.getState().role ?? "readonly";
      navigate(getDefaultRoute(role));
    }
  }

  function handleDemo() {
    loginDemo(selectedRole);
    navigate(getDefaultRoute(selectedRole));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <h1 className="mb-1 text-2xl font-bold text-gray-800">시그널 데스크</h1>
        <p className="mb-6 text-sm text-gray-500">SCM과 P&amp;L을 함께 보는 운영 화면</p>

        <div className="mb-4 flex border-b">
          <button
            onClick={() => setTab("login")}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              tab === "login"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            이메일 로그인
          </button>
          <button
            onClick={() => setTab("demo")}
            className={`flex-1 pb-2 text-sm font-medium transition-colors ${
              tab === "demo"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            데모 체험
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>
        ) : (
          <>
            <p className="mb-3 text-sm font-medium text-gray-700">체험할 역할을 선택하세요</p>
            <div className="mb-6 space-y-2">
              {DEMO_ROLES.map(({ role, label, desc }) => (
                <label
                  key={role}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                    selectedRole === role
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={role}
                    checked={selectedRole === role}
                    onChange={() => setSelectedRole(role)}
                    className="accent-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-800">{label}</div>
                    <div className="text-xs text-gray-400">{desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <button
              onClick={handleDemo}
              className="w-full rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-colors hover:bg-blue-700"
            >
              데모로 들어가기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
