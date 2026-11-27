# 화물운송플랫폼 프론트엔드 명세서

> **기준**: 실제 구현 소스(`frontend/src/**`, `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`)와 화면 디자인 기준([ui-guide.md](../design/ui-guide.md))을 바탕으로 작성한 프론트엔드 기술 명세서입니다.

---

## 1. 개요 및 기술 스택

화주(`SHIPPER`), 차주(`DRIVER`), 관리자(`ADMIN`) 세 역할의 모든 화면을 하나의 반응형 React SPA(최소 360px 모바일 폭 지원)로 제공합니다.

| 항목 | 기술 / 버전 | 비고 |
| --- | --- | --- |
| UI 라이브러리 | React `19.3.1`, React DOM `19.3.1` | 함수형 컴포넌트 + Hooks |
| 번들러 / 빌드 | Vite `8.3.5`, `@vitejs/plugin-react` `6.1.2` | 커스텀 `jsxInJs()` 플러그인으로 `.js` 파일 내 JSX 처리 |
| 라우팅 | React Router (`react-router-dom` `7.18.5`) | `BrowserRouter` 기반 역할 보호 라우팅 |
| 스타일링 | Tailwind CSS `4.3.4` (`@tailwindcss/vite`) | `src/index.css`의 `@theme` 디자인 토큰 사용 |
| HTTP 통신 | Axios `1.21.0` | `src/api/client.js` 단일 인스턴스 + 401 자동 리프레시 |
| 외부 스크립트/SDK | 다음 우편번호 v2, 카카오맵 JS SDK | 동적 `<script>` 로드, 실패 시 폴백 UI 제공 |
| 코드 품질 | ESLint `10.14.0`, Prettier `3.9.10` (`prettier-plugin-tailwindcss`) | `npm run format && npm run lint && npm run build` |

### 핵심 개발 규칙
- **컴포넌트 확장자**: `.jsx`를 사용하지 않고 모든 컴포넌트·페이지 파일을 `.js`로 작성합니다 ([vite.config.js](../../frontend/vite.config.js)의 `jsxInJs`가 `src/**/*.js`를 JSX로 변환).
- **스타일 규칙**: 개별 CSS 파일이나 인라인 `style` 속성 대신 Tailwind CSS 유틸리티 클래스와 `@theme` 변수를 사용합니다.
- **시각(Time Zone) 규칙**: 서버가 타임존 없이 반환하는 ISO 한국 시각 문자열을 `+09:00` (`Asia/Seoul`) 기준으로 파싱·포맷합니다.

---

## 2. 디렉토리 구조

```text
frontend/src
├─ main.js                 # BrowserRouter + AuthProvider 마운트
├─ App.js                  # 전체 라우트 및 RequireRole / AppLayout 매핑
├─ index.css               # S-CoreDream 웹폰트, @theme 토큰, 유틸리티 클래스
├─ api/                    # Axios 인스턴스 및 도메인별 API 함수
│  ├─ client.js            # baseURL '/api', 응답 언래핑, 401 동시 갱신(single-flight)
│  ├─ auth.js              # signup, login, logout, fetchMe
│  ├─ members.js           # fetchAdminMembers, fetchMemberCounts, updateMemberStatus, updateMyProfile
│  ├─ dashboard.js         # fetchAdminDashboard, fetchDashboardOrders
│  ├─ vehicle.js           # getMyVehicle, registerMyVehicle, updateMyVehicle
│  ├─ fare.js              # geocodeAddress, fetchPublicFareTable, estimateFare, fetchAdminFareTable, updateAdminFareRates, updateAdminFareSurcharges
│  ├─ orders.js            # fetchMyOrders, fetchOrderDetail, createOrder, updateOrder, cancelOrder, fetchAdminOrders, fetchAdminOrderDetail
│  ├─ orderIntegration.js  # geocodeAddress, estimateFare, fetchOrderPayment, confirmOrderReceipt, reportOrderIssue
│  ├─ matching.js          # fetchMyVehicle, fetchOpenOrders, fetchOpenOrderDetail, acceptOrder, cancelOrderAssignment
│  ├─ jobs.js              # JOB_TABS, fetchMyJobs, fetchMyJob, fetchMyPayouts, completePickup, completeDropoff
│  └─ disputes.js          # fetchDisputes, fetchDisputeCounts, fetchDispute, resolveDispute
├─ auth/                   # AuthContext, useAuth, RequireRole, roles(ROLE_HOME, ROLE_LABEL)
├─ layouts/                # AppLayout (역할별 공통 상단 네비게이션, 내 정보 수정 모달)
├─ components/
│  ├─ auth/AuthHeader.js
│  ├─ profile/ProfileModal.js
│  ├─ OrderMap.js          # 카카오맵 JS SDK + 폴백 SVG 캔버스
│  ├─ RegionApproximateMap.js
│  ├─ MismatchConfirmModal.js
│  ├─ OrderChangedModal.js
│  ├─ CancelAssignmentModal.js
│  ├─ disputes/DisputeResolution.js
│  ├─ jobs/                # JobCard, JobActionDialog, JobActionDialogs, PayoutPanel, jobPresentation
│  └─ orders/              # OrderDisplay, OrderForm, OrderFormFields, OrderIntegrationFields, OrderCancel, OrderDeliveryPayment
├─ hooks/                  # useAcceptOrder, useDriverJobs, useJobActions, useModalEffect
├─ order/                  # form.js, presentation.js, sampleOrder.js
├─ utils/                  # driverOrder.js
└─ pages/                  # 17개 페이지 컴포넌트
```

