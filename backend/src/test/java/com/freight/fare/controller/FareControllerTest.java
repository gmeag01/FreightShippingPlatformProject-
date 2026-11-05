package com.freight.fare.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.fare.dto.EstimateFareRequest;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.LoadingMethod;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
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
class FareControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private String shipperToken;

    @BeforeEach
    void setUp() {
        Member shipper = memberRepository.save(Fixtures.shipper("fare-shipper@freight.test"));
        shipperToken = jwtTokenProvider.createToken(shipper.getId(), Role.SHIPPER);
    }

    @Test
    @DisplayName("출발지·도착지 좌표와 화물 스펙으로 추천 운임 계산(POST /api/fares/estimate)을 요청하면 200과 계산 내역을 반환한다")
    void estimateFare_validRequest_returnsEstimate() throws Exception {
        EstimateFareRequest request = new EstimateFareRequest(
                37.5665,
                126.9780,
                35.1796,
                129.0756,
                3500,
                null,
                LocalDateTime.of(2026, 11, 8, 14, 0),
                LoadingMethod.MANUAL,
                LocalDateTime.of(2026, 11, 6, 14, 0));

        mockMvc.perform(post("/api/fares/estimate")
                        .header("Authorization", "Bearer " + shipperToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.recommendedVehicleType").value(VehicleType.TON_5.name()))
                .andExpect(jsonPath("$.data.baseFare").value(80000))
                .andExpect(jsonPath("$.data.recommendedFare").isNumber())
                .andExpect(jsonPath("$.data.appliedSurcharges").isArray());
    }

    @Test
    @DisplayName("추천 운임 계산 시 중량이 0 이하이면 400 Bad Request를 반환한다")
    void estimateFare_invalidWeight_badRequest() throws Exception {
        EstimateFareRequest invalidRequest = new EstimateFareRequest(
                37.5665,
                126.9780,
                35.1796,
                129.0756,
                0,
                VehicleType.TON_1,
                LocalDateTime.of(2026, 11, 8, 14, 0),
                LoadingMethod.FORKLIFT,
                null);

        mockMvc.perform(post("/api/fares/estimate")
                        .header("Authorization", "Bearer " + shipperToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    }

    @Test
    @DisplayName("주소 지오코딩(GET /api/fares/geocode)을 요청하면 200과 위경도 좌표를 반환한다")
    void geocode_validAddress_returnsCoordinates() throws Exception {
        mockMvc.perform(get("/api/fares/geocode")
                        .header("Authorization", "Bearer " + shipperToken)
                        .param("address", "서울특별시 강남구 테헤란로 123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.latitude").isNumber())
                .andExpect(jsonPath("$.data.longitude").isNumber());
    }
}
