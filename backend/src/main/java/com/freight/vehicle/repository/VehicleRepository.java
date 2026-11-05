package com.freight.vehicle.repository;

import com.freight.vehicle.entity.Vehicle;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 차량 저장소. */
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByDriverId(Long driverId);
}
