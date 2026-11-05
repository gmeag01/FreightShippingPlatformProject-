package com.freight.fare.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** 할증률 일괄 수정 요청 DTO. */
public record UpdateFareSurchargesRequest(
        @NotEmpty(message = "수정할 할증률 목록이 비어 있습니다") @Valid List<UpdateFareSurchargeItem> surcharges) {}
