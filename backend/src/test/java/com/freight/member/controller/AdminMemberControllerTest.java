package com.freight.member.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.dto.UpdateMemberStatusRequest;
import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminMemberControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private Member adminMember;
    private Member shipperMember;
    private Member driverMember;
    private String adminToken;
    private String shipperToken;
    private String driverToken;

    @BeforeEach
    void setUp() {
        adminMember = memberRepository.save(Member.builder()
                .email("admin_ctrl@freight.test")
                .password(passwordEncoder.encode("pass1234"))
                .name("관리자")
                .phone("010-0000-0000")
                .role(Role.ADMIN)
                .status(MemberStatus.ACTIVE)
                .build());

        shipperMember = memberRepository.save(Member.builder()
                .email("shipper_ctrl@freight.test")
                .password(passwordEncoder.encode("pass1234"))
                .name("화주")
                .phone("010-1111-1111")
                .role(Role.SHIPPER)
                .status(MemberStatus.ACTIVE)
                .build());

        driverMember = memberRepository.save(Member.builder()
                .email("driver_ctrl@freight.test")
                .password(passwordEncoder.encode("pass1234"))
                .name("차주")
                .phone("010-2222-2222")
                .role(Role.DRIVER)
                .status(MemberStatus.ACTIVE)
                .build());

        adminToken = jwtTokenProvider.createToken(adminMember.getId(), Role.ADMIN);
        shipperToken = jwtTokenProvider.createToken(shipperMember.getId(), Role.SHIPPER);
        driverToken = jwtTokenProvider.createToken(driverMember.getId(), Role.DRIVER);
    }

    @Test
    @DisplayName("토큰 없이 회원 목록 조회 시 401 Unauthorized를 반환한다")
    void getMembers_withoutToken_unauthorized_401() throws Exception {
        mockMvc.perform(get("/api/admin/members")).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("화주 계정으로 관리자 회원 목록 조회 시 403 Forbidden을 반환한다")
    void getMembers_asShipper_forbidden_403() throws Exception {
        mockMvc.perform(get("/api/admin/members").header("Authorization", "Bearer " + shipperToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("차주 계정으로 관리자 회원 목록 조회 시 403 Forbidden을 반환한다")
    void getMembers_asDriver_forbidden_403() throws Exception {
        mockMvc.perform(get("/api/admin/members").header("Authorization", "Bearer " + driverToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("관리자 계정으로 회원 목록 조회 시 200 OK와 페이징 데이터를 반환한다")
    void getMembers_asAdmin_success_200() throws Exception {
        mockMvc.perform(get("/api/admin/members")
                        .header("Authorization", "Bearer " + adminToken)
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.totalElements").isNumber());
    }

    @Test
    @DisplayName("관리자 계정으로 회원 상세 조회 시 200 OK와 상세 정보를 반환한다")
    void getMemberDetail_asAdmin_success_200() throws Exception {
        mockMvc.perform(get("/api/admin/members/" + shipperMember.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(shipperMember.getId()))
                .andExpect(jsonPath("$.data.email").value("shipper_ctrl@freight.test"))
                .andExpect(jsonPath("$.data.role").value("SHIPPER"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("관리자가 회원을 정지 상태로 변경 시 200 OK를 반환한다")
    void updateMemberStatus_asAdmin_success_200() throws Exception {
        UpdateMemberStatusRequest request = new UpdateMemberStatusRequest(MemberStatus.SUSPENDED, "약관 위반");

        mockMvc.perform(patch("/api/admin/members/" + shipperMember.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"));
    }

    @Test
    @DisplayName("관리자가 자기 자신을 정지하려 하면 400 Bad Request와 ADMIN_CANNOT_SUSPEND_SELF를 반환한다")
    void updateMemberStatus_selfSuspend_asAdmin_fails_400() throws Exception {
        UpdateMemberStatusRequest request = new UpdateMemberStatusRequest(MemberStatus.SUSPENDED, "실수");

        mockMvc.perform(patch("/api/admin/members/" + adminMember.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("ADMIN_CANNOT_SUSPEND_SELF"));
    }
}
