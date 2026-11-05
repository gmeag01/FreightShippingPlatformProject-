package com.freight.delivery.dto;

import com.freight.member.entity.Member;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.OrderStatusHistory;
import java.time.LocalDateTime;

/** 오더 상태 이력 한 줄. 자동 확인처럼 시스템이 바꾼 이력은 actorName이 null이다. */
public record StatusHistoryResponse(
        OrderStatus fromStatus, OrderStatus toStatus, String actorName, String memo, LocalDateTime createdAt) {

    public static StatusHistoryResponse from(OrderStatusHistory history) {
        Member actor = history.getActor();
        return new StatusHistoryResponse(
                history.getFromStatus(),
                history.getToStatus(),
                actor != null ? actor.getName() : null,
                history.getMemo(),
                history.getCreatedAt());
    }
}
