package com.freight.order.entity;

/** 상태 전이 전후의 오더 상태. 이력을 남길 때 쓴다. */
public record StatusChange(OrderStatus from, OrderStatus to) {}
