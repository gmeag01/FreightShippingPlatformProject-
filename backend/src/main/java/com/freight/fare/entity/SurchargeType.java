package com.freight.fare.entity;

public enum SurchargeType {
    NIGHT("야간"),
    WEEKEND("주말"),
    MANUAL_LOADING("수작업"),
    URGENT("긴급");

    private final String label;

    SurchargeType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
