import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchAdminMemberDetail, fetchAdminMembers, updateMemberStatus } from '../api/members';
import { ROLE_LABEL } from '../auth/roles';
import { useAuth } from '../auth/useAuth';
import { BODY_LABELS, VEHICLE_LABELS, formatDateTime } from '../order/presentation';

// 역할별 뱃지 스타일 매핑
const ROLE_BADGE_STYLES = {
  SHIPPER: 'bg-blue-50 text-blue-700 border-blue-200',
  DRIVER: 'bg-amber-50 text-amber-700 border-amber-200',
  ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
};

// 계정 상태별 뱃지 스타일 매핑
const STATUS_BADGE_STYLES = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SUSPENDED: 'bg-rose-50 text-danger border-rose-200',
};

// 계정 상태 한국어 라벨
const STATUS_LABELS = {
  ACTIVE: '정상',
  SUSPENDED: '정지',
};

// 관리자 전용 회원 관리 화면. 검색 필터와 페이지 번호는 URL에 동기화된다.
export default function AdminMembersPage() {
  const { me } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = params.toString();

  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const [actionError, setActionError] = useState('');

  // 회원 상세 모달 상태
  const [detailModalId, setDetailModalId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // 상태 변경 확인 모달 상태
  const [statusConfirmTarget, setStatusConfirmTarget] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const rawPage = params.get('page') ?? '0';
  const page = /^\d+$/.test(rawPage) ? Number(rawPage) : 0;
  const roleFilter = params.get('role') ?? '';
  const statusFilter = params.get('status') ?? '';
  const keywordFilter = params.get('keyword') ?? '';

  const key = `${query}:${attempt}`;
  const loading = result?.key !== key;

  // 회원 목록 조회
  useEffect(() => {
    const controller = new AbortController();
    fetchAdminMembers(
      {
        role: roleFilter,
        status: statusFilter,
        keyword: keywordFilter,
        page,
        size: 10,
      },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ key, data });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setResult({ key, error: error.message });
        }
      });

    return () => controller.abort();
  }, [key, roleFilter, statusFilter, keywordFilter, page]);

  // 회원 상세 모달 열기 및 닫기
  const handleOpenDetailModal = (id) => {
    setDetailModalId(id);
    setDetailLoading(true);
    setDetailError('');
    setDetailData(null);
  };

  const handleCloseDetailModal = () => {
    setDetailModalId(null);
    setDetailData(null);
    setDetailError('');
  };

  // 회원 상세 조회
  useEffect(() => {
    if (!detailModalId) return;

    const controller = new AbortController();
    fetchAdminMemberDetail(detailModalId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) {
          setDetailData(data);
          setDetailLoading(false);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setDetailError(error.message);
          setDetailLoading(false);
        }
      });

    return () => controller.abort();
  }, [detailModalId]);

  // 검색 폼 제출
  const handleSearch = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextParams = new URLSearchParams();

    const role = formData.get('role');
    const status = formData.get('status');
    const keyword = formData.get('keyword')?.trim();

    if (role) nextParams.set('role', role);
    if (status) nextParams.set('status', status);
    if (keyword) nextParams.set('keyword', keyword);
    nextParams.set('page', '0');

    setParams(nextParams);
  };

  // 검색 조건 초기화
  const handleReset = () => {
    setParams(new URLSearchParams());
  };

  // 페이지 이동
  const handlePageChange = (nextPage) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set('page', String(nextPage));
    setParams(nextParams);
  };

  // 회원 상태 변경 실행
  const handleConfirmStatusChange = async () => {
    if (!statusConfirmTarget) return;
    const { id, nextStatus } = statusConfirmTarget;

    try {
      setIsUpdatingStatus(true);
      setActionError('');
      await updateMemberStatus(id, nextStatus);

      // 성공 시 목록 갱신 및 모달 닫기
      setStatusConfirmTarget(null);
      if (detailModalId === id) {
        // 상세 모달이 열려 있는 경우 상세 데이터도 갱신
        const updatedDetail = await fetchAdminMemberDetail(id);
        setDetailData(updatedDetail);
      }
      setAttempt((prev) => prev + 1);
    } catch (error) {
      setActionError(error.message || '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const pageData = loading ? null : result?.data;
  const members = pageData?.content ?? [];
  const totalElements = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  return (
    <section className="space-y-6">
      {/* 화면 상단 제목 및 안내 */}
      <div>
        <h1 className="text-h1 text-ink font-bold">회원 관리</h1>
        <p className="text-muted mt-1 text-sm">
          전체 화주, 차주, 관리자 회원을 조회하고 계정 상태 및 배차 취소 이력을 관리합니다.
        </p>
      </div>

      {actionError && (
        <div className="bg-danger-soft rounded-lg border border-red-200 px-4 py-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {/* 검색 및 필터 바 */}
      <form
        key={query}
        onSubmit={handleSearch}
        className="border-line bg-card grid gap-4 rounded-lg border p-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label htmlFor="filter-role" className="text-copy min-w-0 text-sm font-medium">
          회원 역할
          <select
            id="filter-role"
            name="role"
            defaultValue={roleFilter}
            className="border-line-strong text-ink mt-1 min-h-11 w-full rounded-md border bg-white px-3 py-2"
          >
            <option value="">전체 역할</option>
            <option value="SHIPPER">화주 (SHIPPER)</option>
            <option value="DRIVER">차주 (DRIVER)</option>
            <option value="ADMIN">관리자 (ADMIN)</option>
          </select>
        </label>

        <label htmlFor="filter-status" className="text-copy min-w-0 text-sm font-medium">
          계정 상태
          <select
            id="filter-status"
            name="status"
            defaultValue={statusFilter}
            className="border-line-strong text-ink mt-1 min-h-11 w-full rounded-md border bg-white px-3 py-2"
          >
            <option value="">전체 상태</option>
            <option value="ACTIVE">정상 (ACTIVE)</option>
            <option value="SUSPENDED">정지 (SUSPENDED)</option>
          </select>
        </label>

        <label
          htmlFor="filter-keyword"
          className="text-copy min-w-0 text-sm font-medium sm:col-span-2 lg:col-span-2"
        >
          회원 검색 (이메일 또는 이름)
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="filter-keyword"
              name="keyword"
              placeholder="이메일 주소 또는 이름을 입력하세요"
              defaultValue={keywordFilter}
              className="border-line-strong text-ink placeholder:text-subtle min-h-11 w-full min-w-0 rounded-md border bg-white px-3 py-2"
            />
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-5 font-semibold whitespace-nowrap text-white"
            >
              검색
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 font-semibold whitespace-nowrap hover:bg-slate-50"
            >
              초기화
            </button>
          </div>
        </label>
      </form>

      {/* 목록 헤더 정보 (총 회원 수) */}
      <div className="text-muted flex items-center justify-between text-sm">
        <span>
          총 <strong className="text-ink">{totalElements}</strong>명의 회원
        </span>
        <span>
          페이지 {totalPages > 0 ? page + 1 : 1} / {Math.max(totalPages, 1)}
        </span>
      </div>

      {/* 회원 목록 테이블 */}
      <div className="border-line overflow-x-auto rounded-lg border bg-white">
        <table className="text-body text-copy w-full text-left">
          <thead className="border-line text-caption text-muted border-b bg-slate-50 font-semibold">
            <tr>
              <th scope="col" className="px-4 py-3.5">
                ID
              </th>
              <th scope="col" className="px-4 py-3.5">
                이름 / 이메일
              </th>
              <th scope="col" className="px-4 py-3.5">
                연락처
              </th>
              <th scope="col" className="px-4 py-3.5">
                역할
              </th>
              <th scope="col" className="px-4 py-3.5">
                상태
              </th>
              <th scope="col" className="px-4 py-3.5">
                가입일시
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-muted py-12 text-center">
                  회원 목록을 불러오는 중입니다...
                </td>
              </tr>
            ) : result?.error ? (
              <tr>
                <td colSpan="7" className="text-danger py-12 text-center">
                  <p>회원 목록 조회 실패: {result.error}</p>
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
                <td colSpan="7" className="text-muted py-12 text-center">
                  조건에 일치하는 회원이 없습니다.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const isMe = me?.id === member.id;
                const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

                return (
                  <tr key={member.id} className="hover:bg-slate-50/70">
                    <td className="text-caption text-muted px-4 py-3.5 font-mono">#{member.id}</td>
                    <td className="px-4 py-3.5">
                      <div className="text-ink font-semibold">{member.name}</div>
                      <div className="text-caption text-subtle">{member.email}</div>
                    </td>
                    <td className="text-copy px-4 py-3.5 tabular-nums">{member.phone || '-'}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-caption inline-flex min-h-6 items-center rounded-sm border px-2 font-semibold whitespace-nowrap ${
                          ROLE_BADGE_STYLES[member.role] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ROLE_LABEL[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-caption inline-flex min-h-6 items-center rounded-sm border px-2 font-semibold whitespace-nowrap ${
                          STATUS_BADGE_STYLES[member.status] || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {STATUS_LABELS[member.status] || member.status}
                      </span>
                    </td>
                    <td className="text-caption text-subtle px-4 py-3.5 whitespace-nowrap tabular-nums">
                      {formatDateTime(member.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(member.id)}
                          className="border-line-strong text-caption text-copy inline-flex min-h-9 items-center rounded-md border bg-white px-3 font-semibold hover:bg-slate-50"
                        >
                          상세보기
                        </button>

                        <button
                          type="button"
                          disabled={isMe}
                          title={isMe ? '본인 계정은 상태를 변경할 수 없습니다.' : ''}
                          onClick={() =>
                            setStatusConfirmTarget({
                              id: member.id,
                              name: member.name,
                              email: member.email,
                              currentStatus: member.status,
                              nextStatus,
                            })
                          }
                          className={`text-caption disabled:text-muted inline-flex min-h-9 items-center rounded-md border px-3 font-semibold disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 ${
                            member.status === 'ACTIVE'
                              ? 'text-danger hover:bg-danger-soft border-red-200 bg-white'
                              : 'text-primary hover:bg-primary-soft border-blue-200 bg-white'
                          }`}
                        >
                          {member.status === 'ACTIVE' ? '정지' : '해제'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => handlePageChange(page - 1)}
            className="border-line-strong text-copy disabled:text-muted inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
          >
            이전
          </button>

          {Array.from({ length: totalPages }, (_, index) => {
            const isCurrent = index === page;
            return (
              <button
                key={index}
                type="button"
                onClick={() => handlePageChange(index)}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border font-semibold tabular-nums ${
                  isCurrent
                    ? 'border-ink bg-ink text-white'
                    : 'border-line-strong text-copy bg-white hover:bg-slate-50'
                }`}
              >
                {index + 1}
              </button>
            );
          })}

          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => handlePageChange(page + 1)}
            className="border-line-strong text-copy disabled:text-muted inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
          >
            다음
          </button>
        </div>
      )}

      {/* 회원 상세 모달 */}
      {detailModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="border-line bg-card w-full max-w-lg rounded-[10px] border p-6 shadow-xl">
            <div className="border-line flex items-center justify-between border-b pb-4">
              <h2 className="text-h2 text-ink font-bold">회원 상세 정보</h2>
              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="text-subtle hover:text-ink"
                aria-label="닫기"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="text-muted py-12 text-center">상세 정보를 조회 중입니다...</div>
            ) : detailError ? (
              <div className="text-danger py-8 text-center">{detailError}</div>
            ) : detailData ? (
              <div className="mt-4 space-y-5">
                {/* 기본 정보 */}
                <div className="bg-ground space-y-3 rounded-lg p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">회원 번호:</span>
                    <span className="text-ink font-mono font-medium">#{detailData.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">이메일:</span>
                    <span className="text-copy font-medium">{detailData.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">이름:</span>
                    <span className="text-copy font-medium">{detailData.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">연락처:</span>
                    <span className="text-copy tabular-nums">{detailData.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">역할:</span>
                    <span
                      className={`text-caption inline-flex min-h-6 items-center rounded-sm border px-2 font-semibold ${
                        ROLE_BADGE_STYLES[detailData.role] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ROLE_LABEL[detailData.role]}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">계정 상태:</span>
                    <span
                      className={`text-caption inline-flex min-h-6 items-center rounded-sm border px-2 font-semibold ${
                        STATUS_BADGE_STYLES[detailData.status] || 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {STATUS_LABELS[detailData.status]}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-subtle">가입 일시:</span>
                    <span className="text-copy tabular-nums">
                      {formatDateTime(detailData.createdAt)}
                    </span>
                  </div>
                </div>

                {/* 차주인 경우 차량 정보 및 배차 취소 횟수 표시 */}
                {detailData.role === 'DRIVER' && (
                  <div className="border-line rounded-lg border bg-white p-4">
                    <h3 className="text-ink text-sm font-bold">차량 및 배차 이력</h3>

                    {detailData.vehicle ? (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                        <div className="text-subtle">차량번호:</div>
                        <div className="text-ink font-mono font-medium">
                          {detailData.vehicle.plateNumber}
                        </div>
                        <div className="text-subtle">차종:</div>
                        <div className="text-copy font-medium">
                          {VEHICLE_LABELS[detailData.vehicle.vehicleType] ||
                            detailData.vehicle.vehicleType}
                        </div>
                        <div className="text-subtle">적재함:</div>
                        <div className="text-copy font-medium">
                          {BODY_LABELS[detailData.vehicle.bodyType] || detailData.vehicle.bodyType}
                        </div>
                      </div>
                    ) : (
                      <div className="text-subtle mt-2 text-sm">등록된 차량 정보가 없습니다.</div>
                    )}

                    {/* 배차 취소 횟수 안내 (설계 문서 3장 규정) */}
                    <div className="border-line mt-4 border-t pt-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-copy font-medium">배차 취소 횟수:</span>
                        <span
                          className={`font-bold tabular-nums ${
                            detailData.cancellationCount > 0 ? 'text-signal-ink' : 'text-copy'
                          }`}
                        >
                          {detailData.cancellationCount}회
                        </span>
                      </div>
                      {detailData.cancellationCount >= 3 && (
                        <p className="text-danger mt-1 text-xs font-medium">
                          ⚠️ 배차 취소 횟수가 3회 이상으로 빈번합니다. 이용 정지 조치를
                          검토하십시오.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* 모달 하단 액션 버튼 */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseDetailModal}
                    className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 font-semibold hover:bg-slate-50"
                  >
                    닫기
                  </button>

                  <button
                    type="button"
                    disabled={me?.id === detailData.id}
                    onClick={() =>
                      setStatusConfirmTarget({
                        id: detailData.id,
                        name: detailData.name,
                        email: detailData.email,
                        currentStatus: detailData.status,
                        nextStatus: detailData.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                      })
                    }
                    className={`disabled:text-muted inline-flex min-h-11 items-center justify-center rounded-md border px-4 font-semibold disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 ${
                      detailData.status === 'ACTIVE'
                        ? 'text-danger hover:bg-danger-soft border-red-200 bg-white'
                        : 'text-primary hover:bg-primary-soft border-blue-200 bg-white'
                    }`}
                  >
                    {detailData.status === 'ACTIVE' ? '계정 정지' : '정지 해제'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 상태 변경 확인 컨펌 다이얼로그 */}
      {statusConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[420px] rounded-[10px] bg-white p-6 shadow-2xl">
            <h3 className="text-h2 text-ink font-bold">
              회원 상태를 {STATUS_LABELS[statusConfirmTarget.nextStatus]}하시겠습니까?
            </h3>
            <p className="text-copy mt-3 text-sm">
              대상 회원: <strong className="text-ink">{statusConfirmTarget.name}</strong> (
              {statusConfirmTarget.email})
            </p>
            <p className="text-muted mt-2 text-sm">
              {statusConfirmTarget.nextStatus === 'SUSPENDED'
                ? '계정이 정지되면 해당 회원은 즉시 서비스 로그인이 차단됩니다.'
                : '계정 정지를 해제하면 정상적으로 로그인 및 서비스를 이용할 수 있습니다.'}
            </p>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={() => setStatusConfirmTarget(null)}
                className="border-line-strong text-copy inline-flex min-h-11 items-center justify-center rounded-md border bg-white px-4 font-semibold hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isUpdatingStatus}
                onClick={handleConfirmStatusChange}
                className={`inline-flex min-h-11 items-center justify-center rounded-md border border-transparent px-4 font-semibold text-white ${
                  statusConfirmTarget.nextStatus === 'SUSPENDED'
                    ? 'bg-danger hover:bg-red-700'
                    : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {isUpdatingStatus ? '처리 중...' : '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
