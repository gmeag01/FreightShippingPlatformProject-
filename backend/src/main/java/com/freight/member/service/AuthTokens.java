package com.freight.member.service;

import com.freight.member.dto.MemberResponse;

/** 로그인·토큰 갱신 결과. 컨트롤러가 두 토큰은 HttpOnly 쿠키로, 회원 정보는 응답 본문으로 내려준다. */
public record AuthTokens(String accessToken, String refreshToken, MemberResponse member) {}
