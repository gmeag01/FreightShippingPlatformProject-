package com.freight.vehicle.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.freight.global.exception.BusinessException;
import com.freight.global.exception.ErrorCode;
import com.freight.member.entity.Member;
import com.freight.member.repository.MemberRepository;
import com.freight.support.Fixtures;
import com.freight.vehicle.dto.VehicleRequest;
import com.freight.vehicle.dto.VehicleResponse;
import com.freight.vehicle.entity.BodyType;
import com.freight.vehicle.entity.Vehicle;
import com.freight.vehicle.entity.VehicleType;
import com.freight.vehicle.repository.VehicleRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class VehicleServiceTest {

    @Autowired
    private VehicleService vehicleService;

    @Autowired
    private VehicleRepository vehicleRepository;

    @Autowired
    private MemberRepository memberRepository;

    private Member driver;

    @BeforeEach
    void setUp() {
        driver = memberRepository.save(Fixtures.driver("test-driver@freight.test"));
    }

    @Test
    @DisplayName("차량이 없는 차주가 차량을 최초 등록하면 정상 저장된다")
    void registerVehicle_whenNoVehicle_createsNew() {
        VehicleRequest request = new VehicleRequest(VehicleType.TON_5, "80가1234", BodyType.CARGO);

        VehicleResponse response = vehicleService.registerOrUpdate(driver.getId(), request);

        assertThat(response.id()).isNotNull();
        assertThat(response.driverId()).isEqualTo(driver.getId());
        assertThat(response.vehicleType()).isEqualTo(VehicleType.TON_5);
        assertThat(response.vehicleTypeName()).isEqualTo("5톤");
        assertThat(response.maxLoadKg()).isEqualTo(5000);
        assertThat(response.plateNumber()).isEqualTo("80가1234");
        assertThat(response.bodyType()).isEqualTo(BodyType.CARGO);
    }

    @Test
    @DisplayName("이미 차량이 등록된 차주가 다시 등록/수정 요청을 하면 기존 차량 정보가 갱신된다")
    void updateVehicle_whenVehicleExists_updatesExisting() {
        Vehicle initialVehicle = vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_1));

        VehicleRequest updateRequest = new VehicleRequest(VehicleType.TON_11, "99하9999", BodyType.WING);
        VehicleResponse response = vehicleService.registerOrUpdate(driver.getId(), updateRequest);

        assertThat(response.id()).isEqualTo(initialVehicle.getId());
        assertThat(response.vehicleType()).isEqualTo(VehicleType.TON_11);
        assertThat(response.plateNumber()).isEqualTo("99하9999");
        assertThat(response.bodyType()).isEqualTo(BodyType.WING);
        assertThat(vehicleRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("등록된 차량을 조회하면 차량 상세 정보를 반환한다")
    void getMyVehicle_whenExists_returnsVehicle() {
        vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_5));

        VehicleResponse response = vehicleService.getMyVehicle(driver.getId());

        assertThat(response.driverId()).isEqualTo(driver.getId());
        assertThat(response.vehicleType()).isEqualTo(VehicleType.TON_5);
    }

    @Test
    @DisplayName("등록된 차량이 없을 때 내 차량을 조회하면 VEHICLE_NOT_FOUND 예외가 발생한다")
    void getMyVehicle_whenNotFound_throwsException() {
        assertThatThrownBy(() -> vehicleService.getMyVehicle(driver.getId()))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.VEHICLE_NOT_FOUND);
    }

    @Test
    @DisplayName("타 도메인 연계용 findByDriverId는 등록된 차량 엔티티를 반환한다")
    void findByDriverId_returnsVehicleOptional() {
        vehicleRepository.save(Fixtures.vehicle(driver, VehicleType.TON_25));

        Optional<Vehicle> found = vehicleService.findByDriverId(driver.getId());

        assertThat(found).isPresent();
        assertThat(found.get().getVehicleType()).isEqualTo(VehicleType.TON_25);
    }
}
