package com.freight.member.service;

import com.freight.member.dto.MemberResponse;

/** 로그인·토큰 갱신 결과. 컨트롤러는 두 토큰을 HttpOnly 쿠키에, 회원 정보를 응답 본문에 담는다. */
public record AuthTokens(String accessToken, String refreshToken, MemberResponse member) {}
