package com.freight.global.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.WebUtils;

/** 요청의 Bearer 헤더나 access_token 쿠키에서 토큰을 꺼내 검증하고, 로그인 회원을 SecurityContext에 넣는다. */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this.jwtTokenProvider = jwtTokenProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = resolveToken(request);

        if (StringUtils.hasText(token)) {
            try {
                AuthMember authMember = jwtTokenProvider.parse(token);
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(authMember, null, authMember.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (Exception e) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken)) {
            String token = bearerToken.trim();
            // Swagger 등에서 'Bearer '를 중복 입력하여 'Bearer Bearer ...'가 되는 경우를 방어
            while (token.regionMatches(true, 0, "Bearer ", 0, 7)) {
                token = token.substring(7).trim();
            }
            return token.isEmpty() ? null : token;
        }
        // 브라우저는 쿠키로 토큰을 보낸다. Swagger와 테스트가 헤더를 쓰므로 헤더를 먼저 본다.
        return resolveCookieToken(request);
    }

    private String resolveCookieToken(HttpServletRequest request) {
        Cookie cookie = WebUtils.getCookie(request, AuthCookies.ACCESS_TOKEN_COOKIE);
        return cookie == null || cookie.getValue().isBlank() ? null : cookie.getValue();
    }
}
