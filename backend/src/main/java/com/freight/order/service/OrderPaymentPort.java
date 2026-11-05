package com.freight.order.service;

/**
 * 오더 등록·수정·취소가 결제 도메인에 요청하는 계약. 구현체는 OrderPaymentAdapter이고 PaymentService에 위임한다.
 * 같은 트랜잭션에 참여하고 실패 시 예외를 던져 오더·이력이 함께 롤백되도록 해야 한다.
 */
public interface OrderPaymentPort {
    /**
     * 등록한 오더의 운임을 보관한다.
     * @param orderId 등록한 오더 ID
     * @param amount 화주가 입력한 운임
     * @throws RuntimeException 결제 보관 실패 시
     */
    void hold(Long orderId, long amount);
    /**
     * 변경한 운임의 차액을 결제 또는 환불한다.
     * @param orderId 수정한 오더 ID
     * @param newAmount 수정 후 운임 전체 금액
     * @throws RuntimeException 차액 처리 실패 시
     */
    void adjust(Long orderId, long newAmount);
    /**
     * 취소한 오더의 보관 운임을 환불한다.
     * @param orderId 취소한 오더 ID
     * @throws RuntimeException 환불 실패 시
     */
    void refund(Long orderId);
}
