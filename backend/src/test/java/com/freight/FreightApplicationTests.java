package com.freight;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/** test 프로필(H2 메모리 DB)로 스프링 설정 전체가 오류 없이 뜨는지 확인한다. */
@SpringBootTest
@ActiveProfiles("test")
class FreightApplicationTests {

    @Test
    void applicationStartsWithTestProfile() {}
}
