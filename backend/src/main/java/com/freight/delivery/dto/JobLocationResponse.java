package com.freight.delivery.dto;

import com.freight.order.entity.Location;

/** 배정된 차주에게만 보여 주는 상세주소, 좌표, 현장 연락처. */
public record JobLocationResponse(
        String address,
        String detailAddress,
        String region,
        double latitude,
        double longitude,
        String contactName,
        String contactPhone) {

    public static JobLocationResponse from(Location location) {
        return new JobLocationResponse(
                location.getAddress(),
                location.getDetailAddress(),
                location.getRegion(),
                location.getLatitude(),
                location.getLongitude(),
                location.getContactName(),
                location.getContactPhone());
    }
}
