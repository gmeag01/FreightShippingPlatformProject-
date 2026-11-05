package com.freight.order.repository;

import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByStatusOrderByPickupAtAsc(OrderStatus status, Pageable pageable);

    Page<Order> findByStatusAndRequiredVehicleTypeOrderByPickupAtAsc(
            OrderStatus status, VehicleType requiredVehicleType, Pageable pageable);

    @Query("select o.id from Order o where o.status = :status and o.droppedOffAt <= :droppedOffBefore")
    List<Long> findIdsByStatusAndDroppedOffBefore(
            @Param("status") OrderStatus status, @Param("droppedOffBefore") LocalDateTime droppedOffBefore);
}
