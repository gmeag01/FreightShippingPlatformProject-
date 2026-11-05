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
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다"),
    ADMIN_CANNOT_SUSPEND_SELF(HttpStatus.BAD_REQUEST, "관리자 본인의 계정은 정지할 수 없습니다"),
    ACCOUNT_SUSPENDED(HttpStatus.FORBIDDEN, "이용 정지된 계정입니다. 관리자에게 문의하세요"),

    // order
    ORDER_NOT_FOUND(HttpStatus.NOT_FOUND, "오더를 찾을 수 없습니다"),
    INVALID_STATUS_TRANSITION(HttpStatus.CONFLICT, "현재 상태에서는 할 수 없는 작업입니다"),
    NOT_ORDER_OWNER(HttpStatus.FORBIDDEN, "본인의 오더가 아닙니다"),
    DRIVER_CANCEL_CUTOFF_PASSED(HttpStatus.CONFLICT, "상차 2시간 전부터는 직접 취소할 수 없습니다. 관리자에게 요청하세요"),

    // matching
    VEHICLE_REQUIRED(HttpStatus.BAD_REQUEST, "차량을 먼저 등록해야 의뢰를 수락할 수 있습니다"),
    VEHICLE_MISMATCH(HttpStatus.CONFLICT, "보유 차량과 오더 요구 조건이 다릅니다"),
    ORDER_CHANGED(HttpStatus.CONFLICT, "오더 내용이 변경되었습니다. 다시 확인해 주세요"),
    ORDER_ALREADY_ASSIGNED(HttpStatus.CONFLICT, "이미 배차된 의뢰입니다");

    private final HttpStatus status;
    private final String message;
}
