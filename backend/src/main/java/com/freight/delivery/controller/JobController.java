package com.freight.delivery.controller;

import com.freight.delivery.dto.JobDetailResponse;
import com.freight.delivery.dto.JobSummaryResponse;
import com.freight.delivery.dto.JobTab;
import com.freight.delivery.service.JobQueryService;
import com.freight.global.common.ApiResponse;
import com.freight.global.security.AuthMember;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 차주가 내 운송 목록과 운송 상세를 조회하는 컨트롤러.
 */
@RestController
@RequestMapping("/api/jobs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DRIVER')")
public class JobController {

    private final JobQueryService jobQueryService;

    /**
     * 내 운송을 진행 중·끝남 탭으로 나눠 조회한다. status를 빼면 전체를 조회한다.
     */
    @GetMapping
    public ApiResponse<Page<JobSummaryResponse>> listJobs(
            @AuthenticationPrincipal AuthMember me,
            @RequestParam(required = false) JobTab status,
            @RequestParam(defaultValue = "0") int page) {
        return ApiResponse.ok(jobQueryService.listJobs(me.id(), status, page));
    }

    /**
     * 내게 배정된 운송의 상세를 조회한다.
     */
    @GetMapping("/{orderId}")
    public ApiResponse<JobDetailResponse> getJob(@PathVariable Long orderId, @AuthenticationPrincipal AuthMember me) {
        return ApiResponse.ok(jobQueryService.getJob(orderId, me.id()));
    }
}
