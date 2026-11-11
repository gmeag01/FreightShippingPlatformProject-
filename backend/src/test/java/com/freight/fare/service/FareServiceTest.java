package com.freight.fare.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

import com.freight.fare.dto.FareEstimate;
import com.freight.fare.dto.FareEstimateCommand;
import com.freight.fare.dto.FareRateResponse;
import com.freight.fare.dto.FareSurchargeResponse;
import com.freight.fare.dto.FareTableResponse;
import com.freight.fare.dto.UpdateFareRateItem;
import com.freight.fare.dto.UpdateFareSurchargeItem;
import com.freight.fare.entity.FareRate;
import com.freight.fare.entity.FareSurcharge;
import com.freight.fare.entity.SurchargeType;
import com.freight.fare.repository.FareRateRepository;
import com.freight.fare.repository.FareSurchargeRepository;
import com.freight.order.entity.LoadingMethod;
import com.freight.vehicle.entity.VehicleType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FareServiceTest {

    @Mock
    private FareRateRepository fareRateRepository;

    @Mock
    private FareSurchargeRepository fareSurchargeRepository;

    @Mock
    private DistanceCalculationService distanceCalculationService;

    @InjectMocks
    private FareService fareService;

    @BeforeEach
    void setUp() {
        // 단가표 목업 (5톤: 기본 80,000, km당 1,900)
        lenient()
                .when(fareRateRepository.findById(VehicleType.TON_5))
                .thenReturn(Optional.of(FareRate.builder()
                        .vehicleType(VehicleType.TON_5)
                        .baseFare(80_000L)
                        .perKmFare(1_900L)
                        .build()));

        // 할증률 목업
        lenient()
                .when(fareSurchargeRepository.findAll())
                .thenReturn(List.of(
                        FareSurcharge.builder()
                                .type(SurchargeType.NIGHT)
                                .rate(new BigDecimal("0.20"))
                                .build(),
                        FareSurcharge.builder()
                                .type(SurchargeType.WEEKEND)
                                .rate(new BigDecimal("0.10"))
                                .build(),
                        FareSurcharge.builder()
                                .type(SurchargeType.MANUAL_LOADING)
                                .rate(new BigDecimal("0.15"))
                                .build(),
                        FareSurcharge.builder()
                                .type(SurchargeType.URGENT)
                                .rate(new BigDecimal("0.30"))
                                .build()));
    }

    @Test
    @DisplayName("명세 계산 예시: 5톤, 120km, 주말 + 수작업인 경우 385,000원이 산출된다")
    void estimate_specExample_matchesExactly() {
        // 거리 120km 목업
        when(distanceCalculationService.calculateDistance(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new DistanceCalculationService.DistanceResult(120.0, false));

        // 2026-11-08은 일요일(주말), 14:00(주간), 수작업, 등록 후 48시간 뒤(일반)
        LocalDateTime requestedAt = LocalDateTime.of(2026, 11, 6, 14, 0);
        LocalDateTime pickupAt = LocalDateTime.of(2026, 11, 8, 14, 0);

        FareEstimateCommand command = new FareEstimateCommand(
                37.5, 127.0, 35.1, 129.0, 4000, VehicleType.TON_5, pickupAt, LoadingMethod.MANUAL, requestedAt);

        FareEstimate result = fareService.estimate(command);

        assertThat(result.distanceKm()).isEqualTo(120.0);
        assertThat(result.isDistanceEstimated()).isFalse();
        assertThat(result.baseFare()).isEqualTo(80_000L);
        assertThat(result.distanceFare()).isEqualTo(228_000L); // 120 * 1,900
        assertThat(result.surchargeAmount()).isEqualTo(77_000L); // 308,000 * 0.25 (주말 10% + 수작업 15%)
        assertThat(result.recommendedFare()).isEqualTo(385_000L); // 308,000 + 77,000 = 385,000
        assertThat(result.appliedSurcharges()).containsExactlyInAnyOrder("주말", "수작업");
    }

    @Test
    @DisplayName("중량별 최소 적재 가능 차종 추천 로직 확인")
    void determineRecommendedVehicleType_byWeight() {
        assertThat(fareService.determineRecommendedVehicleType(800)).isEqualTo(VehicleType.TON_1);
        assertThat(fareService.determineRecommendedVehicleType(1000)).isEqualTo(VehicleType.TON_1);
        assertThat(fareService.determineRecommendedVehicleType(1800)).isEqualTo(VehicleType.TON_2_5);
        assertThat(fareService.determineRecommendedVehicleType(2500)).isEqualTo(VehicleType.TON_2_5);
        assertThat(fareService.determineRecommendedVehicleType(3500)).isEqualTo(VehicleType.TON_5);
        assertThat(fareService.determineRecommendedVehicleType(10000)).isEqualTo(VehicleType.TON_11);
        assertThat(fareService.determineRecommendedVehicleType(22000)).isEqualTo(VehicleType.TON_25);
        assertThat(fareService.determineRecommendedVehicleType(35000)).isEqualTo(VehicleType.TON_25); // 25톤 초과 시 25톤
    }

    @Test
    @DisplayName("4종 할증 조건이 모두 겹칠 때 모든 할증이 정상 합산된다")
    void estimate_allSurchargesApplied() {
        when(distanceCalculationService.calculateDistance(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new DistanceCalculationService.DistanceResult(100.0, true));

        // 2026-11-08(일요일, 주말), 23:00(야간), 수작업, 등록 후 2시간 뒤(긴급)
        LocalDateTime requestedAt = LocalDateTime.of(2026, 11, 8, 21, 0);
        LocalDateTime pickupAt = LocalDateTime.of(2026, 11, 8, 23, 0);

        FareEstimateCommand command = new FareEstimateCommand(
                37.5, 127.0, 35.1, 129.0, 5000, VehicleType.TON_5, pickupAt, LoadingMethod.MANUAL, requestedAt);

        FareEstimate result = fareService.estimate(command);

        assertThat(result.isDistanceEstimated()).isTrue();
        assertThat(result.appliedSurcharges()).containsExactlyInAnyOrder("야간", "주말", "수작업", "긴급");
        // 총 할증률 = 0.20 + 0.10 + 0.15 + 0.30 = 0.75
        // 기본 80,000 + 거리(100 * 1900) 190,000 = 270,000
        // 할증액 = 270,000 * 0.75 = 202,500
        // 합계 = 472,500 -> 1,000원 반올림 시 473,000
        assertThat(result.surchargeAmount()).isEqualTo(202_500L);
        assertThat(result.recommendedFare()).isEqualTo(473_000L);
    }

    @Test
    @DisplayName("1,000원 단위 반올림 함수 검증")
    void roundToNearestThousand() {
        assertThat(fareService.roundToNearestThousand(123_400)).isEqualTo(123_000);
        assertThat(fareService.roundToNearestThousand(123_500)).isEqualTo(124_000);
        assertThat(fareService.roundToNearestThousand(123_600)).isEqualTo(124_000);
    }

    @Test
    @DisplayName("야간 할증(22~06시)만 해당하는 경우 야간 20% 할증만 적용된다")
    void estimate_onlyNightSurcharge() {
        when(distanceCalculationService.calculateDistance(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new DistanceCalculationService.DistanceResult(100.0, false));

        // 2026-11-06(금요일, 평일), 23:00(야간), 지게차(일반), 등록 후 48시간 뒤(일반)
        LocalDateTime requestedAt = LocalDateTime.of(2026, 11, 4, 23, 0);
        LocalDateTime pickupAt = LocalDateTime.of(2026, 11, 6, 23, 0);

        FareEstimate result = fareService.estimate(new FareEstimateCommand(
                37.5, 127.0, 35.1, 129.0, 5000, VehicleType.TON_5, pickupAt, LoadingMethod.FORKLIFT, requestedAt));

        assertThat(result.appliedSurcharges()).containsExactly("야간");
        assertThat(result.surchargeAmount()).isEqualTo(54_000L); // 270,000 * 0.20
        assertThat(result.recommendedFare()).isEqualTo(324_000L);
    }

    @Test
    @DisplayName("주말 할증(토·일)만 해당하는 경우 주말 10% 할증만 적용된다")
    void estimate_onlyWeekendSurcharge() {
        when(distanceCalculationService.calculateDistance(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new DistanceCalculationService.DistanceResult(100.0, false));

        // 2026-11-07(토요일, 주말), 14:00(주간), 지게차(일반), 등록 후 48시간 뒤(일반)
        LocalDateTime requestedAt = LocalDateTime.of(2026, 11, 5, 14, 0);
        LocalDateTime pickupAt = LocalDateTime.of(2026, 11, 7, 14, 0);

        FareEstimate result = fareService.estimate(new FareEstimateCommand(
                37.5, 127.0, 35.1, 129.0, 5000, VehicleType.TON_5, pickupAt, LoadingMethod.FORKLIFT, requestedAt));

        assertThat(result.appliedSurcharges()).containsExactly("주말");
        assertThat(result.surchargeAmount()).isEqualTo(27_000L); // 270,000 * 0.10
        assertThat(result.recommendedFare()).isEqualTo(297_000L);
    }

    @Test
    @DisplayName("수작업 상하차 할증만 해당하는 경우 수작업 15% 할증만 적용된다")
    void estimate_onlyManualLoadingSurcharge() {
        when(distanceCalculationService.calculateDistance(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new DistanceCalculationService.DistanceResult(100.0, false));

        // 2026-11-06(금요일, 평일), 14:00(주간), 수작업, 등록 후 48시간 뒤(일반)
        LocalDateTime requestedAt = LocalDateTime.of(2026, 11, 4, 14, 0);
        LocalDateTime pickupAt = LocalDateTime.of(2026, 11, 6, 14, 0);

        FareEstimate result = fareService.estimate(new FareEstimateCommand(
                37.5, 127.0, 35.1, 129.0, 5000, VehicleType.TON_5, pickupAt, LoadingMethod.MANUAL, requestedAt));

        assertThat(result.appliedSurcharges()).containsExactly("수작업");
        assertThat(result.surchargeAmount()).isEqualTo(40_500L); // 270,000 * 0.15
        assertThat(result.recommendedFare()).isEqualTo(311_000L); // 310,500 -> 반올림 311,000
    }

    @Test
    @DisplayName("긴급 할증(24시간 이내)만 해당하는 경우 긴급 30% 할증만 적용된다")
    void estimate_onlyUrgentSurcharge() {
        when(distanceCalculationService.calculateDistance(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new DistanceCalculationService.DistanceResult(100.0, false));

        // 2026-11-06(금요일, 평일), 14:00(주간), 지게차(일반), 등록 후 12시간 뒤(긴급)
        LocalDateTime requestedAt = LocalDateTime.of(2026, 11, 6, 2, 0);
        LocalDateTime pickupAt = LocalDateTime.of(2026, 11, 6, 14, 0);

        FareEstimate result = fareService.estimate(new FareEstimateCommand(
                37.5, 127.0, 35.1, 129.0, 5000, VehicleType.TON_5, pickupAt, LoadingMethod.FORKLIFT, requestedAt));

        assertThat(result.appliedSurcharges()).containsExactly("긴급");
        assertThat(result.surchargeAmount()).isEqualTo(81_000L); // 270,000 * 0.30
        assertThat(result.recommendedFare()).isEqualTo(351_000L);
    }

    @Test
    @DisplayName("등록 후 24시간 30분 뒤 상차는 24시간을 넘었으므로 긴급 할증을 붙이지 않는다")
    void estimate_pickupJustOver24Hours_isNotUrgent() {
        when(distanceCalculationService.calculateDistance(anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(new DistanceCalculationService.DistanceResult(100.0, false));

        // 2026-11-05(목) 13:30 등록, 2026-11-06(금) 14:00 상차: 평일 주간, 지게차
        LocalDateTime requestedAt = LocalDateTime.of(2026, 11, 5, 13, 30);
        LocalDateTime pickupAt = LocalDateTime.of(2026, 11, 6, 14, 0);

        FareEstimate result = fareService.estimate(new FareEstimateCommand(
                37.5, 127.0, 35.1, 129.0, 5000, VehicleType.TON_5, pickupAt, LoadingMethod.FORKLIFT, requestedAt));

        assertThat(result.appliedSurcharges()).isEmpty();
    }

    @Test
    @DisplayName("단가표 및 할증률 전체 조회 시 5개 차종과 4개 할증 정보를 모두 반환한다")
    void getFareTable_returnsAllRatesAndSurcharges() {
        when(fareRateRepository.findAll())
                .thenReturn(List.of(FareRate.builder()
                        .vehicleType(VehicleType.TON_1)
                        .baseFare(35_000L)
                        .perKmFare(1_100L)
                        .build()));

        FareTableResponse table = fareService.getFareTable();

        assertThat(table.rates()).hasSize(5);
        assertThat(table.rates().get(0).vehicleType()).isEqualTo(VehicleType.TON_1);
        assertThat(table.rates().get(0).baseFare()).isEqualTo(35_000L);
        assertThat(table.rates().get(0).maxLoadKg()).isEqualTo(1000);
        assertThat(table.surcharges()).hasSize(4);
    }

    @Test
    @DisplayName("단가표 수정 시 기본요금과 km당 단가가 갱신되고 최대 적재량은 고정된다")
    void updateFareRates_updatesBaseAndPerKmFare() {
        FareRate existingTon1 = FareRate.builder()
                .vehicleType(VehicleType.TON_1)
                .baseFare(30_000L)
                .perKmFare(1_000L)
                .build();
        when(fareRateRepository.findById(VehicleType.TON_1)).thenReturn(Optional.of(existingTon1));
        when(fareRateRepository.findAll()).thenReturn(List.of(existingTon1));

        List<FareRateResponse> updated =
                fareService.updateFareRates(List.of(new UpdateFareRateItem(VehicleType.TON_1, 40_000L, 1_200L)));

        assertThat(existingTon1.getBaseFare()).isEqualTo(40_000L);
        assertThat(existingTon1.getPerKmFare()).isEqualTo(1_200L);
        assertThat(updated.get(0).baseFare()).isEqualTo(40_000L);
        assertThat(updated.get(0).maxLoadKg()).isEqualTo(1000);
    }

    @Test
    @DisplayName("할증률 수정 시 각 할증 유형의 비율이 갱신된다")
    void updateFareSurcharges_updatesRates() {
        FareSurcharge existingNight = FareSurcharge.builder()
                .type(SurchargeType.NIGHT)
                .rate(new BigDecimal("0.20"))
                .build();
        when(fareSurchargeRepository.findById(SurchargeType.NIGHT)).thenReturn(Optional.of(existingNight));
        when(fareSurchargeRepository.findAll()).thenReturn(List.of(existingNight));

        List<FareSurchargeResponse> updated = fareService.updateFareSurcharges(
                List.of(new UpdateFareSurchargeItem(SurchargeType.NIGHT, new BigDecimal("0.25"))));

        assertThat(existingNight.getRate()).isEqualByComparingTo("0.25");
        assertThat(updated.get(0).rate()).isEqualByComparingTo("0.25");
    }
}
