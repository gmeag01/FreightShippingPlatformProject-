package com.freight.member.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.global.security.JwtTokenProvider;
import com.freight.member.dto.LoginRequest;
import com.freight.member.dto.MemberResponse;
import com.freight.member.dto.SignupRequest;
import com.freight.member.dto.TokenResponse;
import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 회원가입과 로그인을 처리한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

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

        String normalizedEmail = request.email().toLowerCase();
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
     * 이메일과 비밀번호를 확인하고 JWT 액세스 토큰을 발급한다.
     *
     * @param request 로그인 정보
     * @return 액세스 토큰과 회원 역할
     * @throws BusinessException 이메일이나 비밀번호가 틀린 경우(INVALID_CREDENTIALS), 정지된 계정인 경우(ACCOUNT_SUSPENDED)
     */
    public TokenResponse login(LoginRequest request) {
        String normalizedEmail = request.email().toLowerCase();
        Member member = memberRepository
                .findByEmail(normalizedEmail)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), member.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        if (member.getStatus() == MemberStatus.SUSPENDED) {
            throw new BusinessException(ErrorCode.ACCOUNT_SUSPENDED);
        }

        String token = jwtTokenProvider.createToken(member.getId(), member.getRole());
        return new TokenResponse(token, member.getRole());
    }
}
