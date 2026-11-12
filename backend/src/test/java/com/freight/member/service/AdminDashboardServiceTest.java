package com.freight.member.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import com.freight.delivery.dto.DisputeSummaryResponse;
import com.freight.delivery.service.DisputeQueryService;
import com.freight.member.dto.AdminDashboardOrderDto;
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
        given(orderService.countOrdersAssignedBetween(any(), any())).willReturn(7L, 5L);
        given(orderService.countOrdersCompletedBetween(any(), any())).willReturn(4L, 3L);
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

    @Test
    @DisplayName("통계 카드 유형별 상세 오더 목록을 정상 조회한다")
    void getDashboardOrders_byType() {
        // given
        Location pickup =
                Location.builder().region("서울 중구").address("서울 중구 세종대로 1").build();
        Location dropoff =
                Location.builder().region("부산 연제구").address("부산 연제구 중앙대로 1").build();
        Cargo cargo = Cargo.builder().itemName("전자제품").build();

        Order order = Order.builder()
                .id(201L)
                .status(OrderStatus.ASSIGNED)
                .pickup(pickup)
                .dropoff(dropoff)
                .cargo(cargo)
                .requiredVehicleType(VehicleType.TON_5)
                .bodyType(BodyType.WING)
                .fare(500000L)
                .pickupAt(LocalDateTime.now().plusDays(1))
                .assignedAt(LocalDateTime.now())
                .build();

        given(orderService.findOrdersAssignedBetween(any(), any())).willReturn(List.of(order));

        // when
        List<AdminDashboardOrderDto> result = adminDashboardService.getDashboardOrders("TODAY_ASSIGNED");

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).orderId()).isEqualTo(201L);
        assertThat(result.get(0).pickupRegion()).isEqualTo("서울 중구");
        assertThat(result.get(0).dropoffRegion()).isEqualTo("부산 연제구");
        assertThat(result.get(0).fare()).isEqualTo(500000L);
    }

    @Test
    @DisplayName("수락-취소-재수락되어도 오늘 배차 카드는 상태 이력 횟수가 아닌 assigned_at 기준 오더 수로 집계되어 목록과 일치한다")
    void todayAssigned_matches_modalList_evenIfReassigned() {
        // given: 오더 1건이 오늘 수락 -> 취소 -> 재수락되어 최종 배차된 상태
        Order reassignedOrder = Order.builder()
                .id(16L)
                .status(OrderStatus.ASSIGNED)
                .pickup(Location.builder()
                        .region("서울 중구")
                        .address("서울 중구 세종대로 1")
                        .build())
                .dropoff(Location.builder()
                        .region("부산 연제구")
                        .address("부산 연제구 중앙대로 1")
                        .build())
                .cargo(Cargo.builder().itemName("화물").build())
                .fare(300000L)
                .assignedAt(LocalDateTime.now())
                .build();

        // assigned_at 기준 오더 건수 1건 반환 (상태 전이 이력 2건이 아닌 고유 오더 수)
        given(orderService.countOrdersCreatedBetween(any(), any())).willReturn(1L);
        given(orderService.countOrdersAssignedBetween(any(), any())).willReturn(1L);
        given(orderService.countOrdersCompletedBetween(any(), any())).willReturn(0L);
        given(orderService.countUnassignedOrders(any())).willReturn(0L);
        given(orderService.countOrdersByStatus(OrderStatus.DISPUTED)).willReturn(0L);
        given(orderService.findUrgentUnassignedOrders(5)).willReturn(List.of());
        given(disputeQueryService.listDisputes(0)).willReturn(new PageImpl<>(List.of()));
        given(orderService.findOrdersAssignedBetween(any(), any())).willReturn(List.of(reassignedOrder));

        // when: 대시보드 요약 조회 및 모달 목록 조회
        AdminDashboardResponse dashboard = adminDashboardService.getDashboard();
        List<AdminDashboardOrderDto> modalOrders = adminDashboardService.getDashboardOrders("TODAY_ASSIGNED");

        // then: 카드 숫자와 목록 개수가 정확히 1건으로 일치
        assertThat(dashboard.summary().todayAssigned()).isEqualTo(1L);
        assertThat(modalOrders).hasSize(1);
        assertThat(modalOrders.get(0).orderId()).isEqualTo(16L);
        assertThat(dashboard.summary().todayAssigned()).isEqualTo((long) modalOrders.size());
    }
}
