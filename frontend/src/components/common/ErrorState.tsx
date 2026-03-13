interface ErrorStateProps {
  title?: string;
  message?: string;
}

export default function ErrorState({
  title = "데이터를 불러오지 못했습니다.",
  message = "현재 필터, mart 접근 권한, role/RLS 설정을 확인한 뒤 다시 시도해 주세요.",
}: ErrorStateProps) {
  return (
    <div className="panel-card border-red-200 bg-red-50/90 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">오류</p>
      <p className="mt-2 text-base font-semibold text-red-900">{title}</p>
      <p className="mt-2 text-sm text-red-700">{message}</p>
    </div>
  );
}
