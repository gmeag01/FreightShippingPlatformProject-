import { useState } from 'react';
import { JOB_TABS } from '../api/jobs';
import JobActionDialogs, { JobBanner } from '../components/jobs/JobActionDialogs';
import JobCard from '../components/jobs/JobCard';
import PayoutPanel from '../components/jobs/PayoutPanel';
import useDriverJobs from '../hooks/useDriverJobs';
import useJobActions from '../hooks/useJobActions';

const TAB_LABELS = Object.freeze({
  [JOB_TABS.IN_PROGRESS]: '진행 중',
  [JOB_TABS.FINISHED]: '완료',
});

const EMPTY_MESSAGES = Object.freeze({
  [JOB_TABS.IN_PROGRESS]: '진행 중인 운송이 없습니다. 의뢰 목록에서 의뢰를 수락해 보세요.',
  [JOB_TABS.FINISHED]: '끝난 운송이 없습니다.',
});

// 차주 내 운송 화면. 진행 중·완료 탭, 상태에 맞는 진행 버튼, 배차 취소, 지급 내역을 보여 준다.
export default function DriverJobsPage() {
  const [activeTab, setActiveTab] = useState(JOB_TABS.IN_PROGRESS);
  const [page, setPage] = useState(0);
  const { result, isLoading, reload } = useDriverJobs(activeTab, page);
  const { banner, setBanner, submittingId, requestAction, requestCancel, dialogs } =
    useJobActions(reload);

  const changeTab = (tab) => {
    setActiveTab(tab);
    setPage(0);
    setBanner(null);
  };

  return (
    <section className="flex flex-col gap-5 break-keep">
      <h1 className="text-h1-sm text-ink sm:text-h1 font-bold">내 운송</h1>
      <JobTabs activeTab={activeTab} pages={result?.data?.pages} onChange={changeTab} />
      <JobBanner banner={banner} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <JobList
          result={result}
          isLoading={isLoading}
          activeTab={activeTab}
          submittingId={submittingId}
          onRetry={reload}
          onAction={requestAction}
          onCancelAssignment={requestCancel}
          onPageChange={setPage}
          page={page}
        />
        <PayoutPanel
          payouts={result?.data?.payouts ?? []}
          errorMessage={result?.data?.payoutError}
        />
      </div>

      <JobActionDialogs {...dialogs} />
    </section>
  );
}

// 진행 중·완료 탭. 탭 이름 옆에 건수를 붙인다.
function JobTabs({ activeTab, pages, onChange }) {
  return (
    <div className="flex gap-2" role="tablist" aria-label="내 운송 구분">
      {Object.values(JOB_TABS).map((tab) => {
        const isSelected = tab === activeTab;
        const count = pages?.[tab]?.totalElements;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab)}
            className={`min-h-11 rounded-md border px-3.5 font-medium tabular-nums ${
              isSelected ? 'border-ink bg-ink text-white' : 'border-line-strong text-copy bg-white'
            }`}
          >
            {TAB_LABELS[tab]}
            {count != null && ` ${count}`}
          </button>
        );
      })}
    </div>
  );
}

// 고른 탭의 운송 카드 목록. 처음 불러오는 중, 실패, 빈 목록을 각각 안내한다.
function JobList({
  result,
  isLoading,
  activeTab,
  page,
  submittingId,
  onRetry,
  onPageChange,
  onAction,
  onCancelAssignment,
}) {
  if (!result) {
    return <p className="text-muted py-8 text-center text-sm">내 운송을 불러오는 중입니다…</p>;
  }
  if (result.error) {
    return <LoadError message={result.error.message} onRetry={onRetry} />;
  }
  const currentPage = result.data.pages[activeTab];
  if (currentPage.content.length === 0) {
    return (
      <p className="border-line bg-card text-muted rounded-lg border p-8 text-center text-sm">
        {EMPTY_MESSAGES[activeTab]}
      </p>
    );
  }
  const payoutByOrderId = new Map(result.data.payouts.map((payout) => [payout.orderId, payout]));
  return (
    <div className={`flex flex-col gap-4 ${isLoading ? 'opacity-60' : ''}`} aria-busy={isLoading}>
      <ul className="flex flex-col gap-4">
        {currentPage.content.map((job) => (
          <JobCard
            key={job.orderId}
            job={job}
            payout={payoutByOrderId.get(job.orderId)}
            now={result.loadedAt}
            isBusy={submittingId === job.orderId || isLoading}
            onAction={onAction}
            onCancelAssignment={onCancelAssignment}
          />
        ))}
      </ul>
      <Pagination page={page} totalPages={currentPage.totalPages} onChange={onPageChange} />
    </div>
  );
}

// 목록을 불러오지 못했을 때의 오류 알림과 다시 불러오기 버튼.
function LoadError({ message, onRetry }) {
  return (
    <div role="alert" className="bg-danger-soft rounded-lg border border-red-200 px-4 py-3.5">
      <p className="text-sm text-red-800">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-copy mt-3 inline-flex min-h-11 items-center rounded-md border border-red-300 bg-white px-4.5 font-semibold hover:bg-slate-50"
      >
        다시 불러오기
      </button>
    </div>
  );
}

// 한 페이지(20건)를 넘을 때만 이전·다음 버튼을 보여 준다.
function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const buttonClass =
    'border-line-strong text-copy inline-flex min-h-11 items-center rounded-md border bg-white px-4 disabled:cursor-not-allowed disabled:opacity-50';
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        type="button"
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
        className={buttonClass}
      >
        이전
      </button>
      <span className="text-muted text-sm tabular-nums">
        {page + 1} / {totalPages}
      </span>
      <button
        type="button"
        disabled={page + 1 >= totalPages}
        onClick={() => onChange(page + 1)}
        className={buttonClass}
      >
        다음
      </button>
    </div>
  );
}
