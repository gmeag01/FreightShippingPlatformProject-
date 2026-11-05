package com.freight.fare.dto;

import com.freight.vehicle.entity.VehicleType;
import java.util.List;

public record FareEstimate(
        double distanceKm,
        boolean isDistanceEstimated,
        VehicleType recommendedVehicleType,
        long baseFare,
        long distanceFare,
        long surchargeAmount,
        long recommendedFare,
        List<String> appliedSurcharges) {}
