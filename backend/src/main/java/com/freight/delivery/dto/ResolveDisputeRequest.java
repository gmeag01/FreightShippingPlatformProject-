package com.freight.delivery.dto;

import com.freight.order.entity.DisputeResolution;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** 관리자가 분쟁을 지급 또는 환불로 처리할 때 보내는 요청. 설계 문서 3장: 처리 메모는 필수다. */
public record ResolveDisputeRequest(
        @NotNull(message = "처리 방법을 선택해 주세요") DisputeResolution resolution,
        @NotBlank(message = "처리 메모를 입력해 주세요") String memo) {}
