package com.freight.fare.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/** 단가표 일괄 수정 요청 DTO. */
public record UpdateFareRatesRequest(@NotEmpty(message = "수정할 단가 목록이 비어 있습니다") @Valid List<UpdateFareRateItem> rates) {}
