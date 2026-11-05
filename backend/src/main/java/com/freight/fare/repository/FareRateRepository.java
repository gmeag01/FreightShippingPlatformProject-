package com.freight.fare.repository;

import com.freight.fare.entity.FareRate;
import com.freight.vehicle.entity.VehicleType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FareRateRepository extends JpaRepository<FareRate, VehicleType> {}
