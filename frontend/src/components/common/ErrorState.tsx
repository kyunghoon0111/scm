interface ErrorStateProps {
  title?: string;
  message?: string;
}

export default function ErrorState({
  title = "데이터를 불러오지 못했습니다.",
  message = "현재 필터, 권한, 또는 데이터 파이프라인 상태를 확인한 뒤 다시 시도해 주세요.",
}: ErrorStateProps) {
  return (
    <div className="panel-card border-red-200 bg-red-50/90 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-700">오류</p>
      <p className="mt-2 text-base font-semibold text-red-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-red-700">{message}</p>
    </div>
  );
}
