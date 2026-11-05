package com.freight.fare.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.fare.dto.Coordinates;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

/** 주소를 위도/경도 좌표로 변환하는 카카오 로컬 지오코딩 서비스. */
@Slf4j
@Service
public class GeocodingService {

    private static final String KAKAO_GEOCODE_URL = "https://dapi.kakao.com/v2/local/search/address.json";
    private static final Coordinates DEFAULT_COORDINATES = new Coordinates(37.5665, 126.9780); // 서울시청

    private final String kakaoApiKey;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeocodingService(@Value("${app.kakao.rest-api-key:}") String kakaoApiKey, ObjectMapper objectMapper) {
        this.kakaoApiKey = kakaoApiKey;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder().build();
    }

    /**
     * 주소 문자열을 위경도 좌표로 변환한다.
     *
     * @param address 도로명 또는 지번 주소
     * @return 위도, 경도 좌표 DTO
     */
    public Coordinates geocode(String address) {
        if (address == null || address.isBlank()) {
            return DEFAULT_COORDINATES;
        }

        if (kakaoApiKey != null && !kakaoApiKey.isBlank() && !kakaoApiKey.startsWith("dummy-")) {
            try {
                String responseBody = restClient
                        .get()
                        .uri(KAKAO_GEOCODE_URL + "?query=" + address)
                        .header(HttpHeaders.AUTHORIZATION, "KakaoAK " + kakaoApiKey)
                        .retrieve()
                        .body(String.class);

                JsonNode root = objectMapper.readTree(responseBody);
                JsonNode documents = root.path("documents");
                if (documents.isArray() && !documents.isEmpty()) {
                    JsonNode first = documents.get(0);
                    double lat = Double.parseDouble(first.get("y").asText());
                    double lng = Double.parseDouble(first.get("x").asText());
                    return new Coordinates(lat, lng);
                }
            } catch (Exception e) {
                log.warn("카카오 지오코딩 실패: {}. 기본 좌표를 사용합니다.", e.getMessage());
            }
        }

        return DEFAULT_COORDINATES;
    }
}
