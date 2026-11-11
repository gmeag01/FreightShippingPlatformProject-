package com.freight.fare.service;

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
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 추천 차종 선정, 거리 계산 및 4종 할증 기반 추천 운임 계산 서비스. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FareService {

    // 설계 문서 4장: 상차 희망 시각이 등록 시각으로부터 24시간 이내면 긴급 할증을 붙인다.
    private static final Duration URGENT_WINDOW = Duration.ofHours(24);

    private final FareRateRepository fareRateRepository;
    private final FareSurchargeRepository fareSurchargeRepository;
    private final DistanceCalculationService distanceCalculationService;

    /**
     * 화물 스펙과 상차 조건에 따른 추천 차종, 거리, 적용 할증 목록 및 추천 운임을 계산한다.
     *
     * @param command 운임 견적 계산 요청 정보
     * @return 추천 운임 견적 상세 결과
     */
    public FareEstimate estimate(FareEstimateCommand command) {
        // 1. 추천 차종 선정 (화물 중량을 담을 수 있는 가장 작은 차종)
        VehicleType recommendedVehicleType = determineRecommendedVehicleType(command.weightKg());
        VehicleType targetVehicleType = command.vehicleType() != null ? command.vehicleType() : recommendedVehicleType;

        // 2. 거리 계산 (카카오모빌리티 길찾기 또는 하버사인 x 1.3 폴백)
        DistanceCalculationService.DistanceResult distanceResult = distanceCalculationService.calculateDistance(
                command.pickupLat(), command.pickupLng(), command.dropoffLat(), command.dropoffLng());
        double distanceKm = distanceResult.distanceKm();
        boolean isDistanceEstimated = distanceResult.isEstimated();

        // 3. 단가표 조회 (없을 시 설계 문서 기본값 적용)
        FareRate fareRate =
                fareRateRepository.findById(targetVehicleType).orElseGet(() -> getDefaultFareRate(targetVehicleType));
        long baseFare = fareRate.getBaseFare();
        long distanceFare = Math.round(distanceKm * fareRate.getPerKmFare());
        long rawFare = baseFare + distanceFare;

        // 4. 할증률 조회 및 판정
        Map<SurchargeType, BigDecimal> surchargeRates = getSurchargeRates();
        List<String> appliedSurcharges = new ArrayList<>();
        BigDecimal totalSurchargeRate = BigDecimal.ZERO;

        // (1) 야간 할증 (상차 22시 ~ 익일 06시)
        if (isNight(command.pickupAt())) {
            BigDecimal rate = surchargeRates.getOrDefault(SurchargeType.NIGHT, new BigDecimal("0.20"));
            totalSurchargeRate = totalSurchargeRate.add(rate);
            appliedSurcharges.add(SurchargeType.NIGHT.getLabel());
        }

        // (2) 주말 할증 (상차일이 토요일 또는 일요일)
        if (isWeekend(command.pickupAt())) {
            BigDecimal rate = surchargeRates.getOrDefault(SurchargeType.WEEKEND, new BigDecimal("0.10"));
            totalSurchargeRate = totalSurchargeRate.add(rate);
            appliedSurcharges.add(SurchargeType.WEEKEND.getLabel());
        }

        // (3) 수작업 상하차 할증 (loadingMethod == MANUAL)
        if (command.loadingMethod() == LoadingMethod.MANUAL) {
            BigDecimal rate = surchargeRates.getOrDefault(SurchargeType.MANUAL_LOADING, new BigDecimal("0.15"));
            totalSurchargeRate = totalSurchargeRate.add(rate);
            appliedSurcharges.add(SurchargeType.MANUAL_LOADING.getLabel());
        }

        // (4) 긴급 할증 (등록 시각으로부터 상차 시각이 24시간 이내)
        if (isUrgent(command.pickupAt(), command.requestedAt())) {
            BigDecimal rate = surchargeRates.getOrDefault(SurchargeType.URGENT, new BigDecimal("0.30"));
            totalSurchargeRate = totalSurchargeRate.add(rate);
            appliedSurcharges.add(SurchargeType.URGENT.getLabel());
        }

        // 5. 할증 금액 계산 및 1,000원 단위 반올림
        long surchargeAmount = Math.round(rawFare * totalSurchargeRate.doubleValue());
        long totalBeforeRounding = rawFare + surchargeAmount;
        long recommendedFare = roundToNearestThousand(totalBeforeRounding);

        return new FareEstimate(
                distanceKm,
                isDistanceEstimated,
                recommendedVehicleType,
                baseFare,
                distanceFare,
                surchargeAmount,
                recommendedFare,
                appliedSurcharges);
    }

    /**
     * 중량을 적재할 수 있는 가장 작은 차종을 추천한다. 25톤 초과 시 25톤으로 두고 경고 표시는 화면에 위임한다.
     *
     * @param weightKg 화물 중량(kg)
     * @return 추천 차종
     */
    public VehicleType determineRecommendedVehicleType(int weightKg) {
        for (VehicleType type : VehicleType.values()) {
            if (type.getMaxLoadKg() >= weightKg) {
                return type;
            }
        }
        return VehicleType.TON_25;
    }

    /**
     * 금액을 1,000원 단위로 반올림한다.
     *
     * @param amount 반올림할 금액
     * @return 1,000원 단위로 반올림한 금액
     */
    public long roundToNearestThousand(long amount) {
        return Math.round(amount / 1000.0) * 1000L;
    }

    /**
     * 단가표와 할증률 전체 목록을 조회한다. DB에 아직 없는 항목은 설계 문서 기본값으로 채워 반환한다.
     *
     * @return 차종별 단가표와 할증률 목록
     */
    public FareTableResponse getFareTable() {
        return new FareTableResponse(getFareRates(), getFareSurcharges());
    }

    /**
     * 차종별 단가(기본요금, km당 단가)를 수정한다. 최대 적재량은 차종에 고정된 값이다.
     *
     * @param items 수정할 차종별 단가 항목 목록
     * @return 수정 후 전체 차종 단가표 목록
     */
    @Transactional
    public List<FareRateResponse> updateFareRates(List<UpdateFareRateItem> items) {
        for (UpdateFareRateItem item : items) {
            FareRate fareRate = fareRateRepository.findById(item.vehicleType()).orElse(null);
            if (fareRate != null) {
                fareRate.update(item.baseFare(), item.perKmFare());
            } else {
                fareRateRepository.save(FareRate.builder()
                        .vehicleType(item.vehicleType())
                        .baseFare(item.baseFare())
                        .perKmFare(item.perKmFare())
                        .build());
            }
        }
        return getFareRates();
    }

    /**
     * 할증률을 수정한다.
     *
     * @param items 수정할 할증률 항목 목록
     * @return 수정 후 전체 할증률 목록
     */
    @Transactional
    public List<FareSurchargeResponse> updateFareSurcharges(List<UpdateFareSurchargeItem> items) {
        for (UpdateFareSurchargeItem item : items) {
            FareSurcharge surcharge =
                    fareSurchargeRepository.findById(item.type()).orElse(null);
            if (surcharge != null) {
                surcharge.update(item.rate());
            } else {
                fareSurchargeRepository.save(FareSurcharge.builder()
                        .type(item.type())
                        .rate(item.rate())
                        .build());
            }
        }
        return getFareSurcharges();
    }

    private List<FareRateResponse> getFareRates() {
        Map<VehicleType, FareRate> savedMap = fareRateRepository.findAll().stream()
                .collect(Collectors.toMap(FareRate::getVehicleType, Function.identity(), (a, b) -> a));

        return Arrays.stream(VehicleType.values())
                .map(type -> savedMap.getOrDefault(type, getDefaultFareRate(type)))
                .map(FareRateResponse::from)
                .toList();
    }

    private List<FareSurchargeResponse> getFareSurcharges() {
        Map<SurchargeType, FareSurcharge> savedMap = fareSurchargeRepository.findAll().stream()
                .collect(Collectors.toMap(FareSurcharge::getType, Function.identity(), (a, b) -> a));

        return Arrays.stream(SurchargeType.values())
                .map(type -> savedMap.getOrDefault(type, getDefaultFareSurcharge(type)))
                .map(FareSurchargeResponse::from)
                .toList();
    }

    private FareSurcharge getDefaultFareSurcharge(SurchargeType type) {
        BigDecimal defaultRate =
                switch (type) {
                    case NIGHT -> new BigDecimal("0.20");
                    case WEEKEND -> new BigDecimal("0.10");
                    case MANUAL_LOADING -> new BigDecimal("0.15");
                    case URGENT -> new BigDecimal("0.30");
                };
        return FareSurcharge.builder().type(type).rate(defaultRate).build();
    }

    private boolean isNight(LocalDateTime pickupAt) {
        if (pickupAt == null) return false;
        int hour = pickupAt.getHour();
        return hour >= 22 || hour < 6;
    }

    private boolean isWeekend(LocalDateTime pickupAt) {
        if (pickupAt == null) return false;
        DayOfWeek dow = pickupAt.getDayOfWeek();
        return dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY;
    }

    private boolean isUrgent(LocalDateTime pickupAt, LocalDateTime requestedAt) {
        if (pickupAt == null) return false;
        LocalDateTime baseTime = requestedAt != null ? requestedAt : LocalDateTime.now();
        Duration diff = Duration.between(baseTime, pickupAt);
        // toHours()는 분을 버려 24시간 59분도 24로 보므로 Duration끼리 비교한다.
        return !diff.isNegative() && diff.compareTo(URGENT_WINDOW) <= 0;
    }

    private Map<SurchargeType, BigDecimal> getSurchargeRates() {
        return fareSurchargeRepository.findAll().stream()
                .collect(Collectors.toMap(
                        FareSurcharge::getType, FareSurcharge::getRate, (existing, replacement) -> existing));
    }

    private FareRate getDefaultFareRate(VehicleType vehicleType) {
        return switch (vehicleType) {
            case TON_1 ->
                FareRate.builder()
                        .vehicleType(VehicleType.TON_1)
                        .baseFare(30000)
                        .perKmFare(1000)
                        .build();
            case TON_2_5 ->
                FareRate.builder()
                        .vehicleType(VehicleType.TON_2_5)
                        .baseFare(50000)
                        .perKmFare(1400)
                        .build();
            case TON_5 ->
                FareRate.builder()
                        .vehicleType(VehicleType.TON_5)
                        .baseFare(80000)
                        .perKmFare(1900)
                        .build();
            case TON_11 ->
                FareRate.builder()
                        .vehicleType(VehicleType.TON_11)
                        .baseFare(130000)
                        .perKmFare(2600)
                        .build();
            case TON_25 ->
                FareRate.builder()
                        .vehicleType(VehicleType.TON_25)
                        .baseFare(200000)
                        .perKmFare(3500)
                        .build();
        };
    }
}
