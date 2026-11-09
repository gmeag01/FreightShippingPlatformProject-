import { useCallback, useEffect, useState } from 'react';
import { JOB_TABS, fetchMyJobs, fetchMyPayouts } from '../api/jobs';

const EMPTY_PAGE = Object.freeze({ content: [], totalElements: 0, totalPages: 0 });

// 탭 두 개의 건수를 함께 보여 주기 위해 진행 중·끝남 목록과 지급 내역을 한 번에 불러온다.
// 고르지 않은 탭은 건수만 쓰므로 첫 페이지만 부른다.
async function loadJobsAndPayouts(activeTab, page) {
  const pageOf = (tab) => (tab === activeTab ? page : 0);
  const [inProgress, finished, payoutResult] = await Promise.all([
    fetchMyJobs({ tab: JOB_TABS.IN_PROGRESS, page: pageOf(JOB_TABS.IN_PROGRESS) }),
    fetchMyJobs({ tab: JOB_TABS.FINISHED, page: pageOf(JOB_TABS.FINISHED) }),
    // 지급 내역을 못 불러와도 운송 목록은 보여야 하므로 실패를 따로 담는다.
    fetchMyPayouts().then(
      (data) => ({ payouts: data?.content ?? [] }),
      (error) => ({ payouts: [], payoutError: error.message }),
    ),
  ]);
  return {
    pages: {
      [JOB_TABS.IN_PROGRESS]: inProgress ?? EMPTY_PAGE,
      [JOB_TABS.FINISHED]: finished ?? EMPTY_PAGE,
    },
    ...payoutResult,
  };
}

// 차주 내 운송 화면의 데이터(탭별 목록, 지급 내역)를 불러오고 다시 불러오는 훅.
export default function useDriverJobs(activeTab, page) {
  const [reloadCount, setReloadCount] = useState(0);
  const [result, setResult] = useState(null);
  const requestKey = `${activeTab}:${page}:${reloadCount}`;

  useEffect(() => {
    let isActive = true;
    loadJobsAndPayouts(activeTab, page)
      .then((data) => {
        // 배차 취소 마감을 지났는지 판단할 기준 시각을 불러온 때로 고정한다.
        if (isActive) setResult({ key: requestKey, data, loadedAt: Date.now() });
      })
      .catch((error) => {
        if (isActive) setResult({ key: requestKey, error });
      });
    return () => {
      isActive = false;
    };
  }, [activeTab, page, requestKey]);

  const reload = useCallback(() => setReloadCount((count) => count + 1), []);
  const isLoading = result?.key !== requestKey;
  return { result, isLoading, reload };
}
