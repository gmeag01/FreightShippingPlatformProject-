package com.freight.matching.controller;

import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.global.exception.GlobalExceptionHandler;
import com.freight.global.security.AuthMember;
import com.freight.global.security.JsonAccessDeniedHandler;
import com.freight.global.security.JsonAuthEntryPoint;
import com.freight.global.security.JwtTokenProvider;
import com.freight.global.security.SecurityConfig;
import com.freight.matching.dto.OpenOrderDetailResponse;
import com.freight.matching.service.MatchingService;
import com.freight.member.entity.Role;
import com.freight.order.entity.CargoType;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.PackageUnit;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

// GET /api/orders/open/{id} 의 권한과 응답 형식을 확인한다.
@WebMvcTest(controllers = MatchingController.class)
// 웹 계층 테스트는 보안 설정을 자동으로 읽지 않아 @PreAuthorize가 꺼지므로, 실제 보안 설정을 함께 불러온다.
@Import({
    GlobalExceptionHandler.class,
    SecurityConfig.class,
    JwtTokenProvider.class,
    JsonAuthEntryPoint.class,
    JsonAccessDeniedHandler.class
})
@ActiveProfiles("test")
class MatchingDetailControllerTest {

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private MatchingService matchingService;

    private UsernamePasswordAuthenticationToken authOf(Role role) {
        return new UsernamePasswordAuthenticationToken(
                new AuthMember(2L, role), null, List.of(new SimpleGrantedAuthority(role.getAuthority())));
    }

    private OpenOrderDetailResponse sampleDetail() {
        return new OpenOrderDetailResponse(
                10L,
                0L,
                "서울 강남구",
                "부산 해운대구",
                LocalDateTime.of(2026, 12, 1, 10, 0),
                LocalDateTime.of(2026, 12, 1, 16, 0),
                "전자부품 파렛트",
                CargoType.PALLET,
                2000,
                2,
                PackageUnit.PALLET,
                110,
                110,
                150,
                true,
                false,
                VehicleType.TON_5,
                BodyType.CARGO,
                LoadingMethod.FORKLIFT,
                "파손 주의",
                350_000L,
                340_000L,
                390.5);
    }

    @Test
    void getOpenOrderDetail_asDriver_returnsRegionOnlyDetail() throws Exception {
        given(matchingService.getOpenOrderDetail(10L)).willReturn(sampleDetail());

        mvc.perform(get("/api/orders/open/10").with(authentication(authOf(Role.DRIVER))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.version").value(0))
                .andExpect(jsonPath("$.data.pickupRegion").value("서울 강남구"))
                .andExpect(jsonPath("$.data.dropoffRegion").value("부산 해운대구"))
                .andExpect(jsonPath("$.data.fragile").value(true))
                .andExpect(jsonPath("$.data.detailAddress").doesNotExist())
                .andExpect(jsonPath("$.data.contactPhone").doesNotExist())
                .andExpect(jsonPath("$.data.latitude").doesNotExist());
    }

    @Test
    void getOpenOrderDetail_whenAlreadyAssigned_returns409() throws Exception {
        given(matchingService.getOpenOrderDetail(10L))
                .willThrow(new BusinessException(ErrorCode.ORDER_ALREADY_ASSIGNED));

        mvc.perform(get("/api/orders/open/10").with(authentication(authOf(Role.DRIVER))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("ORDER_ALREADY_ASSIGNED"));
    }

    @Test
    void getOpenOrderDetail_asShipper_returns403() throws Exception {
        mvc.perform(get("/api/orders/open/10").with(authentication(authOf(Role.SHIPPER))))
                .andExpect(status().isForbidden());
    }
}
