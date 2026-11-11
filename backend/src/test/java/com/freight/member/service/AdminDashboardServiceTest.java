package com.freight.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.delivery.service.DisputeQueryService;
import com.freight.member.dto.AdminDashboardResponse;
import com.freight.order.entity.Cargo;
import com.freight.order.entity.CargoType;
import com.freight.order.entity.LoadingMethod;
import com.freight.order.entity.Location;
import com.freight.order.entity.Order;
import com.freight.order.entity.OrderStatus;
import com.freight.order.entity.PackageUnit;
import com.freight.order.service.OrderService;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.VehicleType;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;

@ExtendWith(MockitoExtension.class)
class AdminDashboardServiceTest {

    @Mock
    private OrderService orderService;

    @Mock
    private DisputeQueryService disputeQueryService;

    @InjectMocks
    private AdminDashboardService adminDashboardService;

    @Test
    @DisplayName("관리자 대시보드 통계 및 긴급 목록 정상 조회")
    void getDashboard_success() {
        // given
        given(orderService.countOrdersCreatedBetween(any(), any())).willReturn(10L, 8L);
        given(orderService.countStatusTransitions(eq(OrderStatus.ASSIGNED), any(), any()))
                .willReturn(7L, 5L);
        given(orderService.countStatusTransitions(eq(OrderStatus.COMPLETED), any(), any()))
                .willReturn(4L, 3L);
        given(orderService.countUnassignedOrders(any())).willReturn(6L);
        given(orderService.countOrdersByStatus(OrderStatus.DISPUTED)).willReturn(2L);

        Location pickup = Location.builder()
                .address("서울 강남구 역삼동")
                .region("서울 강남구")
                .contactName("홍길동")
                .contactPhone("010-1111-2222")
                .latitude(37.5)
                .longitude(127.0)
                .build();
        Location dropoff = Location.builder()
                .address("부산 해운대구 우동")
                .region("부산 해운대구")
                .contactName("이몽룡")
                .contactPhone("010-3333-4444")
                .latitude(35.1)
                .longitude(129.1)
                .build();
        Cargo cargo = Cargo.builder()
                .itemName("전자제품")
                .cargoType(CargoType.GENERAL)
                .packageUnit(PackageUnit.BOX)
                .quantity(1)
                .weightKg(3000)
                .build();

        Order urgentOrder = Order.builder()
                .id(101L)
                .pickup(pickup)
                .dropoff(dropoff)
                .pickupAt(LocalDateTime.now().plusHours(3))
                .cargo(cargo)
                .requiredVehicleType(VehicleType.TON_5)
                .bodyType(BodyType.WING)
                .loadingMethod(LoadingMethod.FORKLIFT)
                .fare(350000L)
                .build();

        Order overdueOrder = Order.builder()
                .id(103L)
                .status(OrderStatus.REGISTERED)
                .pickup(pickup)
                .dropoff(dropoff)
                .pickupAt(LocalDateTime.now().minusHours(1))
                .cargo(cargo)
                .requiredVehicleType(VehicleType.TON_1)
                .bodyType(BodyType.CARGO)
                .loadingMethod(LoadingMethod.MANUAL)
                .fare(120000L)
                .build();

        LocalDateTime reportedAt = LocalDateTime.of(2026, 11, 11, 14, 10);
        DisputeSummaryResponse dispute = new DisputeSummaryResponse(102L, "서울 강남구", "부산 해운대구", reportedAt, "화물 파손");

        given(orderService.findUrgentUnassignedOrders(5)).willReturn(List.of(overdueOrder, urgentOrder));
        given(disputeQueryService.listDisputes(0)).willReturn(new PageImpl<>(List.of(dispute)));

        // when
        AdminDashboardResponse response = adminDashboardService.getDashboard();

        // then
        assertThat(response.summary().todayRegistered()).isEqualTo(10L);
        assertThat(response.summary().yesterdayRegistered()).isEqualTo(8L);
        assertThat(response.summary().todayAssigned()).isEqualTo(7L);
        assertThat(response.summary().yesterdayAssigned()).isEqualTo(5L);
        assertThat(response.summary().todayCompleted()).isEqualTo(4L);
        assertThat(response.summary().yesterdayCompleted()).isEqualTo(3L);
        assertThat(response.summary().unassignedCount()).isEqualTo(6L);
        assertThat(response.summary().disputedCount()).isEqualTo(2L);

        assertThat(response.urgentOrders()).hasSize(2);
        assertThat(response.urgentOrders().get(1).orderId()).isEqualTo(101L);
        assertThat(response.urgentOrders().get(1).pickupRegion()).isEqualTo("서울 강남구");
        assertThat(response.urgentOrders().get(1).dropoffRegion()).isEqualTo("부산 해운대구");
        assertThat(response.urgentOrders().get(1).fare()).isEqualTo(350000L);
        // 화주 목록과 같은 규칙: 상차 희망 시각이 지난 REGISTERED만 미배차다.
        assertThat(response.urgentOrders().get(0).isUnassigned()).isTrue();
        assertThat(response.urgentOrders().get(1).isUnassigned()).isFalse();

        // 설계 시안(admin-dashboard.png): 분쟁 줄에 신고 사유와 신고 시각을 보여 준다.
        assertThat(response.disputeOrders()).hasSize(1);
        assertThat(response.disputeOrders().get(0).orderId()).isEqualTo(102L);
        assertThat(response.disputeOrders().get(0).reason()).isEqualTo("화물 파손");
        assertThat(response.disputeOrders().get(0).reportedAt()).isEqualTo(reportedAt);
    }
}
