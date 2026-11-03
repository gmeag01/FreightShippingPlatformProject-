package com.freight.matching.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.matching.dto.AcceptOrderResponse;
import com.freight.matching.dto.CancelAssignmentRequest;
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
import org.springframework.dao.CannotAcquireLockException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MatchingService {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final OrderService orderService;
    private final VehicleService vehicleService;

    @Value("${app.order.driver-cancel-cutoff-hours:2}")
    private long driverCancelCutoffHours;

    public Page<OpenOrderResponse> listOpenOrders(VehicleType vehicleType, int page) {
        int safePage = Math.max(page, 0);
        return orderService
                .findOpenOrders(vehicleType, PageRequest.of(safePage, DEFAULT_PAGE_SIZE))
                .map(OpenOrderResponse::from);
    }

    public AcceptOrderResponse acceptOrder(Long orderId, Long driverId, AcceptOrderRequest request) {
        Vehicle vehicle = vehicleService
                .findByDriverId(driverId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_REQUIRED));

        try {
            orderService.changeStatus(orderId, driverId, "차주 수락", (order, driver) -> {
                if (order.getStatus() != OrderStatus.REGISTERED) {
                    throw new BusinessException(ErrorCode.ORDER_ALREADY_ASSIGNED);
                }
                if (!Objects.equals(order.getVersion(), request.version())) {
                    throw new BusinessException(ErrorCode.ORDER_CHANGED);
                }

                int weightKg = order.getCargo().getWeightKg();
                int maxLoadKg = vehicle.getVehicleType().getMaxLoadKg();
                boolean typeMismatch = order.getRequiredVehicleType() != vehicle.getVehicleType();
                boolean overweight = weightKg > maxLoadKg;

                if ((typeMismatch || overweight) && !request.confirmMismatch()) {
                    throw new BusinessException(
                            ErrorCode.VEHICLE_MISMATCH,
                            Map.of(
                                    "driverVehicleType",
                                            vehicle.getVehicleType().name(),
                                    "requiredVehicleType",
                                            order.getRequiredVehicleType().name(),
                                    "weightKg", String.valueOf(weightKg),
                                    "maxLoadKg", String.valueOf(maxLoadKg)));
                }

                return order.accept(driver, LocalDateTime.now());
            });
        } catch (ObjectOptimisticLockingFailureException | OptimisticLockException | CannotAcquireLockException ex) {
            throw new BusinessException(ErrorCode.ORDER_ALREADY_ASSIGNED);
        }

        Order updated = orderService.getOrder(orderId);
        return new AcceptOrderResponse(
                updated.getId(), updated.getStatus(), driverId, updated.getAssignedAt(), updated.getVersion());
    }

    public void cancelAssignment(Long orderId, Long driverId, CancelAssignmentRequest request) {
        orderService.changeStatus(
                orderId,
                driverId,
                request.reason(),
                (order, driver) ->
                        order.cancelAssignment(driver, LocalDateTime.now(), Duration.ofHours(driverCancelCutoffHours)));
    }
}
