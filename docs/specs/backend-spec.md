# 화물운송플랫폼 백엔드 명세서

> **기준**: 실제 구현 소스(`backend/src/main/**`, `backend/build.gradle`, `backend/src/main/resources/**`)와 설계 문서([2026-11-02-freight-platform-design.md](../superpowers/specs/2026-11-02-freight-platform-design.md))를 기준으로 작성한 백엔드 기술 명세서입니다.

---

## 1. 개요 및 기술 스택

화주(`SHIPPER`)의 운송 오더 등록 및 에스크로 결제 보관, 차주(`DRIVER`)의 의뢰 탐색·수락·운송 진행, 관리자(`ADMIN`)의 단가표·분쟁·오더·회원 관리를 처리하는 단일 Spring Boot REST API 서버입니다.

| 항목 | 기술 / 버전 | 비고 |
| --- | --- | --- |
| 언어 / 런타임 | Java 21 (`toolchain`) | `build.gradle` 고정 |
| 프레임워크 | Spring Boot `3.5.16` | `spring-boot-starter-web`, `validation`, `data-jpa`, `security` |
| 데이터베이스 | MariaDB (`mariadb-java-client`) / H2 (테스트) | `spring.jpa.open-in-view=false` |
| 인증 / 토큰 | JJWT `0.12.7` + HttpOnly 쿠키 | Access JWT (30분) + Refresh Token (14일, DB SHA-256 해시) |
| API 문서 | `springdoc-openapi-starter-webmvc-ui` `2.8.17` | `/swagger-ui/index.html`, `/v3/api-docs` |
| 외부 연동 | 카카오 로컬(지오코딩), 카카오모빌리티(길찾기) | API 키 미설정/실패 시 기본 좌표·하버사인 × 1.3 폴백 |
| 품질 / 테스트 | Spotless `7.2.1` (palantirJavaFormat), ArchUnit `1.3.2`, JUnit 5 | `./gradlew spotlessApply test` |

---

## 2. 아키텍처 및 패키지 구조

도메인 중심 패키지 구조(`com.freight.<도메인>.{controller,service,repository,entity,dto}`)를 따릅니다.

```text
com.freight
├─ FreightApplication          # @EnableScheduling, @SpringBootApplication
├─ global/
│  ├─ common/                  # ApiResponse<T>, BaseEntity
│  ├─ config/                  # JpaConfig, SchedulingConfig, SwaggerConfig
│  ├─ exception/               # BusinessException, ErrorCode, GlobalExceptionHandler
│  └─ security/                # SecurityConfig, JwtTokenProvider, JwtAuthenticationFilter, AuthCookies, AuthMember, JsonAuthEntryPoint, JsonAccessDeniedHandler
├─ member/                     # 회원가입·로그인·토큰·프로필·관리자 회원/대시보드
├─ vehicle/                    # 차주 차량 등록·수정·조회 (1인 1차량)
├─ fare/                       # 단가표·할증률 관리, 지오코딩, 거리·추천 운임 계산
├─ order/                      # 오더 엔티티·상태 전이·이력, 화주/관리자 오더 관리, OrderPaymentPort
├─ matching/                   # 열린 의뢰 목록·상세, 오더 수락(낙관적 락), 배차 취소
├─ delivery/                   # 상차·하차·수령확인·문제신고·분쟁처리, 내 운송, AutoConfirmScheduler
└─ payment/                    # 에스크로 결제(보관·차액·지급·환불), PaymentGateway / DummyPaymentGateway, OrderPaymentAdapter
```

### 아키텍처 강제 규칙 ([ArchitectureTest.java](../../backend/src/test/java/com/freight/ArchitectureTest.java))
1. **도메인 간 Repository 직접 접근 금지**: 다른 도메인의 기능이 필요하면 반드시 해당 도메인의 `Service`를 호출합니다 (`noCrossDomainRepositoryAccess`).
2. **도메인 간 결합 완화 (Port-Adapter)**: `order` 도메인은 `OrderPaymentPort` 인터페이스를 통해 결제를 요청하며, `payment` 도메인의 `OrderPaymentAdapter`가 이를 `PaymentService`로 위임합니다.
3. **컨트롤러 반환 타입 제한**: 모든 컨트롤러 `public` 메서드는 엔티티가 아닌 DTO(및 `ApiResponse<T>`/`ResponseEntity`)를 반환합니다 (`controllersDoNotReturnEntities`).
4. **웹 파라미터 이름 명시**: 모든 `@RequestParam`, `@PathVariable`은 `name` 또는 `value`를 명시해야 합니다 (`controllerParametersDeclareExplicitNames`).

