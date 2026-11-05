package com.freight.fare.repository;

import com.freight.fare.entity.FareSurcharge;
import com.freight.fare.entity.SurchargeType;
import org.springframework.data.jpa.repository.JpaRepository;

/** 할증률 저장소. */
public interface FareSurchargeRepository extends JpaRepository<FareSurcharge, SurchargeType> {}
