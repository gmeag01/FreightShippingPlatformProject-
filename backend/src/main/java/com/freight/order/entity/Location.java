package com.freight.order.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 오더의 상차지·하차지 정보. region은 수락 전 차주에게 공개하는 시·구 단위 주소다. */
@Getter
@Builder
@Embeddable
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class Location {

    @Column(nullable = false)
    private String address;

    private String detailAddress;

    @Column(nullable = false)
    private String region;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(nullable = false)
    private String contactName;

    @Column(nullable = false)
    private String contactPhone;
}
