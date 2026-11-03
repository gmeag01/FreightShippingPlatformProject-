package com.freight.global.exception;

import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.freight.global.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 전역 예외 처리가 모든 오류를 공통 응답 형식(ApiResponse)과 알맞은 HTTP 상태로 바꾸는지 확인한다. */
@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)
// 테스트 클래스 안의 클래스는 컴포넌트 스캔에서 빠지므로(TestTypeExcludeFilter) TestController를 직접 등록한다.
@Import({GlobalExceptionHandler.class, GlobalExceptionHandlerTest.TestController.class})
@AutoConfigureMockMvc(addFilters = false)
class GlobalExceptionHandlerTest {

    @Autowired
    MockMvc mvc;

    @Test
    void businessException_returnsCodeAndStatus() throws Exception {
        mvc.perform(get("/test/business"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.error.code").value("ORDER_NOT_FOUND"))
                .andExpect(jsonPath("$.error.message").value("오더를 찾을 수 없습니다"));
    }

    @Test
    void invalidBody_returns400WithFieldErrors() throws Exception {
        mvc.perform(post("/test/valid").contentType(APPLICATION_JSON).content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
                .andExpect(jsonPath("$.error.fieldErrors.name").exists());
    }

    @Test
    void malformedJson_returns400() throws Exception {
        mvc.perform(post("/test/valid").contentType(APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    }

    @Test
    void wrongPathVariableType_returns400() throws Exception {
        mvc.perform(get("/test/number/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
    }

    @Test
    void optimisticLockConflict_returns409() throws Exception {
        mvc.perform(get("/test/conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("CONCURRENT_MODIFICATION"));
    }

    @Test
    void unknownPath_returns404InsteadOf500() throws Exception {
        mvc.perform(get("/test/no-such-path"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.code").value("NOT_FOUND"));
    }

    @Test
    void unexpectedException_returns500WithoutStackTrace() throws Exception {
        mvc.perform(get("/test/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.error.message").value("서버 오류가 발생했습니다"));
    }

    @Test
    void ok_wrapsData() throws Exception {
        mvc.perform(get("/test/ok"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("hi"))
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    /** 이 테스트에서만 쓰는 컨트롤러. 각 경로가 처리해야 할 예외를 하나씩 던진다. */
    @RestController
    static class TestController {

        record Body(@NotBlank String name) {}

        @GetMapping("/test/business")
        ApiResponse<Void> business() {
            throw new BusinessException(ErrorCode.ORDER_NOT_FOUND);
        }

        @PostMapping("/test/valid")
        ApiResponse<String> valid(@Valid @RequestBody Body body) {
            return ApiResponse.ok(body.name());
        }

        @GetMapping("/test/number/{id}")
        ApiResponse<Long> number(@PathVariable Long id) {
            return ApiResponse.ok(id);
        }

        @GetMapping("/test/conflict")
        ApiResponse<Void> conflict() {
            throw new ObjectOptimisticLockingFailureException(Object.class, 1L);
        }

        @GetMapping("/test/boom")
        ApiResponse<Void> boom() {
            throw new IllegalStateException("내부 오류 내용은 응답에 나가면 안 된다");
        }

        @GetMapping("/test/ok")
        ApiResponse<String> ok() {
            return ApiResponse.ok("hi");
        }
    }
}
