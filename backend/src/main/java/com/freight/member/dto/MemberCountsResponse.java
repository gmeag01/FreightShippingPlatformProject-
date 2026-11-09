package com.freight.member.dto;

/**
 * 관리자 회원 역할별 카운트 통계 응답 DTO.
 * 관리자 화면 상단 탭(전체, 화주, 차주)의 뱃지 숫자를 표시할 때 사용한다.
 */
public record MemberCountsResponse(long total, long shipper, long driver) {}
