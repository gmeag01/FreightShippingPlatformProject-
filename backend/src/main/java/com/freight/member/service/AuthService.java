package com.freight.member.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.dto.LoginRequest;
import com.freight.member.dto.MemberResponse;
import com.freight.member.dto.SignupRequest;
import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.RefreshToken;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import com.freight.member.repository.RefreshTokenRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 회원가입, 로그인, 토큰 갱신, 로그아웃을 처리한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    // 32바이트(256비트) 난수라 추측으로 맞힐 수 없다.
    private static final int REFRESH_TOKEN_BYTES = 32;

    @Value("${app.jwt.refresh-validity-ms}")
    private long refreshTokenValidityMs;

    /**
     * 화주 또는 차주 계정을 만든다. 이메일은 소문자로 저장하고, 관리자 계정은 가입으로 만들 수 없다.
     *
     * @param request 가입 정보
     * @return 생성된 회원 정보
     * @throws BusinessException 관리자로 가입하려는 경우(INVALID_INPUT), 이메일이 중복된 경우(DUPLICATE_EMAIL)
     */
    @Transactional
    public MemberResponse signup(SignupRequest request) {
        if (request.role() == Role.ADMIN) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }

        String normalizedEmail = normalizeEmail(request.email());
        if (memberRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }

        Member member = Member.builder()
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.password()))
                .name(request.name())
                .phone(request.phone())
                .role(request.role())
                .status(MemberStatus.ACTIVE)
                .build();

        Member savedMember = memberRepository.save(member);
        return MemberResponse.from(savedMember);
    }

    /**
     * 이메일과 비밀번호를 확인하고 JWT 액세스 토큰과 리프레시 토큰을 발급한다.
     *
     * @param request 로그인 정보
     * @return 액세스 토큰, 리프레시 토큰, 회원 정보
     * @throws BusinessException 이메일이나 비밀번호가 틀린 경우(INVALID_CREDENTIALS), 정지된 계정인 경우(ACCOUNT_SUSPENDED)
     */
    @Transactional
    public AuthTokens login(LoginRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        Member member = memberRepository
                .findByEmail(normalizedEmail)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (member.getStatus() == MemberStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.ACCOUNT_SUSPENDED);
        }

        return issueTokens(member);
    }

    /**
     * 리프레시 토큰을 확인하고 새 액세스·리프레시 토큰을 발급한다. 사용한 리프레시 토큰은 바로 폐기하므로, 탈취된 토큰은 한 번밖에 쓸 수 없다.
     *
     * @param rawRefreshToken 쿠키로 받은 리프레시 토큰 원문(쿠키가 없으면 null)
     * @return 새 액세스 토큰, 새 리프레시 토큰, 회원 정보
     * @throws BusinessException 토큰이 없거나 폐기·만료된 경우(INVALID_REFRESH_TOKEN), 정지된 계정인 경우(ACCOUNT_SUSPENDED)
     */
    @Transactional
    public AuthTokens refresh(String rawRefreshToken) {
        RefreshToken refreshToken = findUsableRefreshToken(rawRefreshToken);
        Member member = memberRepository
                .findById(refreshToken.getMemberId())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));

        // 설계 문서 6장: 정지된 계정은 로그인할 수 없다. 토큰 갱신은 로그인을 연장하는 것이라 같이 막는다.
        if (member.getStatus() == MemberStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.ACCOUNT_SUSPENDED);
        }

        refreshTokenRepository.delete(refreshToken);
        return issueTokens(member);
    }

    /**
     * 리프레시 토큰을 폐기한다. 토큰이 없거나 이미 폐기됐어도 로그아웃은 성공으로 본다.
     *
     * @param rawRefreshToken 쿠키로 받은 리프레시 토큰 원문(쿠키가 없으면 null)
     */
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository
                .findByTokenHash(RefreshToken.hash(rawRefreshToken))
                .ifPresent(refreshTokenRepository::delete);
    }

    private RefreshToken findUsableRefreshToken(String rawRefreshToken) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        RefreshToken refreshToken = refreshTokenRepository
                .findByTokenHash(RefreshToken.hash(rawRefreshToken))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN));
        if (refreshToken.isExpired(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.INVALID_REFRESH_TOKEN);
        }
        return refreshToken;
    }

    private AuthTokens issueTokens(Member member) {
        String accessToken = jwtTokenProvider.createToken(member.getId(), member.getRole());
        String rawRefreshToken = generateRefreshToken();
        LocalDateTime expiresAt = LocalDateTime.now().plus(Duration.ofMillis(refreshTokenValidityMs));
        refreshTokenRepository.save(RefreshToken.create(member.getId(), rawRefreshToken, expiresAt));
        return new AuthTokens(accessToken, rawRefreshToken, MemberResponse.from(member));
    }

    private String generateRefreshToken() {
        byte[] randomBytes = new byte[REFRESH_TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
