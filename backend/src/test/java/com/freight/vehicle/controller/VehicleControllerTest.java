package com.freight.vehicle.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.support.Fixtures;
import com.freight.vehicle.dto.VehicleRequest;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.repository.VehicleRepository;
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
class VehicleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private Member driver;
    private Member shipper;
    private String driverToken;
    private String shipperToken;

    @BeforeEach
    void setUp() {
        driver = memberRepository.save(Fixtures.driver("vehicle-driver@freight.test"));
        shipper = memberRepository.save(Fixtures.shipper("vehicle-shipper@freight.test"));

        driverToken = jwtTokenProvider.createToken(driver.getId(), Role.DRIVER);
        shipperToken = jwtTokenProvider.createToken(shipper.getId(), Role.SHIPPER);
    }

    @Test
    @DisplayName("차주가 차량을 등록(POST)하면 200과 등록된 차량 정보를 반환한다")
    void registerVehicle_asDriver_success() throws Exception {
        VehicleRequest request = new VehicleRequest(VehicleType.TON_5, "80가1234", BodyType.CARGO);

        mockMvc.perform(post("/api/vehicles/me")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.vehicleType").value("TON_5"))
                .andExpect(jsonPath("$.data.plateNumber").value("80가1234"))
                .andExpect(jsonPath("$.data.bodyType").value("CARGO"));
    }

    @Test
    @DisplayName("차주가 차량 정보를 수정(PUT)하면 200과 수정된 정보를 반환한다")
    void updateVehicle_asDriver_success() throws Exception {
        vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_1));

        VehicleRequest updateRequest = new VehicleRequest(VehicleType.TON_11, "99하9999", BodyType.WING);

        mockMvc.perform(put("/api/vehicles/me")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.vehicleType").value("TON_11"))
                .andExpect(jsonPath("$.data.plateNumber").value("99하9999"))
                .andExpect(jsonPath("$.data.bodyType").value("WING"));
    }

    @Test
    @DisplayName("차주가 내 차량 정보를 조회(GET)하면 200과 상세 정보를 반환한다")
    void getMyVehicle_asDriver_success() throws Exception {
        vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_5));

        mockMvc.perform(get("/api/vehicles/me").header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.vehicleType").value("TON_5"))
                .andExpect(jsonPath("$.data.maxLoadKg").value(5000));
    }

    @Test
    @DisplayName("화주(SHIPPER)가 차량 API에 접근하면 403 Forbidden을 반환한다")
    void vehicleApi_asShipper_forbidden() throws Exception {
        mockMvc.perform(get("/api/vehicles/me").header("Authorization", "Bearer " + shipperToken))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("인증 없이 차량 API에 접근하면 401 Unauthorized를 반환한다")
    void vehicleApi_withoutAuth_unauthorized() throws Exception {
        mockMvc.perform(get("/api/vehicles/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("차량 등록 시 필수 필드가 누락되면 400 Bad Request를 반환한다")
    void registerVehicle_missingFields_badRequest() throws Exception {
        VehicleRequest invalidRequest = new VehicleRequest(null, "", null);

        mockMvc.perform(post("/api/vehicles/me")
                        .header("Authorization", "Bearer " + driverToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    }
}
