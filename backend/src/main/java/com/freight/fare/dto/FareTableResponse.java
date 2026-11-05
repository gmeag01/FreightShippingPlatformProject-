package com.freight.fare.dto;

import java.util.List;

/** 단가표와 할증률 전체 목록 응답 DTO. */
public record FareTableResponse(List<FareRateResponse> rates, List<FareSurchargeResponse> surcharges) {}
