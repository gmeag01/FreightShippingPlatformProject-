package com.freight.order.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.OrderRequests;
import com.freight.order.dto.*;
import com.freight.order.entity.*;
import com.freight.order.repository.OrderRepository;
import com.freight.order.repository.OrderStatusHistoryRepository;
import com.freight.order.service.OrderPaymentPort;
import com.freight.support.Fixtures;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/** JWT 권한, 개인정보 가림, 오더 관리 API와 결제 호출을 실제 H2 환경에서 검증한다. */
@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:order_api;MODE=MariaDB;DATABASE_TO_LOWER=TRUE")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OrderControllerTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    @Autowired
    MemberRepository members;

    @Autowired
    OrderRepository orders;

    @Autowired
    OrderStatusHistoryRepository histories;

    @Autowired
    JwtTokenProvider tokens;

    @MockitoBean
    OrderPaymentPort payment;

    Member shipper, otherShipper, driver, otherDriver, admin;
    Order order;

    @BeforeEach
    void setUp() {
        shipper = members.save(Fixtures.shipper());
        otherShipper = members.save(Fixtures.shipper("other@freight.test"));
        driver = members.save(Fixtures.driver());
        otherDriver = members.save(Fixtures.driver("other-driver@freight.test"));
        admin = members.save(Fixtures.admin());
        order = orders.saveAndFlush(Fixtures.registeredOrder(shipper));
    }

    String token(Member member) {
        return "Bearer " + tokens.createToken(member.getId(), member.getRole());
    }

    String json(Object value) throws Exception {
        return mapper.writeValueAsString(value);
    }

    String path() {
        return "/api/orders/" + order.getId();
    }

    @Test
    void create_holdsPaymentAndRecordsInitialHistory() throws Exception {
        String result = mvc.perform(post("/api/orders")
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(OrderRequests.valid(350000))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("REGISTERED"))
                .andExpect(jsonPath("$.data.history[0].fromStatus").isEmpty())
                .andExpect(jsonPath("$.data.history[0].toStatus").value("REGISTERED"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        long id = mapper.readTree(result).path("data").path("id").asLong();
        verify(payment).hold(id, 350000);
        assertThat(orders.findById(id).orElseThrow().getShipper().getId()).isEqualTo(shipper.getId());
    }

    @Test
    void create_byDriver_returns403() throws Exception {
        mvc.perform(post("/api/orders")
                        .header("Authorization", token(driver))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(OrderRequests.valid(350000))))
                .andExpect(status().isForbidden());
        verifyNoInteractions(payment);
    }

    @Test
    void create_withoutToken_returns401() throws Exception {
        mvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(OrderRequests.valid(350000))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_withEmptyNestedFields_returns400() throws Exception {
        mvc.perform(post("/api/orders")
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pickup\":{},\"dropoff\":{},\"cargo\":{}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
        verifyNoInteractions(payment);
    }

    @Test
    void create_withZeroFare_returns400() throws Exception {
        mvc.perform(post("/api/orders")
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(OrderRequests.valid(0))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void create_withPastPickup_returns400() throws Exception {
        var body = mapper.valueToTree(OrderRequests.valid(350000));
        ((com.fasterxml.jackson.databind.node.ObjectNode) body)
                .put("pickupAt", LocalDateTime.now().minusDays(1).toString());
        mvc.perform(post("/api/orders")
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void list_returnsOnlyMyOrdersAndOverdueFlag() throws Exception {
        orders.saveAndFlush(Fixtures.registeredOrder(otherShipper));
        Order past = orders.saveAndFlush(Fixtures.registeredOrder(
                shipper,
                order.getRequiredVehicleType(),
                1200,
                LocalDateTime.now().minusDays(1)));
        mvc.perform(get("/api/orders").header("Authorization", token(shipper)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.content[0].id").value(past.getId()))
                .andExpect(jsonPath("$.data.content[0].isUnassigned").value(true));
    }

    @Test
    void list_filtersStatusAndRejectsNegativePage() throws Exception {
        mvc.perform(get("/api/orders").param("status", "CANCELLED").header("Authorization", token(shipper)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(0));
        mvc.perform(get("/api/orders").param("page", "-1").header("Authorization", token(shipper)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void detail_ownerSeesContact_unassignedDriverDoesNot() throws Exception {
        mvc.perform(get(path()).header("Authorization", token(shipper)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pickup.contactPhone")
                        .value(order.getPickup().getContactPhone()));
        mvc.perform(get(path()).header("Authorization", token(driver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pickup.address")
                        .value(order.getPickup().getRegion()))
                .andExpect(jsonPath("$.data.pickup.detailAddress").isEmpty())
                .andExpect(jsonPath("$.data.pickup.contactPhone").isEmpty())
                .andExpect(jsonPath("$.data.pickup.latitude").isEmpty())
                .andExpect(jsonPath("$.data.memo").isEmpty())
                .andExpect(jsonPath("$.data.history").isEmpty());
    }

    @Test
    void detail_otherShipperCannotReadOrder() throws Exception {
        mvc.perform(get(path()).header("Authorization", token(otherShipper))).andExpect(status().isForbidden());
    }

    @Test
    void detail_assignedDriverSeesContact_otherDriverIsDenied() throws Exception {
        order.accept(driver, LocalDateTime.now());
        orders.saveAndFlush(order);
        mvc.perform(get(path()).header("Authorization", token(driver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pickup.contactPhone")
                        .value(order.getPickup().getContactPhone()));
        mvc.perform(get(path()).header("Authorization", token(otherDriver))).andExpect(status().isForbidden());
    }

    @Test
    void update_changesFareCallsAdjustmentAndIncrementsVersion() throws Exception {
        long version = order.getVersion();
        mvc.perform(put(path())
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateOrderRequest(version, OrderRequests.valid(400000)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fare").value(400000))
                .andExpect(jsonPath("$.data.version").value(version + 1));
        verify(payment).adjust(order.getId(), 400000);
        mvc.perform(put(path())
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateOrderRequest(version, OrderRequests.valid(450000)))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ORDER_CHANGED"));
    }

    @Test
    void update_sameFareDoesNotCallPayment() throws Exception {
        mvc.perform(put(path())
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                json(new UpdateOrderRequest(order.getVersion(), OrderRequests.valid(order.getFare())))))
                .andExpect(status().isOk());
        verifyNoInteractions(payment);
    }

    @Test
    void update_otherShipperAndAssignedOrderAreRejected() throws Exception {
        String body = json(new UpdateOrderRequest(order.getVersion(), OrderRequests.valid(400000)));
        mvc.perform(put(path())
                        .header("Authorization", token(otherShipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
        order.accept(driver, LocalDateTime.now());
        orders.saveAndFlush(order);
        mvc.perform(put(path())
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateOrderRequest(order.getVersion(), OrderRequests.valid(400000)))))
                .andExpect(status().isConflict());
        verifyNoInteractions(payment);
    }

    @Test
    void cancel_beforeAssignmentRefundsAndKeepsHistory() throws Exception {
        mvc.perform(post(path() + "/cancel")
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CancelOrderRequest(order.getVersion(), "배송 일정 변경"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.history[0].memo").value("배송 일정 변경"));
        verify(payment).refund(order.getId());
    }

    @Test
    void cancel_blankReasonIsRejected() throws Exception {
        mvc.perform(post(path() + "/cancel")
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new CancelOrderRequest(order.getVersion(), " "))))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(payment);
    }

    @Test
    void adminCanCancelAssignedOrder_butShipperCannot() throws Exception {
        order.accept(driver, LocalDateTime.now());
        orders.saveAndFlush(order);
        String body = json(new CancelOrderRequest(order.getVersion(), "관리자 취소"));
        mvc.perform(post(path() + "/cancel")
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/admin/orders/" + order.getId() + "/cancel")
                        .header("Authorization", token(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());
        verify(payment).refund(order.getId());
    }

    @Test
    void adminListIsRestrictedAndFiltersInclusiveDate() throws Exception {
        mvc.perform(get("/api/admin/orders").header("Authorization", token(shipper)))
                .andExpect(status().isForbidden());
        String date = order.getPickupAt().toLocalDate().toString();
        mvc.perform(get("/api/admin/orders")
                        .header("Authorization", token(admin))
                        .param("from", date)
                        .param("to", date)
                        .param("status", "REGISTERED")
                        .param("vehicleType", order.getRequiredVehicleType().name()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(1));
        mvc.perform(get("/api/admin/orders")
                        .header("Authorization", token(admin))
                        .param("from", "2099-02-02")
                        .param("to", "2099-01-01"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void detail_missingOrderReturns404() throws Exception {
        mvc.perform(get("/api/orders/9999999").header("Authorization", token(shipper)))
                .andExpect(status().isNotFound());
    }

    @Autowired
    com.freight.vehicle.repository.VehicleRepository vehicles;

    @Test
    void assignedDetail_includesDriverVehicleAndCancellationDeadline() throws Exception {
        vehicles.saveAndFlush(Fixtures.vehicle(driver, com.freight.vehicle.entity.VehicleType.TON_5));
        order.accept(driver, LocalDateTime.now());
        orders.flush();
        mvc.perform(get(path()).header("Authorization", token(shipper)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.driverPhone").value(driver.getPhone()))
                .andExpect(jsonPath("$.data.driverVehicleType").value("TON_5"))
                .andExpect(jsonPath("$.data.driverBodyType").value("CARGO"))
                .andExpect(jsonPath("$.data.driverPlateNumber").value("80아1234"))
                .andExpect(jsonPath("$.data.driverCancelableUntil")
                        .value(order.getPickupAt()
                                .minusHours(2)
                                .format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                .andExpect(jsonPath("$.data.autoConfirmAt").isEmpty());
    }

    @Test
    void awaitingDetail_includesAutoConfirmationDeadlineOnly() throws Exception {
        order.accept(driver, LocalDateTime.now());
        order.startTransit(driver);
        var dropped = LocalDateTime.of(2026, 12, 1, 15, 30);
        order.completeDropoff(driver, dropped);
        orders.flush();
        mvc.perform(get(path()).header("Authorization", token(admin)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.autoConfirmAt")
                        .value(dropped.plusHours(24).format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)))
                .andExpect(jsonPath("$.data.driverCancelableUntil").isEmpty());
    }

    @Test
    void openDetail_hidesDriverAndDeadlineFields() throws Exception {
        mvc.perform(get(path()).header("Authorization", token(otherDriver)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.driverPhone").isEmpty())
                .andExpect(jsonPath("$.data.driverPlateNumber").isEmpty())
                .andExpect(jsonPath("$.data.autoConfirmAt").isEmpty())
                .andExpect(jsonPath("$.data.driverCancelableUntil").isEmpty());
    }

    @Test
    void fareUpdate_recordsPreviousAndNewFareInHistory() throws Exception {
        long oldFare = order.getFare();
        mvc.perform(put(path())
                        .header("Authorization", token(shipper))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(new UpdateOrderRequest(order.getVersion(), OrderRequests.valid(250000)))))
                .andExpect(status().isOk());
        var history = histories.findByOrderIdOrderByCreatedAtAscIdAsc(order.getId());
        assertThat(history.getLast().getMemo()).contains(String.format("%,d", oldFare), "250,000");
        assertThat(history.getLast().getFromStatus()).isEqualTo(OrderStatus.REGISTERED);
        assertThat(history.getLast().getToStatus()).isEqualTo(OrderStatus.REGISTERED);
    }
}
