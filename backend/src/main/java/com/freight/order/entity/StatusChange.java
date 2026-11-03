package com.freight.order.entity;

public record StatusChange(OrderStatus from, OrderStatus to) {}
