package com.freight.vehicle.service;

import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.repository.VehicleRepository;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class VehicleService {

    private final VehicleRepository vehicleRepository;

    public Optional<Vehicle> findByDriverId(Long driverId) {
        return vehicleRepository.findByDriverId(driverId);
    }
}
