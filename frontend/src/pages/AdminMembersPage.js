import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAdminMembers, fetchMemberCounts, updateMemberStatus } from '../api/members';
import { ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { BODY_LABELS, VEHICLE_LABELS } from '../order/presentation';

// 관리자 전용 회원 관리 화면 (시안: docs/design/screens/admin-members.png)
export default function AdminMembersPage() {
  const { me } = useAuth();
  const [params, setParams] = useSearchParams();

  // URL 쿼리 파라미터 동기화
  const activeRole = params.get('role') ?? '';
  const searchKeyword = params.get('keyword') ?? '';
  const rawPage = params.get('page') ?? '0';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 0;

  // 로컬 검색어 인풋 상태
  const [keywordInput, setKeywordInput] = useState(searchKeyword);

  const query = params.toString();
  const [attempt, setAttempt] = useState(0);
  const key = `${query}:${attempt}`;
  const [result, setResult] = useState(null);
  const [counts, setCounts] = useState({ total: 0, shipper: 0, driver: 0 });

  // 상태 변경 컨펌 모달 상태
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');

  // 1. 역할별 카운트 조회
  useEffect(() => {
    const controller = new AbortController();
    fetchMemberCounts({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted && data) {
          setCounts(data);
        }
      })
      .catch(() => {
        // 통계 카운트 실패 시 무시
      });
    return () => controller.abort();
  }, [attempt]);

  // 2. 회원 목록 조회
  useEffect(() => {
    const controller = new AbortController();

    fetchAdminMembers(
      {
        role: activeRole,
        keyword: searchKeyword,
        page,
        size: 10,
        sort: 'id,desc',
      },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key, data });
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setResult({
            key,
            error: err.message || '회원 목록을 불러오지 못했습니다.',
          });
        }
      });

    return () => controller.abort();
  }, [key, activeRole, searchKeyword, page]);

  const loading = result?.key !== key;
  const membersData = loading ? null : result?.data;
  const error = loading ? '' : result?.error;

  // 역할 탭 변경 핸들러
  const handleSelectRoleTab = (roleValue) => {
    const nextParams = new URLSearchParams(params);
    if (roleValue) {
      nextParams.set('role', roleValue);
    } else {
      nextParams.delete('role');
    }
    nextParams.set('page', '0');
    setParams(nextParams);
  };

  // 검색 폼 제출 핸들러
  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const nextParams = new URLSearchParams(params);
    const trimmed = keywordInput.trim();
    if (trimmed) {
      nextParams.set('keyword', trimmed);
    } else {
      nextParams.delete('keyword');
    }
    nextParams.set('page', '0');
    setParams(nextParams);
  };

  // 페이지 이동 핸들러
  const handlePageChange = (nextPage) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('page', String(nextPage));
    setParams(nextParams);
  };

  // 상태 변경 컨펌 모달 열기/닫기
  const handleOpenConfirm = (member) => {
    const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setConfirmTarget({
      id: member.id,
      name: member.name,
      email: member.email,
      nextStatus,
    });
    setActionError('');
  };

  const handleCloseConfirm = () => {
    if (isSubmitting) return;
    setConfirmTarget(null);
    setActionError('');
  };

  // 상태 변경 실행 핸들러
  const handleConfirmStatusChange = async () => {
    if (!confirmTarget) return;

    try {
      setIsSubmitting(true);
      setActionError('');
      await updateMemberStatus(confirmTarget.id, confirmTarget.nextStatus);
      setConfirmTarget(null);
      setAttempt((prev) => prev + 1);
    } catch (err) {
      setActionError(err.message || '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 차량 정보 렌더링 헬퍼
  const renderVehicleCell = (member) => {
    if (member.role !== 'DRIVER') {
      return <span className="text-subtle">-</span>;
    }
    if (!member.vehicle) {
      return (
        <span className="bg-signal-soft text-signal-ink text-caption inline-flex min-h-6 items-center rounded-sm px-2 font-semibold">
          차량 미등록
        </span>
      );
    }
    const typeLabel = VEHICLE_LABELS[member.vehicle.vehicleType] || member.vehicle.vehicleType;
    const bodyLabel = BODY_LABELS[member.vehicle.bodyType] || member.vehicle.bodyType;
    return (
      <span className="text-body text-copy">
        {typeLabel} {bodyLabel} · <span className="font-mono">{member.vehicle.plateNumber}</span>
      </span>
    );
  };

  // 배차 취소 횟수 렌더링 헬퍼
  const renderCancellationCell = (member) => {
    if (member.role !== 'DRIVER') {
      return <span className="text-subtle">-</span>;
    }
    const count = member.cancellationCount ?? 0;
    return <span className="text-body text-copy font-medium tabular-nums">{count}회</span>;
  };

  const members = membersData?.content ?? [];
  const totalPages = membersData?.totalPages ?? 1;
  const currentPageDisplay = totalPages > 0 ? page + 1 : 1;

  return (
    <section className="space-y-5">
      {/* 1. 화면 상단 타이틀 및 설명 */}
      <div>
        <h1 className="text-h1 text-ink font-bold">회원 관리</h1>
        <p className="text-muted mt-1 text-sm">
          차량 등록 여부와 차주별 배차 취소 횟수를 확인합니다.
        </p>
      </div>

      {actionError && (
        <div className="bg-danger-soft text-danger border-danger/30 rounded-lg border px-4 py-3 text-sm">
          {actionError}
        </div>
      )}

      {/* 2. 상단 탭 필터 및 검색창 (시안 일치) */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        {/* 역할 탭: 전체 N / 화주 N / 차주 N */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSelectRoleTab('')}
            className={`min-h-11 rounded-md border px-4 font-semibold transition-colors ${
              activeRole === ''
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong text-copy bg-white hover:bg-slate-50'
            }`}
          >
            전체 {counts.total}
          </button>
          <button
            type="button"
            onClick={() => handleSelectRoleTab('SHIPPER')}
            className={`min-h-11 rounded-md border px-4 font-semibold transition-colors ${
              activeRole === 'SHIPPER'
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong text-copy bg-white hover:bg-slate-50'
            }`}
          >
            화주 {counts.shipper}
          </button>
          <button
            type="button"
            onClick={() => handleSelectRoleTab('DRIVER')}
            className={`min-h-11 rounded-md border px-4 font-semibold transition-colors ${
              activeRole === 'DRIVER'
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong text-copy bg-white hover:bg-slate-50'
            }`}
          >
            차주 {counts.driver}
          </button>
        </div>

        {/* 우측 검색창 */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder="이름 또는 이메일"
            aria-label="이름 또는 이메일 검색"
            className="border-line-strong text-ink placeholder:text-subtle min-h-11 w-64 rounded-md border bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-5 font-semibold whitespace-nowrap text-white"
          >
            검색
          </button>
        </form>
      </div>

      {/* 3. 회원 목록 테이블 (시안 레이아웃 및 컬럼 일치) */}
      <div className="border-line bg-card overflow-x-auto rounded-lg border shadow-xs">
        <table className="text-body text-copy w-full text-left">
          <thead className="border-line text-caption text-muted border-b bg-slate-50 font-semibold">
            <tr>
              <th scope="col" className="px-5 py-4">
                이름
              </th>
              <th scope="col" className="px-5 py-4">
                역할
              </th>
              <th scope="col" className="px-5 py-4">
                차량
              </th>
              <th scope="col" className="px-5 py-4 text-center">
                배차 취소
              </th>
              <th scope="col" className="px-5 py-4 text-center">
                계정
              </th>
              <th scope="col" className="px-5 py-4 text-right">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {loading ? (
              <tr>
                <td colSpan="6" className="text-muted py-12 text-center">
                  회원 목록을 불러오는 중입니다...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="6" className="text-danger py-12 text-center">
                  <p>{error}</p>
                  <button
                    type="button"
                    onClick={() => setAttempt((p) => p + 1)}
                    className="border-line-strong text-copy mt-3 inline-flex min-h-11 items-center rounded-md border bg-white px-4 text-sm font-semibold hover:bg-slate-50"
                  >
                    다시 시도
                  </button>
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-muted py-12 text-center">
                  등록된 회원이 없습니다.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const isMe = me?.id === member.id;
                const isSuspended = member.status === 'SUSPENDED';

                return (
                  <tr key={member.id} className="hover:bg-slate-50/70">
                    {/* 이름 & 이메일 */}
                    <td className="px-5 py-4">
                      <div className="text-copy font-bold">{member.name}</div>
                      <div className="text-caption text-subtle mt-0.5 font-mono">
                        {member.email}
                      </div>
                    </td>

                    {/* 역할 */}
                    <td className="text-body text-copy px-5 py-4 whitespace-nowrap">
                      {ROLE_LABEL[member.role] || member.role}
                    </td>

                    {/* 차량 정보 */}
                    <td className="px-5 py-4 whitespace-nowrap">{renderVehicleCell(member)}</td>

                    {/* 배차 취소 횟수 */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {renderCancellationCell(member)}
                    </td>

                    {/* 계정 상태 뱃지 (시안: 정상은 회색/연파랑 뱃지, 정지는 진한 빨강 솔리드 뱃지) */}
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      {isSuspended ? (
                        <span className="text-caption inline-flex min-h-6 items-center rounded-sm bg-red-700 px-2.5 font-semibold text-white">
                          정지
                        </span>
                      ) : (
                        <span className="text-caption inline-flex min-h-6 items-center rounded-sm bg-slate-100 px-2.5 font-semibold text-slate-700">
                          정상
                        </span>
                      )}
                    </td>

                    {/* 행동 버튼 (시안: 정상은 계정 정지 버튼, 정지는 정지 해제 버튼) */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {isSuspended ? (
                        <button
                          type="button"
                          disabled={isMe}
                          onClick={() => handleOpenConfirm(member)}
                          className="border-line-strong text-copy text-caption disabled:text-muted inline-flex min-h-9 items-center justify-center rounded-md border bg-white px-3.5 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                        >
                          정지 해제
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isMe}
                          title={isMe ? '본인 계정은 정지할 수 없습니다.' : ''}
                          onClick={() => handleOpenConfirm(member)}
                          className="text-danger text-caption disabled:text-muted inline-flex min-h-9 items-center justify-center rounded-md border border-red-300 bg-white px-3.5 font-semibold hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
                        >
                          계정 정지
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. 하단 페이징 영역 (시안: 좌측 "1쪽 / 전체 4쪽", 우측 "이전", "다음") */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-muted text-sm tabular-nums">
          {currentPageDisplay}쪽 / 전체 {Math.max(totalPages, 1)}쪽
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => handlePageChange(page - 1)}
            className="border-line-strong text-copy disabled:text-muted inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-4 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
          >
            이전
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => handlePageChange(page + 1)}
            className="border-line-strong text-copy disabled:text-muted inline-flex min-h-10 items-center justify-center rounded-md border bg-white px-4 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
          >
            다음
          </button>
        </div>
      </div>

      {/* 5. 계정 정지/해제 컨펌 다이얼로그 (common-dialogs.png 규격) */}
      {confirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="border-line bg-card w-full max-w-[420px] rounded-[10px] border p-6 shadow-2xl">
            <h3 className="text-h2 text-ink font-bold">
              {confirmTarget.nextStatus === 'SUSPENDED'
                ? '계정을 정지할까요?'
                : '계정 정지를 해제할까요?'}
            </h3>
            <p className="text-copy mt-3 text-sm">
              대상: <strong className="text-ink">{confirmTarget.name}</strong> (
              {confirmTarget.email})
            </p>
            <p className="text-muted mt-2 text-sm">
              {confirmTarget.nextStatus === 'SUSPENDED'
                ? '계정이 정지되면 해당 회원은 로그인이 즉시 제한됩니다.'
                : '정지가 해제되면 회원이 정상적으로 로그인할 수 있습니다.'}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCloseConfirm}
                className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4.5 font-semibold hover:bg-slate-50"
              >
                돌아가기
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmStatusChange}
                className={`inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-4.5 font-semibold text-white ${
                  confirmTarget.nextStatus === 'SUSPENDED'
                    ? 'bg-danger hover:bg-red-700'
                    : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {isSubmitting
                  ? '처리 중...'
                  : confirmTarget.nextStatus === 'SUSPENDED'
                    ? '계정 정지'
                    : '정지 해제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
