package com.freight.matching.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.matching.dto.AcceptOrderRequest;
import com.freight.matching.dto.OpenOrderDetailResponse;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.order.entity.Order;
import com.freight.order.repository.OrderRepository;
import com.freight.support.Fixtures;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.repository.VehicleRepository;
import java.lang.reflect.RecordComponent;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

// 수락 전 의뢰 상세 조회(GET /api/orders/open/{id})의 업무 규칙을 확인한다.
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class MatchingDetailServiceTest {

    // 로드맵: 수락 전에는 상세주소·연락처·좌표를 보내지 않는다.
    private static final List<String> FORBIDDEN_FIELD_NAMES = List.of(
            "address",
            "detailAddress",
            "pickupAddress",
            "dropoffAddress",
            "contactName",
            "contactPhone",
            "latitude",
            "longitude",
            "pickupLatitude",
            "pickupLongitude",
            "dropoffLatitude",
            "dropoffLongitude");

    @Autowired
    private MatchingService matchingService;

    @Autowired
    private MemberRepository memberRepository;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private OrderRepository orderRepository;

    private Member shipper;
    private Member driver;

    @BeforeEach
    void setUp() {
        shipper = memberRepository.save(Fixtures.shipper("detail-shipper@freight.test"));
        driver = memberRepository.save(Fixtures.driver("detail-driver@freight.test"));
        vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_5));
    }

    @Test
    void getOpenOrderDetail_forRegisteredOrder_returnsRegionAndCargoInfo() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusDays(1)));

        OpenOrderDetailResponse detail = matchingService.getOpenOrderDetail(order.getId());

        assertThat(detail.id()).isEqualTo(order.getId());
        assertThat(detail.version()).isEqualTo(order.getVersion());
        assertThat(detail.pickupRegion()).isEqualTo("서울 강남구");
        assertThat(detail.dropoffRegion()).isEqualTo("부산 해운대구");
        assertThat(detail.itemName()).isEqualTo("전자부품 파렛트");
        assertThat(detail.weightKg()).isEqualTo(3000);
        assertThat(detail.quantity()).isEqualTo(2);
        assertThat(detail.requiredVehicleType()).isEqualTo(VehicleType.TON_5);
        assertThat(detail.memo()).isEqualTo("파손 주의");
        assertThat(detail.fare()).isEqualTo(350_000L);
        assertThat(detail.recommendedFare()).isEqualTo(340_000L);
        assertThat(detail.fragile()).isTrue();
    }

    @Test
    void openOrderDetailResponse_hasNoAddressContactOrCoordinateFields() {
        List<String> fieldNames = Arrays.stream(OpenOrderDetailResponse.class.getRecordComponents())
                .map(RecordComponent::getName)
                .toList();

        assertThat(fieldNames).doesNotContainAnyElementsOf(FORBIDDEN_FIELD_NAMES);
    }

    @Test
    void getOpenOrderDetail_whenAlreadyAssigned_throwsOrderAlreadyAssigned() {
        Order order = orderRepository.save(Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusDays(1)));
        matchingService.acceptOrder(order.getId(), driver.getId(), new AcceptOrderRequest(order.getVersion(), false));

        assertThatThrownBy(() -> matchingService.getOpenOrderDetail(order.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_ALREADY_ASSIGNED);
    }

    @Test
    void getOpenOrderDetail_whenCancelled_throwsOrderAlreadyAssigned() {
        Order order = Fixtures.registeredOrder(
                shipper, VehicleType.TON_5, 3000, LocalDateTime.now().plusDays(1));
        order.cancel(shipper);
        Order saved = orderRepository.save(order);

        assertThatThrownBy(() -> matchingService.getOpenOrderDetail(saved.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_ALREADY_ASSIGNED);
    }

    @Test
    void getOpenOrderDetail_whenOrderMissing_throwsOrderNotFound() {
        assertThatThrownBy(() -> matchingService.getOpenOrderDetail(999_999L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.ORDER_NOT_FOUND);
    }
}