---

## 3. 디자인 시스템 및 공통 레이아웃

### 3.1 타이포그래피 및 색상 토큰 ([index.css](../../frontend/src/index.css))
- **글꼴**: 한글 `S-CoreDream`(400/500/600/700, 눈누 CDN), 숫자/코드 `Roboto Mono` (`font-mono`, `.font-num`, `tabular-nums`).
- **텍스트 스케일**: `--text-body: 15px`, `--text-caption: 13px`, `--text-h1: 26px`, `--text-h1-sm: 22px`, `--text-h2: 17px`, `--text-fare: 22px`, `--text-fare-lg: 32px`.
- **핵심 색상 토큰**:
  - 브랜드/텍스트: `ink` (`#172554`), `copy` (`#1e293b`), `muted` (`#475569`), `subtle` (`#64748b`)
  - 배경/테두리: `ground` (`#eff6ff`), `card` (`#ffffff`), `line` (`#dbeafe`), `line-strong` (`#cbd5e1`)
  - 액션/강조: `primary` (`#2563eb`), `primary-dark` (`#1d4ed8`), `primary-soft` (`#eff6ff`), `signal` (`#ea580c`), `signal-soft` (`#ffedd5`), `signal-ink` (`#7c2d12`), `danger` (`#b91c1c`), `danger-soft` (`#fef2f2`)
  - 상태 뱃지: `--color-status-registered` 등 7개 상태별 배경·글자 토큰 정의.

### 3.2 공통 레이아웃 (`AppLayout`, `AuthHeader`, `ProfileModal`)
- **`AppLayout`**: 로그인된 역할 영역을 감싸며 `bg-ink` 상단 헤더(`FreightOn` 로고, 역할별 메뉴, 역할 뱃지, 이름 버튼 → `ProfileModal`, 로그아웃 버튼)와 `max-w-280` 본문 컨테이너를 제공합니다. 모바일(`max-sm`)에서는 메뉴가 2번째 줄로 내려와 360px 폭 가로 스크롤을 방지합니다.
  - `SHIPPER`: `내 오더` (`/shipper/orders`), `오더 등록` (`/shipper/orders/new`)
  - `DRIVER`: `의뢰 목록` (`/driver/orders`), `내 운송` (`/driver/jobs`), `내 차량` (`/driver/vehicle`)
  - `ADMIN`: `대시보드` (`/admin`), `오더` (`/admin/orders`), `분쟁` (`/admin/disputes`), `운임` (`/admin/fares`), `회원` (`/admin/members`)
- **`ProfileModal`**: 이름, 휴대폰 번호(`010-0000-0000` 자동 하이픈 포맷), 선택적 비밀번호 변경(현재 비밀번호, 새 비밀번호 8자 이상, 확인 일치 검증)을 `PATCH /api/members/me`로 저장하고 `refreshMe()`로 컨텍스트를 동기화합니다.

---

## 4. 인증 상태 관리 및 API 클라이언트

