interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({
  message = "현재 필터 기준으로 표시할 데이터가 없습니다.",
}: EmptyStateProps) {
  return (
    <div className="panel-card flex min-h-56 flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-full bg-orange-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
        비어 있음
      </div>
      <p className="mb-1 text-xl font-semibold text-gray-800">아직 보여줄 내용이 없습니다</p>
      <p className="max-w-md text-sm text-gray-500">{message}</p>
    </div>
  );
}
