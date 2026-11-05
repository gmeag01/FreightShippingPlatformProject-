package com.freight.fare.dto;

import com.freight.vehicle.entity.VehicleType;
import java.util.List;

/** 추천 운임 계산 결과. 거리, 요금 구성, 적용된 할증을 담는다. */
public record FareEstimate(
        double distanceKm,
        boolean isDistanceEstimated,
        VehicleType recommendedVehicleType,
        long baseFare,
        long distanceFare,
        long surchargeAmount,
        long recommendedFare,
        List<String> appliedSurcharges) {}