---

## 3. 공통 응답 형식 및 오류 코드

### 3.1 공통 응답 래퍼 (`ApiResponse<T>`)
- 성공: `{ "success": true, "data": <결과 또는 null> }` (`error` 필드는 `NON_NULL`로 생략)
- 실패: `{ "success": false, "data": null, "error": { "code": "...", "message": "...", "fieldErrors": { ... } } }` (`fieldErrors`는 검증 실패·상세 정보가 있을 때만 포함)

### 3.2 전역 예외 처리 (`GlobalExceptionHandler`)
| 예외 유형 | HTTP 상태 | 오류 코드 | 비고 |
| --- | --- | --- | --- |
| `BusinessException` | `ErrorCode.status` | `ErrorCode.name()` | `details`가 있으면 `fieldErrors`에 포함 (예: `VEHICLE_MISMATCH`) |
| `MethodArgumentNotValidException` | `400` | `INVALID_INPUT` | 필드별 첫 번째 오류 메시지를 `fieldErrors`에 담아 반환 |
| `HttpMessageNotReadableException` 등 파싱 오류 | `400` | `INVALID_INPUT` | 타입 불일치·필수 파라미터 누락 포함 |
| `ObjectOptimisticLockingFailureException` | `409` | `CONCURRENT_MODIFICATION` | 도메인에서 미변환된 낙관적 락 충돌 |
| `AccessDeniedException` | `403` | `FORBIDDEN` | `@PreAuthorize` 권한 거부 |
| `NoResourceFoundException` | `404` | `NOT_FOUND` | 존재하지 않는 경로 |
| `HttpRequestMethodNotSupportedException` | `405` | `METHOD_NOT_ALLOWED` | 지원하지 않는 HTTP 메서드 |
| 그 외 `Exception` | `500` | `INTERNAL_ERROR` | 스택트레이스는 서버 로그에만 기록 |

