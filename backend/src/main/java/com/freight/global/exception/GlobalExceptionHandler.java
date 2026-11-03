package com.freight.global.exception;

import com.freight.global.common.ApiResponse;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/** 컨트롤러에서 올라온 예외를 모두 공통 응답 형식(ApiResponse)과 알맞은 HTTP 상태로 바꾼다. */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** 업무 규칙 위반: 예외에 담긴 오류 코드의 상태와 메시지를 그대로 돌려준다. */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException exception) {
        return toResponse(exception.getErrorCode());
    }

    /** @Valid 검증 실패: 어떤 필드가 왜 틀렸는지 fieldErrors에 담아 400으로 돌려준다. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
            // 한 필드에 오류가 여러 개면 첫 번째 메시지만 보여 준다.
            fieldErrors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        ErrorCode code = ErrorCode.INVALID_INPUT;
        return ResponseEntity.status(code.getStatus()).body(ApiResponse.fail(code, fieldErrors));
    }

    /** JSON 형식 오류, 경로·쿼리 값의 타입 오류, 필수 쿼리 파라미터 누락은 모두 잘못된 입력으로 본다. */
    @ExceptionHandler({
        HttpMessageNotReadableException.class,
        MethodArgumentTypeMismatchException.class,
        MissingServletRequestParameterException.class
    })
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(Exception exception) {
        return toResponse(ErrorCode.INVALID_INPUT);
    }

    /** 설계 문서 5장: 낙관적 락(@Version) 충돌. 도메인에서 더 구체적인 코드로 바꾸지 않은 충돌은 여기서 409로 처리한다. */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLock(ObjectOptimisticLockingFailureException exception) {
        return toResponse(ErrorCode.CONCURRENT_MODIFICATION);
    }

    /** 메서드 보안(@PreAuthorize 등)에서 권한이 없을 때. */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException exception) {
        return toResponse(ErrorCode.FORBIDDEN);
    }

    /** 없는 주소로 요청했을 때. 이 처리가 없으면 아래 Exception 처리에 걸려 500이 된다. */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResource(NoResourceFoundException exception) {
        return toResponse(ErrorCode.NOT_FOUND);
    }

    /** 주소는 맞지만 GET/POST 같은 요청 방식이 틀렸을 때. */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(
            HttpRequestMethodNotSupportedException exception) {
        return toResponse(ErrorCode.METHOD_NOT_ALLOWED);
    }

    /** 예상하지 못한 모든 예외. 내부 내용은 응답에 내보내지 않고 서버 로그에만 스택트레이스를 남긴다. */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpected(Exception exception) {
        log.error("처리하지 못한 예외", exception);
        return toResponse(ErrorCode.INTERNAL_ERROR);
    }

    private ResponseEntity<ApiResponse<Void>> toResponse(ErrorCode code) {
        return ResponseEntity.status(code.getStatus()).body(ApiResponse.fail(code));
    }
}
