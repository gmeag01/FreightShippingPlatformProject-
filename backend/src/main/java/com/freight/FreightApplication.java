package com.freight;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/** 화물운송플랫폼 백엔드 시작점. com.freight 아래의 모든 도메인을 읽어 들인다. */
@EnableScheduling
@SpringBootApplication
public class FreightApplication {

    public static void main(String[] args) {
        SpringApplication.run(FreightApplication.class, args);
    }
}
