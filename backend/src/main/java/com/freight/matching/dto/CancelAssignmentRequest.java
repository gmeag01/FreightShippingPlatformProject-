package com.freight.matching.dto;

import jakarta.validation.constraints.NotBlank;

/** 차주의 배차 취소 요청. */
public record CancelAssignmentRequest(@NotBlank String reason) {}