### 3.3 `ErrorCode` 전체 목록 ([ErrorCode.java](../../backend/src/main/java/com/freight/global/exception/ErrorCode.java))
| 도메인 | 코드 | HTTP | 메시지 |
| --- | --- | --- | --- |
| 공통 | `INVALID_INPUT` | 400 | 입력값이 올바르지 않습니다 |
| 공통 | `UNAUTHORIZED` | 401 | 로그인이 필요합니다 |
| 공통 | `FORBIDDEN` | 403 | 권한이 없습니다 |
| 공통 | `NOT_FOUND` | 404 | 대상을 찾을 수 없습니다 |
| 공통 | `METHOD_NOT_ALLOWED` | 405 | 지원하지 않는 요청 방식입니다 |
| 공통 | `CONCURRENT_MODIFICATION` | 409 | 다른 요청과 충돌했습니다. 다시 시도해 주세요 |
| 공통 | `INTERNAL_ERROR` | 500 | 서버 오류가 발생했습니다 |
| member | `DUPLICATE_EMAIL` | 409 | 이미 가입된 이메일입니다 |
| member | `INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호가 올바르지 않습니다 |
| member | `INVALID_REFRESH_TOKEN` | 401 | 로그인이 만료되었습니다. 다시 로그인해 주세요 |
| member | `INVALID_CURRENT_PASSWORD` | 400 | 현재 비밀번호가 일치하지 않습니다 |
| member | `MEMBER_NOT_FOUND` | 404 | 회원을 찾을 수 없습니다 |
| member | `ADMIN_CANNOT_SUSPEND_SELF` | 400 | 관리자 본인의 계정은 정지할 수 없습니다 |
| member | `ACCOUNT_SUSPENDED` | 403 | 이용 정지된 계정입니다. 관리자에게 문의하세요 |
| order | `ORDER_NOT_FOUND` | 404 | 오더를 찾을 수 없습니다 |
| order | `INVALID_STATUS_TRANSITION` | 409 | 현재 상태에서는 할 수 없는 작업입니다 |
| order | `NOT_ORDER_OWNER` | 403 | 본인의 오더가 아닙니다 |
| order | `DRIVER_CANCEL_CUTOFF_PASSED` | 409 | 상차 2시간 전부터는 직접 취소할 수 없습니다. 관리자에게 요청하세요 |
| vehicle | `VEHICLE_NOT_FOUND` | 404 | 등록된 차량을 찾을 수 없습니다 |
| matching | `VEHICLE_REQUIRED` | 400 | 차량을 먼저 등록해야 의뢰를 수락할 수 있습니다 |
| matching | `VEHICLE_MISMATCH` | 409 | 보유 차량과 오더 요구 조건이 다릅니다 |
| matching | `ORDER_CHANGED` | 409 | 오더 내용이 변경되었습니다. 다시 확인해 주세요 |
| matching | `ORDER_ALREADY_ASSIGNED` | 409 | 이미 배차된 의뢰입니다 |
| payment | `PAYMENT_NOT_FOUND` | 404 | 결제 내역을 찾을 수 없습니다 |
| payment | `PAYMENT_ALREADY_SETTLED` | 409 | 이미 지급 또는 환불이 끝난 결제입니다 |

---

## 4. 보안 및 인증 설계

- **세션 정책**: `SessionCreationPolicy.STATELESS`, `BCryptPasswordEncoder`, CSRF 비활성화 (`SameSite=Strict` 쿠키 사용).
- **접근 제어 (`SecurityConfig`)**:
  - `permitAll`: `/api/auth/**`, `GET /api/fares/table`, `/swagger-ui/**`, `/swagger-ui.html`, `/v3/api-docs/**`, `/h2-console/**`, `/error`
  - `hasRole("ADMIN")`: `/api/admin/**`
  - 그 외 모든 요청: `authenticated()`, 컨트롤러 메서드별 `@PreAuthorize`로 세분화.
- **토큰 추출 우선순위 (`JwtAuthenticationFilter`)**:
  1. `Authorization: Bearer <token>` 헤더 (중복 `Bearer ` 접두사 제거 처리 포함)
  2. `access_token` 쿠키
- **HttpOnly 쿠키 정책 (`AuthCookies`)**:
  - `access_token`: `HttpOnly`, `Secure` (`app.auth.cookie-secure`), `SameSite=Strict`, `Path=/api`, 유효기간 30분 (`app.jwt.validity-ms=1800000`)
  - `refresh_token`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`, 유효기간 14일 (`app.jwt.refresh-validity-ms=1209600000`)
- **토큰 갱신 및 정지 정책 (`AuthService`)**:
  - Refresh Token 원문은 32바이트 `SecureRandom` Base64 문자열이며, DB `refresh_tokens`에는 SHA-256 해시(64자 hex)만 저장합니다.
  - `/api/auth/refresh` 호출 시 기존 Refresh Token은 즉시 삭제하고 새 Access/Refresh 토큰을 발급합니다(1회용 회전).
  - `SUSPENDED` 계정은 로그인 및 토큰 갱신(`ACCOUNT_SUSPENDED`)이 차단됩니다.
  - 회원가입은 `SHIPPER`와 `DRIVER`만 허용하며 `ADMIN` 지정 시 `INVALID_INPUT`을 반환합니다. 이메일은 소문자(`Locale.ROOT`)로 정규화합니다.

---

## 5. 데이터 모델 (엔티티 및 Enum)

모든 `BaseEntity` 상속 엔티티는 JPA Auditing(`JpaConfig`)으로 `created_at`, `updated_at`을 자동 기록합니다.

### 5.1 테이블 및 엔티티 명세

| 테이블 / 엔티티 | 주요 필드 및 제약 | 비고 |
| --- | --- | --- |
| `members` (`Member`) | `id` (PK), `email` (unique, 100), `password`, `name` (50), `phone` (20), `role` (`Role`), `status` (`MemberStatus`, 기본 `ACTIVE`), `BaseEntity` | 이메일 소문자 저장 |
| `refresh_tokens` (`RefreshToken`) | `id` (PK), `member_id`, `token_hash` (unique, 64), `expires_at`, `BaseEntity` | SHA-256 해시 보관 |
| `vehicles` (`Vehicle`) | `id` (PK), `driver_id` (FK→`members`, unique 1:1), `vehicle_type` (`VehicleType`), `plate_number`, `body_type` (`BodyType`) | 차주 1인 1차량 |
| `fare_rate` (`FareRate`) | `vehicle_type` (PK, `VehicleType`), `base_fare` (long), `per_km_fare` (long) | 단가표 |
| `fare_surcharge` (`FareSurcharge`) | `type` (PK, `SurchargeType`), `rate` (`BigDecimal(5,2)`) | 할증률 |
| `orders` (`Order`) | `id` (PK), `shipper_id` (FK), `driver_id` (FK, nullable), `status` (`OrderStatus`), `pickup_*` (`Location`), `dropoff_*` (`Location`), `pickup_at`, `arrive_by`, `cargo` (`Cargo`), `required_vehicle_type`, `body_type`, `loading_method`, `memo`, `fare`, `recommended_fare`, `distance_km`, `assigned_at`, `dropped_off_at`, `completed_at`, `version` (`@Version`), `BaseEntity` | 낙관적 락 적용 |
| `order_status_history` (`OrderStatusHistory`) | `id` (PK), `order_id` (FK), `from_status` (nullable), `to_status`, `actor_id` (FK, nullable), `memo`, `created_at` | 상태 변경·운임 수정 이력 |
| `payments` (`Payment`) | `id` (PK), `order_id` (FK, unique 1:1), `amount`, `status` (`PaymentStatus`, 기본 `HELD`), `version` (`@Version`), `BaseEntity` | 에스크로 상태 |
| `payment_transactions` (`PaymentTransaction`) | `id` (PK), `payment_id` (FK), `type` (`PaymentTransactionType`), `amount`, `created_at` | 건별 거래 원장 |

- **`Location` (`@Embeddable`)**: `address`, `detailAddress`, `region`(시·구 단위 공개 주소), `latitude`, `longitude`, `contactName`, `contactPhone`
- **`Cargo` (`@Embeddable`)**: `itemName`, `cargoType`, `weightKg`, `quantity`, `packageUnit`, `widthCm`, `depthCm`, `heightCm`, `fragile`, `noStack`

### 5.2 Enum 정의
- **`Role`**: `SHIPPER`, `DRIVER`, `ADMIN`
- **`MemberStatus`**: `ACTIVE`, `SUSPENDED`
- **`VehicleType`** (`maxLoadKg`, `label`): `TON_1`(1000, "1톤"), `TON_2_5`(2500, "2.5톤"), `TON_5`(5000, "5톤"), `TON_11`(11000, "11톤"), `TON_25`(25000, "25톤")
- **`BodyType`**: `CARGO`, `WING`, `BOX`, `REFRIGERATED`
- **`SurchargeType`** (`label`): `NIGHT`("야간"), `WEEKEND`("주말"), `MANUAL_LOADING`("수작업"), `URGENT`("긴급")
- **`OrderStatus`**: `REGISTERED`, `ASSIGNED`, `IN_TRANSIT`, `AWAITING_CONFIRM`, `COMPLETED`, `DISPUTED`, `CANCELLED`
- **`CargoType`**: `GENERAL`, `PALLET`, `MACHINERY`, `CONSTRUCTION`, `FURNITURE_APPLIANCE`, `OTHER`
- **`PackageUnit`**: `BOX`, `PALLET`, `PIECE`
- **`LoadingMethod`**: `FORKLIFT`, `MANUAL`
- **`DisputeResolution`**: `PAY_DRIVER`, `REFUND_SHIPPER`
- **`PaymentStatus`**: `HELD`, `RELEASED`, `REFUNDED`
- **`PaymentTransactionType`**: `CHARGE`, `ADDITIONAL_CHARGE`, `PARTIAL_REFUND`, `PAYOUT`, `REFUND`
- **`JobTab`**: `IN_PROGRESS` (`ASSIGNED`, `IN_TRANSIT`, `AWAITING_CONFIRM`, `DISPUTED`), `FINISHED` (`COMPLETED`, `CANCELLED`)

---

## 6. 핵심 비즈니스 로직 및 규칙

### 6.1 오더 상태 전이 (`Order` 엔티티 캡슐화)
`Order`는 `setStatus`를 제공하지 않으며, 모든 상태 변경은 엔티티 도메인 메서드와 `OrderService.changeStatus(...)`를 통해서만 수행하고 `order_status_history`를 동일 트랜잭션에 저장합니다.

| 현재 상태 | 행위 (메서드) | 주체 | 다음 상태 | 결제 연동 | 비고 |
| --- | --- | --- | --- | --- | --- |
| (없음) | `Order.create` | 화주 | `REGISTERED` | `hold` (`CHARGE`) | `pickupAt`은 현재 이후여야 함 |
| `REGISTERED` | `updateDetails` | 화주(본인) | `REGISTERED` | 차액 시 `adjust` (`ADDITIONAL_CHARGE` / `PARTIAL_REFUND`) | `version` 검증, 이력 메모 기록 |
| `REGISTERED` | `accept` | 차주(차량 보유) | `ASSIGNED` | — | `version`·차종/중량 불일치·낙관적 락 검증 |
| `REGISTERED` | `cancel` | 화주(본인) / 관리자 | `CANCELLED` | `refund` (`REFUND`) | `version` 및 사유 필수 |
| `ASSIGNED` | `cancelAssignment` | 배정된 차주 | `REGISTERED` | — (`HELD` 유지) | 상차 `driver-cancel-cutoff-hours`(2시간) 전까지만 허용 |
| `ASSIGNED` | `cancel` | 관리자 | `CANCELLED` | `refund` (`REFUND`) | `version` 및 사유 필수 |
| `ASSIGNED` | `startTransit` | 배정된 차주 | `IN_TRANSIT` | — | |
| `IN_TRANSIT` | `completeDropoff` | 배정된 차주 | `AWAITING_CONFIRM` | — | `droppedOffAt` 기록 |
| `AWAITING_CONFIRM` | `confirmReceipt` | 화주(본인) | `COMPLETED` | `release` (`PAYOUT`) | `completedAt` 기록 |
| `AWAITING_CONFIRM` | `autoConfirm` | 시스템(스케줄러) | `COMPLETED` | `release` (`PAYOUT`) | `droppedOffAt + 24시간` 이후 |
| `AWAITING_CONFIRM` | `reportIssue` | 화주(본인) | `DISPUTED` | — (`HELD` 유지) | 신고 사유 이력 기록 |
| `DISPUTED` | `resolveDispute` | 관리자 | `COMPLETED` (`PAY_DRIVER`) / `CANCELLED` (`REFUND_SHIPPER`) | `release` / `refund` | 처리 메모 필수 |

### 6.2 동시 수락 방지 및 버전 충돌 제어 (`MatchingService`)
1. 차주의 차량 보유 여부 확인 (`VEHICLE_REQUIRED`).
2. `order.status == REGISTERED` 확인 (`ORDER_ALREADY_ASSIGNED`).
3. 요청 `version`과 DB `order.version` 일치 여부 확인 (`ORDER_CHANGED` - 차주가 목록을 본 사이 화주가 수정한 경우).
4. 차주의 차량 차종 ≠ `requiredVehicleType` 또는 `cargo.weightKg > vehicleType.maxLoadKg`이고 `confirmMismatch == false`이면 `VEHICLE_MISMATCH`(409)와 `details`(`driverVehicleType`, `requiredVehicleType`, `weightKg`, `maxLoadKg`) 반환.
5. 커밋 시 `@Version` 기반 `ConcurrencyFailureException` 또는 `OptimisticLockException` 발생 시 `ORDER_ALREADY_ASSIGNED`(409)로 변환하여 1명만 수락 성공.

### 6.3 개인정보 마스킹 및 마감 시각 계산
- **열린 의뢰 목록/상세 (`/api/orders/open/**`)**: `region`(시·구)만 반환하며 상세주소, 연락처, 좌표는 제외합니다.
- **오더 상세 (`/api/orders/{id}`)**: `ADMIN`, 본인 화주, 또는 `REGISTERED`가 아닌 상태에서 배정된 차주에게만 전체 주소·좌표·연락처·메모·기사 차량정보·이력을 공개(`canViewPrivate=true`)합니다. 그 외 배차 전 차주에게는 `region`만 노출합니다.
- **마감 시각**: `driverCancelableUntil = pickupAt - 2시간`(`ASSIGNED`일 때), `autoConfirmAt = droppedOffAt + 24시간`(`AWAITING_CONFIRM`일 때)을 응답에 포함합니다.
- **미배차 판별 (`isUnassigned`)**: `status == REGISTERED && pickupAt.isBefore(now)`

### 6.4 추천 운임 계산 (`FareService`, `DistanceCalculationService`, `GeocodingService`)
1. **추천 차종**: `weightKg <= maxLoadKg`를 만족하는 가장 작은 `VehicleType` 선택 (`25,000kg` 초과 시 `TON_25`). 요청에 `vehicleType`이 지정되면 해당 차종 단가로 계산.
2. **거리 계산**: 카카오모빌리티 길찾기 API(`https://apis-navi.kakaomobility.com/v1/directions`, 타임아웃 연결 3초/읽기 5초) 호출. 키 미설정(`dummy-` 포함) 또는 실패 시 하버사인 직선거리 × `1.3` (소수점 첫째 자리 반올림) 폴백 (`isDistanceEstimated = true`).
3. **할증률 합산** (중복 시 합산):
   - `NIGHT`: `pickupAt` 시가 `22 <= hour || hour < 6` (기본 `0.20`)
   - `WEEKEND`: `pickupAt` 요일이 토/일 (기본 `0.10`)
   - `MANUAL_LOADING`: `loadingMethod == MANUAL` (기본 `0.15`)
   - `URGENT`: `requestedAt`(없으면 현재) 기준 `pickupAt`까지 `0 <= diff <= 24시간` (기본 `0.30`)
4. **공식 및 반올림**:
   - `rawFare = baseFare + Math.round(distanceKm * perKmFare)`
   - `surchargeAmount = Math.round(rawFare * totalSurchargeRate)`
   - `recommendedFare = Math.round((rawFare + surchargeAmount) / 1000.0) * 1000L` (1,000원 단위 반올림)
5. **지오코딩 (`GeocodingService`)**: 카카오 로컬 주소 검색 API 호출, 실패/키 없음 시 서울시청 좌표 `(37.5665, 126.9780)` 반환.

### 6.5 자동 수령 확인 스케줄러 (`AutoConfirmScheduler`)
- `app.order.auto-confirm-cron` (`0 */10 * * * *`, 10분마다) 주기로 `AWAITING_CONFIRM` 상태이면서 `droppedOffAt <= now - 24시간`인 오더 ID를 조회합니다.
- 각 오더를 별도 트랜잭션(`DeliveryService.autoConfirm`)으로 처리하며, 화주의 수동 확인과 겹쳐도 `@Version` 충돌로 1회만 지급됩니다.

---

## 7. REST API 전체 명세

모든 응답은 `ApiResponse<T>` 형식입니다.

### 7.1 인증 및 회원 (`AuthController`, `MemberController`)
| 메서드 | 경로 | 권한 | 요청 (Query / Body) | 응답 `data` |
| --- | --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | 공개 | `SignupRequest` (`email`, `password` ≥8자, `name`, `phone`, `role` ≠ `ADMIN`) | `MemberResponse` |
| `POST` | `/api/auth/login` | 공개 | `LoginRequest` (`email`, `password`) | `MemberResponse` + `Set-Cookie` (`access_token`, `refresh_token`) |
| `POST` | `/api/auth/refresh` | 공개 | Cookie: `refresh_token` | `MemberResponse` + `Set-Cookie` (새 토큰 쌍) |
| `POST` | `/api/auth/logout` | 공개 | Cookie: `refresh_token` | `null` + 만료 쿠키 헤더 |
| `GET` | `/api/members/me` | 인증 | — | `MemberResponse` (`id`, `email`, `name`, `phone`, `role`) |
| `PATCH` | `/api/members/me` | 인증 | `UpdateProfileRequest` (`name`, `phone` `^01[0-9]-[0-9]{3,4}-[0-9]{4}$`, 선택 `currentPassword`, `newPassword` ≥8자) | `MemberResponse` |

### 7.2 차량 (`VehicleController`, `DRIVER` 전용)
| 메서드 | 경로 | 권한 | 요청 | 응답 `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/vehicles/me` | `DRIVER` | — | `VehicleResponse` (`id`, `driverId`, `vehicleType`, `vehicleTypeName`, `maxLoadKg`, `plateNumber`, `bodyType`) |
| `POST` | `/api/vehicles/me` | `DRIVER` | `VehicleRequest` (`vehicleType`, `plateNumber`, `bodyType`) | `VehicleResponse` (기등록 시 갱신) |
| `PUT` | `/api/vehicles/me` | `DRIVER` | `VehicleRequest` | `VehicleResponse` |

### 7.3 운임 및 지오코딩 (`FareController`, `AdminFareController`)
| 메서드 | 경로 | 권한 | 요청 | 응답 `data` |
| --- | --- | --- | --- | --- |
| `POST` | `/api/fares/estimate` | 인증 | `EstimateFareRequest` (`pickupLat/Lng`, `dropoffLat/Lng`, `weightKg` >0, 선택 `vehicleType`, `pickupAt`, `loadingMethod`, `requestedAt`) | `FareEstimate` |
| `GET` | `/api/fares/geocode` | 인증 | Query: `address` | `Coordinates` (`latitude`, `longitude`) |
| `GET` | `/api/fares/table` | 공개 | — | `FareTableResponse` (`rates`, `surcharges`) |
| `GET` | `/api/admin/fares` | `ADMIN` | — | `FareTableResponse` |
| `PUT` | `/api/admin/fares/rates` | `ADMIN` | `UpdateFareRatesRequest` (`rates`: `vehicleType`, `baseFare` ≥0, `perKmFare` ≥0) | `List<FareRateResponse>` |
| `PUT` | `/api/admin/fares/surcharges` | `ADMIN` | `UpdateFareSurchargesRequest` (`surcharges`: `type`, `rate` 0.00~5.00) | `List<FareSurchargeResponse>` |

### 7.4 오더 관리 (`OrderController`, `AdminOrderController`)
| 메서드 | 경로 | 권한 | 요청 | 응답 `data` |
| --- | --- | --- | --- | --- |
| `POST` | `/api/orders` | `SHIPPER` | `SaveOrderRequest` (`pickup`, `dropoff`, `pickupAt` > 현재, `arriveBy` > `pickupAt`, `cargo`, `requiredVehicleType`, `bodyType`, `loadingMethod`, `memo`, `fare`, `recommendedFare`, `distanceKm`) | `OrderDetailResponse` |
| `GET` | `/api/orders` | `SHIPPER` | Query: `status` (선택), `page` (기본 0, size 20) | `Page<OrderSummaryResponse>` |
| `GET` | `/api/orders/{id}` | 인증(관계자) | Path: `id` | `OrderDetailResponse` |
| `PUT` | `/api/orders/{id}` | `SHIPPER` | `UpdateOrderRequest` (`version`, `details`: `SaveOrderRequest`) | `OrderDetailResponse` |
| `POST` | `/api/orders/{id}/cancel` | `SHIPPER` | `CancelOrderRequest` (`version`, `reason`) | `OrderDetailResponse` |
| `GET` | `/api/admin/orders` | `ADMIN` | Query: `status`, `vehicleType`, `from` (`YYYY-MM-DD`), `to` (`YYYY-MM-DD`), `page` (size 20) | `Page<OrderSummaryResponse>` |
| `GET` | `/api/admin/orders/{id}` | `ADMIN` | Path: `id` | `OrderDetailResponse` |
| `POST` | `/api/admin/orders/{id}/cancel` | `ADMIN` | `CancelOrderRequest` (`version`, `reason`) | `OrderDetailResponse` |

### 7.5 배차·매칭 (`MatchingController`, `DRIVER` 전용)
| 메서드 | 경로 | 권한 | 요청 | 응답 `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/orders/open` | `DRIVER` | Query: `vehicleType` (선택), `page` (기본 0, size 20) | `Page<OpenOrderResponse>` (`pickupAt` 오름차순) |
| `GET` | `/api/orders/open/{id}` | `DRIVER` | Path: `id` | `OpenOrderDetailResponse` (시·구만 공개) |
| `POST` | `/api/orders/{id}/accept` | `DRIVER` | `AcceptOrderRequest` (`version`, `confirmMismatch`) | `AcceptOrderResponse` |
| `POST` | `/api/orders/{id}/cancel-assignment` | `DRIVER` | `CancelAssignmentRequest` (`reason`) | `null` |

### 7.6 운송 진행, 내 운송, 분쟁 및 결제 (`DeliveryController`, `JobController`, `AdminDisputeController`, `PaymentController`)
| 메서드 | 경로 | 권한 | 요청 | 응답 `data` |
| --- | --- | --- | --- | --- |
| `POST` | `/api/orders/{id}/pickup` | `DRIVER` | Path: `id` | `DeliveryStatusResponse` (`orderId`, `status`) |
| `POST` | `/api/orders/{id}/dropoff` | `DRIVER` | Path: `id` | `DeliveryStatusResponse` |
| `POST` | `/api/orders/{id}/confirm` | `SHIPPER` | Path: `id` | `DeliveryStatusResponse` |
| `POST` | `/api/orders/{id}/report` | `SHIPPER` | `ReportIssueRequest` (`reason`) | `DeliveryStatusResponse` |
| `GET` | `/api/jobs` | `DRIVER` | Query: `status` (`IN_PROGRESS` / `FINISHED`, 선택), `page` (size 20) | `Page<JobSummaryResponse>` |
| `GET` | `/api/jobs/{orderId}` | `DRIVER` | Path: `orderId` | `JobDetailResponse` |
| `GET` | `/api/admin/disputes` | `ADMIN` | Query: `resolved` (기본 `false`), `page` (size 20) | `Page<DisputeSummaryResponse>` |
| `GET` | `/api/admin/disputes/counts` | `ADMIN` | — | `DisputeCountsResponse` (`pending`, `resolved`) |
| `GET` | `/api/admin/disputes/{orderId}` | `ADMIN` | Path: `orderId` | `DisputeDetailResponse` |
| `POST` | `/api/admin/disputes/{orderId}/resolve` | `ADMIN` | `ResolveDisputeRequest` (`resolution`, `memo`) | `DeliveryStatusResponse` |
| `GET` | `/api/orders/{id}/payment` | `SHIPPER`, `ADMIN` | Path: `id` | `PaymentDetailResponse` |
| `GET` | `/api/payouts` | `DRIVER` | Query: `page` (size 20) | `Page<PayoutResponse>` |

### 7.7 관리자 회원 및 대시보드 (`AdminMemberController`, `AdminDashboardController`)
| 메서드 | 경로 | 권한 | 요청 | 응답 `data` |
| --- | --- | --- | --- | --- |
| `GET` | `/api/admin/members` | `ADMIN` | Query: `role`, `status`, `keyword` (이름·이메일·연락처), `Pageable` (기본 `size=10, sort=id,desc`, 허용 정렬 필드: `id`, `email`, `name`, `phone`, `role`, `status`, `createdAt`) | `Page<AdminMemberResponse>` |
| `GET` | `/api/admin/members/counts` | `ADMIN` | — | `MemberCountsResponse` (`total`, `shipper`, `driver`) |
| `GET` | `/api/admin/members/{id}` | `ADMIN` | Path: `id` | `AdminMemberDetailResponse` |
| `PATCH` | `/api/admin/members/{id}/status` | `ADMIN` | `UpdateMemberStatusRequest` (`status`: `ACTIVE` / `SUSPENDED`, 선택 `reason`) | `AdminMemberResponse` |
| `GET` | `/api/admin/dashboard` | `ADMIN` | — | `AdminDashboardResponse` (`summary`, `urgentOrders` 최대 5건, `disputeOrders` 최대 5건) |
| `GET` | `/api/admin/dashboard/orders` | `ADMIN` | Query: `type` (`TODAY_REGISTERED`, `TODAY_ASSIGNED`, `TODAY_COMPLETED`, `URGENT_UNASSIGNED`) | `List<AdminDashboardOrderDto>` |

---

## 8. 설정 프로퍼티 및 초기 시드 데이터

### 8.1 주요 설정 (`application.properties`)
- `spring.profiles.default=local`, `spring.jpa.open-in-view=false`, `spring.sql.init.encoding=UTF-8`
- `app.jwt.validity-ms=1800000` (30분), `app.jwt.refresh-validity-ms=1209600000` (14일)
- `app.auth.cookie-secure=true` (로컬 HTTP 환경에서는 `application-local.properties`에서 `false` 설정 가능)
- `app.order.auto-confirm-hours=24`, `app.order.auto-confirm-cron=0 */10 * * * *`
- `app.order.driver-cancel-cutoff-hours=2`
- 비밀키(`app.jwt.secret`, `app.kakao.rest-api-key`) 및 DB 접속 정보는 `application-local.properties` 또는 환경변수로 주입

### 8.2 초기 시드 데이터 ([data.sql](../../backend/src/main/resources/data.sql))
- **계정 (공통 비밀번호 `pass1234`, BCrypt)**:
  - `id=1`: `admin@freight.test` (`ADMIN`)
  - `id=2`: `shipper1@freight.test` (`SHIPPER`)
  - `id=3`: `driver1@freight.test` (`DRIVER`, 5톤 카고 `80가1234`)
  - `id=4`: `driver2@freight.test` (`DRIVER`, 1톤 탑차 `81나5678`)
- **운임 단가표 (`fare_rate`)**: `TON_1` (30,000 / 1,000), `TON_2_5` (50,000 / 1,400), `TON_5` (80,000 / 1,900), `TON_11` (130,000 / 2,600), `TON_25` (200,000 / 3,500)
- **할증률 (`fare_surcharge`)**: `NIGHT` (0.20), `WEEKEND` (0.10), `MANUAL_LOADING` (0.15), `URGENT` (0.30)

