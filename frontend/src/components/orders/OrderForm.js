import { FareEstimatePanel } from './OrderIntegrationFields';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createOrder, updateOrder } from '../../api/orders';
import {
  nextKoreanMinute,
  parseKoreanTime,
  readOrderForm,
  validateOrderForm,
} from '../../order/form';
import {
  BODY_LABELS,
  formatDateTime,
  formatNumber,
  LOADING_LABELS,
  PACKAGE_LABELS,
  VEHICLE_LABELS,
} from '../../order/presentation';
import { CargoScheduleFields, FormField, LocationFields } from './OrderFormFields';

const CHECK_INPUT_MESSAGE = '입력 항목을 확인해 주세요.';

// 공통 폼으로 신규 등록과 배차 전 수정을 처리하며 성공 응답 전에는 상세로 이동하지 않는다.
export default function OrderForm({ initial, isEditing, onReload }) {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [review, setReview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pickupAt, setPickupAt] = useState(initial.pickupAt ?? '');
  const [pickupMin, setPickupMin] = useState(() => nextKoreanMinute(Date.now()));
  const inFlight = useRef(false);
  const formRef = useRef(null);
  const quoteRef = useRef(null);
  const quoteChanged = useRef(false);
  const [quoteRevision, setQuoteRevision] = useState(0);
  function invalidateQuote() {
    quoteRef.current = null;
    quoteChanged.current = true;
    setQuoteRevision((value) => value + 1);
  }
  function changeInput(event) {
    setDirty(true);
    if (['pickup.address', 'dropoff.address'].includes(event.target.name)) {
      const location = event.target.name.split('.')[0];
      // 주소가 바뀌면 이전 주소의 위치로 견적을 내거나 등록하지 않는다.
      for (const coordinate of ['latitude', 'longitude']) {
        formRef.current.elements.namedItem(`${location}.${coordinate}`).value = '';
      }
    }
    if (event.target.name === 'pickupAt') setPickupAt(event.target.value);
    if (
      [
        'pickup.address',
        'dropoff.address',
        'pickup.latitude',
        'pickup.longitude',
        'dropoff.latitude',
        'dropoff.longitude',
        'cargo.weightKg',
        'pickupAt',
        'arriveBy',
        'requiredVehicleType',
        'loadingMethod',
      ].includes(event.target.name)
    )
      invalidateQuote();
  }
  const errorBox = useRef(null);
  const reviewTitle = useRef(null);
  const backTo = isEditing ? `/shipper/orders/${initial.id}` : '/shipper/orders';

  useEffect(() => {
    if (!dirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (message) errorBox.current?.focus();
  }, [message]);
  useEffect(() => {
    if (review) reviewTitle.current?.focus();
  }, [review]);

  // 개발 서버의 신규 등록 폼만 예시로 채운다. 검토·등록 요청은 사용자가 따로 누른다.
  async function fillSample() {
    if (!import.meta.env.DEV || isEditing) return;
    const { createSampleOrderFields } = await import('../../order/sampleOrder');
    if (!formRef.current) return;
    for (const [name, value] of Object.entries(createSampleOrderFields())) {
      const input = formRef.current.elements.namedItem(name);
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = value;
      else input.value = String(value);
    }
    setPickupAt(formRef.current.elements.namedItem('pickupAt').value);
    setErrors({});
    setMessage('');
    setDirty(true);
    invalidateQuote();
  }

  function reviewInput(event) {
    event.preventDefault();
    const details = readOrderForm(event.currentTarget, initial);
    if (quoteRef.current) {
      details.recommendedFare = quoteRef.current.recommendedFare;
      details.distanceKm = quoteRef.current.distanceKm;
    } else if (quoteChanged.current) {
      details.recommendedFare = 0;
      details.distanceKm = 0;
    }
    const nextErrors = validateOrderForm(details, isEditing);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setMessage(CHECK_INPUT_MESSAGE);
      event.currentTarget.elements.namedItem(Object.keys(nextErrors)[0])?.focus();
      return;
    }
    setMessage('');
    setReview(details);
  }

  async function save() {
    if (inFlight.current || conflict) return;
    const scheduleErrors = validateOrderForm(review, isEditing);
    if (Object.keys(scheduleErrors).length) {
      setReview(null);
      setErrors(scheduleErrors);
      setMessage('일정이 지났거나 입력이 올바르지 않습니다. 다시 확인해 주세요.');
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setMessage('');
    try {
      const result = isEditing
        ? await updateOrder(initial.id, initial.version, review)
        : await createOrder(review);
      setDirty(false);
      navigate(`/shipper/orders/${result.id}`, { replace: true });
    } catch (error) {
      const fields = Object.fromEntries(
        Object.entries(error.fieldErrors ?? {}).map(([key, value]) => [
          key.replace(/^details\./, ''),
          value,
        ]),
      );
      setErrors(fields);
      if (error.status === 409 || error.code === 'INVALID_STATUS_TRANSITION') {
        setConflict(true);
        setMessage(
          '다른 변경이나 기사 배차로 오더가 달라졌습니다. 최신 정보를 다시 불러온 뒤 수정해 주세요.',
        );
      } else {
        setMessage(error.message || '요청을 완료하지 못했습니다.');
      }
      if (Object.keys(fields).length) setReview(null);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const visibleErrors = Object.entries(errors).filter(
    ([, error]) => typeof error === 'string' && error.trim(),
  );

  return (
    <>
      {message && (message !== CHECK_INPUT_MESSAGE || visibleErrors.length > 0) && (
        <div
          ref={errorBox}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{message}</p>
          {visibleErrors.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {visibleErrors.map(([name, error]) => (
                <li key={name}>{error}</li>
              ))}
            </ul>
          )}
          {conflict && (
            <button
              type="button"
              onClick={onReload}
              className="mt-3 rounded-lg border border-red-300 bg-white px-3 py-2 font-semibold"
            >
              최신 정보로 다시 불러오기
            </button>
          )}
        </div>
      )}
      <form ref={formRef} onSubmit={reviewInput} onChange={changeInput} hidden={Boolean(review)}>
        <fieldset disabled={submitting || conflict} className="min-w-0 space-y-5">
          {import.meta.env.DEV && !isEditing && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div>
                <p className="text-sm font-semibold text-blue-900">테스트용 예시 입력</p>
                <p className="mt-1 text-xs text-blue-800">
                  현재 입력을 예시로 바꿉니다. 자동으로 등록되지는 않아요.
                </p>
              </div>
              <button
                type="button"
                onClick={fillSample}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                테스트 값 채우기
              </button>
            </div>
          )}
          <LocationFields
            name="pickup"
            title="상차지"
            initial={initial.pickup}
            errors={errors}
            onCoordinatesChange={(confirmed) => {
              setDirty(true);
              if (confirmed) {
                setErrors((previous) => {
                  const next = { ...previous };
                  delete next['pickup.address'];
                  return next;
                });
              }
              invalidateQuote();
            }}
          />
          <LocationFields
            name="dropoff"
            title="하차지"
            initial={initial.dropoff}
            errors={errors}
            onCoordinatesChange={(confirmed) => {
              setDirty(true);
              if (confirmed) {
                setErrors((previous) => {
                  const next = { ...previous };
                  delete next['dropoff.address'];
                  return next;
                });
              }
              invalidateQuote();
            }}
          />
          <CargoScheduleFields
            initial={initial}
            errors={errors}
            pickupMin={isEditing ? undefined : pickupMin}
            arriveMin={nextKoreanMinute(parseKoreanTime(pickupAt))}
            onPickupFocus={() => setPickupMin(nextKoreanMinute(Date.now()))}
          />
          <fieldset className="rounded-xl border border-gray-200 bg-white p-5">
            <legend className="px-2 font-bold text-gray-900">운임</legend>
            <FormField
              label="최종 운임 (원)"
              name="fare"
              type="number"
              min={1}
              max={Number.MAX_SAFE_INTEGER}
              step={1}
              required
              defaultValue={initial.fare ?? ''}
              error={errors.fare}
            />
            <p className="mt-3 text-sm text-gray-500">
              차주에게 제시할 최종 운임을 입력하세요. 추천 운임은 아래에서 계산할 수 있습니다.
            </p>
            <FareEstimatePanel
              key={quoteRevision}
              formRef={formRef}
              onEstimate={(quote) => {
                quoteRef.current = quote;
              }}
            />
            {isEditing && (
              <p className="mt-2 text-sm text-gray-600">
                기존 운임: {formatNumber(initial.fare)}원. 운임 변경 시 차액 결제 또는 환불이
                필요합니다.
              </p>
            )}
          </fieldset>
          <div className="flex flex-wrap justify-end gap-3">
            <Link to={backTo} className="rounded-lg border border-gray-300 px-4 py-3 text-sm">
              돌아가기
            </Link>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              입력 내용 확인
            </button>
          </div>
        </fieldset>
      </form>
      {review && (
        <section
          className="border-primary bg-card space-y-4 rounded-xl border-2 p-5"
          aria-labelledby="review-title"
        >
          <h2
            id="review-title"
            ref={reviewTitle}
            tabIndex={-1}
            className="text-lg font-bold text-gray-900"
          >
            {isEditing ? '수정 내용 확인' : '등록 내용 확인'}
          </h2>
          <p className="text-sm text-gray-600">주소와 일정, 운임을 확인한 뒤 요청해 주세요.</p>
          <dl className="space-y-3 text-sm">
            {[
              ['상차지', review.pickup],
              ['하차지', review.dropoff],
            ].map(([label, location]) => (
              <div key={label} className="break-words">
                <dt className="font-semibold">{label}</dt>
                <dd>
                  {location.address} {location.detailAddress}
                  <br />
                  {location.region} · {location.contactName} · {location.contactPhone}
                </dd>
              </div>
            ))}
            <div>
              <dt className="font-semibold">일정 (한국 시간)</dt>
              <dd>
                {formatDateTime(review.pickupAt)} → {formatDateTime(review.arriveBy)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">화물·차량</dt>
              <dd className="break-words">
                {review.cargo.itemName} · {formatNumber(review.cargo.weightKg)}kg ·{' '}
                {review.cargo.quantity}
                {PACKAGE_LABELS[review.cargo.packageUnit]}
                <br />
                {VEHICLE_LABELS[review.requiredVehicleType]} ·{' '}
                {BODY_LABELS[review.bodyType] ?? '차체 무관'} ·{' '}
                {LOADING_LABELS[review.loadingMethod]}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">최종 운임</dt>
              <dd className="text-2xl font-bold text-blue-700">{formatNumber(review.fare)}원</dd>
            </div>
          </dl>
          <p className="text-sm text-gray-600">
            {isEditing
              ? '운임을 바꾸면 차액을 결제하거나 환불합니다.'
              : '등록 시 운임을 결제하고 운송 완료까지 보관합니다.'}
          </p>
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setReview(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm disabled:opacity-50"
            >
              입력 다시하기
            </button>
            <button
              type="button"
              disabled={submitting || conflict}
              onClick={save}
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? '요청 중…' : isEditing ? '수정 요청' : '등록 요청'}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
