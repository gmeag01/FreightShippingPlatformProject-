package com.freight.member.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthCookies;
import com.freight.member.dto.LoginRequest;
import com.freight.member.dto.MemberResponse;
import com.freight.member.dto.SignupRequest;
import com.freight.member.service.AuthService;
import com.freight.member.service.AuthTokens;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 회원가입, 로그인, 토큰 갱신, 로그아웃 API. 토큰은 HttpOnly 쿠키에 담아 내려준다. */
@Tag(name = "인증 API", description = "회원가입, 로그인, 토큰 갱신, 로그아웃 API")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final AuthCookies authCookies;

    /** 화주 또는 차주로 회원가입한다. */
    @Operation(summary = "회원가입", description = "이메일, 비밀번호, 이름, 연락처, 역할을 입력하여 회원가입합니다.")
    @PostMapping("/signup")
    public ApiResponse<MemberResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ApiResponse.ok(authService.signup(request));
    }

    /** 로그인하고 액세스·리프레시 토큰 쿠키를 내려준다. 본문에는 회원 정보를 담는다. */
    @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인합니다. 토큰은 HttpOnly 쿠키로 내려갑니다.")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<MemberResponse>> login(@Valid @RequestBody LoginRequest request) {
        return withTokenCookies(authService.login(request));
    }

    /** 리프레시 토큰 쿠키를 확인하고 새 토큰 쿠키 두 개를 내려준다. */
    @Operation(summary = "토큰 갱신", description = "리프레시 토큰 쿠키로 새 토큰 쿠키를 받습니다. 쓴 리프레시 토큰은 폐기됩니다.")
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<MemberResponse>> refresh(
            @CookieValue(name = AuthCookies.REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        return withTokenCookies(authService.refresh(refreshToken));
    }

    /** 리프레시 토큰을 폐기하고 토큰 쿠키를 지운다. */
    @Operation(summary = "로그아웃", description = "리프레시 토큰을 폐기하고 토큰 쿠키를 지웁니다.")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @CookieValue(name = AuthCookies.REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        authCookies.expiredAccessTokenCookie().toString())
                .header(
                        HttpHeaders.SET_COOKIE,
                        authCookies.expiredRefreshTokenCookie().toString())
                .body(ApiResponse.ok(null));
    }

    private ResponseEntity<ApiResponse<MemberResponse>> withTokenCookies(AuthTokens tokens) {
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        authCookies.accessTokenCookie(tokens.accessToken()).toString())
                .header(
                        HttpHeaders.SET_COOKIE,
                        authCookies.refreshTokenCookie(tokens.refreshToken()).toString())
                .body(ApiResponse.ok(tokens.member()));
    }
}
