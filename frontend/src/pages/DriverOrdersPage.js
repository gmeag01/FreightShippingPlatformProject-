'use strict';

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchMyVehicle, fetchOpenOrders } from '../api/matching';
import MismatchConfirmModal from '../components/MismatchConfirmModal';
import OrderChangedModal from '../components/OrderChangedModal';
import useAcceptOrder from '../hooks/useAcceptOrder';
import {
  LOADING_LABELS,
  formatAmount,
  formatDateTime,
  formatVehicleTag,
} from '../utils/driverOrder';

const TABS = Object.freeze([
  { key: 'CUSTOM', label: '내 차량 맞춤' },
  { key: 'TON_1', label: '1톤' },
  { key: 'TON_2_5', label: '2.5톤' },
  { key: 'TON_5', label: '5톤' },
  { key: 'TON_11', label: '11톤' },
  { key: 'TON_25', label: '25톤' },
]);

const PRIMARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-transparent bg-primary px-4.5 font-semibold whitespace-nowrap text-white hover:bg-primary-dark disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-muted';
const SECONDARY_BUTTON_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-line-strong bg-white px-4.5 font-semibold whitespace-nowrap text-copy hover:bg-slate-50';

// 상단 제목과 내 차량 태그(또는 차량 등록 안내 링크).
function OrdersHeader({ myVehicle }) {
  const vehicleTag = myVehicle?.vehicleType
    ? formatVehicleTag(myVehicle.vehicleType, myVehicle.bodyType)
    : null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-h1-sm sm:text-h1 text-ink font-bold">의뢰 목록</h1>
      {vehicleTag ? (
        <span className="text-caption inline-flex min-h-6 items-center rounded-sm bg-slate-200 px-2.5 py-1 font-medium text-slate-700">
          내 차량 {vehicleTag}
        </span>
      ) : (
        <Link
          to="/driver/vehicle"
          className="bg-signal-soft text-signal-ink text-caption inline-flex min-h-6 items-center rounded-sm px-2.5 py-1 font-semibold"
        >
          차량 등록하러 가기
        </Link>
      )}
    </div>
  );
}

