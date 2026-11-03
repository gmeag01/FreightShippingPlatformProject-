package com.freight.member.entity;

public enum Role {
    SHIPPER,
    DRIVER,
    ADMIN;

    public String getAuthority() {
        return "ROLE_" + name();
    }
}
