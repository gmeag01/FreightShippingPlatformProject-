package com.freight.delivery.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** 관리자 분쟁 건수 통계 (처리 대기 건수, 처리 완료 건수). */
public record DisputeCountsResponse(
        @Schema(description = "처리 대기 중인 분쟁 건수", example = "2") long pending,
        @Schema(description = "처리 완료된 분쟁 이력 건수", example = "5") long resolved) {}
