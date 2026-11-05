package com.freight.fare.dto;

import com.freight.order.entity.LoadingMethod;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

public record FareEstimateCommand(
        double pickupLat,
        double pickupLng,
        double dropoffLat,
        double dropoffLng,
        int weightKg,
        VehicleType vehicleType,
        LocalDateTime pickupAt,
        LoadingMethod loadingMethod,
        LocalDateTime requestedAt) {}
