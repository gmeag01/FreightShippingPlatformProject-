package com.freight.payment.service;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.order.entity.Order;
import com.freight.order.service.OrderService;
import com.freight.payment.dto.PayoutResponse;
import com.freight.payment.entity.Payment;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.entity.PaymentTransaction;
import com.freight.payment.entity.PaymentTransactionType;
import com.freight.payment.repository.PaymentRepository;
import com.freight.payment.repository.PaymentTransactionRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 오더 운임의 에스크로 결제(보관, 차액, 지급, 환불)를 처리하고 거래를 건별로 남기는 서비스.
 * 설계 문서 3장: 오더 변경과 한 트랜잭션에서 처리되도록 호출하는 쪽의 트랜잭션에 참여한다.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PaymentService {

    private static final int DEFAULT_PAGE_SIZE = 20;

    private final PaymentRepository paymentRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final PaymentGateway paymentGateway;
    private final OrderService orderService;

    /**
     * 오더 등록 시 운임을 결제해 플랫폼이 보관한다.
     *
     * @param orderId 등록한 오더 ID
     * @param amount 보관할 운임
     * @throws BusinessException 금액이 0 이하(INVALID_INPUT), 오더 없음(ORDER_NOT_FOUND)
     */
    public void hold(Long orderId, long amount) {
        requirePositive(amount);
        Order order = orderService.getOrder(orderId);
        paymentGateway.charge(orderId, amount);
        Payment payment = paymentRepository.save(
                Payment.builder().order(order).amount(amount).build());
        recordTransaction(payment, PaymentTransactionType.CHARGE, amount);
    }

    /**
     * 운임 수정의 차액을 처리한다. 오르면 추가 결제하고 내리면 부분 환불하며, 같으면 아무 일도 하지 않는다.
     *
     * @param orderId 수정한 오더 ID
     * @param newAmount 수정 후 운임 전체 금액
     * @throws BusinessException 금액이 0 이하(INVALID_INPUT), 결제 없음(PAYMENT_NOT_FOUND),
     *         이미 끝난 결제(PAYMENT_ALREADY_SETTLED)
     */
    public void adjust(Long orderId, long newAmount) {
        requirePositive(newAmount);
        Payment payment = getPayment(orderId);
        long difference = newAmount - payment.getAmount();
        if (difference == 0) {
            return;
        }
        payment.changeAmount(newAmount);
        if (difference > 0) {
            paymentGateway.charge(orderId, difference);
            recordTransaction(payment, PaymentTransactionType.ADDITIONAL_CHARGE, difference);
            return;
        }
        paymentGateway.refund(orderId, -difference);
        recordTransaction(payment, PaymentTransactionType.PARTIAL_REFUND, -difference);
    }

    /**
     * 운송이 완료된 오더의 보관 운임 전체를 차주에게 지급한다.
     *
     * @param orderId 완료된 오더 ID
     * @throws BusinessException 결제 없음(PAYMENT_NOT_FOUND), 이미 끝난 결제(PAYMENT_ALREADY_SETTLED)
     */
    public void release(Long orderId) {
        Payment payment = getPayment(orderId);
        payment.release();
        paymentGateway.payout(orderId, payment.getAmount());
        recordTransaction(payment, PaymentTransactionType.PAYOUT, payment.getAmount());
    }

    /**
     * 취소된 오더의 보관 운임 전체를 화주에게 환불한다.
     *
     * @param orderId 취소된 오더 ID
     * @throws BusinessException 결제 없음(PAYMENT_NOT_FOUND), 이미 끝난 결제(PAYMENT_ALREADY_SETTLED)
     */
    public void refund(Long orderId) {
        Payment payment = getPayment(orderId);
        payment.refund();
        paymentGateway.refund(orderId, payment.getAmount());
        recordTransaction(payment, PaymentTransactionType.REFUND, payment.getAmount());
    }

    /**
     * 오더의 결제 상태를 조회한다.
     *
     * @param orderId 오더 ID
     * @return 결제 상태. 결제가 없으면 비어 있다
     */
    @Transactional(readOnly = true)
    public Optional<PaymentStatus> findStatus(Long orderId) {
        return paymentRepository.findByOrderId(orderId).map(Payment::getStatus);
    }

    /**
     * 차주의 지급 내역을 최신순으로 조회한다.
     *
     * @param driverId 차주 회원 ID
     * @param page 0부터 시작하는 페이지 번호
     * @return 지급 내역 페이지
     */
    @Transactional(readOnly = true)
    public Page<PayoutResponse> listPayouts(Long driverId, int page) {
        return paymentTransactionRepository
                .findByTypeAndDriverId(
                        PaymentTransactionType.PAYOUT, driverId, PageRequest.of(Math.max(page, 0), DEFAULT_PAGE_SIZE))
                .map(PayoutResponse::from);
    }

    private Payment getPayment(Long orderId) {
        return paymentRepository
                .findByOrderId(orderId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));
    }

    private void requirePositive(long amount) {
        if (amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    private void recordTransaction(Payment payment, PaymentTransactionType type, long amount) {
        paymentTransactionRepository.save(PaymentTransaction.builder()
                .payment(payment)
                .type(type)
                .amount(amount)
                .build());
    }
}
