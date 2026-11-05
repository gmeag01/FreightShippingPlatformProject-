package com.freight.matching.dto;

import jakarta.validation.constraints.NotNull;

/** 오더 수락 요청. 조회 시점의 version과 차종·중량 불일치 확인 여부를 담는다. */
public record AcceptOrderRequest(@NotNull Long version, boolean confirmMismatch) {}
