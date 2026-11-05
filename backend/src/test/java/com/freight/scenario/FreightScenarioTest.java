package com.freight.scenario;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.delivery.dto.ReportIssueRequest;
import com.freight.delivery.dto.ResolveDisputeRequest;
import com.freight.delivery.service.AutoConfirmScheduler;
import com.freight.fare.dto.EstimateFareRequest;
import com.freight.fare.dto.UpdateFareRateItem;
import com.freight.fare.dto.UpdateFareRatesRequest;
import com.freight.fare.dto.UpdateFareSurchargeItem;
import com.freight.fare.dto.UpdateFareSurchargesRequest;
import com.freight.fare.entity.SurchargeType;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.matching.dto.CancelAssignmentRequest;
import com.freight.member.dto.UpdateMemberStatusRequest;
import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.order.OrderRequests;
import com.freight.order.dto.CancelOrderRequest;
import com.freight.order.dto.SaveOrderRequest;
import com.freight.order.dto.UpdateOrderRequest;
import com.freight.order.entity.DisputeResolution;
import com.freight.order.entity.LoadingMethod;
import com.freight.scenario.ScenarioApi.Account;
import com.freight.scenario.ScenarioApi.ApiResult;
import com.freight.vehicle.dto.VehicleRequest;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 로드맵 2주차 완료 기준(등록 → 수락 → 상차 → 하차 → 확인 → 지급)과 '최종 확인 시나리오' 1~9번을 API로 끝까지 실행한다.
 * 도메인 사이 연결을 확인하려고 Mock 없이 실제 빈과 JWT를 쓰고, 테스트를 트랜잭션으로 감싸지 않아 요청마다 실제로 커밋된다.
 * 10번(휴대폰 폭)은 화면 항목이라 여기서 다루지 않는다.
 */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:freight_scenario;MODE=MariaDB;DATABASE_TO_LOWER=TRUE")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FreightScenarioTest {

    private static final int HTTP_OK = 200;
    private static final int HTTP_BAD_REQUEST = 400;
    private static final int HTTP_UNAUTHORIZED = 401;
    private static final int HTTP_FORBIDDEN = 403;
    private static final int HTTP_CONFLICT = 409;
    private static final long FARE = 350_000L;
    private static final long RAISED_FARE = 390_000L;
    private static final long LOWERED_FARE = 300_000L;
    private static final long NEW_BASE_FARE = 300_000L;
    private static final long NEW_PER_KM_FARE = 5_000L;
    private static final BigDecimal NEW_MANUAL_RATE = new BigDecimal("0.50");
    private static final LocalDateTime WEEKDAY_PICKUP_AT = LocalDateTime.of(2026, 12, 2, 14, 0);
    private static final int AUTO_CONFIRM_HOURS = 24;
    private static final AtomicInteger PLATE_SEQUENCE = new AtomicInteger(1000);

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AutoConfirmScheduler autoConfirmScheduler;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private ScenarioApi api;
    private Account shipper;
    private Account admin;

    @BeforeEach
    void setUp() throws Exception {
        api = new ScenarioApi(mvc, objectMapper);
        shipper = api.signUpAndLogin(Role.SHIPPER);
        admin = createAdmin();
    }

    @Test
    @DisplayName("2주차 기준: 등록부터 지급까지 화주·차주가 API로 끝까지 진행하면 차주에게 운임이 지급된다")
    void fullScenario_registerToPayout_releasesFareToDriver() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_5);
        JsonNode estimate = estimateFare(5000);
        assertThat(estimate.path("recommendedVehicleType").asText()).isEqualTo("TON_5");
        assertThat(estimate.path("isDistanceEstimated").asBoolean()).isTrue();
        assertThat(estimate.path("recommendedFare").asLong() % 1000).isZero();

        long fare = estimate.path("recommendedFare").asLong();
        JsonNode order = registerOrder(orderRequest(VehicleType.TON_5, 5000, daysLater(2), fare, estimate));
        long orderId = idOf(order);
        assertThat(order.path("status").asText()).isEqualTo("REGISTERED");
        assertThat(order.path("recommendedFare").asLong()).isEqualTo(fare);
        assertThat(paymentOf(orderId).path("status").asText()).isEqualTo("HELD");

        assertSuccess(accept(driver, orderId, order.path("version").asLong(), false));
        assertSuccess(api.post("/api/orders/" + orderId + "/pickup", driver.token(), null));
        assertSuccess(api.post("/api/orders/" + orderId + "/dropoff", driver.token(), null));
        assertThat(orderDetail(orderId, shipper).path("autoConfirmAt").isNull()).isFalse();
        assertSuccess(api.post("/api/orders/" + orderId + "/confirm", shipper.token(), null));

        JsonNode completed = orderDetail(orderId, shipper);
        assertThat(completed.path("status").asText()).isEqualTo("COMPLETED");
        assertThat(historyStatuses(completed))
                .containsExactly("REGISTERED", "ASSIGNED", "IN_TRANSIT", "AWAITING_CONFIRM", "COMPLETED");
        assertPaymentSettled(orderId, "RELEASED", List.of("CHARGE", "PAYOUT"));
        assertPayoutListed(driver, orderId, fare);
        assertFinishedJobListed(driver, orderId);
    }

    @Test
    @DisplayName("시나리오 2: 차종 필터에는 그 차종만 나오고, 수락 전 차주에게 상세주소와 연락처가 나가지 않는다")
    void openOrders_filteredByVehicleType_hideAddressUntilAssigned() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_5);
        long fiveTonOrderId = idOf(registerOrder(VehicleType.TON_5, 4000, daysLater(2)));
        long oneTonOrderId = idOf(registerOrder(VehicleType.TON_1, 800, daysLater(2)));

        ApiResult list = api.get("/api/orders/open?vehicleType=TON_5", driver.token());
        List<Long> listedIds =
                contentOf(list).stream().map(row -> row.path("id").asLong()).toList();
        assertThat(listedIds).contains(fiveTonOrderId).doesNotContain(oneTonOrderId);
        assertThat(contentOf(list))
                .allMatch(row -> "TON_5".equals(row.path("requiredVehicleType").asText()));
        assertAddressHidden(list);

        ApiResult openDetail = api.get("/api/orders/open/" + fiveTonOrderId, driver.token());
        assertThat(openDetail.data().path("pickupRegion").asText()).isEqualTo("서울 강남구");
        assertAddressHidden(openDetail);
        assertAddressHidden(api.get("/api/orders/" + fiveTonOrderId, driver.token()));

        long version = openDetail.data().path("version").asLong();
        assertSuccess(accept(driver, fiveTonOrderId, version, false));
        JsonNode assigned = orderDetail(fiveTonOrderId, driver);
        assertThat(assigned.path("pickup").path("detailAddress").asText()).isEqualTo("1층 물류창고");
        assertThat(assigned.path("pickup").path("contactPhone").asText()).isEqualTo("010-1234-5678");
    }

    @Test
    @DisplayName("시나리오 3: 1톤 차주의 5,000kg 오더 수락은 경고 후 확인하면 된다")
    void accept_overweightOrder_needsConfirmMismatch() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_1);
        JsonNode order = registerOrder(VehicleType.TON_5, 5000, daysLater(2));
        long version = order.path("version").asLong();

        ApiResult warned = accept(driver, idOf(order), version, false);

        assertFailure(warned, HTTP_CONFLICT, "VEHICLE_MISMATCH");
        JsonNode warning = warned.body().path("error").path("fieldErrors");
        assertThat(warning.path("driverVehicleType").asText()).isEqualTo("TON_1");
        assertThat(warning.path("requiredVehicleType").asText()).isEqualTo("TON_5");
        assertThat(warning.path("weightKg").asText()).isEqualTo("5000");
        assertThat(warning.path("maxLoadKg").asText()).isEqualTo("1000");
        assertThat(orderDetail(idOf(order), shipper).path("status").asText()).isEqualTo("REGISTERED");

        assertSuccess(accept(driver, idOf(order), version, true));
        assertThat(orderDetail(idOf(order), shipper).path("driverId").asLong()).isEqualTo(driver.id());
    }

    @Test
    @DisplayName("시나리오 4: 두 차주가 동시에 수락하면 한 명만 성공하고 다른 한 명은 이미 배차됨을 받는다")
    void accept_byTwoDriversAtOnce_onlyOneSucceeds() throws Exception {
        Account firstDriver = driverWithVehicle(VehicleType.TON_2_5);
        Account secondDriver = driverWithVehicle(VehicleType.TON_2_5);
        JsonNode order = registerOrder(VehicleType.TON_2_5, 1200, daysLater(2));
        long version = order.path("version").asLong();

        List<ApiResult> results = runAtOnce(List.of(
                () -> accept(firstDriver, idOf(order), version, false),
                () -> accept(secondDriver, idOf(order), version, false)));

        assertThat(results).filteredOn(result -> result.status() == HTTP_OK).hasSize(1);
        ApiResult rejected = results.stream()
                .filter(result -> result.status() != HTTP_OK)
                .findFirst()
                .orElseThrow();
        assertFailure(rejected, HTTP_CONFLICT, "ORDER_ALREADY_ASSIGNED");
        assertThat(historyStatuses(orderDetail(idOf(order), shipper))).containsExactly("REGISTERED", "ASSIGNED");
    }

    @Test
    @DisplayName("시나리오 5: 차주가 본 뒤 화주가 운임을 바꾸면 그 수락은 거부되고, 차액 결제와 이력이 남는다")
    void accept_afterShipperChangedFare_failsWithOrderChanged() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        long orderId = idOf(registerOrder(VehicleType.TON_2_5, 1200, daysLater(2)));
        JsonNode seen = api.get("/api/orders/open/" + orderId, driver.token()).data();
        long seenVersion = seen.path("version").asLong();

        SaveOrderRequest raised = orderRequest(VehicleType.TON_2_5, 1200, daysLater(2), RAISED_FARE, null);
        ApiResult updated =
                api.put("/api/orders/" + orderId, shipper.token(), new UpdateOrderRequest(seenVersion, raised));
        assertSuccess(updated);

        assertFailure(accept(driver, orderId, seenVersion, false), HTTP_CONFLICT, "ORDER_CHANGED");
        assertThat(paymentOf(orderId).path("amount").asLong()).isEqualTo(RAISED_FARE);
        assertThat(transactionTypes(orderId)).containsExactly("CHARGE", "ADDITIONAL_CHARGE");
        assertThat(lastHistory(orderDetail(orderId, shipper)).path("memo").asText())
                .contains("350,000", "390,000");

        assertSuccess(accept(driver, orderId, updated.data().path("version").asLong(), false));
    }

    @Test
    @DisplayName("시나리오 6: 상차 3시간 전 차주 취소는 되고, 오더는 다시 열리며 화주와 관리자가 취소 사실을 본다")
    void cancelAssignment_threeHoursBeforePickup_reopensOrder() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        Account nextDriver = driverWithVehicle(VehicleType.TON_2_5);
        JsonNode order =
                registerOrder(VehicleType.TON_2_5, 1200, LocalDateTime.now().plusHours(3));
        long orderId = idOf(order);
        assertSuccess(accept(driver, orderId, order.path("version").asLong(), false));

        assertSuccess(cancelAssignment(driver, orderId, "차량 고장"));

        JsonNode reopened = orderDetail(orderId, shipper);
        assertThat(reopened.path("status").asText()).isEqualTo("REGISTERED");
        assertThat(reopened.path("driverId").isNull()).isTrue();
        assertThat(reopened.path("isDriverCancelled").asBoolean()).isTrue();
        assertThat(lastHistory(reopened).path("memo").asText()).isEqualTo("차량 고장");
        assertThat(paymentOf(orderId).path("status").asText()).isEqualTo("HELD");
        JsonNode memberDetail =
                api.get("/api/admin/members/" + driver.id(), admin.token()).data();
        assertThat(memberDetail.path("cancellationCount").asLong()).isEqualTo(1);

        assertSuccess(accept(nextDriver, orderId, reopened.path("version").asLong(), false));
    }

    @Test
    @DisplayName("시나리오 6: 상차 1시간 전 차주 취소는 거부되고, 관리자가 취소하면 화주에게 환불된다")
    void cancelAssignment_oneHourBeforePickup_failsAndAdminCanCancel() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        JsonNode order =
                registerOrder(VehicleType.TON_2_5, 1200, LocalDateTime.now().plusHours(1));
        long orderId = idOf(order);
        assertSuccess(accept(driver, orderId, order.path("version").asLong(), false));

        assertFailure(cancelAssignment(driver, orderId, "차량 고장"), HTTP_CONFLICT, "DRIVER_CANCEL_CUTOFF_PASSED");
        long version = orderDetail(orderId, shipper).path("version").asLong();
        CancelOrderRequest cancel = new CancelOrderRequest(version, "차주 요청으로 관리자 취소");
        assertFailure(
                api.post("/api/orders/" + orderId + "/cancel", shipper.token(), cancel),
                HTTP_CONFLICT,
                "INVALID_STATUS_TRANSITION");

        assertSuccess(api.post("/api/admin/orders/" + orderId + "/cancel", admin.token(), cancel));

        assertThat(orderDetail(orderId, shipper).path("status").asText()).isEqualTo("CANCELLED");
        assertPaymentSettled(orderId, "REFUNDED", List.of("CHARGE", "REFUND"));
    }

    @Test
    @DisplayName("시나리오 7: 화주가 확인하지 않아도 자동 확인 시간이 지나면 시스템이 완료하고 한 번만 지급한다")
    void autoConfirm_afterDeadline_releasesFareOnce() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        long orderId = awaitingConfirmOrder(driver);

        autoConfirmScheduler.confirmExpiredOrders();
        assertThat(orderDetail(orderId, shipper).path("status").asText()).isEqualTo("AWAITING_CONFIRM");

        moveDropoffBeforeDeadline(orderId);
        autoConfirmScheduler.confirmExpiredOrders();

        JsonNode completed = orderDetail(orderId, shipper);
        assertThat(completed.path("status").asText()).isEqualTo("COMPLETED");
        assertThat(lastHistory(completed).path("actorName").isNull()).isTrue();
        assertPaymentSettled(orderId, "RELEASED", List.of("CHARGE", "PAYOUT"));

        ApiResult lateConfirm = api.post("/api/orders/" + orderId + "/confirm", shipper.token(), null);
        assertFailure(lateConfirm, HTTP_CONFLICT, "INVALID_STATUS_TRANSITION");
        assertThat(transactionTypes(orderId)).containsExactly("CHARGE", "PAYOUT");
    }

    @Test
    @DisplayName("시나리오 8: 문제 신고 후 관리자가 환불을 고르면 오더는 취소되고 결제는 환불된다")
    void resolveDispute_refundShipper_cancelsOrderAndRefunds() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        long orderId = disputedOrder(driver, "화물 파손");

        JsonNode dispute =
                api.get("/api/admin/disputes/" + orderId, admin.token()).data();
        assertThat(dispute.path("reason").asText()).isEqualTo("화물 파손");
        assertThat(dispute.path("paymentStatus").asText()).isEqualTo("HELD");
        ResolveDisputeRequest noMemo = new ResolveDisputeRequest(DisputeResolution.REFUND_SHIPPER, " ");
        assertThat(api.post(resolvePath(orderId), admin.token(), noMemo).status())
                .isEqualTo(HTTP_BAD_REQUEST);

        ResolveDisputeRequest refund = new ResolveDisputeRequest(DisputeResolution.REFUND_SHIPPER, "파손 사진 확인");
        assertSuccess(api.post(resolvePath(orderId), admin.token(), refund));

        JsonNode cancelled = orderDetail(orderId, shipper);
        assertThat(cancelled.path("status").asText()).isEqualTo("CANCELLED");
        assertThat(lastHistory(cancelled).path("memo").asText()).isEqualTo("파손 사진 확인");
        assertPaymentSettled(orderId, "REFUNDED", List.of("CHARGE", "REFUND"));
    }

    @Test
    @DisplayName("분쟁 후 관리자가 지급을 고르면 오더는 완료되고 차주에게 지급된다")
    void resolveDispute_payDriver_completesOrderAndReleases() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        long orderId = disputedOrder(driver, "수량 차이 신고");

        ResolveDisputeRequest pay = new ResolveDisputeRequest(DisputeResolution.PAY_DRIVER, "수량 이상 없음 확인");
        assertSuccess(api.post(resolvePath(orderId), admin.token(), pay));

        assertThat(orderDetail(orderId, shipper).path("status").asText()).isEqualTo("COMPLETED");
        assertPaymentSettled(orderId, "RELEASED", List.of("CHARGE", "PAYOUT"));
        assertPayoutListed(driver, orderId, FARE);
    }

    @Test
    @DisplayName("시나리오 9: 다른 차주의 상차·하차와 다른 화주의 확인·결제 조회는 거부되고 상태가 바뀌지 않는다")
    void otherMembers_cannotProgressOrReadOrder() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        Account otherDriver = driverWithVehicle(VehicleType.TON_2_5);
        Account otherShipper = api.signUpAndLogin(Role.SHIPPER);
        long orderId = assignedOrder(driver);
        String orderPath = "/api/orders/" + orderId;

        assertFailure(api.post(orderPath + "/pickup", otherDriver.token(), null), HTTP_FORBIDDEN, "NOT_ORDER_OWNER");
        assertThat(orderDetail(orderId, shipper).path("status").asText()).isEqualTo("ASSIGNED");
        assertThat(api.get(orderPath, otherDriver.token()).status()).isEqualTo(HTTP_FORBIDDEN);
        assertThat(api.get("/api/jobs/" + orderId, otherDriver.token()).status())
                .isEqualTo(HTTP_FORBIDDEN);

        assertSuccess(api.post(orderPath + "/pickup", driver.token(), null));
        assertFailure(api.post(orderPath + "/dropoff", otherDriver.token(), null), HTTP_FORBIDDEN, "NOT_ORDER_OWNER");
        assertSuccess(api.post(orderPath + "/dropoff", driver.token(), null));

        assertFailure(api.post(orderPath + "/confirm", otherShipper.token(), null), HTTP_FORBIDDEN, "NOT_ORDER_OWNER");
        assertThat(api.get(orderPath + "/payment", otherShipper.token()).status())
                .isEqualTo(HTTP_FORBIDDEN);
        assertThat(orderDetail(orderId, shipper).path("status").asText()).isEqualTo("AWAITING_CONFIRM");
        assertThat(paymentOf(orderId).path("status").asText()).isEqualTo("HELD");
    }

    @Test
    @DisplayName("화주가 배차 전에 취소하면 환불되고 목록에서 사라지며 차주는 수락할 수 없다")
    void shipperCancel_beforeAssignment_refundsAndClosesOrder() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        JsonNode order = registerOrder(VehicleType.TON_2_5, 1200, daysLater(2));
        long orderId = idOf(order);
        long version = order.path("version").asLong();

        CancelOrderRequest cancel = new CancelOrderRequest(version, "일정 변경");
        assertSuccess(api.post("/api/orders/" + orderId + "/cancel", shipper.token(), cancel));

        assertPaymentSettled(orderId, "REFUNDED", List.of("CHARGE", "REFUND"));
        assertThat(contentOf(api.get("/api/orders/open", driver.token())))
                .noneMatch(row -> row.path("id").asLong() == orderId);
        assertFailure(accept(driver, orderId, version, false), HTTP_CONFLICT, "ORDER_ALREADY_ASSIGNED");
    }

    @Test
    @DisplayName("차량이 없는 차주는 수락할 수 없고, 차량을 등록하면 수락할 수 있다")
    void accept_withoutVehicle_failsUntilVehicleRegistered() throws Exception {
        Account driver = api.signUpAndLogin(Role.DRIVER);
        JsonNode order = registerOrder(VehicleType.TON_2_5, 1200, daysLater(2));
        long version = order.path("version").asLong();

        assertFailure(accept(driver, idOf(order), version, false), HTTP_BAD_REQUEST, "VEHICLE_REQUIRED");

        registerVehicle(driver, VehicleType.TON_2_5);
        assertSuccess(accept(driver, idOf(order), version, false));
    }

    @Test
    @DisplayName("상태 순서를 건너뛴 요청은 거부되고 결제는 그대로 보관된다")
    void progress_skippingStatus_isRejected() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        long orderId = assignedOrder(driver);
        String orderPath = "/api/orders/" + orderId;

        assertFailure(
                api.post(orderPath + "/dropoff", driver.token(), null), HTTP_CONFLICT, "INVALID_STATUS_TRANSITION");
        assertFailure(
                api.post(orderPath + "/confirm", shipper.token(), null), HTTP_CONFLICT, "INVALID_STATUS_TRANSITION");
        assertFailure(
                api.post(orderPath + "/report", shipper.token(), new ReportIssueRequest("미도착")),
                HTTP_CONFLICT,
                "INVALID_STATUS_TRANSITION");

        assertThat(orderDetail(orderId, shipper).path("status").asText()).isEqualTo("ASSIGNED");
        assertThat(paymentOf(orderId).path("status").asText()).isEqualTo("HELD");
    }

    @Test
    @DisplayName("역할 밖의 API는 막힌다: 비로그인 401, 화주의 수락과 차주의 오더 등록·관리자 API는 403")
    void api_outsideRole_isRejected() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        JsonNode order = registerOrder(VehicleType.TON_2_5, 1200, daysLater(2));
        SaveOrderRequest newOrder = orderRequest(VehicleType.TON_1, 500, daysLater(2), FARE, null);

        assertThat(api.get("/api/orders/open", null).status()).isEqualTo(HTTP_UNAUTHORIZED);
        assertThat(accept(shipper, idOf(order), order.path("version").asLong(), false)
                        .status())
                .isEqualTo(HTTP_FORBIDDEN);
        assertThat(api.post("/api/orders", driver.token(), newOrder).status()).isEqualTo(HTTP_FORBIDDEN);
        assertThat(api.get("/api/admin/orders", driver.token()).status()).isEqualTo(HTTP_FORBIDDEN);
        assertThat(api.get("/api/admin/disputes", shipper.token()).status()).isEqualTo(HTTP_FORBIDDEN);
    }

    @Test
    @DisplayName("관리자가 정지한 계정은 로그인이 막히고, 이미 받은 토큰은 만료까지 쓸 수 있다")
    void suspendedMember_cannotLoginButKeepsIssuedToken() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);

        assertSuccess(api.patch(
                "/api/admin/members/" + driver.id() + "/status",
                admin.token(),
                new UpdateMemberStatusRequest(MemberStatus.SUSPENDED, null)));

        assertFailure(api.tryLogin(driver.email()), HTTP_FORBIDDEN, "ACCOUNT_SUSPENDED");
        assertSuccess(api.get("/api/orders/open", driver.token()));
    }

    @Test
    @DisplayName("화주가 운임을 내리면 차액이 부분 환불되고, 완료되면 내린 운임만 차주에게 지급된다")
    void updateFare_lowered_refundsDifferenceAndPaysLoweredFare() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_2_5);
        JsonNode order = registerOrder(VehicleType.TON_2_5, 1200, daysLater(2));
        long orderId = idOf(order);

        SaveOrderRequest lowered = orderRequest(VehicleType.TON_2_5, 1200, daysLater(2), LOWERED_FARE, null);
        UpdateOrderRequest update = new UpdateOrderRequest(order.path("version").asLong(), lowered);
        ApiResult updated = api.put("/api/orders/" + orderId, shipper.token(), update);
        assertSuccess(updated);

        JsonNode payment = paymentOf(orderId);
        assertThat(payment.path("status").asText()).isEqualTo("HELD");
        assertThat(payment.path("amount").asLong()).isEqualTo(LOWERED_FARE);
        assertThat(transactionTypes(orderId)).containsExactly("CHARGE", "PARTIAL_REFUND");
        assertThat(payment.path("transactions").get(1).path("amount").asLong()).isEqualTo(FARE - LOWERED_FARE);
        assertThat(lastHistory(orderDetail(orderId, shipper)).path("memo").asText())
                .contains("350,000", "300,000");

        assertSuccess(accept(driver, orderId, updated.data().path("version").asLong(), false));
        assertSuccess(api.post("/api/orders/" + orderId + "/pickup", driver.token(), null));
        assertSuccess(api.post("/api/orders/" + orderId + "/dropoff", driver.token(), null));
        assertSuccess(api.post("/api/orders/" + orderId + "/confirm", shipper.token(), null));

        assertPaymentSettled(orderId, "RELEASED", List.of("CHARGE", "PARTIAL_REFUND", "PAYOUT"));
        assertPayoutListed(driver, orderId, LOWERED_FARE);
    }

    @Test
    @DisplayName("관리자가 단가표와 할증률을 바꾸면 다음 추천 운임에 반영되고, 이미 등록된 오더의 운임은 그대로다")
    void adminFareChange_appliesToNextEstimateOnly() throws Exception {
        // 같은 DB를 쓰는 다른 시나리오에 영향이 없도록 그쪽에서 쓰지 않는 25톤과 수작업 할증만 바꾼다.
        JsonNode before = estimateManualLoadingFare();
        assertThat(before.path("baseFare").asLong()).isEqualTo(200_000L);
        long fare = before.path("recommendedFare").asLong();
        JsonNode order = registerOrder(orderRequest(VehicleType.TON_25, 25_000, daysLater(2), fare, before));

        UpdateFareRateItem rate = new UpdateFareRateItem(VehicleType.TON_25, NEW_BASE_FARE, NEW_PER_KM_FARE);
        UpdateFareSurchargeItem surcharge = new UpdateFareSurchargeItem(SurchargeType.MANUAL_LOADING, NEW_MANUAL_RATE);
        assertSuccess(api.put("/api/admin/fares/rates", admin.token(), new UpdateFareRatesRequest(List.of(rate))));
        assertSuccess(api.put(
                "/api/admin/fares/surcharges", admin.token(), new UpdateFareSurchargesRequest(List.of(surcharge))));

        JsonNode after = estimateManualLoadingFare();
        long expectedDistanceFare = Math.round(after.path("distanceKm").asDouble() * NEW_PER_KM_FARE);
        double surchargedFare = (NEW_BASE_FARE + expectedDistanceFare) * (1 + NEW_MANUAL_RATE.doubleValue());
        assertThat(after.path("recommendedVehicleType").asText()).isEqualTo("TON_25");
        assertThat(after.path("baseFare").asLong()).isEqualTo(NEW_BASE_FARE);
        assertThat(after.path("distanceFare").asLong()).isEqualTo(expectedDistanceFare);
        assertThat(after.path("appliedSurcharges").toString()).isEqualTo("[\"수작업\"]");
        assertThat(after.path("recommendedFare").asLong()).isEqualTo(Math.round(surchargedFare / 1000) * 1000);

        JsonNode unchanged = orderDetail(idOf(order), shipper);
        assertThat(unchanged.path("fare").asLong()).isEqualTo(fare);
        assertThat(unchanged.path("recommendedFare").asLong()).isEqualTo(fare);
        assertThat(paymentOf(idOf(order)).path("amount").asLong()).isEqualTo(fare);
    }

    @Test
    @DisplayName("차주가 차량을 바꾸면 수락 판단도 새 차량 기준이고, 화주는 바뀐 차량 정보를 본다")
    void vehicleUpdate_appliesToNextAcceptance() throws Exception {
        Account driver = driverWithVehicle(VehicleType.TON_5);
        JsonNode order = registerOrder(VehicleType.TON_5, 4000, daysLater(2));
        long version = order.path("version").asLong();

        updateVehicle(driver, VehicleType.TON_1, "81바1111");
        ApiResult warned = accept(driver, idOf(order), version, false);
        assertFailure(warned, HTTP_CONFLICT, "VEHICLE_MISMATCH");
        JsonNode warning = warned.body().path("error").path("fieldErrors");
        assertThat(warning.path("driverVehicleType").asText()).isEqualTo("TON_1");
        assertThat(warning.path("maxLoadKg").asText()).isEqualTo("1000");

        updateVehicle(driver, VehicleType.TON_5, "82사2222");
        assertSuccess(accept(driver, idOf(order), version, false));

        JsonNode assigned = orderDetail(idOf(order), shipper);
        assertThat(assigned.path("driverVehicleType").asText()).isEqualTo("TON_5");
        assertThat(assigned.path("driverPlateNumber").asText()).isEqualTo("82사2222");
    }

    private Account createAdmin() throws Exception {
        // 회원가입 API는 ADMIN을 받지 않으므로, 시드 계정처럼 저장한 뒤 로그인만 API로 한다.
        String email = "admin-" + UUID.randomUUID() + "@freight.test";
        Member member = memberRepository.save(Member.builder()
                .email(email)
                .password(passwordEncoder.encode(ScenarioApi.PASSWORD))
                .name("관리자")
                .phone("010-9999-0000")
                .role(Role.ADMIN)
                .build());
        return new Account(member.getId(), email, api.login(email));
    }

    private Account driverWithVehicle(VehicleType vehicleType) throws Exception {
        Account driver = api.signUpAndLogin(Role.DRIVER);
        registerVehicle(driver, vehicleType);
        return driver;
    }

    private void registerVehicle(Account driver, VehicleType vehicleType) throws Exception {
        String plateNumber = "80아" + PLATE_SEQUENCE.incrementAndGet();
        VehicleRequest request = new VehicleRequest(vehicleType, plateNumber, BodyType.CARGO);
        assertSuccess(api.post("/api/vehicles/me", driver.token(), request));
    }

    private void updateVehicle(Account driver, VehicleType vehicleType, String plateNumber) throws Exception {
        VehicleRequest request = new VehicleRequest(vehicleType, plateNumber, BodyType.CARGO);
        assertSuccess(api.put("/api/vehicles/me", driver.token(), request));
    }

    private JsonNode estimateFare(int weightKg) throws Exception {
        return estimateFare(weightKg, daysLater(2), LoadingMethod.FORKLIFT, LocalDateTime.now());
    }

    /** 수작업 할증만 붙도록 평일 낮 상차, 일주일 전 등록으로 고정한다. 실행 요일에 따라 주말·긴급 할증이 섞이지 않게 한다. */
    private JsonNode estimateManualLoadingFare() throws Exception {
        return estimateFare(25_000, WEEKDAY_PICKUP_AT, LoadingMethod.MANUAL, WEEKDAY_PICKUP_AT.minusDays(7));
    }

    private JsonNode estimateFare(
            int weightKg, LocalDateTime pickupAt, LoadingMethod loadingMethod, LocalDateTime requestedAt)
            throws Exception {
        SaveOrderRequest base = OrderRequests.valid(FARE);
        EstimateFareRequest request = new EstimateFareRequest(
                base.pickup().latitude(),
                base.pickup().longitude(),
                base.dropoff().latitude(),
                base.dropoff().longitude(),
                weightKg,
                null,
                pickupAt,
                loadingMethod,
                requestedAt);
        ApiResult result = api.post("/api/fares/estimate", shipper.token(), request);
        assertSuccess(result);
        return result.data();
    }

    private JsonNode registerOrder(VehicleType vehicleType, int weightKg, LocalDateTime pickupAt) throws Exception {
        return registerOrder(orderRequest(vehicleType, weightKg, pickupAt, FARE, null));
    }

    private JsonNode registerOrder(SaveOrderRequest request) throws Exception {
        ApiResult result = api.post("/api/orders", shipper.token(), request);
        assertSuccess(result);
        return result.data();
    }

    /** 공통 오더 입력에서 시나리오마다 달라지는 값만 바꾼다. estimate가 있으면 등록 화면처럼 추천 운임과 거리를 담는다. */
    private SaveOrderRequest orderRequest(
            VehicleType vehicleType, int weightKg, LocalDateTime pickupAt, long fare, JsonNode estimate) {
        SaveOrderRequest base = OrderRequests.valid(fare);
        SaveOrderRequest.CargoRequest cargo = base.cargo();
        long recommendedFare = estimate == null
                ? base.recommendedFare()
                : estimate.path("recommendedFare").asLong();
        double distanceKm = estimate == null
                ? base.distanceKm()
                : estimate.path("distanceKm").asDouble();
        return new SaveOrderRequest(
                base.pickup(),
                base.dropoff(),
                pickupAt,
                pickupAt.plusHours(6),
                new SaveOrderRequest.CargoRequest(
                        cargo.itemName(),
                        cargo.cargoType(),
                        weightKg,
                        cargo.quantity(),
                        cargo.packageUnit(),
                        cargo.widthCm(),
                        cargo.depthCm(),
                        cargo.heightCm(),
                        cargo.fragile(),
                        cargo.noStack()),
                vehicleType,
                base.bodyType(),
                base.loadingMethod(),
                base.memo(),
                fare,
                recommendedFare,
                distanceKm);
    }

    private ApiResult accept(Account driver, long orderId, long version, boolean confirmMismatch) throws Exception {
        AcceptOrderRequest request = new AcceptOrderRequest(version, confirmMismatch);
        return api.post("/api/orders/" + orderId + "/accept", driver.token(), request);
    }

    private ApiResult cancelAssignment(Account driver, long orderId, String reason) throws Exception {
        CancelAssignmentRequest request = new CancelAssignmentRequest(reason);
        return api.post("/api/orders/" + orderId + "/cancel-assignment", driver.token(), request);
    }

    private long assignedOrder(Account driver) throws Exception {
        JsonNode order = registerOrder(VehicleType.TON_2_5, 1200, daysLater(2));
        assertSuccess(accept(driver, idOf(order), order.path("version").asLong(), false));
        return idOf(order);
    }

    private long awaitingConfirmOrder(Account driver) throws Exception {
        long orderId = assignedOrder(driver);
        assertSuccess(api.post("/api/orders/" + orderId + "/pickup", driver.token(), null));
        assertSuccess(api.post("/api/orders/" + orderId + "/dropoff", driver.token(), null));
        return orderId;
    }

    private long disputedOrder(Account driver, String reason) throws Exception {
        long orderId = awaitingConfirmOrder(driver);
        assertSuccess(api.post("/api/orders/" + orderId + "/report", shipper.token(), new ReportIssueRequest(reason)));
        assertThat(orderDetail(orderId, shipper).path("status").asText()).isEqualTo("DISPUTED");
        assertThat(paymentOf(orderId).path("status").asText()).isEqualTo("HELD");
        return orderId;
    }

    /** 실제로 24시간을 기다릴 수 없으므로 하차 시각만 과거로 옮긴다. 스케줄러와 판정 코드는 그대로 지난다. */
    private void moveDropoffBeforeDeadline(long orderId) {
        LocalDateTime expired =
                LocalDateTime.now().minusHours(AUTO_CONFIRM_HOURS).minusMinutes(1);
        jdbcTemplate.update("update orders set dropped_off_at = ? where id = ?", expired, orderId);
    }

    /** 요청들을 스레드마다 동시에 출발시키고 결과를 모은다. */
    private List<ApiResult> runAtOnce(List<Callable<ApiResult>> requests) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(requests.size());
        CountDownLatch startSignal = new CountDownLatch(1);
        List<Future<ApiResult>> futures = new ArrayList<>();
        for (Callable<ApiResult> request : requests) {
            futures.add(executor.submit(() -> {
                startSignal.await();
                return request.call();
            }));
        }
        startSignal.countDown();
        List<ApiResult> results = new ArrayList<>();
        for (Future<ApiResult> future : futures) {
            results.add(future.get());
        }
        executor.shutdown();
        return results;
    }

    private JsonNode orderDetail(long orderId, Account viewer) throws Exception {
        ApiResult result = api.get("/api/orders/" + orderId, viewer.token());
        assertSuccess(result);
        return result.data();
    }

    private JsonNode paymentOf(long orderId) throws Exception {
        ApiResult result = api.get("/api/orders/" + orderId + "/payment", shipper.token());
        assertSuccess(result);
        return result.data();
    }

    private List<String> transactionTypes(long orderId) throws Exception {
        return paymentOf(orderId).path("transactions").findValuesAsText("type");
    }

    private List<String> historyStatuses(JsonNode detail) {
        return detail.path("history").findValuesAsText("toStatus");
    }

    private JsonNode lastHistory(JsonNode detail) {
        JsonNode history = detail.path("history");
        return history.get(history.size() - 1);
    }

    private List<JsonNode> contentOf(ApiResult page) {
        List<JsonNode> rows = new ArrayList<>();
        page.data().path("content").forEach(rows::add);
        return rows;
    }

    private long idOf(JsonNode order) {
        return order.path("id").asLong();
    }

    private LocalDateTime daysLater(int days) {
        return LocalDateTime.now().plusDays(days).withNano(0);
    }

    private String resolvePath(long orderId) {
        return "/api/admin/disputes/" + orderId + "/resolve";
    }

    private void assertSuccess(ApiResult result) {
        assertThat(result.status()).as(result.body().toString()).isEqualTo(HTTP_OK);
        assertThat(result.body().path("success").asBoolean()).isTrue();
    }

    private void assertFailure(ApiResult result, int status, String errorCode) {
        assertThat(result.status()).as(result.body().toString()).isEqualTo(status);
        assertThat(result.errorCode()).isEqualTo(errorCode);
    }

    private void assertAddressHidden(ApiResult result) {
        assertSuccess(result);
        assertThat(result.body().toString()).doesNotContain("테헤란로", "1층 물류창고", "김발송", "010-1234-5678", "37.5012");
    }

    private void assertPaymentSettled(long orderId, String status, List<String> expectedTypes) throws Exception {
        assertThat(paymentOf(orderId).path("status").asText()).isEqualTo(status);
        assertThat(transactionTypes(orderId)).containsExactlyElementsOf(expectedTypes);
    }

    private void assertPayoutListed(Account driver, long orderId, long amount) throws Exception {
        assertThat(contentOf(api.get("/api/payouts", driver.token())))
                .anyMatch(payout -> payout.path("orderId").asLong() == orderId
                        && payout.path("amount").asLong() == amount);
    }

    private void assertFinishedJobListed(Account driver, long orderId) throws Exception {
        assertThat(contentOf(api.get("/api/jobs?status=FINISHED", driver.token())))
                .anyMatch(job -> job.path("orderId").asLong() == orderId);
    }
}
