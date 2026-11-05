// 차종·중량이 내 차량과 맞지 않을 때 띄우는 확인창. 확인하면 불일치를 알고도 수락한다.
export default function MismatchConfirmModal({ messages, isSubmitting, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        <h2 className="text-base font-bold text-gray-900">차량 조건 불일치 확인</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
        <p className="mt-3 text-sm font-medium text-gray-800">계속하시겠습니까?</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            확인 후 수락
          </button>
        </div>
      </div>
    </div>
  );
}
