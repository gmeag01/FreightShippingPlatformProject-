package com.freight.member.dto;

import com.freight.member.entity.Role;

/** 로그인 응답. 액세스 토큰과 회원 역할을 담는다. */
public record TokenResponse(String accessToken, Role role) {}
