package com.freight.member.controller;

import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import com.freight.member.dto.MemberResponse;
import com.freight.member.entity.Member;
import com.freight.member.service.MemberService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 로그인한 회원 본인의 정보 조회 API 컨트롤러. */
@Tag(name = "회원 API", description = "회원 정보 조회 API")
@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    /** 로그인한 회원 본인의 정보를 조회한다. */
    @Operation(
            summary = "내 정보 조회",
            description = "현재 로그인한 사용자의 정보를 조회합니다.",
            security = @SecurityRequirement(name = "BearerAuth"))
    @GetMapping("/me")
    public ApiResponse<MemberResponse> getMe(@AuthenticationPrincipal AuthMember me) {
        Member member = memberService.getById(me.id());
        return ApiResponse.ok(MemberResponse.from(member));
    }
}
