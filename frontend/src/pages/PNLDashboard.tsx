import { Suspense, lazy, useState } from "react";
import ErrorBoundary from "../components/common/ErrorBoundary";
import GlobalFilter from "../components/common/GlobalFilter";

const Revenue = lazy(() => import("../components/pnl/Revenue"));
const COGS = lazy(() => import("../components/pnl/COGS"));
const Contribution = lazy(() => import("../components/pnl/Contribution"));
const OperatingProfit = lazy(() => import("../components/pnl/OperatingProfit"));
const ProfitabilityRanking = lazy(() => import("../components/pnl/ProfitabilityRanking"));

interface Tab {
  key: string;
  label: string;
}

const TABS: Tab[] = [
  { key: "revenue", label: "매출" },
  { key: "cogs", label: "COGS" },
  { key: "contribution", label: "공헌이익" },
  { key: "operating-profit", label: "영업이익" },
  { key: "profitability-ranking", label: "수익성 순위" },
];

function renderTabContent(tab: string) {
  switch (tab) {
    case "revenue":
      return <Revenue />;
    case "cogs":
      return <COGS />;
    case "contribution":
      return <Contribution />;
    case "operating-profit":
      return <OperatingProfit />;
    case "profitability-ranking":
      return <ProfitabilityRanking />;
    default:
      return (
        <div className="flex h-64 items-center justify-center">
          <p className="text-lg text-gray-400">아직 준비되지 않은 화면입니다.</p>
        </div>
      );
  }
}

function TabLoading() {
  return <div className="p-8 text-center text-sm text-gray-500">화면을 불러오는 중입니다...</div>;
}

export default function PNLDashboard() {
  const [activeTab, setActiveTab] = useState("revenue");

  return (
    <div className="space-y-5">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">손익</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            매출부터 공헌이익, 영업이익, 수익성 순위까지 한 흐름으로 봅니다.
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            먼저 챙겨야 할 핵심 숫자를 앞에 두고, 필요할 때는 채널과 상품 기준 상세로 바로 내려갈 수 있도록 정리했습니다.
          </p>
        </div>
      </div>

      <GlobalFilter />

      <div className="md:hidden">
        <select
          value={activeTab}
          onChange={(event) => setActiveTab(event.target.value)}
          className="filter-control w-full"
        >
          {TABS.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <nav className="panel-card flex min-w-max gap-2 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`dashboard-tab whitespace-nowrap ${activeTab === tab.key ? "dashboard-tab-active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <ErrorBoundary>
        <Suspense fallback={<TabLoading />}>{renderTabContent(activeTab)}</Suspense>
      </ErrorBoundary>
    </div>
  );
}
