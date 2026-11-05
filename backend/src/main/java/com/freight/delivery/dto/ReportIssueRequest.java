package com.freight.delivery.dto;

import jakarta.validation.constraints.NotBlank;

/** 화주가 수령 확인 대신 문제를 신고할 때 보내는 요청. */
public record ReportIssueRequest(@NotBlank(message = "신고 사유를 입력해 주세요") String reason) {}
