export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">설정</h1>
        <p className="mt-1 text-sm text-gray-500">
          메인 대시보드와 접근 권한 규칙이 안정화된 뒤 다시 연결될 영역입니다.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mb-3 text-4xl text-gray-400">&#9881;</div>
        <p className="text-base font-medium text-gray-700">설정 화면은 아직 열려 있지 않습니다</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-500">
          컬럼 매핑, 임계값, 기타 운영 설정은 접근 권한 규칙이 끝까지 확인된 뒤 다시 붙일 예정입니다.
        </p>
      </div>
    </div>
  );
}
