package com.freight.delivery.service;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.List;
import org.junit.jupiter.api.Test;

class AutoConfirmSchedulerTest {

    private final DeliveryService deliveryService = mock(DeliveryService.class);
    private final AutoConfirmScheduler scheduler = new AutoConfirmScheduler(deliveryService);

    @Test
    void confirmExpiredOrders_continuesAfterOneFailure() {
        given(deliveryService.findAutoConfirmTargetIds()).willReturn(List.of(1L, 2L));
        willThrow(new IllegalStateException("처리 실패")).given(deliveryService).autoConfirm(1L);

        scheduler.confirmExpiredOrders();

        verify(deliveryService).autoConfirm(2L);
    }
}
