package com.freight.vehicle.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum VehicleType {
    TON_1(1000, "1톤"),
    TON_2_5(2500, "2.5톤"),
    TON_5(5000, "5톤"),
    TON_11(11000, "11톤"),
    TON_25(25000, "25톤");

    private final int maxLoadKg;
    private final String label;
}
