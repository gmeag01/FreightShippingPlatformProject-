package com.freight.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;
    private final String secretKey = "test-secret-key-freight-platform-at-least-32-bytes-long";
    private final long validityInMilliseconds = 3600000; // 1시간

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider(secretKey, validityInMilliseconds);
    }

    @Test
    @DisplayName("토큰 생성 및 파싱 성공")
    void createAndParseToken_success() {
        Long memberId = 1L;
        Role role = Role.SHIPPER;

        String token = jwtTokenProvider.createToken(memberId, role);
        assertThat(token).isNotBlank();

        AuthMember authMember = jwtTokenProvider.parse(token);
        assertThat(authMember.id()).isEqualTo(memberId);
        assertThat(authMember.role()).isEqualTo(role);
    }

    @Test
    @DisplayName("잘못된 토큰 파싱 시 UNAUTHORIZED 예외 발생")
    void parse_invalidToken_throwsUnauthorized() {
        String invalidToken = "invalid.jwt.token";

        assertThatThrownBy(() -> jwtTokenProvider.parse(invalidToken))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }

    @Test
    @DisplayName("만료된 토큰 파싱 시 UNAUTHORIZED 예외 발생")
    void parse_expiredToken_throwsUnauthorized() {
        JwtTokenProvider expiredProvider = new JwtTokenProvider(secretKey, 0); // 즉시 만료
        String token = expiredProvider.createToken(1L, Role.DRIVER);

        assertThatThrownBy(() -> expiredProvider.parse(token))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.UNAUTHORIZED);
    }
}
