package com.freight.delivery.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.freight.global.security.AuthMember;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.order.repository.OrderRepository;
import com.freight.order.service.OrderService;
import com.freight.payment.service.PaymentService;
import com.freight.support.Fixtures;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DeliveryControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private OrderService orderService;

    @Autowired
    private PaymentService paymentService;

    private Long orderId;
    private Long shipperId;
    private Long driverId;
    private Long adminId;

    @BeforeEach
    void setUp() {
        Member shipper = memberRepository.save(Fixtures.shipper("api-shipper@freight.test"));
        shipperId = shipper.getId();
        driverId = memberRepository
                .save(Fixtures.driver("api-driver@freight.test"))
                .getId();
        adminId = memberRepository.save(Fixtures.admin()).getId();
        orderId = orderRepository.save(Fixtures.registeredOrder(shipper)).getId();
        paymentService.hold(orderId, 350_000L);
        orderService.changeStatus(
                orderId, driverId, null, (order, driver) -> order.accept(driver, LocalDateTime.now()));
    }

    private RequestPostProcessor loginAs(Long memberId, Role role) {
        return authentication(new UsernamePasswordAuthenticationToken(
                new AuthMember(memberId, role), null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))));
    }

    private void moveToAwaitingConfirm() throws Exception {
        mvc.perform(post("/api/orders/{id}/pickup", orderId).with(loginAs(driverId, Role.DRIVER)));
        mvc.perform(post("/api/orders/{id}/dropoff", orderId).with(loginAs(driverId, Role.DRIVER)));
    }

    private void moveToDisputed() throws Exception {
        moveToAwaitingConfirm();
        mvc.perform(post("/api/orders/{id}/report", orderId)
                .with(loginAs(shipperId, Role.SHIPPER))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"reason\":\"화물 파손\"}"));
    }

    @Test
    void pickup_byDriver_returnsInTransit() throws Exception {
        mvc.perform(post("/api/orders/{id}/pickup", orderId).with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.orderId").value(orderId))
                .andExpect(jsonPath("$.data.status").value("IN_TRANSIT"));
    }

    @Test
    void pickup_byShipper_isForbidden() throws Exception {
        mvc.perform(post("/api/orders/{id}/pickup", orderId).with(loginAs(shipperId, Role.SHIPPER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    void confirm_byShipper_returnsCompleted() throws Exception {
        moveToAwaitingConfirm();

        mvc.perform(post("/api/orders/{id}/confirm", orderId).with(loginAs(shipperId, Role.SHIPPER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    void confirm_byDriver_isForbidden() throws Exception {
        moveToAwaitingConfirm();

        mvc.perform(post("/api/orders/{id}/confirm", orderId).with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void confirm_inWrongStatus_returnsConflict() throws Exception {
        mvc.perform(post("/api/orders/{id}/confirm", orderId).with(loginAs(shipperId, Role.SHIPPER)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("INVALID_STATUS_TRANSITION"));
    }

    @Test
    void report_withBlankReason_returnsBadRequest() throws Exception {
        moveToAwaitingConfirm();

        mvc.perform(post("/api/orders/{id}/report", orderId)
                        .with(loginAs(shipperId, Role.SHIPPER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\" \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    }

    @Test
    void resolve_byAdmin_returnsCancelled() throws Exception {
        moveToDisputed();

        mvc.perform(post("/api/admin/disputes/{orderId}/resolve", orderId)
                        .with(loginAs(adminId, Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolution\":\"REFUND_SHIPPER\",\"memo\":\"파손 확인\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));
    }

    @Test
    void resolve_withBlankMemo_returnsBadRequest() throws Exception {
        moveToDisputed();

        mvc.perform(post("/api/admin/disputes/{orderId}/resolve", orderId)
                        .with(loginAs(adminId, Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolution\":\"PAY_DRIVER\",\"memo\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resolve_withoutResolution_returnsBadRequest() throws Exception {
        moveToDisputed();

        mvc.perform(post("/api/admin/disputes/{orderId}/resolve", orderId)
                        .with(loginAs(adminId, Role.ADMIN))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"memo\":\"처리\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resolve_byShipper_isForbidden() throws Exception {
        moveToDisputed();

        mvc.perform(post("/api/admin/disputes/{orderId}/resolve", orderId)
                        .with(loginAs(shipperId, Role.SHIPPER))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"resolution\":\"PAY_DRIVER\",\"memo\":\"처리\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void listDisputes_byAdmin_returnsDisputes() throws Exception {
        moveToDisputed();

        mvc.perform(get("/api/admin/disputes").with(loginAs(adminId, Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].orderId").value(orderId))
                .andExpect(jsonPath("$.data.content[0].reason").value("화물 파손"));
    }

    @Test
    void listDisputes_byDriver_isForbidden() throws Exception {
        mvc.perform(get("/api/admin/disputes").with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getDispute_byAdmin_returnsDetail() throws Exception {
        moveToDisputed();

        mvc.perform(get("/api/admin/disputes/{orderId}", orderId).with(loginAs(adminId, Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("DISPUTED"))
                .andExpect(jsonPath("$.data.paymentStatus").value("HELD"))
                .andExpect(jsonPath("$.data.history[0].toStatus").value("ASSIGNED"));
    }

    @Test
    void listJobs_byDriver_filtersByTab() throws Exception {
        mvc.perform(get("/api/jobs").param("status", "IN_PROGRESS").with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].orderId").value(orderId))
                .andExpect(jsonPath("$.data.content[0].status").value("ASSIGNED"));
    }

    @Test
    void listJobs_withUnknownTab_returnsBadRequest() throws Exception {
        mvc.perform(get("/api/jobs").param("status", "UNKNOWN").with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listJobs_byShipper_isForbidden() throws Exception {
        mvc.perform(get("/api/jobs").with(loginAs(shipperId, Role.SHIPPER))).andExpect(status().isForbidden());
    }

    @Test
    void getJob_byAssignedDriver_returnsDetail() throws Exception {
        mvc.perform(get("/api/jobs/{orderId}", orderId).with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.pickup.contactPhone").value("010-1234-5678"));
    }

    @Test
    void listPayouts_byDriver_returnsPayout() throws Exception {
        moveToAwaitingConfirm();
        mvc.perform(post("/api/orders/{id}/confirm", orderId).with(loginAs(shipperId, Role.SHIPPER)));

        mvc.perform(get("/api/payouts").with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].orderId").value(orderId))
                .andExpect(jsonPath("$.data.content[0].amount").value(350000));
    }

    @Test
    void listPayouts_byShipper_isForbidden() throws Exception {
        mvc.perform(get("/api/payouts").with(loginAs(shipperId, Role.SHIPPER))).andExpect(status().isForbidden());
    }
}
