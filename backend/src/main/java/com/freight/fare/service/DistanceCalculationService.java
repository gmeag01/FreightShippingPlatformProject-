package com.freight.fare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** 출발지와 도착지 간의 운송 거리 계산 서비스. 카카오모빌리티 길찾기 API를 사용하며, 실패 시 하버사인 직선거리 x 1.3으로 대체한다. */
@Slf4j
@Service
public class DistanceCalculationService {

    private static final double EARTH_RADIUS_KM = 6371.0;
    private static final double ROAD_DISTANCE_MULTIPLIER = 1.3;
    private static final String KAKAO_DIRECTIONS_URL = "https://apis-navi.kakaomobility.com/v1/directions";

    private final String kakaoApiKey;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public DistanceCalculationService(
            @Value("${app.kakao.rest-api-key:}") String kakaoApiKey, ObjectMapper objectMapper) {
        this.kakaoApiKey = kakaoApiKey;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    /** 거리 계산 결과 레코드 */
    public record DistanceResult(double distanceKm, boolean isEstimated) {}

    /**
     * 출발지와 도착지 좌표 간의 주행 거리를 계산한다.
     *
     * @param originLat 출발지 위도
     * @param originLng 출발지 경도
     * @param destLat 도착지 위도
     * @param destLng 도착지 경도
     * @return 계산된 주행 거리(km)와 추정치 여부
     */
    public DistanceResult calculateDistance(double originLat, double originLng, double destLat, double destLng) {
        if (kakaoApiKey != null && !kakaoApiKey.isBlank() && !kakaoApiKey.startsWith("dummy-")) {
            try {
                double distanceKm = fetchKakaoDirectionsDistance(originLat, originLng, destLat, destLng);
                return new DistanceResult(distanceKm, false);
            } catch (Exception e) {
                log.warn("카카오모빌리티 길찾기 호출 실패로 직선거리 대체 로직을 적용합니다. 원인: {}", e.getMessage());
            }
        }

        double estimatedDistanceKm = calculateHaversineRoadDistance(originLat, originLng, destLat, destLng);
        return new DistanceResult(estimatedDistanceKm, true);
    }

    /** 카카오모빌리티 길찾기 API 호출 (경도 x, 위도 y) */
    private double fetchKakaoDirectionsDistance(double originLat, double originLng, double destLat, double destLng)
            throws Exception {
        String url = String.format(
                "%s?origin=%f,%f&destination=%f,%f&priority=RECOMMEND",
                KAKAO_DIRECTIONS_URL, originLng, originLat, destLng, destLat);

        String responseBody = restClient
                .get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + kakaoApiKey)
                .retrieve()
                .body(String.class);

        JsonNode root = objectMapper.readTree(responseBody);
        JsonNode routes = root.path("routes");
        if (routes.isArray() && !routes.isEmpty()) {
            JsonNode summary = routes.get(0).path("summary");
            if (summary.has("distance")) {
                int distanceMeters = summary.get("distance").asInt();
                return Math.round((distanceMeters / 1000.0) * 10.0) / 10.0;
            }
        }
        throw new IllegalStateException("카카오모빌리티 응답에 거리 정보가 없습니다");
    }

    /**
     * 하버사인 직선거리에 1.3을 곱해 도로 거리를 추정한다.
     *
     * @param lat1 출발지 위도
     * @param lon1 출발지 경도
     * @param lat2 도착지 위도
     * @param lon2 도착지 경도
     * @return 추정 도로 거리(km)
     */
    public double calculateHaversineRoadDistance(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                        * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLon / 2)
                        * Math.sin(dLon / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double straightDistance = EARTH_RADIUS_KM * c;
        double roadDistance = straightDistance * ROAD_DISTANCE_MULTIPLIER;

        return Math.round(roadDistance * 10.0) / 10.0;
    }
}
