package com.freight.matching.dto;

import jakarta.validation.constraints.NotBlank;

public record CancelAssignmentRequest(@NotBlank String reason) {}

