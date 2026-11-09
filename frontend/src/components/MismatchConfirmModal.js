'use strict';

// 불일치 문구 내용에 따라 확인창 제목을 고른다.
function pickDialogTitle(messages) {
  const hasOverweight = messages.some((text) => text.includes('적재량'));
  return hasOverweight ? '적재량을 넘는 화물입니다' : '차량 조건이 맞지 않습니다';
}

// 차종·중량이 내 차량과 맞지 않을 때 띄우는 확인창(ui-guide '경고창'). 확인하면 불일치를 알고도 수락한다.
export default function MismatchConfirmModal({ messages, isSubmitting, onCancel, onConfirm }) {
  const title = pickDialogTitle(messages);

  return (
    <div className="bg-ink/50 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mismatch-dialog-title"
        className="w-full max-w-105 rounded-[10px] bg-white p-6 break-keep shadow-lg"
      >
        <p className="text-caption text-subtle">차주 · 의뢰 수락</p>
        <h2 id="mismatch-dialog-title" className="text-h2 text-ink mt-1 font-bold">
          {title}
        </h2>
        <div className="text-body text-copy mt-3 space-y-1.5">
          {messages.map((message) => (
            <p key={message}>{message}</p>
          ))}
          <p>계속하시겠습니까?</p>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4.5 font-semibold whitespace-nowrap hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            돌아가기
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="bg-primary hover:bg-primary-dark disabled:text-muted inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-4.5 font-semibold whitespace-nowrap text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200"
          >
            {isSubmitting ? '처리 중…' : '확인 후 수락'}
          </button>
        </div>
      </div>
    </div>
  );
}
