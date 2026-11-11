'use strict';

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchMyVehicle, fetchOpenOrderDetail } from '../api/matching';
import MismatchConfirmModal from '../components/MismatchConfirmModal';
import OrderChangedModal from '../components/OrderChangedModal';
import RegionApproximateMap from '../components/RegionApproximateMap';
import useAcceptOrder from '../hooks/useAcceptOrder';
import {
  BODY_LABELS,
  CARGO_TYPE_LABELS,
  LOADING_LABELS,
  PACKAGE_UNIT_LABELS,
  VEHICLE_LABELS,
  VEHICLE_MAX_LOAD,
  checkMyVehicleMismatch,
  formatAmount,
  formatCancelCutoffTime,
  formatDateTime,
  formatVehicleTag,
} from '../utils/driverOrder';

const CARD_CLASS = 'rounded-lg border border-line bg-card p-4 sm:p-5';
const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-transparent bg-primary px-4.5 font-semibold whitespace-nowrap text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-muted';
const SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-white px-4.5 font-semibold whitespace-nowrap text-copy hover:bg-slate-50';
const DETAIL_STEPS = Object.freeze(['등록', '배차', '운송', '수령 확인', '완료']);

// 항목 이름과 값을 한 칸으로 보여 준다.
function DetailField({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-subtle">{label}</dt>
      <dd className="text-body text-copy mt-1 font-semibold break-words tabular-nums">
        {children || '-'}
      </dd>
    </div>
  );
}

