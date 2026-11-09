package com.freight.member.dto;

import com.freight.member.dto.AdminMemberDetailResponse.VehicleSummary;
import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.vehicle.entity.Vehicle;
import java.time.LocalDateTime;

/**
 * 관리자 회원 목록 조회 응답 DTO.
 * 차주인 경우 차량 정보 및 배차 취소 횟수를 포함한다.
 */
public record AdminMemberResponse(
        Long id,
        String email,
        String name,
        String phone,
        Role role,
        MemberStatus status,
        LocalDateTime createdAt,
        VehicleSummary vehicle,
        Long cancellationCount) {

    public static AdminMemberResponse from(Member member) {
        return new AdminMemberResponse(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getPhone(),
                member.getRole(),
                member.getStatus(),
                member.getCreatedAt(),
                null,
                null);
    }

    public static AdminMemberResponse of(Member member, Vehicle vehicle, Long cancellationCount) {
        return new AdminMemberResponse(
                member.getId(),
                member.getEmail(),
                member.getName(),
                member.getPhone(),
                member.getRole(),
                member.getStatus(),
                member.getCreatedAt(),
                VehicleSummary.from(vehicle),
                cancellationCount);
    }
}
