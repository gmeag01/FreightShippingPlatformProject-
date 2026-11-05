package com.freight.order.repository;

import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.vehicle.entity.VehicleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Page<Order> findByStatusOrderByPickupAtAsc(OrderStatus status, Pageable pageable);

    Page<Order> findByStatusAndRequiredVehicleTypeOrderByPickupAtAsc(
            OrderStatus status, VehicleType requiredVehicleType, Pageable pageable);
}
