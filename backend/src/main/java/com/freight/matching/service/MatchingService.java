package com.freight.matching.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.matching.dto.AcceptOrderResponse;
import com.freight.matching.dto.CancelAssignmentRequest;
import com.freight.matching.dto.OpenOrderDetailResponse;
import com.freight.matching.dto.OpenOrderResponse;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.service.OrderService;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.service.VehicleService;
import jakarta.persistence.OptimisticLockException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/**
 * 차주 의뢰 목록 조회, 오더 수락(버전·차종 불일치·동시 수락 방지), 배차 취소를 처리하는 서비스.
 */
@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final OrderService orderService;
    private final VehicleService vehicleService;

    @Value("${app.order.driver-cancel-cutoff-hours:2}")
    private long driverCancelCutoffHours;

    /**
     * 등록됨(REGISTERED) 상태의 의뢰 목록을 상차 희망 시각(pickupAt) 오름차순으로 조회한다.
     *
     * @param vehicleType 필터링할 요구 차종 (null이면 전체 차종 조회)
     * @param page 0부터 시작하는 페이지 번호
     * @return 시·구(region) 주소만 포함된 의뢰 목록 페이지
     */
    public Page<OpenOrderResponse> listOpenOrders(VehicleType vehicleType, int page) {
        int safePage = Math.max(page, 0);
        return orderService
                .findOpenOrders(vehicleType, PageRequest.of(safePage, DEFAULT_PAGE_SIZE))
                .map(OpenOrderResponse::from);
    }

    /**
     * 수락 전 의뢰 상세를 조회한다. 상세주소·연락처·좌표는 응답에 담지 않는다(로드맵 matching).
     *
     * @param orderId 조회할 오더 ID
     * @return 시·구(region)까지만 담긴 의뢰 상세
     * @throws BusinessException 오더가 없으면 ORDER_NOT_FOUND, REGISTERED 상태가 아니면 ORDER_ALREADY_ASSIGNED
     */
    public OpenOrderDetailResponse getOpenOrderDetail(Long orderId) {
        Order order = orderService.getOrder(orderId);
        if (order.getStatus() != OrderStatus.REGISTERED) {
            throw new BusinessException(ErrorCode.ORDER_ALREADY_ASSIGNED);
        }
        return OpenOrderDetailResponse.from(order);
    }

    /**
     * 차주가 등록됨(REGISTERED) 상태의 오더를 수락한다.
     * 설계 문서 5장: 차량 미등록 차단, 버전 비교로 수정된 오더 수락 차단, 차종·중량 불일치 경고 확인,
     * JPA 낙관적 락(@Version)으로 동시 수락 시 정확히 1명만 성공하도록 보장한다.
     *
     * @param orderId 수락할 오더 ID
     * @param driverId 요청 차주 회원 ID
     * @param request 조회 시점의 version과 불일치 확인 여부(confirmMismatch)
     * @return 배차 완료된 오더 상태 응답
     * @throws BusinessException 차량 미등록(VEHICLE_REQUIRED), 오더 변경(ORDER_CHANGED),
     *         차종·중량 불일치 미확인(VEHICLE_MISMATCH), 이미 배차됨(ORDER_ALREADY_ASSIGNED)
     */
    public AcceptOrderResponse acceptOrder(Long orderId, Long driverId, AcceptOrderRequest request) {
        Vehicle vehicle = vehicleService
                .findByDriverId(driverId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_REQUIRED));

        try {
            orderService.changeStatus(orderId, driverId, "차주 수락", (order, driver) -> {
                validateAcceptability(order, vehicle, request);
                return order.accept(driver, LocalDateTime.now());
            });
        } catch (ConcurrencyFailureException | OptimisticLockException ex) {
            // 설계 문서 5장: 동시 수락으로 낙관적 락·데드락 충돌이 발생하면 ORDER_ALREADY_ASSIGNED로 변환한다.
            throw new BusinessException(ErrorCode.ORDER_ALREADY_ASSIGNED);
        }

        Order updated = orderService.getOrder(orderId);
        return new AcceptOrderResponse(
                updated.getId(), updated.getStatus(), driverId, updated.getAssignedAt(), updated.getVersion());
    }

    /**
     * 배정된 차주가 상차 희망 시각 기준 취소 가능 기한(기본 2시간 전) 내에 사유를 남겨 배차를 취소한다.
     *
     * @param orderId 취소할 오더 ID
     * @param driverId 요청 차주 회원 ID
     * @param request 배차 취소 사유
     * @throws BusinessException 기한 경과(DRIVER_CANCEL_CUTOFF_PASSED), 권한/소유 불일치(NOT_ORDER_OWNER)
     */
    public void cancelAssignment(Long orderId, Long driverId, CancelAssignmentRequest request) {
        // 설계 문서 3장: 상차 2시간 전부터는 차주가 직접 취소할 수 없다.
        orderService.changeStatus(
                orderId,
                driverId,
                request.reason(),
                (order, driver) ->
                        order.cancelAssignment(driver, LocalDateTime.now(), Duration.ofHours(driverCancelCutoffHours)));
    }

    private void validateAcceptability(Order order, Vehicle vehicle, AcceptOrderRequest request) {
        if (order.getStatus() != OrderStatus.REGISTERED) {
            throw new BusinessException(ErrorCode.ORDER_ALREADY_ASSIGNED);
        }
        if (!Objects.equals(order.getVersion(), request.version())) {
            throw new BusinessException(ErrorCode.ORDER_CHANGED);
        }

        int weightKg = order.getCargo().getWeightKg();
        int maxLoadKg = vehicle.getVehicleType().getMaxLoadKg();
        boolean isTypeMismatch = order.getRequiredVehicleType() != vehicle.getVehicleType();
        boolean isOverweight = weightKg > maxLoadKg;

        if ((isTypeMismatch || isOverweight) && !request.confirmMismatch()) {
            throw new BusinessException(
                    ErrorCode.VEHICLE_MISMATCH,
                    Map.of(
                            "driverVehicleType", vehicle.getVehicleType().name(),
                            "requiredVehicleType",
                                    order.getRequiredVehicleType().name(),
                            "weightKg", String.valueOf(weightKg),
                            "maxLoadKg", String.valueOf(maxLoadKg)));
        }
    }
}
