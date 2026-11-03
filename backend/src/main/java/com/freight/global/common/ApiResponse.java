package com.freight.global.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.freight.global.exception.ErrorCode;
import java.util.Map;

/**
 * 모든 API가 돌려주는 공통 응답 형식. 성공이면 data에 결과를, 실패면 error에 오류 코드와 메시지를 담는다.
 * data는 null이어도 항상 내보내고, error는 실패일 때만 내보낸다(설계 문서 7장 '공통 응답 형식').
 */
public record ApiResponse<T>(boolean success, T data, @JsonInclude(JsonInclude.Include.NON_NULL) ErrorBody error) {

    /** 성공 응답을 만든다. */
    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    /** 오류 코드 하나로 실패 응답을 만든다. */
    public static ApiResponse<Void> fail(ErrorCode code) {
        return new ApiResponse<>(false, null, new ErrorBody(code.name(), code.getMessage(), null));
    }

    /** 입력 검증 실패처럼 필드별 메시지가 있는 실패 응답을 만든다. */
    public static ApiResponse<Void> fail(ErrorCode code, Map<String, String> fieldErrors) {
        return new ApiResponse<>(false, null, new ErrorBody(code.name(), code.getMessage(), fieldErrors));
    }

    /** 실패 응답의 오류 내용. fieldErrors는 입력 검증 실패일 때만 있고, 없으면 JSON에서 빠진다. */
    public record ErrorBody(
            String code, String message, @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, String> fieldErrors) {}
}
