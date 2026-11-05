package com.freight.member.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 다른 도메인에 회원 조회를 제공한다. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MemberService {

    private final MemberRepository memberRepository;

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
}
