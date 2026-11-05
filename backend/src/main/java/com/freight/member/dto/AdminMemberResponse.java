package com.freight.member.dto;

import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import java.time.LocalDateTime;

/**
 * 관리자 회원 목록 조회 응답 DTO.
 */
public record AdminMemberResponse(
        Long id, String email, String name, String phone, Role role, MemberStatus status, LocalDateTime createdAt) {

    public static AdminMemberResponse from(Member member) {
        return new AdminMemberResponse(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getPhone(),
                member.getRole(),
                member.getStatus(),
                member.getCreatedAt());
    }
}
