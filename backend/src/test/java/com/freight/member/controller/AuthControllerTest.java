package com.freight.member.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.dto.LoginRequest;
import com.freight.member.dto.SignupRequest;
import com.freight.member.entity.Member;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
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
class AuthControllerTest {

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

    @Test
    @DisplayName("회원가입 API 호출 성공 시 200과 ApiResponse 응답을 반환한다")
    void signup_success() throws Exception {
        SignupRequest request = new SignupRequest("tester@x.com", "password123!", "홍길동", "010-1234-5678", Role.SHIPPER);

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("tester@x.com"))
                .andExpect(jsonPath("$.data.role").value("SHIPPER"));
    }

    @Test
    @DisplayName("로그인 API 호출 성공 시 JWT 토큰을 반환한다")
    void login_success() throws Exception {
        Member member = Member.builder()
                .email("loginuser@x.com")
                .password(passwordEncoder.encode("password123!"))
                .name("로그인유저")
                .phone("010-9999-8888")
                .role(Role.DRIVER)
                .build();
        memberRepository.save(member);

        LoginRequest request = new LoginRequest("loginuser@x.com", "password123!");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").isString())
                .andExpect(jsonPath("$.data.role").value("DRIVER"));
    }

    @Test
    @DisplayName("유효한 JWT 토큰으로 내 정보 조회 API 호출 시 200과 회원 정보를 반환한다")
    void getMe_withValidToken_returnsMemberInfo() throws Exception {
        Member member = Member.builder()
                .email("me@x.com")
                .password(passwordEncoder.encode("password123!"))
                .name("내정보")
                .phone("010-5555-6666")
                .role(Role.SHIPPER)
                .build();
        member = memberRepository.save(member);

        String token = jwtTokenProvider.createToken(member.getId(), member.getRole());

        mockMvc.perform(get("/api/members/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("me@x.com"))
                .andExpect(jsonPath("$.data.name").value("내정보"));
    }

    @Test
    @DisplayName("토큰 없이 내 정보 조회 API 호출 시 401과 ApiResponse 에러 JSON을 반환한다 (Review Focus 2)")
    void getMe_withoutToken_returns401Json() throws Exception {
        mockMvc.perform(get("/api/members/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.error.message").value("로그인이 필요합니다"));
    }
}
