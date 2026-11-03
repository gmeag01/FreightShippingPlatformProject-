package com.freight.global.common;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.freight.global.exception.ErrorCode;
import java.util.Map;

public record ApiResponse<T>(boolean success, T data, @JsonInclude(JsonInclude.Include.NON_NULL) ErrorBody error) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data, null);
    }

    public static ApiResponse<Void> fail(ErrorCode code) {
        return new ApiResponse<>(false, null, new ErrorBody(code.name(), code.getMessage(), null));
    }

    public static ApiResponse<Void> fail(ErrorCode code, Map<String, String> fieldErrors) {
        return new ApiResponse<>(false, null, new ErrorBody(code.name(), code.getMessage(), fieldErrors));
    }

    public static ApiResponse<Void> fail(ErrorCode code, String message, Map<String, String> fieldErrors) {
        return new ApiResponse<>(false, null, new ErrorBody(code.name(), message, fieldErrors));
    }

    public record ErrorBody(
            String code, String message, @JsonInclude(JsonInclude.Include.NON_NULL) Map<String, String> fieldErrors) {}
}
