import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { acceptOrder, fetchMyVehicle, fetchOpenOrders } from '../api/matching';

const VEHICLE_LABELS = Object.freeze({
  TON_1: '1톤',
  TON_2_5: '2.5톤',
  TON_5: '5톤',
  TON_11: '11톤',
  TON_25: '25톤',
});

const VEHICLE_MAX_LOAD = Object.freeze({
  TON_1: 1000,
  TON_2_5: 2500,
  TON_5: 5000,
  TON_11: 11000,
  TON_25: 25000,
});

const BODY_LABELS = Object.freeze({
  CARGO: '카고',
  WING: '윙바디',
  BOX: '탑차',
  REFRIGERATED: '냉장·냉동',
});

const LOADING_LABELS = Object.freeze({
  FORKLIFT: '지게차',
  MANUAL: '수작업',
});

const TABS = Object.freeze([
  { key: 'CUSTOM', label: '내 차량 맞춤' },
  { key: 'TON_1', label: '1톤' },
  { key: 'TON_2_5', label: '2.5톤' },
  { key: 'TON_5', label: '5톤' },
  { key: 'TON_11', label: '11톤' },
  { key: 'TON_25', label: '25톤' },
]);

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildMismatchMessages({ driverVehicleType, requiredVehicleType, weightKg, maxLoadKg }) {
  const messages = [];
  if (driverVehicleType && requiredVehicleType && driverVehicleType !== requiredVehicleType) {
    const myLabel = VEHICLE_LABELS[driverVehicleType] ?? driverVehicleType;
    const reqLabel = VEHICLE_LABELS[requiredVehicleType] ?? requiredVehicleType;
    messages.push(`보유 차량(${myLabel})과 요구 차종(${reqLabel})이 다릅니다.`);
  }
  const numWeight = Number(weightKg);
  const numMax = Number(maxLoadKg);
  if (Number.isFinite(numWeight) && Number.isFinite(numMax) && numWeight > numMax) {
    messages.push(
      `화물 중량(${numWeight.toLocaleString()}kg)이 차량 최대 적재량(${numMax.toLocaleString()}kg)을 넘습니다.`,
    );
  }
  return messages;
}

