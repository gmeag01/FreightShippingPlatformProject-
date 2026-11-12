package com.freight.member.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.dto.MemberResponse;
import com.freight.member.dto.UpdateProfileRequest;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 다른 도메인에 회원 조회 및 회원 본인의 정보 관리를 제공한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * 회원 ID로 회원 엔티티를 조회한다. 다른 도메인은 이 메서드로 회원을 가져온다.
     *
     * @param id 회원 ID
     * @return 회원 엔티티
     * @throws BusinessException 회원이 없는 경우(NOT_FOUND)
     */
    public Member getById(Long id) {
        return memberRepository.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.NOT_FOUND));
    }

    /**
     * 로그인한 회원 본인의 프로필(이름, 연락처, 선택적 비밀번호)을 수정한다.
     *
     * @param memberId 회원 ID
     * @param request  프로필 수정 요청 정보
     * @return 갱신된 회원 정보 응답 DTO
     * @throws BusinessException 회원이 없거나(NOT_FOUND), 현재 비밀번호가 불일치하거나(INVALID_CURRENT_PASSWORD), 새 비밀번호 형식이 올바르지 않은 경우(INVALID_INPUT)
     */
    @Transactional
    public MemberResponse updateProfile(Long memberId, UpdateProfileRequest request) {
        Member member = getById(memberId);

        // 비밀번호 변경 요청이 있는 경우 검증 및 갱신
        if (hasPasswordChangeRequest(request)) {
            validateAndUpdatePassword(member, request);
        }

        // 이름 및 연락처 갱신
        member.updateProfile(request.name(), request.phone());
        return MemberResponse.from(member);
    }

    private boolean hasPasswordChangeRequest(UpdateProfileRequest request) {
        return request.newPassword() != null && !request.newPassword().isBlank();
    }

    private void validateAndUpdatePassword(Member member, UpdateProfileRequest request) {
        if (request.currentPassword() == null || request.currentPassword().isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }
        if (!passwordEncoder.matches(request.currentPassword(), member.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CURRENT_PASSWORD);
        }
        if (request.newPassword().trim().length() < 8) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        member.changePassword(passwordEncoder.encode(request.newPassword().trim()));
    }
}
