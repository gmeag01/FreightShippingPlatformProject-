package com.freight.order.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/** 화면에서 확인한 버전과 수정 내용을 함께 전달해 오래된 정보의 덮어쓰기를 막는다. */
public record UpdateOrderRequest(@NotNull @PositiveOrZero Long version, @NotNull @Valid SaveOrderRequest details) {}
