package com.freight.global.exception;

import java.util.Map;
import lombok.Getter;

/** 업무 규칙 위반을 알리는 예외. 서비스와 엔티티는 이 예외에 ErrorCode를 담아 던지고, 응답 변환은 GlobalExceptionHandler가 맡는다. */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Map<String, String> details;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.details = null;
    }

    public BusinessException(ErrorCode errorCode, Map<String, String> details) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.details = details != null ? Map.copyOf(details) : null;
    }
}
