package com.freight.member.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.member.dto.AdminMemberDetailResponse;
import com.freight.member.dto.AdminMemberResponse;
import com.freight.member.dto.UpdateMemberStatusRequest;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.member.service.AdminMemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 관리자 전용 회원 관리 API 컨트롤러.
 */
@Tag(name = "관리자 회원 API", description = "관리자 전용 회원 목록 조회, 상세 조회, 계정 상태 변경 API")
@RestController
@RequestMapping("/api/admin/members")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
public class AdminMemberController {

    private final AdminMemberService adminMemberService;

    @Operation(summary = "회원 목록 조회", description = "역할, 상태, 검색어 필터와 페이징을 통해 회원 목록을 조회합니다.")
    @GetMapping
    public ApiResponse<Page<AdminMemberResponse>> getMembers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) MemberStatus status,
            @RequestParam(required = false) String keyword,
            @PageableDefault(size = 10, sort = "id", direction = Sort.Direction.DESC) Pageable pageable) {
        Page<AdminMemberResponse> result = adminMemberService.getMembers(role, status, keyword, pageable);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "회원 상세 조회", description = "특정 회원의 상세 정보를 조회합니다. 차주인 경우 차량 정보와 배차 취소 횟수를 포함합니다.")
    @GetMapping("/{id}")
    public ApiResponse<AdminMemberDetailResponse> getMemberDetail(@PathVariable Long id) {
        AdminMemberDetailResponse result = adminMemberService.getMemberDetail(id);
        return ApiResponse.ok(result);
    }

    @Operation(summary = "회원 상태 변경", description = "회원 계정을 정지(SUSPENDED)하거나 정상(ACTIVE)으로 변경합니다.")
    @PatchMapping("/{id}/status")
    public ApiResponse<AdminMemberResponse> updateMemberStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateMemberStatusRequest request,
            @AuthenticationPrincipal AuthMember me) {
        AdminMemberResponse result = adminMemberService.updateMemberStatus(id, request.status(), me.id());
        return ApiResponse.ok(result);
    }
}
