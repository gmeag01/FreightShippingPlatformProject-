package com.freight.order.repository;

import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 오더 저장소. 다른 도메인은 OrderService를 거쳐 사용한다. */
public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    Page<Order> findByStatus(OrderStatus status, Pageable pageable);

    Page<Order> findByDriverIdAndStatusIn(Long driverId, Collection<OrderStatus> statuses, Pageable pageable);

    Page<Order> findByStatusOrderByPickupAtAsc(OrderStatus status, Pageable pageable);

    Page<Order> findByStatusAndRequiredVehicleTypeOrderByPickupAtAsc(
            OrderStatus status, VehicleType requiredVehicleType, Pageable pageable);

    long countByStatus(OrderStatus status);

    long countByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    @Query("select o.id from Order o where o.status = :status and o.droppedOffAt <= :droppedOffBefore")
    List<Long> findIdsByStatusAndDroppedOffBefore(
            @Param("status") OrderStatus status, @Param("droppedOffBefore") LocalDateTime droppedOffBefore);
}
