package com.freight.member.dto;

import com.freight.member.entity.MemberStatus;
import jakarta.validation.constraints.NotNull;

/**
 * 관리자 회원 상태 변경 요청 DTO.
 */
public record UpdateMemberStatusRequest(@NotNull(message = "변경할 상태는 필수입니다") MemberStatus status, String reason) {}
