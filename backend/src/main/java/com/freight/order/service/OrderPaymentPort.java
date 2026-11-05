package com.freight.order.service;

/**
 * E 담당 결제 서비스와 연결할 C 측 계약. 구현체는 PaymentService의 hold/adjust/refund에 위임한다.
 * 구현체가 없는 동안 테스트만 Mockito로 대체하고 실행 환경의 결제 필요 작업은 명시적으로 거절한다.
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
