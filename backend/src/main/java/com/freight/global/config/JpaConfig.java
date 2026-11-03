package com.freight.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing을 켜서 BaseEntity의 생성·수정 시각이 자동으로 채워지게 한다.
 * FreightApplication에 직접 달면 @WebMvcTest가 JPA 없이 뜨지 못하므로 설정 클래스로 분리한다.
 */
@Configuration
@EnableJpaAuditing
public class JpaConfig {}
