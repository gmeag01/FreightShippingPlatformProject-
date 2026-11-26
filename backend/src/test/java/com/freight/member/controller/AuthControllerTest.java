package com.freight.member.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.global.security.AuthCookies;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.dto.LoginRequest;
import com.freight.member.dto.SignupRequest;
import com.freight.member.entity.Member;
import com.freight.member.entity.RefreshToken;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.member.repository.RefreshTokenRepository;
import jakarta.servlet.http.Cookie;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AuthControllerTest {

    private static final String PASSWORD = "password123!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

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
    @DisplayName("로그인 성공 시 토큰을 본문이 아니라 HttpOnly 쿠키로 내려준다")
    void login_success_setsHttpOnlyTokenCookies() throws Exception {
        saveMember("loginuser@x.com", Role.DRIVER);

        mockMvc.perform(loginRequest("loginuser@x.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("loginuser@x.com"))
                .andExpect(jsonPath("$.data.role").value("DRIVER"))
                .andExpect(jsonPath("$.data.accessToken").doesNotExist())
                .andExpect(cookie().httpOnly(AuthCookies.ACCESS_TOKEN_COOKIE, true))
                .andExpect(cookie().path(AuthCookies.ACCESS_TOKEN_COOKIE, "/api"))
                .andExpect(cookie().httpOnly(AuthCookies.REFRESH_TOKEN_COOKIE, true))
                .andExpect(cookie().path(AuthCookies.REFRESH_TOKEN_COOKIE, "/api/auth"));
    }

    @Test
    @DisplayName("유효한 JWT 토큰을 Authorization 헤더로 보내면 내 정보를 반환한다")
    void getMe_withValidToken_returnsMemberInfo() throws Exception {
        Member member = saveMember("me@x.com", Role.SHIPPER);
        String token = jwtTokenProvider.createToken(member.getId(), member.getRole());

        mockMvc.perform(get("/api/members/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("me@x.com"));
    }

    @Test
    @DisplayName("액세스 토큰 쿠키로 내 정보 조회 API를 부를 수 있다")
    void getMe_withAccessTokenCookie_returnsMemberInfo() throws Exception {
        saveMember("cookie@x.com", Role.SHIPPER);
        MvcResult login = mockMvc.perform(loginRequest("cookie@x.com")).andReturn();

        mockMvc.perform(get("/api/members/me").cookie(login.getResponse().getCookie(AuthCookies.ACCESS_TOKEN_COOKIE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("cookie@x.com"));
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

    @Test
    @DisplayName("리프레시 토큰으로 새 토큰을 받으면 쓰던 리프레시 토큰은 다시 쓸 수 없다")
    void refresh_withValidToken_rotatesTokens() throws Exception {
        saveMember("refresh@x.com", Role.SHIPPER);
        Cookie oldRefreshCookie = loginAndGetRefreshCookie("refresh@x.com");

        mockMvc.perform(post("/api/auth/refresh").cookie(oldRefreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("refresh@x.com"))
                .andExpect(cookie().exists(AuthCookies.ACCESS_TOKEN_COOKIE))
                .andExpect(cookie().exists(AuthCookies.REFRESH_TOKEN_COOKIE));

        mockMvc.perform(post("/api/auth/refresh").cookie(oldRefreshCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    @DisplayName("리프레시 토큰 쿠키 없이 갱신하면 401을 반환한다")
    void refresh_withoutCookie_fails() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    @DisplayName("만료된 리프레시 토큰으로 갱신하면 401을 반환한다")
    void refresh_withExpiredToken_fails() throws Exception {
        Member member = saveMember("expired@x.com", Role.SHIPPER);
        refreshTokenRepository.save(RefreshToken.create(
                member.getId(), "expired-raw-token", LocalDateTime.now().minusMinutes(1)));

        mockMvc.perform(post("/api/auth/refresh")
                        .cookie(new Cookie(AuthCookies.REFRESH_TOKEN_COOKIE, "expired-raw-token")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_REFRESH_TOKEN"));
    }

    @Test
    @DisplayName("정지된 회원은 리프레시 토큰으로 갱신할 수 없다")
    void refresh_bySuspendedMember_fails() throws Exception {
        Member member = saveMember("suspended@x.com", Role.DRIVER);
        Cookie refreshCookie = loginAndGetRefreshCookie("suspended@x.com");
        member.suspend();
        memberRepository.saveAndFlush(member);

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCOUNT_SUSPENDED"));
    }

    @Test
    @DisplayName("로그아웃하면 쿠키를 지우고 리프레시 토큰을 폐기한다")
    void logout_clearsCookiesAndRevokesRefreshToken() throws Exception {
        saveMember("logout@x.com", Role.SHIPPER);
        Cookie refreshCookie = loginAndGetRefreshCookie("logout@x.com");

        mockMvc.perform(post("/api/auth/logout").cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge(AuthCookies.ACCESS_TOKEN_COOKIE, 0))
                .andExpect(cookie().maxAge(AuthCookies.REFRESH_TOKEN_COOKIE, 0));

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie)).andExpect(status().isUnauthorized());
    }

    private Member saveMember(String email, Role role) {
        return memberRepository.save(Member.builder()
                .email(email)
                .password(passwordEncoder.encode(PASSWORD))
                .name("테스트회원")
                .phone("010-9999-8888")
                .role(role)
                .build());
    }

    private MockHttpServletRequestBuilder loginRequest(String email) throws Exception {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(new LoginRequest(email, PASSWORD)));
    }

    private Cookie loginAndGetRefreshCookie(String email) throws Exception {
        MvcResult login = mockMvc.perform(loginRequest(email)).andReturn();
        return login.getResponse().getCookie(AuthCookies.REFRESH_TOKEN_COOKIE);
    }
}
