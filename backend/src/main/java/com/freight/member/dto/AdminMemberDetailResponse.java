package com.freight.member.dto;

import com.freight.member.entity.Member;
import com.freight.member.entity.MemberStatus;
import com.freight.member.entity.Role;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;

/**
 * 관리자 회원 상세 조회 응답 DTO.
 * 차주인 경우 차량 정보 및 배차 취소 횟수를 포함한다.
 */
public record AdminMemberDetailResponse(
        Long id,
        String email,
        String name,
        String phone,
        Role role,
        MemberStatus status,
        LocalDateTime createdAt,
        VehicleSummary vehicle,
        long cancellationCount) {

    public record VehicleSummary(Long id, VehicleType vehicleType, String plateNumber, BodyType bodyType) {

        public static VehicleSummary from(Vehicle vehicle) {
            if (vehicle == null) {
                return null;
            }
            return new VehicleSummary(
                    vehicle.getId(), vehicle.getVehicleType(), vehicle.getPlateNumber(), vehicle.getBodyType());
        }
    }

    public static AdminMemberDetailResponse of(Member member, Vehicle vehicle, long cancellationCount) {
        return new AdminMemberDetailResponse(
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
