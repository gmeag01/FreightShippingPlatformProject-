package com.freight.member.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 회원 프로필(이름, 연락처, 비밀번호) 수정 요청 DTO. */
public record UpdateProfileRequest(
        @Schema(description = "회원 이름", example = "홍길동")
                @NotBlank(message = "이름을 입력해주세요.")
                @Size(max = 50, message = "이름은 50자 이내여야 합니다.")
                String name,
        @Schema(description = "휴대폰 번호 (하이픈 포함)", example = "010-1234-5678")
                @NotBlank(message = "연락처를 입력해주세요.")
                @Pattern(regexp = "^01[0-9]-[0-9]{3,4}-[0-9]{4}$", message = "올바른 휴대폰 번호 형식(010-0000-0000)이어야 합니다.")
                String phone,
        @Schema(description = "현재 비밀번호 (비밀번호 변경 시 필수)", example = "password123!") String currentPassword,
        @Schema(description = "새 비밀번호 (8자 이상, 변경할 경우에만 입력)", example = "newPassword123!") String newPassword) {}
