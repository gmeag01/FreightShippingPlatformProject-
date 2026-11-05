package com.freight.payment.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.freight.global.security.AuthMember;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.order.repository.OrderRepository;
import com.freight.payment.service.PaymentService;
import com.freight.support.Fixtures;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
class PaymentControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private PaymentService paymentService;

    private Member shipper;
    private Long orderId;
    private Long otherShipperId;
    private Long driverId;
    private Long adminId;

    @BeforeEach
    void setUp() {
        shipper = memberRepository.save(Fixtures.shipper("history-shipper@freight.test"));
        otherShipperId = memberRepository
                .save(Fixtures.shipper("history-other-shipper@freight.test"))
                .getId();
        driverId = memberRepository
                .save(Fixtures.driver("history-driver@freight.test"))
                .getId();
        adminId = memberRepository.save(Fixtures.admin()).getId();
        orderId = orderRepository.save(Fixtures.registeredOrder(shipper)).getId();
    }

    private RequestPostProcessor loginAs(Long memberId, Role role) {
        return authentication(new UsernamePasswordAuthenticationToken(
                new AuthMember(memberId, role), null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))));
    }

    @Test
    void getPayment_byOwner_returnsStatusAndTransactionsInOrder() throws Exception {
        paymentService.hold(orderId, 350_000L);
        paymentService.adjust(orderId, 400_000L);

        mvc.perform(get("/api/orders/{id}/payment", orderId).with(loginAs(shipper.getId(), Role.SHIPPER)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.orderId").value(orderId))
                .andExpect(jsonPath("$.data.status").value("HELD"))
                .andExpect(jsonPath("$.data.amount").value(400000))
                .andExpect(jsonPath("$.data.transactions.length()").value(2))
                .andExpect(jsonPath("$.data.transactions[0].type").value("CHARGE"))
                .andExpect(jsonPath("$.data.transactions[1].type").value("ADDITIONAL_CHARGE"))
                .andExpect(jsonPath("$.data.transactions[1].amount").value(50000));
    }

    @Test
    void getPayment_byAdmin_returnsPayment() throws Exception {
        paymentService.hold(orderId, 350_000L);

        mvc.perform(get("/api/orders/{id}/payment", orderId).with(loginAs(adminId, Role.ADMIN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("HELD"));
    }

    @Test
    void getPayment_byOtherShipper_isForbidden() throws Exception {
        paymentService.hold(orderId, 350_000L);

        mvc.perform(get("/api/orders/{id}/payment", orderId).with(loginAs(otherShipperId, Role.SHIPPER)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("NOT_ORDER_OWNER"));
    }

    @Test
    void getPayment_byDriver_isForbidden() throws Exception {
        paymentService.hold(orderId, 350_000L);

        mvc.perform(get("/api/orders/{id}/payment", orderId).with(loginAs(driverId, Role.DRIVER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getPayment_withoutPayment_returnsNotFound() throws Exception {
        mvc.perform(get("/api/orders/{id}/payment", orderId).with(loginAs(shipper.getId(), Role.SHIPPER)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("PAYMENT_NOT_FOUND"));
    }

    @Test
    void getPayment_forMissingOrder_returnsNotFound() throws Exception {
        mvc.perform(get("/api/orders/{id}/payment", -1L).with(loginAs(adminId, Role.ADMIN)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("ORDER_NOT_FOUND"));
    }
}