// 표처럼 좌우로 마주 보는 한 줄(내 차량 확인 카드에서 사용).
function SummaryRow({ label, value }) {
  return (
    <div className="border-line flex items-center justify-between gap-3 border-b py-2.5 text-sm last:border-b-0">
      <dt className="text-subtle">{label}</dt>
      <dd className="text-ink text-right font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// 오더 번호, 등록됨 뱃지, 차종 태그, 시·구 구간 표시와 운임을 그린다.
function OrderDetailHeader({ detail }) {
  const vehicleTag = formatVehicleTag(detail.requiredVehicleType, detail.bodyType);
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-muted font-mono">#{detail.id}</span>
          <span className="bg-status-registered text-status-registered-ink text-caption inline-flex min-h-6 items-center rounded-sm px-2.5 font-semibold whitespace-nowrap">
            등록됨
          </span>
          {vehicleTag && (
            <span className="text-caption inline-flex min-h-6 items-center rounded-sm bg-slate-200 px-2 font-medium text-slate-700">
              {vehicleTag}
            </span>
          )}
        </div>
        <h1 className="text-h1-sm sm:text-h1 text-ink flex flex-wrap items-center gap-x-2 font-bold">
          <span>{detail.pickupRegion}</span>
          <span aria-hidden="true" className="flex items-center">
            <span className="bg-primary size-2 rounded-full" />
            <span className="bg-line-strong h-px w-6" />
            <span className="bg-ink size-2" />
          </span>
          <span className="sr-only">에서</span>
          <span>{detail.dropoffRegion}</span>
        </h1>
      </div>
      <p className="text-fare-lg text-ink hidden font-bold tabular-nums sm:block">
        {formatAmount(detail.fare)}원
      </p>
    </div>
  );
}

// 수락 전 단계(등록 완료 → 지금 할 일은 배차)를 다섯 칸 진행 막대로 보여 준다.
function RegistrationProgressCard() {
  return (
    <div className={CARD_CLASS}>
      <ol className="grid grid-cols-5" aria-label="운송 진행 단계">
        {DETAIL_STEPS.map((step, index) => {
          const isDone = index === 0;
          const isCurrent = index === 1;
          const dotColor = isCurrent
            ? 'border-ink bg-signal'
            : isDone
              ? 'border-primary bg-primary'
              : 'border-line-strong bg-white';
          return (
            <li key={step} className="flex flex-col items-center gap-1.5">
              <span className="flex w-full items-center">
                <span
                  className={`h-0.5 flex-1 ${
                    index === 0 ? '' : isDone || isCurrent ? 'bg-primary' : 'bg-line-strong'
                  }`}
                />
                <span className={`size-4 shrink-0 rounded-full border-2 ${dotColor}`} />
                <span
                  className={`h-0.5 flex-1 ${
                    index === DETAIL_STEPS.length - 1
                      ? ''
                      : isDone
                        ? 'bg-primary'
                        : 'bg-line-strong'
                  }`}
                />
              </span>
              <span
                className={`text-caption ${isCurrent ? 'text-ink font-semibold' : 'text-subtle'}`}
              >
                {step}
                {isCurrent && <span className="sr-only"> (지금 단계)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// 수락 안내 알림과 데스크톱용 의뢰 수락·목록으로 버튼을 보여 준다.
function AcceptPromptNotice({ detail, isSubmitting, onAccept }) {
  const cutoffText = formatCancelCutoffTime(detail.pickupAt);
  return (
    <div className="bg-primary-soft rounded-lg border border-blue-200 px-4 py-3.5 text-sm text-blue-900">
      <p className="text-ink hidden font-bold sm:block">이 의뢰를 수락할까요?</p>
      <p className="sm:mt-1">
        수락하면 상세주소와 현장 담당자 연락처를 볼 수 있습니다. 상차 희망 시각 2시간 전(
        <span className="tabular-nums">{cutoffText}</span>)까지 직접 취소할 수 있습니다.
      </p>
      <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onAccept}
          className={PRIMARY_BUTTON_CLASS}
        >
          {isSubmitting ? '수락 처리 중…' : '의뢰 수락'}
        </button>
        <Link to="/driver/orders" className={SECONDARY_BUTTON_CLASS}>
          목록으로
        </Link>
      </div>
    </div>
  );
}

// 운송 정보 카드: 상·하차 지역(시·구), 일시, 거리, 요구 차종, 적재함, 상하차 방식, 대략 영역 지도.
function TransportInfoCard({ detail }) {
  return (
    <section className={`${CARD_CLASS} flex flex-col gap-5`}>
      <h2 className="text-h2 text-ink font-bold">운송 정보</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex gap-3">
          <span aria-hidden="true" className="bg-primary mt-1.5 size-2.5 shrink-0 rounded-full" />
          <div>
            <p className="text-caption text-subtle">상차 지역</p>
            <p className="text-body text-ink mt-1 font-semibold">{detail.pickupRegion}</p>
            <p className="text-caption text-muted mt-0.5 tabular-nums">
              상차 희망 {formatDateTime(detail.pickupAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <span aria-hidden="true" className="bg-ink mt-1.5 size-2.5 shrink-0" />
          <div>
            <p className="text-caption text-subtle">하차 지역</p>
            <p className="text-body text-ink mt-1 font-semibold">{detail.dropoffRegion}</p>
            <p className="text-caption text-muted mt-0.5 tabular-nums">
              도착 희망 {formatDateTime(detail.arriveBy)}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DetailField label="거리">
          {`${formatAmount(Math.round(detail.distanceKm ?? 0))}km`}
        </DetailField>
        <DetailField label="요구 차종">
          {VEHICLE_LABELS[detail.requiredVehicleType] ?? detail.requiredVehicleType}
        </DetailField>
        <DetailField label="적재함">
          {detail.bodyType ? (BODY_LABELS[detail.bodyType] ?? detail.bodyType) : '차체 무관'}
        </DetailField>
        <DetailField label="상하차">
          {LOADING_LABELS[detail.loadingMethod] ?? detail.loadingMethod}
        </DetailField>
      </dl>

      {detail.memo && (
        <dl>
          <DetailField label="요청 사항">{detail.memo}</DetailField>
        </dl>
      )}

      <RegionApproximateMap
        pickupRegion={detail.pickupRegion}
        dropoffRegion={detail.dropoffRegion}
      />
    </section>
  );
}

// 화물 정보 카드: 품목명, 화물 종류, 중량, 수량, 크기, 취급 주의.
function CargoInfoCard({ detail }) {
  const hasSize = detail.widthCm && detail.depthCm && detail.heightCm;
  const handlingText = [detail.fragile && '파손주의', detail.noStack && '적재 금지']
    .filter(Boolean)
    .join(', ');

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-4`}>
      <h2 className="text-h2 text-ink font-bold">화물 정보</h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <DetailField label="품목명">{detail.itemName}</DetailField>
        <DetailField label="화물 종류">
          {detail.cargoType ? (CARGO_TYPE_LABELS[detail.cargoType] ?? detail.cargoType) : '일반'}
        </DetailField>
        <DetailField label="중량">{`${formatAmount(detail.weightKg)}kg`}</DetailField>
        <DetailField label="수량">
          {`${detail.quantity} ${PACKAGE_UNIT_LABELS[detail.packageUnit] ?? detail.packageUnit ?? ''}`}
        </DetailField>
        {hasSize && (
          <DetailField label="크기">
            {`${detail.widthCm}×${detail.depthCm}×${detail.heightCm}cm`}
          </DetailField>
        )}
        {handlingText && <DetailField label="취급 주의">{handlingText}</DetailField>}
      </dl>
    </section>
  );
}

// 내 차량과 오더 요구 조건(차종·최대 적재량)을 비교해 보여 주는 카드.
function VehicleCheckCard({ myVehicle, detail }) {
  const mismatchWarnings = checkMyVehicleMismatch(myVehicle, detail);
  const myMaxLoadKg = myVehicle?.vehicleType
    ? (myVehicle.maxLoadKg ?? VEHICLE_MAX_LOAD[myVehicle.vehicleType])
    : null;
  const hasVehicle = Boolean(myVehicle?.vehicleType);
  const isMatch = hasVehicle && mismatchWarnings.length === 0;

  return (
    <section className={`${CARD_CLASS} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h2 text-ink font-bold">내 차량 확인</h2>
        {!hasVehicle ? (
          <Link
            to="/driver/vehicle"
            className="text-caption text-primary-dark font-semibold underline"
          >
            차량 등록하러 가기
          </Link>
        ) : isMatch ? (
          <span className="bg-primary-soft text-caption inline-flex min-h-6 items-center rounded-sm border border-blue-200 px-2.5 font-medium text-blue-900">
            수락 가능
          </span>
        ) : (
          <span className="bg-signal-soft text-signal-ink text-caption inline-flex min-h-6 items-center rounded-sm border border-orange-300 px-2.5 font-medium">
            조건 확인 필요
          </span>
        )}
      </div>

      {!hasVehicle ? (
        <p className="text-muted text-sm">
          등록된 차량이 없습니다. 의뢰를 수락하려면 먼저 내 차량을 등록해 주세요.
        </p>
      ) : (
        <>
          <dl>
            <SummaryRow
              label="내 차량"
              value={formatVehicleTag(myVehicle.vehicleType, myVehicle.bodyType)}
            />
            <SummaryRow
              label="요구 차종"
              value={VEHICLE_LABELS[detail.requiredVehicleType] ?? detail.requiredVehicleType}
            />
            <SummaryRow
              label="화물 중량 / 최대 적재량"
              value={`${formatAmount(detail.weightKg)}kg / ${formatAmount(myMaxLoadKg)}kg`}
            />
          </dl>
          {mismatchWarnings.length > 0 && (
            <div className="bg-signal-soft text-signal-ink rounded-lg border border-orange-300 px-4 py-3.5 text-sm">
              {mismatchWarnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// 우측 보조 영역의 운임·에스크로 보관 안내 카드.
function FareEscrowCard({ detail }) {
  return (
    <section className={CARD_CLASS}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-h2 text-ink font-bold">운임</h2>
        <span className="bg-primary-soft text-caption inline-flex min-h-6 items-center rounded-sm px-2 font-medium text-blue-900">
          보관중
        </span>
      </div>
      <p className="text-fare text-ink mt-3 hidden font-bold tabular-nums sm:block">
        {formatAmount(detail.fare)}원
      </p>
      {detail.recommendedFare > 0 && (
        <p className="text-caption text-subtle mt-1 tabular-nums">
          추천 운임 {formatAmount(detail.recommendedFare)}원
        </p>
      )}
      <p className="text-muted mt-3 text-sm">
        화주가 결제한 운임을 플랫폼이 보관합니다. 수령 확인이 끝나면 지급하고, 하차 후 24시간 동안
        확인이 없으면 자동으로 지급합니다.
      </p>
    </section>
  );
}

// 휴대폰 폭(<640px) 하단에 고정되는 운임·의뢰 수락 막대(mobile-driver-order-detail.png).
function MobileAcceptBar({ fare, isSubmitting, onAccept }) {
  return (
    <div className="border-line bg-card sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t px-4 py-3 sm:hidden">
      <div>
        <p className="text-caption text-subtle">운임</p>
        <p className="text-fare text-ink font-bold tabular-nums">{formatAmount(fare)}원</p>
      </div>
      <button
        type="button"
        disabled={isSubmitting}
        onClick={onAccept}
        className={`${PRIMARY_BUTTON_CLASS} flex-1`}
      >
        {isSubmitting ? '수락 처리 중…' : '의뢰 수락'}
      </button>
    </div>
  );
}

// 수락 전 의뢰 상세 화면. 주소는 시·구까지만 보이고, 정확한 주소와 연락처는 수락(배차) 뒤에 열린다.
export default function DriverOrderDetailPage() {
  const { id } = useParams();
  const isValidId = /^[1-9]\d*$/.test(id ?? '') && Number.isSafeInteger(Number(id));
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [myVehicle, setMyVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(isValidId);
  const [reloadCount, setReloadCount] = useState(0);
  const [banner, setBanner] = useState(null);
  const [loadError, setLoadError] = useState(
    isValidId ? null : '올바르지 않은 의뢰 주소입니다. 목록에서 의뢰를 선택해 주세요.',
  );

  const {
    submittingId,
    mismatchModal,
    changedModal,
    requestAccept,
    executeAccept,
    closeMismatchModal,
    closeChangedModal,
  } = useAcceptOrder({
    onAccepted: async () => navigate('/driver/jobs'),
    onOrderChanged: async () => {
      setBanner({
        type: 'error',
        text: '화주가 오더 내용을 수정했습니다. 바뀐 내용을 확인한 뒤 다시 수락해 주세요.',
      });
      setReloadCount((count) => count + 1);
    },
    onOrderUnavailable: async (_order, error) => {
      setDetail(null);
      setLoadError(error.message);
    },
    onFailed: (error) => setBanner({ type: 'error', code: error.code, text: error.message }),
  });

  useEffect(() => {
    let isActive = true;
    fetchMyVehicle()
      .then((vehicle) => {
        if (isActive) setMyVehicle(vehicle);
      })
      .catch(() => {
        if (isActive) setMyVehicle(null);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!isValidId) return undefined;
    let isActive = true;
    fetchOpenOrderDetail(id)
      .then((data) => {
        if (!isActive) return;
        setDetail(data);
        setLoadError(null);
      })
      .catch((error) => {
        if (!isActive) return;
        setDetail(null);
        setLoadError(error.message);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [id, isValidId, reloadCount]);

  if (isLoading) {
    return <p className="text-muted py-8 text-center text-sm">의뢰 정보를 불러오는 중입니다…</p>;
  }

  if (!detail) {
    return (
      <section className="flex flex-col gap-5 break-keep">
        <Link to="/driver/orders" className="text-ink self-start font-semibold underline">
          의뢰 목록으로 돌아가기
        </Link>
        <div
          role="alert"
          className="bg-danger-soft rounded-lg border border-red-200 px-4 py-3.5 text-sm text-red-800"
        >
          {loadError ?? '의뢰를 찾을 수 없습니다.'}
        </div>
      </section>
    );
  }

  const isSubmitting = submittingId === detail.id;
  const handleAccept = () => requestAccept(detail, myVehicle);

  return (
    <section className="flex flex-col gap-5 break-keep">
      <Link to="/driver/orders" className="text-ink self-start font-semibold underline">
        의뢰 목록으로 돌아가기
      </Link>

      {banner && (
        <p
          role="status"
          className="bg-danger-soft rounded-lg border border-red-200 px-4 py-3.5 text-sm text-red-800"
        >
          <span>{banner.text}</span>
          {banner.code === 'VEHICLE_REQUIRED' && (
            <Link to="/driver/vehicle" className="ml-2 font-semibold underline">
              차량 등록하러 가기
            </Link>
          )}
        </p>
      )}

      <OrderDetailHeader detail={detail} />
      <RegistrationProgressCard />
      <AcceptPromptNotice detail={detail} isSubmitting={isSubmitting} onAccept={handleAccept} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <TransportInfoCard detail={detail} />
          <CargoInfoCard detail={detail} />
          <VehicleCheckCard myVehicle={myVehicle} detail={detail} />
        </div>
        <div className="flex flex-col gap-5">
          <FareEscrowCard detail={detail} />
        </div>
      </div>

      <MobileAcceptBar fare={detail.fare} isSubmitting={isSubmitting} onAccept={handleAccept} />

      {mismatchModal && (
        <MismatchConfirmModal
          messages={mismatchModal.messages}
          isSubmitting={isSubmitting}
          onCancel={closeMismatchModal}
          onConfirm={() => executeAccept(mismatchModal.order, true)}
        />
      )}
      {changedModal && (
        <OrderChangedModal
          previousOrder={changedModal.previousOrder}
          updatedOrder={changedModal.updatedOrder}
          isSubmitting={submittingId === changedModal.updatedOrder.id}
          onClose={closeChangedModal}
          onConfirm={() => requestAccept(changedModal.updatedOrder, myVehicle)}
        />
      )}
    </section>
  );
}
