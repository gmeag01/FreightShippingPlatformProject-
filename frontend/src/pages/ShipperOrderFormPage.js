import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchOrderDetail } from '../api/orders';
import OrderForm from '../components/orders/OrderForm';
import { OrderLoadError } from '../components/orders/OrderDisplay';
import { emptyOrder } from '../order/form';

// 새 오더는 빈 폼으로, 수정은 최신 본인 오더를 조회한 뒤에만 연다.
export default function ShipperOrderFormPage({ isEditing = false }) {
  const { id } = useParams();
  const validId = /^[1-9]\d*$/.test(id ?? '') && Number.isSafeInteger(Number(id));
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${id}:${attempt}`;
  const [result, setResult] = useState(null);
  const loading = isEditing && result?.key !== requestKey;
  const reload = () => setAttempt((value) => value + 1);
  useEffect(() => {
    if (!isEditing || !validId) return;
    const controller = new AbortController();
    fetchOrderDetail(id, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, error });
      });
    return () => controller.abort();
  }, [id, isEditing, validId, requestKey]);
  const order = result?.data;
  return (
    <section className="space-y-5">
      <Link
        to={isEditing && validId ? `/shipper/orders/${id}` : '/shipper/orders'}
        className="text-sm font-medium text-blue-700 hover:underline"
      >
        ← {isEditing ? '오더 상세' : '내 오더 목록'}
      </Link>
      <div>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          {isEditing ? '오더 수정' : '오더 등록'}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          필수 항목(*)을 입력하고 마지막 단계에서 내용을 확인하세요.
        </p>
      </div>
      {!isEditing ? (
        <OrderForm key="new" initial={emptyOrder()} isEditing={false} />
      ) : !validId ? (
        <p role="alert" className="text-sm text-red-700">
          올바르지 않은 오더 주소입니다.
        </p>
      ) : loading ? (
        <p role="status" className="py-10 text-center text-sm text-gray-500">
          수정할 오더를 불러오는 중입니다…
        </p>
      ) : result?.error ? (
        <OrderLoadError
          message={
            result.error.status === 403
              ? '본인이 등록한 오더만 수정할 수 있습니다.'
              : result.error.status === 404
                ? '수정할 오더를 찾을 수 없습니다.'
                : result.error.message
          }
          onRetry={reload}
        />
      ) : order?.status !== 'REGISTERED' ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
        >
          배차 대기 상태의 오더만 수정할 수 있습니다. 상세 화면에서 현재 진행 상황을 확인해 주세요.
        </p>
      ) : (
        <OrderForm key={requestKey} initial={order} isEditing onReload={reload} />
      )}
    </section>
  );
}
