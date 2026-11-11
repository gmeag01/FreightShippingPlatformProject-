import { AddressSearchButton } from './OrderIntegrationFields';
import { useRef, useState } from 'react';
import { geocodeAddress } from '../../api/fare';
import {
  BODY_LABELS,
  CARGO_LABELS,
  LOADING_LABELS,
  PACKAGE_LABELS,
  VEHICLE_LABELS,
} from '../../order/presentation';

const INPUT_STYLE =
  'mt-1 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-2 focus:outline-blue-200';

// 입력 이름과 오류 문구를 연결해 키보드·스크린리더로도 확인할 수 있게 한다.
export function FormField({ label, name, error, children, ...props }) {
  return (
    <div className="min-w-0">
      <label htmlFor={name} className="text-sm font-medium text-gray-700">
        {label}
        {props.required && (
          <span aria-hidden="true" className="ml-1 text-red-600">
            *
          </span>
        )}
      </label>
      {children ? (
        <select
          id={name}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={INPUT_STYLE}
          {...props}
        >
          {children}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className={INPUT_STYLE}
          {...props}
        />
      )}
      {error && (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// 상하차 주소·현장 연락처와 실제 지도 위치를 입력한다. 좌표는 임의로 채우지 않는다.
export function LocationFields({ name, title, initial = {}, errors, onCoordinatesChange }) {
  const pending = useRef(null);
  const [locationMessage, setLocationMessage] = useState('');
  const lookupFailure = '주소의 위치를 확인하지 못했습니다. 주소를 확인하고 다시 입력해 주세요.';

  async function locateAddress(form, value) {
    const address = value.trim();
    const latitude = form.elements.namedItem(`${name}.latitude`);
    const longitude = form.elements.namedItem(`${name}.longitude`);
    if (!address || pending.current || (latitude.value && longitude.value)) return;

    const request = Symbol();
    pending.current = request;
    setLocationMessage('주소의 위치를 확인하는 중입니다…');
    try {
      const result = await geocodeAddress(address);
      if (
        pending.current !== request ||
        form.elements.namedItem(`${name}.address`).value.trim() !== address
      )
        return;
      if (
        !Number.isFinite(result.latitude) ||
        !Number.isFinite(result.longitude) ||
        Math.abs(result.latitude) > 90 ||
        Math.abs(result.longitude) > 180 ||
        (result.latitude === 37.5665 && result.longitude === 126.978)
      ) {
        setLocationMessage(lookupFailure);
        return;
      }
      latitude.value = result.latitude;
      longitude.value = result.longitude;
      onCoordinatesChange();
      setLocationMessage('위치를 확인했습니다.');
    } catch {
      if (pending.current === request) setLocationMessage(lookupFailure);
    } finally {
      if (pending.current === request) pending.current = null;
    }
  }

  function selectAddress(form, address) {
    pending.current = null;
    form.elements.namedItem(`${name}.latitude`).value = '';
    form.elements.namedItem(`${name}.longitude`).value = '';
    onCoordinatesChange();
    locateAddress(form, address);
  }

  const field = (key, label, props = {}) => (
    <FormField
      name={`${name}.${key}`}
      label={label}
      defaultValue={initial[key] ?? ''}
      error={errors[`${name}.${key}`]}
      required
      {...props}
    />
  );
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-white p-5">
      <legend className="px-2 font-bold text-gray-900">{title}</legend>
      <AddressSearchButton name={name} onAddressSelected={selectAddress} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormField
            name={`${name}.address`}
            label="주소"
            defaultValue={initial.address ?? ''}
            error={errors[`${name}.address`]}
            required
            maxLength={255}
            onBlur={(event) => locateAddress(event.currentTarget.form, event.currentTarget.value)}
            onChange={() => {
              pending.current = null;
              setLocationMessage('');
            }}
          />
          {locationMessage && (
            <p role="status" className="text-muted mt-1 text-xs">
              {locationMessage}
            </p>
          )}
        </div>
        {field('detailAddress', '상세주소', { maxLength: 255 })}
        {field('region', '지역 (시·구)', { placeholder: '예: 서울 강남구', maxLength: 255 })}
        {field('contactName', '현장 담당자 이름', { maxLength: 50 })}
        {field('contactPhone', '현장 연락처', { type: 'tel', maxLength: 20 })}
      </div>
      <input hidden name={`${name}.latitude`} defaultValue={initial.latitude ?? ''} />
      <input hidden name={`${name}.longitude`} defaultValue={initial.longitude ?? ''} />
    </fieldset>
  );
}

// 화물·차량·일정을 서버 입력 규칙에 맞춰 입력한다.
export function CargoScheduleFields({ initial, errors, pickupMin, arriveMin, onPickupFocus }) {
  const cargo = initial.cargo ?? {};
  const field = (name, label, props = {}) => (
    <FormField
      name={name}
      label={label}
      defaultValue={
        name.startsWith('cargo.')
          ? (cargo[name.slice(6)] ?? '')
          : (initial[name]?.slice(0, 16) ?? '')
      }
      error={errors[name]}
      required
      {...props}
    />
  );
  const options = (labels) =>
    Object.entries(labels).map(([key, label]) => (
      <option key={key} value={key}>
        {label}
      </option>
    ));
  return (
    <>
      <fieldset className="rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-2 font-bold text-gray-900">운송 일정</legend>
        <p className="mb-4 text-xs text-gray-500">모든 일정은 한국 시간 기준입니다.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('pickupAt', '상차 희망 시각', {
            type: 'datetime-local',
            min: pickupMin,
            onFocus: onPickupFocus,
          })}
          {field('arriveBy', '도착 희망 시각', { type: 'datetime-local', min: arriveMin })}
        </div>
      </fieldset>
      <fieldset className="rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-2 font-bold text-gray-900">화물 정보</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field('cargo.itemName', '품명', { maxLength: 255 })}
          <FormField
            label="화물 종류"
            name="cargo.cargoType"
            defaultValue={cargo.cargoType}
            required
            error={errors['cargo.cargoType']}
          >
            {options(CARGO_LABELS)}
          </FormField>
          {field('cargo.weightKg', '중량 (kg)', {
            type: 'number',
            min: 1,
            max: 2147483647,
            step: 1,
          })}
          {field('cargo.quantity', '수량', { type: 'number', min: 1, max: 2147483647, step: 1 })}
          <FormField
            label="포장 단위"
            name="cargo.packageUnit"
            defaultValue={cargo.packageUnit}
            required
            error={errors['cargo.packageUnit']}
          >
            {options(PACKAGE_LABELS)}
          </FormField>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {['widthCm', 'depthCm', 'heightCm'].map((name, index) => (
            <FormField
              key={name}
              name={`cargo.${name}`}
              label={['너비 (cm)', '깊이 (cm)', '높이 (cm)'][index]}
              type="number"
              min="1"
              max="2147483647"
              step="1"
              defaultValue={cargo[name] ?? ''}
              error={errors[`cargo.${name}`]}
            />
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cargo.fragile" defaultChecked={cargo.fragile} />
            파손 주의
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="cargo.noStack" defaultChecked={cargo.noStack} />
            겹쳐 쌓기 금지
          </label>
        </div>
      </fieldset>
      <fieldset className="rounded-xl border border-gray-200 bg-white p-5">
        <legend className="px-2 font-bold text-gray-900">차량 및 상하차 조건</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            label="요구 차량"
            name="requiredVehicleType"
            defaultValue={initial.requiredVehicleType}
            required
            error={errors.requiredVehicleType}
          >
            {options(VEHICLE_LABELS)}
          </FormField>
          <FormField
            label="적재함 형태"
            name="bodyType"
            defaultValue={initial.bodyType ?? ''}
            error={errors.bodyType}
          >
            <option value="">차체 무관</option>
            {options(BODY_LABELS)}
          </FormField>
          <FormField
            label="상하차 방법"
            name="loadingMethod"
            defaultValue={initial.loadingMethod}
            required
            error={errors.loadingMethod}
          >
            {options(LOADING_LABELS)}
          </FormField>
        </div>
        <label htmlFor="memo" className="mt-4 block text-sm font-medium text-gray-700">
          요청 사항 (선택)
        </label>
        <textarea
          id="memo"
          name="memo"
          maxLength={255}
          rows={3}
          defaultValue={initial.memo ?? ''}
          className={INPUT_STYLE}
          aria-invalid={Boolean(errors.memo)}
          aria-describedby={errors.memo ? 'memo-error' : undefined}
        />
        {errors.memo && (
          <p id="memo-error" className="mt-1 text-xs text-red-700">
            {errors.memo}
          </p>
        )}
      </fieldset>
    </>
  );
}
