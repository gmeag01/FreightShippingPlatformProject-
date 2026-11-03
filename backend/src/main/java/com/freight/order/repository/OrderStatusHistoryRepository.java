package com.freight.order.repository;

import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {
    long countByActorIdAndFromStatusAndToStatus(Long actorId, OrderStatus fromStatus, OrderStatus toStatus);

    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtAscIdAsc(Long orderId);
}
