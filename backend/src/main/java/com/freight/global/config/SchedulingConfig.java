package com.freight.global.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 수령 자동 확인 같은 주기 작업(@Scheduled)을 켠다. */
@Configuration
@EnableScheduling
public class SchedulingConfig {}
