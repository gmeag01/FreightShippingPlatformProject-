import { ORDER_STATUS, statusLabel } from '../../order/presentation';

// 오더 진행 상태를 색상과 한국어 이름으로 함께 표시한다.
export function OrderStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${ORDER_STATUS[status]?.color ?? 'bg-gray-100 text-gray-700'}`}
    >
      {statusLabel(status)}
    </span>
  );
}

// 상세 정보의 항목과 값을 같은 형태로 표시한다.
export function DetailField({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-words text-gray-900">{children ?? '—'}</dd>
    </div>
  );
}

// 조회 실패 메시지와 재시도 동작을 함께 제공한다.
export function OrderLoadError({ message, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5">
      <p className="text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-100"
      >
        다시 불러오기
      </button>
    </div>
  );
}
