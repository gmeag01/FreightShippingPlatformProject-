import { formatAmount, formatShortDate } from './jobPresentation';

// 내 운송 화면 옆의 지급 내역 카드. 수령 확인이 끝나 차주에게 지급된 금액을 최신순으로 보여 준다.
export default function PayoutPanel({ payouts, errorMessage }) {
  return (
    <section className="border-line bg-card rounded-lg border p-4 sm:p-5">
      <h2 className="text-h2 text-ink font-bold">지급 내역</h2>
      {errorMessage ? (
        <p className="text-danger mt-3 text-sm">{errorMessage}</p>
      ) : payouts.length === 0 ? (
        <p className="text-muted mt-3 text-sm">아직 지급된 운임이 없습니다.</p>
      ) : (
        <ul className="divide-line mt-3 divide-y">
          {payouts.map((payout) => (
            <li
              key={`${payout.orderId}-${payout.paidAt}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <span className="text-subtle tabular-nums">
                {formatShortDate(payout.paidAt)}{' '}
                <span className="font-mono">#{payout.orderId}</span> 지급완료
              </span>
              <span className="text-ink font-semibold whitespace-nowrap tabular-nums">
                {formatAmount(payout.amount)}원
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
