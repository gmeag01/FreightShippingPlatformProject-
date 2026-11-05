package com.freight.fare.dto;

import com.freight.fare.entity.FareSurcharge;
import com.freight.fare.entity.SurchargeType;
import java.math.BigDecimal;

/** 할증률 응답 DTO. */
public record FareSurchargeResponse(SurchargeType type, String label, BigDecimal rate) {

    public static FareSurchargeResponse from(FareSurcharge surcharge) {
        SurchargeType type = surcharge.getType();
        return new FareSurchargeResponse(type, type.getLabel(), surcharge.getRate());
    }
}