// 차종 필터 탭 모음.
function VehicleTabs({ activeTab, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="차종 필터">
      {TABS.map((tab) => {
        const isSelected = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(tab.key)}
            className={`min-h-11 shrink-0 rounded-md border px-3.5 font-medium ${
              isSelected
                ? 'border-ink bg-ink text-white'
                : 'border-line-strong text-copy bg-white hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// 의뢰 한 건을 보여 주는 카드(driver-orders.png, mobile-driver-orders.png).
function OpenOrderCard({ order, isSubmitting, onAccept }) {
  const vehicleTag = formatVehicleTag(order.requiredVehicleType, order.bodyType);
  return (
    <li className="border-line bg-card rounded-lg border p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
          <div className="min-w-52">
            <div className="flex items-center justify-between gap-2 lg:justify-start">
              <span className="text-caption inline-flex min-h-6 items-center rounded-sm bg-slate-200 px-2 font-medium text-slate-700">
                {vehicleTag}
              </span>
              <p className="text-fare text-ink font-bold tabular-nums lg:hidden">
                {formatAmount(order.fare)}원
              </p>
            </div>
            <p className="text-h2 text-ink mt-2 flex flex-wrap items-center gap-x-2 font-bold">
              <span>{order.pickupRegion}</span>
              <span aria-hidden="true" className="flex items-center">
                <span className="bg-primary size-2 rounded-full" />
                <span className="bg-line-strong h-px w-6" />
                <span className="bg-ink size-2" />
              </span>
              <span className="sr-only">에서</span>
              <span>{order.dropoffRegion}</span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <div>
              <dt className="text-caption text-subtle">상차 희망</dt>
              <dd className="text-body text-copy mt-0.5 font-semibold tabular-nums">
                {formatDateTime(order.pickupAt)}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-subtle">화물</dt>
              <dd className="text-body text-copy mt-0.5 font-semibold tabular-nums">
                {order.itemName} {formatAmount(order.weightKg)}kg
              </dd>
            </div>
            <div>
              <dt className="text-caption text-subtle">상하차</dt>
              <dd className="text-body text-copy mt-0.5 font-semibold">
                {LOADING_LABELS[order.loadingMethod] ?? order.loadingMethod}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-subtle">거리</dt>
              <dd className="text-body text-copy mt-0.5 font-semibold tabular-nums">
                {formatAmount(Math.round(order.distanceKm ?? 0))}km
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col items-stretch gap-2 lg:items-end">
          <p className="text-fare text-ink hidden font-bold tabular-nums lg:block">
            {formatAmount(order.fare)}원
          </p>
          <div className="flex gap-2">
            <Link to={`/driver/orders/${order.id}`} className={SECONDARY_BUTTON_CLASS}>
              상세
            </Link>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onAccept(order)}
              className={`${PRIMARY_BUTTON_CLASS} min-w-32 flex-1 lg:flex-initial`}
            >
              {isSubmitting ? '수락 처리 중…' : '의뢰 수락'}
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

// 목록을 불러오지 못했을 때 다시 시도 카드(common-states.png).
function OrdersLoadError({ onRetry }) {
  return (
    <div role="alert" className="border-line bg-card rounded-lg border p-8 text-center break-keep">
      <p className="text-h2 text-ink font-bold">목록을 불러오지 못했습니다</p>
      <p className="text-muted mt-2 text-sm">연결을 확인한 뒤 다시 시도해 주세요.</p>
      <button type="button" onClick={onRetry} className={`${SECONDARY_BUTTON_CLASS} mt-4`}>
        다시 시도
      </button>
    </div>
  );
}

// 차주 의뢰 목록 화면. 차종 탭으로 거르고, 불일치 경고를 확인한 뒤 수락한다.
export default function DriverOrdersPage() {
  const [activeTab, setActiveTab] = useState('CUSTOM');
  const [myVehicle, setMyVehicle] = useState(null);
  const [vehicleLoaded, setVehicleLoaded] = useState(false);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [banner, setBanner] = useState(null);

  useEffect(() => {
    let active = true;
    fetchMyVehicle()
      .then((vehicle) => {
        if (active) setMyVehicle(vehicle);
      })
      .catch(() => {
        if (active) setMyVehicle(null);
      })
      .finally(() => {
        if (active) setVehicleLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!vehicleLoaded) return undefined;
    const vehicleType = activeTab === 'CUSTOM' ? myVehicle?.vehicleType : activeTab;
    if (activeTab === 'CUSTOM' && !vehicleType) {
      Promise.resolve().then(() => {
        setOrders([]);
        setTotalPages(0);
        setLoadFailed(false);
        setLoading(false);
      });
      return undefined;
    }

    let active = true;
    fetchOpenOrders({ vehicleType, page })
      .then((data) => {
        if (!active) return;
        setOrders(data?.content ?? []);
        setTotalPages(data?.totalPages ?? 0);
        setLoadFailed(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadFailed(true);
        setBanner({ type: 'error', text: err.message });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [vehicleLoaded, activeTab, myVehicle, page]);

  const reloadCurrentOrders = useCallback(async () => {
    const vehicleType = activeTab === 'CUSTOM' ? myVehicle?.vehicleType : activeTab;
    if (activeTab === 'CUSTOM' && !vehicleType) {
      setOrders([]);
      setTotalPages(0);
      setLoadFailed(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadFailed(false);
    try {
      const data = await fetchOpenOrders({ vehicleType, page });
      setOrders(data?.content ?? []);
      setTotalPages(data?.totalPages ?? 0);
    } catch (err) {
      setLoadFailed(true);
      setBanner({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeTab, myVehicle, page]);

  const {
    submittingId,
    mismatchModal,
    changedModal,
    requestAccept,
    executeAccept,
    closeMismatchModal,
    closeChangedModal,
  } = useAcceptOrder({
    onAccepted: async (order) => {
      setBanner({
        type: 'success',
        text: `오더 #${order.id} 배차가 완료되었습니다. 내 운송에서 상차지를 확인하세요.`,
      });
      await reloadCurrentOrders();
    },
    onOrderChanged: async () => {
      setBanner({
        type: 'error',
        text: '화주가 오더 내용을 수정했습니다. 최신 목록으로 다시 불러왔습니다.',
      });
      await reloadCurrentOrders();
    },
    onOrderUnavailable: async (_order, error) => {
      setBanner({ type: 'error', text: error.message });
      await reloadCurrentOrders();
    },
    onFailed: (error) => setBanner({ type: 'error', text: error.message }),
  });

  const handleTabChange = (tabKey) => {
    setLoading(true);
    setActiveTab(tabKey);
    setPage(0);
    setBanner(null);
  };

  const handlePageChange = (nextPage) => {
    setLoading(true);
    setPage(nextPage);
  };

  return (
    <section className="flex flex-col gap-5 break-keep">
      <OrdersHeader myVehicle={myVehicle} />
      <VehicleTabs activeTab={activeTab} onChange={handleTabChange} />

      {banner && (
        <p
          role="status"
          className={`rounded-lg border px-4 py-3.5 text-sm ${
            banner.type === 'success'
              ? 'bg-primary-soft border-blue-200 text-blue-900'
              : 'bg-danger-soft border-red-200 text-red-800'
          }`}
        >
          {banner.text}
        </p>
      )}

      {activeTab === 'CUSTOM' && vehicleLoaded && !myVehicle?.vehicleType ? (
        <div className="border-line bg-card rounded-lg border p-8 text-center">
          <p className="text-h2 text-ink font-bold">등록된 차량이 없습니다</p>
          <p className="text-muted mt-2 text-sm">
            차량을 먼저 등록하거나 상단 차종 탭(1톤~25톤)을 선택해 의뢰를 확인하세요.
          </p>
          <Link to="/driver/vehicle" className={`${PRIMARY_BUTTON_CLASS} mt-4`}>
            내 차량 등록하기
          </Link>
        </div>
      ) : loading ? (
        <p className="text-muted py-8 text-center text-sm">의뢰 목록을 불러오는 중입니다…</p>
      ) : loadFailed ? (
        <OrdersLoadError onRetry={reloadCurrentOrders} />
      ) : orders.length === 0 ? (
        <div className="border-line bg-card rounded-lg border p-8 text-center">
          <p className="text-h2 text-ink font-bold">지금 수락할 수 있는 의뢰가 없습니다</p>
          <p className="text-muted mt-2 text-sm">다른 차종 탭에서 의뢰를 찾아볼 수 있습니다.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-4">
          {orders.map((order) => (
            <OpenOrderCard
              key={order.id}
              order={order}
              isSubmitting={submittingId === order.id}
              onAccept={(target) => {
                setBanner(null);
                requestAccept(target, myVehicle);
              }}
            />
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => handlePageChange(Math.max(0, page - 1))}
            className={`${SECONDARY_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            이전
          </button>
          <span className="text-muted text-sm tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className={`${SECONDARY_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            다음
          </button>
        </div>
      )}

      {mismatchModal && (
        <MismatchConfirmModal
          messages={mismatchModal.messages}
          isSubmitting={submittingId === mismatchModal.order.id}
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
