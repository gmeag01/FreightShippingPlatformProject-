package com.freight.matching.dto;

import jakarta.validation.constraints.NotNull;

public record AcceptOrderRequest(@NotNull Long version, boolean confirmMismatch) {}

