package com.freight.fare.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.fare.dto.UpdateFareRateItem;
import com.freight.fare.dto.UpdateFareRatesRequest;
import com.freight.fare.dto.UpdateFareSurchargeItem;
import com.freight.fare.dto.UpdateFareSurchargesRequest;
import com.freight.fare.entity.SurchargeType;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.VehicleType;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminFareControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String adminToken;
    private String shipperToken;

    @BeforeEach
    void setUp() {
        Member admin = memberRepository.save(Fixtures.admin());
        Member shipper = memberRepository.save(Fixtures.shipper("adminfare-shipper@freight.test"));

        adminToken = jwtTokenProvider.createToken(admin.getId(), Role.ADMIN);
        shipperToken = jwtTokenProvider.createToken(shipper.getId(), Role.SHIPPER);
    }

    @Test
    @DisplayName("관리자가 단가표 및 할증률 전체를 조회(GET /api/admin/fares)하면 5개 차종과 4개 할증을 반환한다")
    void getFareTable_asAdmin_success() throws Exception {
        mockMvc.perform(get("/api/admin/fares").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.rates.length()").value(5))
                .andExpect(jsonPath("$.data.surcharges.length()").value(4));
    }

    @Test
    @DisplayName("관리자가 단가표를 수정(PUT /api/admin/fares/rates)하면 수정된 단가표 목록을 반환한다")
    void updateFareRates_asAdmin_success() throws Exception {
        UpdateFareRatesRequest request =
                new UpdateFareRatesRequest(List.of(new UpdateFareRateItem(VehicleType.TON_1, 35000L, 1200L)));

        mockMvc.perform(put("/api/admin/fares/rates")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].vehicleType").value("TON_1"))
                .andExpect(jsonPath("$.data[0].baseFare").value(35000))
                .andExpect(jsonPath("$.data[0].perKmFare").value(1200))
                .andExpect(jsonPath("$.data[0].maxLoadKg").value(1000));
    }

    @Test
    @DisplayName("관리자가 할증률을 수정(PUT /api/admin/fares/surcharges)하면 수정된 할증률 목록을 반환한다")
    void updateFareSurcharges_asAdmin_success() throws Exception {
        UpdateFareSurchargesRequest request = new UpdateFareSurchargesRequest(
                List.of(new UpdateFareSurchargeItem(SurchargeType.NIGHT, new BigDecimal("0.25"))));

        mockMvc.perform(put("/api/admin/fares/surcharges")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].type").value("NIGHT"))
                .andExpect(jsonPath("$.data[0].rate").value(0.25));
    }

    @Test
    @DisplayName("일반 회원(SHIPPER)이 관리자 단가표 API에 접근하면 403 Forbidden을 반환한다")
    void adminFareApi_asShipper_forbidden() throws Exception {
        mockMvc.perform(get("/api/admin/fares").header("Authorization", "Bearer " + shipperToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }
}
