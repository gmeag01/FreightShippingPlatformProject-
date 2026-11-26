package com.freight.global.security;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

/** 액세스·리프레시 토큰을 담을 HttpOnly 쿠키를 만든다. */
@Component
public class AuthCookies {

    public static final String ACCESS_TOKEN_COOKIE = "access_token";
    public static final String REFRESH_TOKEN_COOKIE = "refresh_token";

    private static final String ACCESS_TOKEN_PATH = "/api";
    // 리프레시 토큰은 갱신과 로그아웃 요청에만 실리도록 경로를 /api/auth로 좁힌다.
    private static final String REFRESH_TOKEN_PATH = "/api/auth";
    // SameSite=Strict면 다른 사이트에서 보낸 요청에 쿠키가 실리지 않는다. 그래서 CSRF 토큰을 따로 쓰지 않는다(SecurityConfig 참고).
    private static final String SAME_SITE = "Strict";

    private final Duration accessTokenValidity;
    private final Duration refreshTokenValidity;
    private final boolean isSecure;

    public AuthCookies(
            @Value("${app.jwt.validity-ms}") long accessTokenValidityMs,
            @Value("${app.jwt.refresh-validity-ms}") long refreshTokenValidityMs,
            @Value("${app.auth.cookie-secure:true}") boolean isSecure) {
        this.accessTokenValidity = Duration.ofMillis(accessTokenValidityMs);
        this.refreshTokenValidity = Duration.ofMillis(refreshTokenValidityMs);
        this.isSecure = isSecure;
    }

    public ResponseCookie accessTokenCookie(String accessToken) {
        return buildCookie(ACCESS_TOKEN_COOKIE, accessToken, ACCESS_TOKEN_PATH, accessTokenValidity);
    }

    public ResponseCookie refreshTokenCookie(String refreshToken) {
        return buildCookie(REFRESH_TOKEN_COOKIE, refreshToken, REFRESH_TOKEN_PATH, refreshTokenValidity);
    }

    public ResponseCookie expiredAccessTokenCookie() {
        return buildCookie(ACCESS_TOKEN_COOKIE, "", ACCESS_TOKEN_PATH, Duration.ZERO);
    }

    public ResponseCookie expiredRefreshTokenCookie() {
        return buildCookie(REFRESH_TOKEN_COOKIE, "", REFRESH_TOKEN_PATH, Duration.ZERO);
    }

    private ResponseCookie buildCookie(String name, String value, String path, Duration maxAge) {
        return ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(isSecure)
                .sameSite(SAME_SITE)
                .path(path)
                .maxAge(maxAge)
                .build();
    }
}
