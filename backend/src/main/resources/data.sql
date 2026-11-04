-- ===================================================================
-- Task 6: 로컬 개발 및 테스트용 초기 시드 데이터 (data.sql)
-- 모든 쿼리는 INSERT IGNORE 및 고정 ID를 사용하여 서버 재시작 시에도 중복 오류가 발생하지 않습니다.
-- ===================================================================

-- 1. 회원 (members)
-- 공통 테스트 비밀번호: pass1234 (BCrypt 해시 적용)
INSERT IGNORE INTO members (id, email, password, name, phone, role, created_at, updated_at) VALUES
(1, 'admin@freight.test', '$2a$10$rtQlBBCf7MNdkpBWJG2h5O9YvXBk3l1czFXgSIKAtmuFxVONs8hpK', '관리자', '010-0000-0000', 'ADMIN', NOW(), NOW()),
(2, 'shipper1@freight.test', '$2a$10$rtQlBBCf7MNdkpBWJG2h5O9YvXBk3l1czFXgSIKAtmuFxVONs8hpK', '화주1', '010-1111-1111', 'SHIPPER', NOW(), NOW()),
(3, 'driver1@freight.test', '$2a$10$rtQlBBCf7MNdkpBWJG2h5O9YvXBk3l1czFXgSIKAtmuFxVONs8hpK', '차주1', '010-2222-2222', 'DRIVER', NOW(), NOW()),
(4, 'driver2@freight.test', '$2a$10$rtQlBBCf7MNdkpBWJG2h5O9YvXBk3l1czFXgSIKAtmuFxVONs8hpK', '차주2', '010-3333-3333', 'DRIVER', NOW(), NOW());

-- 2. 차량 (vehicles)
-- driver1 (id=3): 5톤 카고, driver2 (id=4): 1톤 탑차
INSERT IGNORE INTO vehicles (id, driver_id, vehicle_type, plate_number, body_type) VALUES
(1, 3, 'TON_5', '80가1234', 'CARGO'),
(2, 4, 'TON_1', '81나5678', 'BOX');

-- 3. 차종별 기본요금 및 km당 단가 (fare_rate) - 설계 문서 4장 표 기준
INSERT IGNORE INTO fare_rate (vehicle_type, base_fare, per_km_fare) VALUES
('TON_1', 30000, 1000),
('TON_2_5', 50000, 1400),
('TON_5', 80000, 1900),
('TON_11', 130000, 2600),
('TON_25', 200000, 3500);

-- 4. 할증률 (fare_surcharge)
-- 야간 20%, 주말 10%, 수작업 15%, 긴급 30%
INSERT IGNORE INTO fare_surcharge (type, rate) VALUES
('NIGHT', 0.20),
('WEEKEND', 0.10),
('MANUAL_LOADING', 0.15),
('URGENT', 0.30);
