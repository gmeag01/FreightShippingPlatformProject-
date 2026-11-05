# delivery·payment 구현 계획 (담당 E, 기존 범위)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 에스크로 결제(보관·차액·지급·환불)와 운송 진행(상차·하차·수령 확인·문제 신고·자동 확인·분쟁 처리) 백엔드를 만든다.

**Architecture:** `payment`는 `PaymentService`로 결제 상태와 건별 거래를 관리하고, `PaymentGateway` 뒤에 더미 구현을 둔다. `delivery`는 엔티티 없이 `OrderService.changeStatus`와 `PaymentService`를 한 트랜잭션으로 묶는다.

**Tech Stack:** Java 21, Spring Boot 3.5, Spring Data JPA, Spring Security, H2(테스트), JUnit 5, MockMvc

**Spec:** `docs/superpowers/specs/2026-11-02-freight-platform-design.md` 3장, `docs/superpowers/plans/2026-11-02-roadmap.md` 'delivery·payment (E)'

## 범위

- 이 계획: 설계 문서 보강(#24) 전부터 있던 E 백엔드 범위. `resolve`의 필수 `memo`는 같은 API의 현재 규칙이므로 여기서 함께 만든다.
- 나중 계획: #24로 추가된 조회 API(`GET /api/admin/disputes`, `/api/admin/disputes/{orderId}`, `/api/jobs`, `/api/jobs/{orderId}`, `/api/payouts`, `/api/orders/{id}/payment`), 화면.

## Global Constraints

- 패키지: `com.freight.<도메인>.{controller,service,repository,entity,dto}`. 다른 도메인의 repository를 직접 쓰지 않는다.
- 오더 상태는 `OrderService.changeStatus`와 `Order` 전이 메서드로만 바꾼다. 자동 확인의 `actorId`는 `null`이다.
- 결제 상태는 `HELD → RELEASED | REFUNDED`만 있고, 끝난 결제는 `PAYMENT_ALREADY_SETTLED`로 거부한다.
- 오더 상태 변경과 결제 변경은 같은 트랜잭션이다. 하나가 실패하면 둘 다 되돌린다.
- 주석은 한국어. service public 메서드는 `@param`, `@return`, `@throws`를 적는다.
- 커밋 전 `./gradlew spotlessApply test` 통과.

## Review Focus

1. 수령 확인을 두 번 누름: 두 번째는 `INVALID_STATUS_TRANSITION`, `PAYOUT`은 1건 (Task 2)
2. 결제 게이트웨이 실패: 오더 상태와 이력이 그대로 (Task 2)
3. 결제 행이 없는 오더 확인: `PAYMENT_NOT_FOUND`, 오더는 그대로 (Task 2)
4. 자동 확인 중 한 오더가 실패: 나머지 오더는 계속 처리 (Task 3)
5. 시간이 안 된 오더의 자동 확인: 대상 조회에서 빠지고 상태 유지 (Task 3)

---

### Task 1: 에스크로 결제

**Files:**
- Modify: `backend/src/main/java/com/freight/payment/entity/Payment.java`, `backend/src/main/java/com/freight/global/exception/ErrorCode.java`
- Create: `payment/repository/PaymentRepository.java`, `payment/repository/PaymentTransactionRepository.java`, `payment/service/PaymentGateway.java`, `payment/service/DummyPaymentGateway.java`, `payment/service/PaymentService.java`
- Test: `payment/entity/PaymentTest.java`, `payment/service/PaymentServiceTest.java`

**Interfaces:**
- Consumes: `OrderService.getOrder(Long): Order`
- Produces:
  - `Payment.changeAmount(long)`, `Payment.release()`, `Payment.refund()`
  - `PaymentGateway`: `void charge(Long orderId, long amount)`, `void refund(Long orderId, long amount)`, `void payout(Long orderId, long amount)`
  - `PaymentService`: `void hold(Long orderId, long amount)`, `void adjust(Long orderId, long newAmount)`, `void release(Long orderId)`, `void refund(Long orderId)`
  - `ErrorCode.PAYMENT_NOT_FOUND`(404), `ErrorCode.PAYMENT_ALREADY_SETTLED`(409)

- [ ] **Step 1: 실패하는 테스트 작성** — `release_afterRefund_fails`, `refund_afterRelease_fails`, `changeAmount_afterRelease_fails`, `hold_createsHeldPaymentAndChargeTransaction`, `hold_withNonPositiveAmount_fails`(`INVALID_INPUT`), `adjust_increase_recordsAdditionalCharge`(차액 금액), `adjust_decrease_recordsPartialRefund`, `adjust_sameAmount_recordsNothing`, `release_recordsPayoutOfFullAmount`, `refund_recordsRefundOfFullAmount`, `release_withoutPayment_fails`(`PAYMENT_NOT_FOUND`)
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests 'com.freight.payment.*'` → 컴파일 실패
- [ ] **Step 3: 구현** — 게이트웨이를 부른 뒤 거래를 남긴다. 환불·지급 금액은 그 시점의 `Payment.amount` 전체다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: Commit** — `feat: 에스크로 결제 서비스와 더미 게이트웨이 추가`

### Task 2: 운송 진행과 분쟁 처리

**Files:**
- Create: `delivery/service/DeliveryService.java`, `delivery/controller/DeliveryController.java`, `delivery/controller/AdminDisputeController.java`, `delivery/dto/ReportIssueRequest.java`, `delivery/dto/ResolveDisputeRequest.java`, `delivery/dto/DeliveryStatusResponse.java`
- Test: `delivery/service/DeliveryServiceTest.java`, `delivery/service/DeliveryRollbackTest.java`, `delivery/controller/DeliveryControllerTest.java`, `delivery/controller/AdminDisputeControllerTest.java`

**Interfaces:**
- Consumes: `OrderService.changeStatus`, `OrderService.getOrder`, Task 1의 `PaymentService`
- Produces:
  - `DeliveryService`: `DeliveryStatusResponse pickup(Long orderId, Long driverId)`, `dropoff(Long orderId, Long driverId)`, `confirm(Long orderId, Long shipperId)`, `report(Long orderId, Long shipperId, ReportIssueRequest request)`, `resolveDispute(Long orderId, Long adminId, ResolveDisputeRequest request)`
  - `record DeliveryStatusResponse(Long orderId, OrderStatus status)`, `record ReportIssueRequest(@NotBlank String reason)`, `record ResolveDisputeRequest(@NotNull DisputeResolution resolution, @NotBlank String memo)`
  - `POST /api/orders/{id}/pickup`·`/dropoff`(DRIVER), `/confirm`·`/report`(SHIPPER), `POST /api/admin/disputes/{orderId}/resolve`(ADMIN)

- [ ] **Step 1: 실패하는 테스트 작성** — `pickup_movesToInTransit`, `pickup_byOtherDriver_fails`(`NOT_ORDER_OWNER`), `dropoff_movesToAwaitingConfirm`, `confirm_completesOrderAndReleasesPayment`, `confirm_twice_failsAndPaysOnce`, `confirm_beforeDropoff_fails`, `confirm_withoutPayment_keepsOrderUnchanged`, `report_keepsPaymentHeldAndRecordsReason`, `resolve_payDriver_releasesPayment`, `resolve_refundShipper_cancelsAndRefunds`, `resolve_recordsMemoInHistory`, `confirm_whenGatewayFails_rollsBackOrderAndHistory`, 컨트롤러 역할·검증 테스트(빈 `reason`, 빈 `memo`는 400, 역할이 다르면 403)
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests 'com.freight.delivery.*'` → 컴파일 실패
- [ ] **Step 3: 구현** — 메서드마다 `@Transactional`로 `changeStatus`와 결제 호출을 묶는다.
- [ ] **Step 4: 통과 확인** — 같은 명령 → PASS
- [ ] **Step 5: Commit** — `feat: 상차·하차·수령 확인·문제 신고·분쟁 처리 API 추가`

### Task 3: 자동 확인 스케줄러와 동시성

**Files:**
- Modify: `order/repository/OrderRepository.java`, `order/service/OrderService.java`, `delivery/service/DeliveryService.java`, `backend/src/main/resources/application.properties`, `backend/src/test/resources/application-test.properties`
- Create: `global/config/SchedulingConfig.java`, `delivery/service/AutoConfirmScheduler.java`
- Test: `delivery/service/AutoConfirmSchedulerTest.java`, `delivery/service/DeliveryConcurrencyTest.java`

**Interfaces:**
- Produces:
  - `OrderService.findAutoConfirmTargetIds(LocalDateTime droppedOffBefore): List<Long>` — `AWAITING_CONFIRM`이고 `droppedOffAt <= droppedOffBefore`
  - `DeliveryService.findAutoConfirmTargetIds(): List<Long>`, `DeliveryService.autoConfirm(Long orderId)`
  - `AutoConfirmScheduler.confirmExpiredOrders()`, `app.order.auto-confirm-cron=0 */10 * * * *`, 테스트는 `-`로 끈다

- [ ] **Step 1: 실패하는 테스트 작성** — `autoConfirm_afterDeadline_completesAndReleases`, `findTargets_beforeDeadline_excludesOrder`, `confirmExpiredOrders_continuesAfterOneFailure`, `confirmAndAutoConfirmSimultaneously_paysOnce`(`PAYOUT` 1건, `RELEASED`)
- [ ] **Step 2: 실패 확인** — `./gradlew test --tests 'com.freight.delivery.*'` → 컴파일 실패
- [ ] **Step 3: 구현** — 오더마다 별도 트랜잭션이 되도록 스케줄러가 `DeliveryService.autoConfirm`을 호출하고, 실패는 로그만 남기고 다음 오더로 넘어간다.
- [ ] **Step 4: 전체 확인** — `./gradlew spotlessApply test` → `BUILD SUCCESSFUL`
- [ ] **Step 5: Commit** — `feat: 수령 자동 확인 스케줄러와 동시 확인 테스트 추가`

### Task 4: 오더 결제 연결 (#22가 합쳐진 뒤)

C의 `OrderPaymentPort`는 `feat/order-management`(#22)에만 있어 이 작업은 #22가 합쳐진 뒤에 한다.

**Files:**
- Modify: `payment/service/PaymentService.java`, C의 `order/service/OrderPaymentUnavailableTest.java`

- [ ] **Step 1:** `PaymentService implements OrderPaymentPort`로 연결한다. 구현체가 생기면 결제 미연결을 전제한 `OrderPaymentUnavailableTest`는 맞지 않으므로 C와 맞춰 고친다.
- [ ] **Step 2:** 화주 취소와 관리자 취소 끝에 결제가 `REFUNDED`, 운임 수정 뒤 차액 거래가 남는지 통합 테스트로 확인한다.
- [ ] **Step 3: Commit** — `feat: 오더 등록·수정·취소를 결제와 연결`
