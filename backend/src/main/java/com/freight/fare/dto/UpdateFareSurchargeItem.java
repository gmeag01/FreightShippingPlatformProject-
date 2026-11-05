package com.freight.fare.dto;

import com.freight.fare.entity.SurchargeType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** 개별 할증률 수정 항목 DTO. */
public record UpdateFareSurchargeItem(
        @NotNull(message = "할증 유형을 지정해 주세요") SurchargeType type,
        @NotNull(message = "할증률을 입력해 주세요")
                @DecimalMin(value = "0.00", message = "할증률은 0 이상이어야 합니다")
                @DecimalMax(value = "5.00", message = "할증률은 5.00 이하여야 합니다")
                BigDecimal rate) {}
