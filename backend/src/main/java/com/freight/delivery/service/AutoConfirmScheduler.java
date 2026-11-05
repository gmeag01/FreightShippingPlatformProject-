package com.freight.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 설계 문서 3장: 하차 완료 후 정해진 시간 안에 화주가 확인하지 않은 오더를 주기적으로 자동 확인한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AutoConfirmScheduler {

    private final DeliveryService deliveryService;

    /**
     * 자동 확인 대상 오더를 하나씩 별도 트랜잭션으로 처리한다.
     * 화주가 먼저 확인한 경우처럼 한 오더가 실패해도 나머지 오더는 계속 처리한다.
     */
    @Scheduled(cron = "${app.order.auto-confirm-cron}")
    public void confirmExpiredOrders() {
        for (Long orderId : deliveryService.findAutoConfirmTargetIds()) {
            try {
                deliveryService.autoConfirm(orderId);
            } catch (RuntimeException exception) {
                log.warn("오더 {} 자동 확인 실패", orderId, exception);
            }
        }
    }
}
