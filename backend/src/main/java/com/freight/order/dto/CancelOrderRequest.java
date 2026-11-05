package com.freight.order.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** 취소 이력에 남길 사유와 사용자가 확인한 버전을 전달한다. */
public record CancelOrderRequest(@NotNull @PositiveOrZero Long version, @NotBlank @Size(max = 255) String reason) {}
