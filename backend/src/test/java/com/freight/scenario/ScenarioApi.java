package com.freight.scenario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.freight.member.dto.LoginRequest;
import com.freight.member.dto.SignupRequest;
import com.freight.member.entity.Role;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/**
 * 시나리오 테스트에서 API를 부르는 도우미. 인증을 가짜로 넣지 않고 로그인으로 받은 JWT를 헤더에 담아,
 * 프론트가 부르는 것과 같은 경로(JWT 필터, 권한 검사, 입력 검증)를 지나게 한다.
 */
final class ScenarioApi {

    static final String PASSWORD = "scenario-password";

    private final MockMvc mvc;
    private final ObjectMapper objectMapper;

    ScenarioApi(MockMvc mvc, ObjectMapper objectMapper) {
        this.mvc = mvc;
        this.objectMapper = objectMapper;
    }

    /** 로그인까지 마친 회원. */
    record Account(Long id, String email, String token) {}

    /** API 응답의 HTTP 상태와 공통 응답 본문. */
    record ApiResult(int status, JsonNode body) {
        JsonNode data() {
            return body.path("data");
        }

        String errorCode() {
            return body.path("error").path("code").asText();
        }
    }

    /** 화주·차주 계정을 회원가입 API로 만들고 로그인한다. */
    Account signUpAndLogin(Role role) throws Exception {
        String email = role.name().toLowerCase() + "-" + UUID.randomUUID() + "@freight.test";
        SignupRequest request = new SignupRequest(email, PASSWORD, role.name() + " 회원", "010-5555-6666", role);
        ApiResult signup = post("/api/auth/signup", null, request);
        assertThat(signup.status()).as(signup.body().toString()).isEqualTo(200);
        return new Account(signup.data().path("id").asLong(), email, login(email));
    }

    /** 로그인 API로 토큰을 받는다. */
    String login(String email) throws Exception {
        ApiResult result = tryLogin(email);
        assertThat(result.status()).as(result.body().toString()).isEqualTo(200);
        return result.data().path("accessToken").asText();
    }

    /** 실패 응답을 확인할 수 있도록 로그인 결과를 그대로 돌려준다. */
    ApiResult tryLogin(String email) throws Exception {
        return post("/api/auth/login", null, new LoginRequest(email, PASSWORD));
    }

    ApiResult get(String path, String token) throws Exception {
        return send(HttpMethod.GET, path, token, null);
    }

    ApiResult post(String path, String token, Object body) throws Exception {
        return send(HttpMethod.POST, path, token, body);
    }

    ApiResult put(String path, String token, Object body) throws Exception {
        return send(HttpMethod.PUT, path, token, body);
    }

    ApiResult patch(String path, String token, Object body) throws Exception {
        return send(HttpMethod.PATCH, path, token, body);
    }

    private ApiResult send(HttpMethod method, String path, String token, Object body) throws Exception {
        MockHttpServletRequestBuilder builder = request(method, path);
        if (token != null) {
            builder.header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        }
        if (body != null) {
            builder.contentType(MediaType.APPLICATION_JSON).content(objectMapper.writeValueAsString(body));
        }
        MockHttpServletResponse response = mvc.perform(builder).andReturn().getResponse();
        String content = response.getContentAsString(StandardCharsets.UTF_8);
        JsonNode json = content.isBlank() ? objectMapper.createObjectNode() : objectMapper.readTree(content);
        return new ApiResult(response.getStatus(), json);
    }
}