### 4.1 `api/client.js` 동작 규칙
- `baseURL: '/api'`로 설정되어 있으며 개발 환경(`vite.config.js`)에서 `http://localhost:8080`으로 프록시됩니다.
- 인증 토큰은 `HttpOnly` 쿠키(`access_token`, `refresh_token`)로 자동 전송되므로 프론트 JavaScript는 토큰 값을 읽거나 저장하지 않습니다.
- **응답 인터셉터**:
  - 성공 시 `ApiResponse` 외피를 벗겨 `response.data?.data`만 반환합니다.
  - `401` 응답이며 `/auth/` 경로가 아니고 재시도(`isRetried`) 전이라면 `/auth/refresh`를 호출합니다. 동시 다발 401 요청은 `refreshPromise`로 단일 갱신만 수행하고, 갱신 성공 시 원 요청을 재시도하며 실패 시 `handleSessionExpired()`로 로그인 상태를 초기화합니다.
  - 실패 시 `{ message, code, fieldErrors, status }` 속성을 가진 `Error` 객체로 변환합니다(서버 미응답 시 `code: 'NETWORK_ERROR'`).

### 4.2 `AuthContext` 및 `RequireRole`
- 앱 시작 시 `GET /api/members/me`를 호출하여 세션을 복원하며, 조회 완료 전까지 `isLoading = true` 상태로 화면 깜빡임을 방지합니다.
- `RequireRole`: 비로그인 시 `/login` (`state.from` 보존), 역할 불일치 시 해당 역할의 홈(`ROLE_HOME`: `SHIPPER → /shipper/orders`, `DRIVER → /driver/orders`, `ADMIN → /admin`)으로 리다이렉트합니다.

---

## 5. 라우팅 및 화면별 상세 명세

### 5.1 공개 화면
| 경로 | 컴포넌트 | 주요 기능 및 동작 |
| --- | --- | --- |
| `/` | `LandingPage` | 고정 헤더(로그인 상태에 따라 내 화면 이동/로그인·회원가입), 히어로 배너, 문제 해결 섹션(`useScrollReveal` + SVG 강조), 5종 차량 가로 캐러셀(`useDragScroll` + 좌우 버튼), 실시간 DB 기준 단가표·할증 안내(`GET /api/fares/table`, 비로그인 시 `.fare-progressive-blur` 오버레이 및 로그인 유도) |
| `/login` | `LoginPage` | 이메일·비밀번호 로그인(`POST /api/auth/login`), 회원가입 완료 안내 배너(`state.signedUp`), 성공 시 `ROLE_HOME` 이동 |
| `/signup` | `SignupPage` | 역할 선택(`SHIPPER` / `DRIVER`, URL 쿼리 `?role=` 지원), 4개 입력 필드 및 서버 `fieldErrors` 칸별 표시, 성공 시 `/login` 이동 |
| `*` | `NotFoundPage` | 404 안내 및 `/` 이동 링크 |

### 5.2 화주 (`SHIPPER`) 화면
| 경로 | 컴포넌트 | 주요 기능 및 동작 |
| --- | --- | --- |
| `/shipper/orders` | `ShipperOrdersPage` | URL 쿼리(`?status=&page=`) 연동 상태별 필터, `isUnassigned` 미배차 뱃지·안내, 카드 목록 및 20건 단위 페이지네이션 |
| `/shipper/orders/new` | `ShipperOrderFormPage` (`isEditing=false`) | `OrderForm` 렌더링. 개발 모드(`import.meta.env.DEV`)에서는 `테스트 값 채우기` 버튼 제공 |
| `/shipper/orders/:id/edit` | `ShipperOrderFormPage` (`isEditing=true`) | `GET /api/orders/:id` 조회 후 `status === 'REGISTERED'`인 본인 오더만 수정 허용. `version` 포함 `PUT /api/orders/:id` |
| `/shipper/orders/:id` | `ShipperOrderDetailPage` | 상·하차지 상세 및 연락처, `OrderMap`(정확 좌표 + 카카오맵 길찾기 링크), 화물·차량 조건, 운임·추천운임·거리, 배정 기사 정보, 차주 배차 취소 안내 배너(`isDriverCancelled`), 진행 기한(`autoConfirmAt`, `driverCancelableUntil`), 상태 이력, `OrderCancel`(사유 확인 2단계), `OrderDeliveryActions`(`AWAITING_CONFIRM` 시 수령 확정 / 문제 신고), `OrderPaymentPanel`(결제 상태 및 거래 원장) |

