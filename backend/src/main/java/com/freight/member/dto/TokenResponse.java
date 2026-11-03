package com.freight.member.dto;

import com.freight.member.entity.Role;

public record TokenResponse(String accessToken, Role role) {}
