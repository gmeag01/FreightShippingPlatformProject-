package com.freight.matching.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.global.exception.GlobalExceptionHandler;
import com.freight.global.security.AuthMember;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.matching.dto.AcceptOrderResponse;
import com.freight.matching.dto.CancelAssignmentRequest;
import com.freight.matching.dto.OpenOrderResponse;
import com.freight.matching.service.MatchingService;
import com.freight.member.entity.Role;
import com.freight.order.entity.CargoType;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.OrderStatus;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = MatchingController.class)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("test")
class MatchingControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private MatchingService matchingService;

    private UsernamePasswordAuthenticationToken driverAuth(Long driverId) {
        return new UsernamePasswordAuthenticationToken(
                new AuthMember(driverId, Role.DRIVER), null, List.of(new SimpleGrantedAuthority("ROLE_DRIVER")));
    }

    @Test
    void getOpenOrders_returnsPageOfOpenOrders() throws Exception {
        OpenOrderResponse item = new OpenOrderResponse(
                10L,
                0L,
                "서울 강남구",
                "부산 해운대구",
                LocalDateTime.of(2026, 12, 1, 10, 0),
                LocalDateTime.of(2026, 12, 1, 16, 0),
                "전자부품 파렛트",
                CargoType.PALLET,
                2000,
                VehicleType.TON_5,
                BodyType.CARGO,
                LoadingMethod.FORKLIFT,
                350_000L,
                390.5);
        given(matchingService.listOpenOrders(VehicleType.TON_5, 0)).willReturn(new PageImpl<>(List.of(item)));

        mvc.perform(get("/api/orders/open")
                        .param("vehicleType", "TON_5")
                        .param("page", "0")
                        .with(authentication(driverAuth(2L))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(10))
                .andExpect(jsonPath("$.data.content[0].pickupRegion").value("서울 강남구"))
                .andExpect(jsonPath("$.data.content[0].requiredVehicleType").value("TON_5"));
    }

    @Test
    void acceptOrder_returnsAssignedOrder() throws Exception {
        given(matchingService.acceptOrder(eq(10L), eq(2L), any(AcceptOrderRequest.class)))
                .willReturn(new AcceptOrderResponse(
                        10L, OrderStatus.ASSIGNED, 2L, LocalDateTime.of(2026, 11, 3, 12, 0), 1L));

        mvc.perform(post("/api/orders/10/accept")
                        .with(csrf())
                        .with(authentication(driverAuth(2L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"confirmMismatch\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderId").value(10))
                .andExpect(jsonPath("$.data.status").value("ASSIGNED"));
    }

    @Test
    void acceptOrder_whenVehicleMismatch_returns409WithMismatchDetails() throws Exception {
        given(matchingService.acceptOrder(eq(10L), eq(2L), any(AcceptOrderRequest.class)))
                .willThrow(new BusinessException(
                        ErrorCode.VEHICLE_MISMATCH,
                        Map.of(
                                "driverVehicleType", "TON_5",
                                "requiredVehicleType", "TON_1",
                                "weightKg", "800",
                                "maxLoadKg", "5000")));

        mvc.perform(post("/api/orders/10/accept")
                        .with(csrf())
                        .with(authentication(driverAuth(2L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"version\":0,\"confirmMismatch\":false}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VEHICLE_MISMATCH"))
                .andExpect(jsonPath("$.error.fieldErrors.driverVehicleType").value("TON_5"))
                .andExpect(jsonPath("$.error.fieldErrors.requiredVehicleType").value("TON_1"));
    }

    @Test
    void cancelAssignment_withBlankReason_returns400InvalidInput() throws Exception {
        mvc.perform(post("/api/orders/10/cancel-assignment")
                        .with(csrf())
                        .with(authentication(driverAuth(2L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fieldErrors.reason").exists());
    }

    @Test
    void cancelAssignment_withValidReason_returns200() throws Exception {
        mvc.perform(post("/api/orders/10/cancel-assignment")
                        .with(csrf())
                        .with(authentication(driverAuth(2L)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"차량 점검 필요\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(matchingService).cancelAssignment(eq(10L), eq(2L), eq(new CancelAssignmentRequest("차량 점검 필요")));
    }
}
