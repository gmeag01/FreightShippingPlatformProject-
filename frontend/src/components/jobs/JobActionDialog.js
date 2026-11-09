// 상차 완료·하차 완료를 누르기 전에 한 번 더 묻는 확인창(ui-guide '경고창').
export default function JobActionDialog({ job, action, isSubmitting, onCancel, onConfirm }) {
  return (
    <div className="bg-ink/50 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-action-title"
        className="w-full max-w-105 rounded-[10px] bg-white p-6 shadow-lg"
      >
        <h2 id="job-action-title" className="text-h2 text-ink font-bold">
          #{job.orderId} {action.label}
        </h2>
        <p className="text-copy mt-3 text-sm">{action.confirmText}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4.5 font-semibold whitespace-nowrap hover:bg-slate-50"
          >
            닫기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="bg-primary hover:bg-primary-dark disabled:text-muted inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-4.5 font-semibold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            {isSubmitting ? '처리 중…' : action.label}
          </button>
        </div>
      </div>
    </div>
  );
}
