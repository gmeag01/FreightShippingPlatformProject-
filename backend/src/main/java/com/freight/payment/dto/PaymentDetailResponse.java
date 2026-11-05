package com.freight.payment.dto;

import com.freight.payment.entity.Payment;
import com.freight.payment.entity.PaymentStatus;
import com.freight.payment.entity.PaymentTransaction;
import com.freight.payment.entity.PaymentTransactionType;
import java.time.LocalDateTime;
import java.util.List;

/** 오더 상세의 결제 내역. 현재 결제 상태와 거래를 오래된 순으로 담는다. */
public record PaymentDetailResponse(
        Long orderId, PaymentStatus status, long amount, List<TransactionResponse> transactions) {

    public static PaymentDetailResponse from(Long orderId, Payment payment, List<PaymentTransaction> transactions) {
        return new PaymentDetailResponse(
                orderId,
                payment.getStatus(),
                payment.getAmount(),
                transactions.stream().map(TransactionResponse::from).toList());
    }

    /** 결제, 추가결제, 부분환불, 지급, 환불 거래 한 건. */
    public record TransactionResponse(PaymentTransactionType type, long amount, LocalDateTime createdAt) {

        static TransactionResponse from(PaymentTransaction transaction) {
            return new TransactionResponse(transaction.getType(), transaction.getAmount(), transaction.getCreatedAt());
        }
    }
}
