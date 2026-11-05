package com.freight.member.entity;

/** 회원 역할. 화주, 차주, 관리자가 있다. */
public enum Role {
    SHIPPER,
    DRIVER,
    ADMIN;

    public String getAuthority() {
        return "ROLE_" + name();
    }
}
