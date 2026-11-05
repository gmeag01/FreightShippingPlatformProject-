package com.freight.member.dto;

import com.freight.member.entity.Member;
import com.freight.member.entity.Role;

/** 회원 정보 응답. */
public record MemberResponse(Long id, String email, String name, String phone, Role role) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(
                member.getId(), member.getEmail(), member.getName(), member.getPhone(), member.getRole());
    }
}
