export type CoverageNoticeTone = "critical" | "warning" | "info";

export interface CoverageNoticeItem {
  key: string;
  label: string;
  message: string;
  tone?: CoverageNoticeTone;
}

interface CoverageNoticeProps {
  title: string;
  summary: string;
  items: CoverageNoticeItem[];
  successMessage?: string;
}

const TONE_CLASS: Record<CoverageNoticeTone, string> = {
  critical: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
};

export default function CoverageNotice({
  title,
  summary,
  items,
  successMessage = "현재 조회 범위 기준으로 바로 의사결정에 필요한 핵심 원천이 들어와 있습니다.",
}: CoverageNoticeProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <p className="font-semibold">{title}</p>
        <p className="mt-1">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
      <p className="font-semibold">{title}</p>
      <p className="mt-1">{summary}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => {
          const tone = item.tone ?? "warning";
          return (
            <div
              key={item.key}
              className={`rounded-xl border px-3 py-3 ${TONE_CLASS[tone]}`}
            >
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 text-xs opacity-90">{item.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
