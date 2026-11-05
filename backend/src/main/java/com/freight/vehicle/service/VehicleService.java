package com.freight.vehicle.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.service.MemberService;
import com.freight.vehicle.dto.VehicleRequest;
import com.freight.vehicle.dto.VehicleResponse;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.repository.VehicleRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 차주 차량 관리 및 타 도메인 조회 서비스. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final MemberService memberService;

    /**
     * 차주 ID로 등록된 차량 엔티티를 조회한다. 매칭 등 타 도메인에서 차주 차량 적재량 및 차종 확인 시 사용된다.
     *
     * @param driverId 차주 회원 ID
     * @return 등록된 차량 정보(Optional)
     */
    public Optional<Vehicle> findByDriverId(Long driverId) {
        return vehicleRepository.findByDriverId(driverId);
    }

    /**
     * 차주의 등록된 차량 정보를 조회한다.
     *
     * @param driverId 차주 회원 ID
     * @return 차량 상세 응답 DTO
     * @throws BusinessException 등록된 차량이 없는 경우(VEHICLE_NOT_FOUND)
     */
    public VehicleResponse getMyVehicle(Long driverId) {
        return vehicleRepository
                .findByDriverId(driverId)
                .map(VehicleResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_FOUND));
    }

    /**
     * 차주의 차량을 등록하거나 기존 차량 정보를 수정한다. 차주 한 명당 최대 한 대의 차량만 등록된다.
     *
     * @param driverId 차주 회원 ID
     * @param request 차량 등록/수정 요청 DTO
     * @return 등록/수정된 차량 상세 응답 DTO
     * @throws BusinessException 회원을 찾을 수 없는 경우(NOT_FOUND)
     */
    @Transactional
    public VehicleResponse registerOrUpdate(Long driverId, VehicleRequest request) {
        Member driver = memberService.getById(driverId);
        Optional<Vehicle> existing = vehicleRepository.findByDriverId(driverId);

        Vehicle vehicle;
        if (existing.isPresent()) {
            vehicle = existing.get();
            vehicle.update(request.vehicleType(), request.plateNumber(), request.bodyType());
        } else {
            vehicle = Vehicle.builder()
                    .driver(driver)
                    .vehicleType(request.vehicleType())
                    .plateNumber(request.plateNumber())
                    .bodyType(request.bodyType())
                    .build();
            vehicleRepository.save(vehicle);
        }

        return VehicleResponse.from(vehicle);
    }
}
