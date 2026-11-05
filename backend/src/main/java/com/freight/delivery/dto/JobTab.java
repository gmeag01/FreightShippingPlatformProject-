package com.freight.delivery.dto;

import com.freight.order.entity.OrderStatus;
import java.util.List;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/** 차주 내 운송 화면의 탭. 취소된 운송은 끝난 운송으로 본다. */
@Getter
@RequiredArgsConstructor
public enum JobTab {
    IN_PROGRESS(
            List.of(OrderStatus.ASSIGNED, OrderStatus.IN_TRANSIT, OrderStatus.AWAITING_CONFIRM, OrderStatus.DISPUTED)),
    FINISHED(List.of(OrderStatus.COMPLETED, OrderStatus.CANCELLED));

    private final List<OrderStatus> statuses;
}
