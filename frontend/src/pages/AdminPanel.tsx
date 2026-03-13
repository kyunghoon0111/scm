export default function AdminPanel() {
  return (
    <div>
      <h2 className="mb-1 text-lg font-bold md:text-xl">관리</h2>
      <p className="mb-4 text-sm text-gray-500">
        관리자 도구는 대시보드와 접근 권한 규칙이 확정된 뒤 순서대로 다시 붙일 예정입니다.
      </p>

      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mb-3 text-4xl text-gray-400">&#128736;</div>
        <p className="text-base font-medium text-gray-700">관리 도구는 아직 사용할 수 없습니다</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          다음으로 붙일 항목은 업로드 상태, 최근 처리 결과, 기간 제어 기능입니다.
        </p>
      </div>
    </div>
  );
}
