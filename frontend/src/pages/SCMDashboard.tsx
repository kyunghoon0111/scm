import { Suspense, lazy, useState } from "react";
import ErrorBoundary from "../components/common/ErrorBoundary";
import GlobalFilter from "../components/common/GlobalFilter";

const InventoryOnhand = lazy(() => import("../components/scm/InventoryOnhand"));
const StockoutRisk = lazy(() => import("../components/scm/StockoutRisk"));
const OpenPO = lazy(() => import("../components/scm/OpenPO"));
const LeadTime = lazy(() => import("../components/scm/LeadTime"));
const ShipmentReturn = lazy(() => import("../components/scm/ShipmentReturn"));

interface Tab {
  key: string;
  label: string;
}

const TABS: Tab[] = [
  { key: "onhand", label: "재고 현황" },
  { key: "stockout", label: "품절 위험" },
  { key: "open-po", label: "미입고 발주" },
  { key: "lead-time", label: "리드타임" },
  { key: "shipment-return", label: "출고/반품" },
];

function renderTabContent(tab: string) {
  switch (tab) {
    case "onhand":
      return <InventoryOnhand />;
    case "stockout":
      return <StockoutRisk />;
    case "open-po":
      return <OpenPO />;
    case "lead-time":
      return <LeadTime />;
    case "shipment-return":
      return <ShipmentReturn />;
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

export default function SCMDashboard() {
  const [activeTab, setActiveTab] = useState("onhand");

  return (
    <div className="space-y-5">
      <div className="hero-panel">
        <p className="eyebrow relative z-10">공급망</p>
        <div className="relative z-10 mt-3 max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-gray-900 md:text-4xl">
            재고부터 리드타임, 출고와 반품까지 공급망 지표를 한 화면에서 살펴봅니다.
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-600 md:text-base">
            지금 당장 필요한 재고와 품절 신호는 물론, 입고 지연과 물류 흐름까지 주제별 탭으로 나눠 빠르게 확인할 수 있게 구성했습니다.
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
