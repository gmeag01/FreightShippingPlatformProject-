package com.freight.fare.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DistanceCalculationServiceTest {

    @Test
    @DisplayName("카카오 API 키가 없을 때 하버사인 직선거리 x 1.3으로 대체하고 isEstimated=true를 반환한다")
    void calculateDistance_withoutApiKey_fallsBackToHaversine() {
        DistanceCalculationService service = new DistanceCalculationService("", new ObjectMapper());

        // 서울특별시청(37.5665, 126.9780) ~ 부산광역시청(35.1796, 129.0756)
        // 직선거리 약 325km * 1.3 ≈ 422.5km
        DistanceCalculationService.DistanceResult result =
                service.calculateDistance(37.5665, 126.9780, 35.1796, 129.0756);

        assertThat(result.isEstimated()).isTrue();
        assertThat(result.distanceKm()).isBetween(410.0, 435.0);
    }

    @Test
    @DisplayName("동일한 좌표 간 거리는 0.0km가 산출된다")
    void calculateDistance_sameCoordinates_returnsZero() {
        DistanceCalculationService service = new DistanceCalculationService(null, new ObjectMapper());

        DistanceCalculationService.DistanceResult result =
                service.calculateDistance(37.5665, 126.9780, 37.5665, 126.9780);

        assertThat(result.isEstimated()).isTrue();
        assertThat(result.distanceKm()).isEqualTo(0.0);
    }
}
