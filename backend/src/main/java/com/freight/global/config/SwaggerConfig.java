package com.freight.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Swagger UI(/swagger-ui.html) 설정. 오른쪽 위 Authorize 버튼에 로그인 토큰을 넣으면 모든 요청에 Bearer 토큰이 붙는다. */
@Configuration
public class SwaggerConfig {

    private static final String BEARER_SCHEME_NAME = "BearerAuth";

    /** API 문서 제목과 JWT Bearer 인증 방식을 등록한다. */
    @Bean
    public OpenAPI freightOpenApi() {
        SecurityScheme bearerScheme = new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("JWT 토큰 값(ey...)을 입력하세요. 'Bearer ' 접두사는 Swagger가 자동으로 붙입니다.");
        return new OpenAPI()
                .info(new Info().title("화물운송플랫폼 API").version("v1"))
                .components(new Components().addSecuritySchemes(BEARER_SCHEME_NAME, bearerScheme))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME_NAME));
    }
}
