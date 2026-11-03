package com.freight.global.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * 서비스 전체의 오류 코드 목록. 각 도메인 담당자는 자기 도메인 코드를 아래 구역에 추가한다.
 * 응답 JSON의 error.code에는 상수 이름이, error.message에는 message가 나간다.
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    // 공통
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없습니다"),
    NOT_FOUND(HttpStatus.NOT_FOUND, "대상을 찾을 수 없습니다"),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "지원하지 않는 요청 방식입니다"),
    CONCURRENT_MODIFICATION(HttpStatus.CONFLICT, "다른 요청과 충돌했습니다. 다시 시도해 주세요"),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 오류가 발생했습니다"),

    // member
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "이미 가입된 이메일입니다"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않습니다"),

    // vehicle
    VEHICLE_NOT_REGISTERED(HttpStatus.BAD_REQUEST, "차량을 먼저 등록해 주세요"),

    // order
    ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "오더를 찾을 수 없습니다"),
    INVALID_STATUS_TRANSITION(HttpStatus.CONFLICT, "현재 상태에서는 할 수 없는 작업입니다"),
    NOT_ORDER_OWNER(HttpStatus.FORBIDDEN, "본인의 오더가 아닙니다"),
    DRIVER_CANCEL_CUTOFF_PASSED(HttpStatus.CONFLICT, "상차 2시간 전부터는 직접 취소할 수 없습니다. 관리자에게 요청하세요"),

    // matching
    ORDER_ALREADY_ASSIGNED(HttpStatus.CONFLICT, "이미 다른 차주가 수락한 오더입니다"),
    VEHICLE_TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "차량 톤수가 오더 요구 조건보다 작습니다"),
    OVERWEIGHT_FOR_VEHICLE(HttpStatus.BAD_REQUEST, "화물 중량이 차량 적재 한도를 초과합니다"),
    BODY_TYPE_MISMATCH(HttpStatus.BAD_REQUEST, "차체 형태가 오더 요구 조건과 일치하지 않습니다");

    private final HttpStatus status;
    private final String message;
}
