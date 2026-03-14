interface EmptyStateProps {
  message?: string;
}

export default function EmptyState({
  message = "현재 조건에 맞는 데이터가 없습니다. 기간을 넓히거나 필요한 파일을 다시 확인해 주세요.",
}: EmptyStateProps) {
  return (
    <div className="panel-card flex min-h-56 flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-full bg-orange-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
        빈 화면
      </div>
      <p className="mb-1 text-xl font-semibold text-gray-800">보여줄 내용이 아직 없습니다</p>
      <p className="max-w-md text-sm leading-6 text-gray-500">{message}</p>
    </div>
  );
}