export default function DriverOrdersPage() {
  const [activeTab, setActiveTab] = useState('CUSTOM');
  const [myVehicle, setMyVehicle] = useState(null);
  const [vehicleLoaded, setVehicleLoaded] = useState(false);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [mismatchModal, setMismatchModal] = useState(null);

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
    if (!vehicleLoaded) return;
    const vehicleType = activeTab === 'CUSTOM' ? myVehicle?.vehicleType : activeTab;
    if (activeTab === 'CUSTOM' && !vehicleType) {
      Promise.resolve().then(() => {
        setOrders([]);
        setTotalPages(0);
        setLoading(false);
      });
      return;
    }

    let active = true;
    fetchOpenOrders({ vehicleType, page })
      .then((data) => {
        if (!active) return;
        setOrders(data?.content ?? []);
        setTotalPages(data?.totalPages ?? 0);
      })
      .catch((err) => {
        if (!active) return;
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
      return;
    }
    setLoading(true);
    try {
      const data = await fetchOpenOrders({ vehicleType, page });
      setOrders(data?.content ?? []);
      setTotalPages(data?.totalPages ?? 0);
    } catch (err) {
      setBanner({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }, [activeTab, myVehicle, page]);

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

  const executeAccept = async (order, confirmMismatch) => {
    setSubmittingId(order.id);
    setBanner(null);
    try {
      await acceptOrder(order.id, { version: order.version, confirmMismatch });
      setMismatchModal(null);
      setBanner({ type: 'success', text: `오더 #${order.id} 배차가 완료되었습니다.` });
      await reloadCurrentOrders();
    } catch (err) {
      if (err.code === 'VEHICLE_MISMATCH') {
        const messages = buildMismatchMessages(err.fieldErrors ?? {});
        setMismatchModal({
          order,
          messages:
            messages.length > 0
              ? messages
              : ['보유 차량과 오더 요구 조건이 다릅니다. 계속하시겠습니까?'],
        });
      } else if (err.code === 'ORDER_CHANGED') {
        setMismatchModal(null);
        setBanner({
          type: 'error',
          text: '화주가 오더 내용을 수정했습니다. 최신 목록으로 다시 불러왔습니다.',
        });
        await reloadCurrentOrders();
      } else {
        setMismatchModal(null);
        setBanner({ type: 'error', text: err.message });
        if (err.code === 'ORDER_ALREADY_ASSIGNED') {
          await reloadCurrentOrders();
        }
      }
    } finally {
      setSubmittingId(null);
    }
  };

  const handleAcceptClick = (order) => {
    if (myVehicle?.vehicleType) {
      const driverVehicleType = myVehicle.vehicleType;
      const maxLoadKg = myVehicle.maxLoadKg ?? VEHICLE_MAX_LOAD[driverVehicleType];
      const messages = buildMismatchMessages({
        driverVehicleType,
        requiredVehicleType: order.requiredVehicleType,
        weightKg: order.weightKg,
        maxLoadKg,
      });
      if (messages.length > 0) {
        setMismatchModal({ order, messages });
        return;
      }
    }
    executeAccept(order, false);
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">화물 의뢰 목록</h1>
        {myVehicle?.vehicleType ? (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            내 차량: {VEHICLE_LABELS[myVehicle.vehicleType] ?? myVehicle.vehicleType}
          </span>
        ) : (
          <Link
            to="/driver/vehicle"
            className="rounded-md bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200"
          >
            차량 등록하러 가기
          </Link>
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {banner && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            banner.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {banner.text}
        </div>
      )}

      {activeTab === 'CUSTOM' && vehicleLoaded && !myVehicle?.vehicleType ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
          <p className="text-sm text-gray-600">
            등록된 차량이 없어 내 차량 맞춤 의뢰를 조회할 수 없습니다.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            차량을 먼저 등록하거나 상단 차종 탭(1톤~25톤)을 선택해 의뢰를 확인하세요.
          </p>
          <Link
            to="/driver/vehicle"
            className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            내 차량 등록하기
          </Link>
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-gray-500">의뢰 목록을 불러오는 중입니다...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          현재 조건에 해당하는 등록된 의뢰가 없습니다.
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    {VEHICLE_LABELS[order.requiredVehicleType] ?? order.requiredVehicleType}
                    {order.bodyType ? ` · ${BODY_LABELS[order.bodyType] ?? order.bodyType}` : ''}
                  </span>
                  <p className="mt-1.5 text-base font-bold text-gray-900">
                    {order.pickupRegion} → {order.dropoffRegion}
                  </p>
                </div>
                <p className="text-lg font-bold text-blue-600">
                  {Number(order.fare ?? 0).toLocaleString()}원
                </p>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 sm:grid-cols-4">
                <div>
                  <dt className="text-gray-400">상차 희망</dt>
                  <dd className="font-medium text-gray-800">{formatDateTime(order.pickupAt)}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">화물</dt>
                  <dd className="font-medium text-gray-800">
                    {order.itemName} ({Number(order.weightKg ?? 0).toLocaleString()}kg)
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">상하차</dt>
                  <dd className="font-medium text-gray-800">
                    {LOADING_LABELS[order.loadingMethod] ?? order.loadingMethod}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400">거리</dt>
                  <dd className="font-medium text-gray-800">
                    {Number(order.distanceKm ?? 0).toFixed(1)}km
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={submittingId === order.id}
                  onClick={() => handleAcceptClick(order)}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
                >
                  {submittingId === order.id ? '수락 처리 중...' : '의뢰 수락'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => handlePageChange(Math.max(0, page - 1))}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
          >
            이전
          </button>
          <span className="text-sm text-gray-600">
            {page + 1} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page + 1 >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}

      {mismatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
            <h2 className="text-base font-bold text-gray-900">차량 조건 불일치 확인</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-700">
              {mismatchModal.messages.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm font-medium text-gray-800">계속하시겠습니까?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMismatchModal(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={submittingId === mismatchModal.order.id}
                onClick={() => executeAccept(mismatchModal.order, true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                확인 후 수락
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