#### `OrderForm` + `OrderIntegrationFields` 세부 흐름
1. **주소 및 좌표**: `AddressSearchButton`으로 다음 우편번호 팝업을 열어 도로명/지번 주소와 시·구(`region`)를 채우고 `GET /api/fares/geocode`로 좌표를 조회합니다. 주소 변경 시 기존 좌표를 초기화하고 견적을 무효화(`invalidateQuote`)합니다.
2. **추천 운임 계산 (`FareEstimatePanel`)**: 상·하차 좌표, 중량(`weightKg`), 상차 시각(`pickupAt`), 상하차 방식(`loadingMethod`)이 채워지면 자동/수동 `POST /api/fares/estimate`를 호출합니다. `weightKg > 25,000`이면 경고 배너를 표시하고, `추천 운임 적용` 버튼으로 `fare` 입력칸에 반영합니다. 중량 변경 시 요구 차종을 자동 추천하되 사용자가 직접 수정한 뒤(`dataset.userModified='true'`)에는 덮어쓰지 않습니다.
3. **2단계 검토 후 저장**: `validateOrderForm` 클라이언트 검증(공백, 좌표 범위, 상차 이후 도착 시각, 정수 범위) → 입력 내용 확인 화면(`review` 상태) → 등록/수정 API 호출. `409` 충돌 시 최신 정보 재조회 유도.

### 5.3 차주 (`DRIVER`) 화면
| 경로 | 컴포넌트 | 주요 기능 및 동작 |
| --- | --- | --- |
| `/driver/vehicle` | `DriverVehiclePage` | `GET /api/vehicles/me` 조회 후 최초 등록(`POST`) 또는 수정(`PUT`). 차종 선택 시 `VEHICLE_MAX_LOAD` 기반 최대 적재량 실시간 안내 |
| `/driver/orders` | `DriverOrdersPage` | 탭 6종(`내 차량 맞춤`, `1톤`, `2.5톤`, `5톤`, `11톤`, `25톤`), 미등록 차주에게 차량 등록 안내 카드, 열린 의뢰 목록(`GET /api/orders/open`), `useAcceptOrder` 기반 수락 처리 및 페이지네이션 |
| `/driver/orders/:id` | `DriverOrderDetailPage` | 수락 전 의뢰 상세(`GET /api/orders/open/:id`). 5단계 진행 막대, `RegionApproximateMap`(시·구 대략 영역), 내 차량 대비 조건 적합성(`VehicleCheckCard`), 에스크로 보관 안내, 모바일 하단 고정 수락 바(`MobileAcceptBar`) |
| `/driver/jobs` | `DriverJobsPage` | `useDriverJobs`로 진행 중(`IN_PROGRESS`) / 완료(`FINISHED`) 탭 목록과 `GET /api/payouts` 지급 내역(`PayoutPanel`)을 병렬 조회. 각 `JobCard`에서 상차/하차 완료·배차 취소 실행 |
| `/driver/jobs/:id` | `DriverJobDetailPage` | `GET /api/jobs/:orderId` 상세. 배차 후 전체 주소·연락처 공개, `OrderMap` 정확 좌표 + 카카오맵 길찾기 링크, 진행 기한 안내, 상차/하차 완료 및 2시간 전 마감 기준 배차 취소 버튼, 결제 상태·상태 이력 |

#### 차주 의뢰 수락 공통 훅 (`useAcceptOrder`)
1. 수락 클릭 시 내 차량과 오더 요구 조건(차종 불일치 / 중량 초과)을 `checkMyVehicleMismatch`로 선검사하여 불일치 시 `MismatchConfirmModal` 노출.
2. 서버 요청(`POST /api/orders/{id}/accept`) 결과에 따라 분기:
   - `VEHICLE_MISMATCH` → `MismatchConfirmModal` 띄우고 확인 시 `confirmMismatch: true`로 재요청
   - `ORDER_CHANGED` → `fetchOpenOrderDetail`로 최신 상세를 다시 받아 `OrderChangedModal`(수정 전/후 운임·상차 시각 비교) 노출
   - `ORDER_ALREADY_ASSIGNED` → 오류 배너/안내 후 목록 갱신
   - `VEHICLE_REQUIRED` → 차량 등록 링크가 포함된 오류 배너 표시

### 5.4 관리자 (`ADMIN`) 화면
| 경로 | 컴포넌트 | 주요 기능 및 동작 |
| --- | --- | --- |
| `/admin` | `AdminDashboardPage` | `GET /api/admin/dashboard` 조회. 상단 4종 통계 카드(오늘 등록·배차·완료 및 어제 대비 증감, 상차 지난 미배차) 클릭 시 `GET /api/admin/dashboard/orders?type=...` 상세 모달 오픈. 하단 처리 대기 분쟁(최대 5건) 및 상차 임박 미배차 목록(최대 5건) 표시 |
| `/admin/orders` | `AdminOrdersPage` | URL 쿼리 동기화 검색 폼(`status`, `vehicleType`, `from`, `to` 상차일 범위 검증), 결과 목록 및 페이지네이션 |
| `/admin/orders/:id` | `ShipperOrderDetailPage` (`admin=true`) | `GET /api/admin/orders/:id` 조회, `OrderCancel(admin=true)`로 `REGISTERED`/`ASSIGNED` 상태 취소 가능, 결제 내역 조회 |
| `/admin/disputes` | `AdminDisputesPage` | `처리 대기` / `처리 완료` 탭 및 `GET /api/admin/disputes/counts` 통계. 좌측 목록 선택 시 우측에 `DisputeDetail`·`DisputeHistory` 표시. 미결 분쟁(`DISPUTED` & `HELD`)은 `DisputeResolution`으로 처리 메모 입력 후 `<dialog>` 확인창을 거쳐 차주 지급(`PAY_DRIVER`) 또는 화주 환불(`REFUND_SHIPPER`) 실행 |
| `/admin/fares` | `AdminFaresPage` | `GET /api/admin/fares` 조회 후 5개 차종 기본요금·km당 단가(`PUT /api/admin/fares/rates`)와 4종 할증률 %(`PUT /api/admin/fares/surcharges`, 저장 시 소수 변환) 일괄 수정. 우측 사이드바에서 5톤 390km 할증 없음 기준 실시간 계산 예시 제공 |
| `/admin/members` | `AdminMembersPage` | 역할 탭(`전체`/`화주`/`차주` 건수 뱃지), 이름·이메일·연락처 검색(`size=10`), 차주의 차량·배차취소 횟수 표시, 본인 계정 제외 계정 정지/정지 해제 컨펌 모달(`PATCH /api/admin/members/:id/status`) |

---

## 6. 주요 공통 컴포넌트 및 유틸리티

### 6.1 지도 컴포넌트 ([OrderMap.js](../../frontend/src/components/OrderMap.js), [RegionApproximateMap.js](../../frontend/src/components/RegionApproximateMap.js))
- **정확 좌표 모드**: `pickup`/`dropoff`에 유효한 `latitude`, `longitude`가 모두 있으면 카카오맵에 상차지(파란 원)·하차지(`ink` 사각형) 오버레이를 표시하고 `LatLngBounds`로 뷰포트를 맞춥니다.
- **대략 영역 모드 (`RegionApproximateMap`)**: `pickupRegion`, `dropoffRegion`만 전달받으면 카카오 `services.Geocoder`로 시·구 좌표를 찾아 반경 3,500m 점선 원을 그립니다.
- **폴백(`FallbackMapCanvas`)**: `VITE_KAKAO_MAP_KEY`가 없거나 SDK 로드·지오코딩이 실패하면 내장 SVG 기반 안내 지도를 렌더링해 정보 표시가 끊기지 않도록 합니다.

### 6.2 공통 훅 및 유틸리티
- **`useDriverJobs` / `useJobActions`**: 차주 운송 탭 데이터(`IN_PROGRESS`, `FINISHED`, `payouts`) 병렬 로드, 상차·하차 확인 모달(`JobActionDialog`) 및 배차 취소 모달(`CancelAssignmentModal`) 제어, 409/404 발생 시 자동 재조회.
- **`useModalEffect`**: 모달 열림 시 `Escape` 키 닫기 및 `document.body.style.overflow = 'hidden'` 스크롤 잠금 처리.
- **`order/form.js` & `order/presentation.js` & `utils/driverOrder.js`**: 폼 `FormData` ↔ 서버 DTO 직렬화, 한국 시각 입력/검증(`nextKoreanMinute`, `parseKoreanTime`), 상태·차종·적재함·화물·포장 단위 라벨 매핑 및 금액/날짜 포맷터 제공.

---

## 7. 환경 변수 및 실행 명령

- **환경 변수 (`frontend/.env.local`, Git 제외)**:
  - `VITE_KAKAO_MAP_KEY`: 카카오맵 JavaScript SDK 앱 키 (미설정 시 `OrderMap`은 폴백 SVG 지도 표시)
- **개발 서버 프록시 (`vite.config.js`)**:
  - `npm run dev` 실행 시 `/api/*` 요청을 `http://localhost:8080`으로 전달
- **품질 검증 명령어**:
  - 포맷팅: `npm run format`
  - 린트: `npm run lint`
  - 프로덕션 빌드: `npm run build`

