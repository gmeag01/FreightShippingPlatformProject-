# 2주차 시나리오 통합 테스트 결과

로드맵 2주차 완료 기준인 "등록 → 수락 → 상차 → 하차 → 확인 → 지급을 API로 끝까지 실행"을 확인한 기록이다. 테스트 코드는 PR #39로 `develop`에 합쳐졌다.

- 실행일: 2026-11-05
- 테스트 코드: `backend/src/test/java/com/freight/scenario/FreightScenarioTest.java` (19개), `ScenarioApi.java` (API 호출 도우미)
- 결과: PR #39 기준 백엔드 전체 252개 통과, GitHub Actions `backend`, `frontend` 검사 통과

## 결론

2주차 완료 기준과 로드맵의 필수 테스트는 모두 통과했다. 최종 확인 시나리오 1~9번의 API 부분도 미리 실행해 통과했다. 10번(휴대폰 폭)과 화면 동작은 3·4주차에 확인한다.

## 테스트 방식

- Mock을 쓰지 않는다. 실제 빈을 쓰고, 회원가입과 로그인으로 받은 JWT를 헤더에 담아 JWT 필터, 권한 검사, 입력 검증을 그대로 지난다.
- 테스트를 트랜잭션으로 감싸지 않는다. 요청마다 실제로 커밋되므로 도메인 사이 트랜잭션 연결까지 확인된다.
- 관리자는 회원가입 API가 받지 않으므로 시드 계정처럼 저장한 뒤 로그인만 API로 한다.
- 24시간 경과는 기다릴 수 없어 DB의 `dropped_off_at`만 과거로 옮긴다. 스케줄러와 판정 코드는 그대로 지난다.

## 실행 방법

```bash
cd backend
./gradlew test --tests 'com.freight.scenario.*'
```

기본은 H2 메모리 DB에서 돈다.

**주의:** 테스트 프로필은 `ddl-auto=create-drop`이다. 개발용 DB에 연결하면 시작할 때 테이블을 지운다. MariaDB로 돌릴 때는 반드시 검증 전용 DB를 쓰고, 끝나면 그 DB를 지운다.

## 최종 확인 시나리오 대응표

| 번호 | 시나리오 | 테스트 메서드 |
| --- | --- | --- |
| 1 | 등록 시 추천 운임 표시, 결제 HELD | `fullScenario_registerToPayout_releasesFareToDriver` |
| 2 | 차종 필터, 시·구까지만 주소 표시 | `openOrders_filteredByVehicleType_hideAddressUntilAssigned` |
| 3 | 1톤 차주의 5,000kg 오더 경고 후 수락 | `accept_overweightOrder_needsConfirmMismatch` |
| 4 | 동시 수락 시 한 명만 성공 | `accept_byTwoDriversAtOnce_onlyOneSucceeds` |
| 5 | 본 뒤 운임이 바뀌면 수락 거부 | `accept_afterShipperChangedFare_failsWithOrderChanged` |
| 6 | 상차 3시간 전 취소 가능, 1시간 전 거부 | `cancelAssignment_threeHoursBeforePickup_reopensOrder`, `cancelAssignment_oneHourBeforePickup_failsAndAdminCanCancel` |
| 7 | 화주 확인 또는 자동 확인으로 RELEASED | `fullScenario_registerToPayout_releasesFareToDriver`, `autoConfirm_afterDeadline_releasesFareOnce` |
| 8 | 문제 신고 후 환불이면 CANCELLED, REFUNDED | `resolveDispute_refundShipper_cancelsOrderAndRefunds` |
| 9 | 다른 차주의 상차 처리 거부 | `otherMembers_cannotProgressOrReadOrder` |
| 10 | 휴대폰 폭에서 가로 스크롤 없음 | 화면 항목이라 제외 |

시나리오 외에 추가한 테스트는 다음과 같다.

| 테스트 메서드 | 확인 내용 |
| --- | --- |
| `resolveDispute_payDriver_completesOrderAndReleases` | 분쟁을 지급으로 처리하면 COMPLETED, RELEASED |
| `shipperCancel_beforeAssignment_refundsAndClosesOrder` | 화주 취소 시 환불, 목록에서 제외, 수락 불가 |
| `accept_withoutVehicle_failsUntilVehicleRegistered` | 차량이 없으면 수락 불가 |
| `progress_skippingStatus_isRejected` | 상태 순서를 건너뛴 요청 거부 |
| `api_outsideRole_isRejected` | 비로그인 401, 역할 밖 API 403 |
| `suspendedMember_cannotLoginButKeepsIssuedToken` | 정지 계정의 로그인 차단, 발급된 토큰 유지 |
| `updateFare_lowered_refundsDifferenceAndPaysLoweredFare` | 운임 인하 시 부분 환불, 내린 운임만 지급 |
| `adminFareChange_appliesToNextEstimateOnly` | 단가표·할증률 수정이 다음 추천 운임에만 반영 |
| `vehicleUpdate_appliesToNextAcceptance` | 차량 수정 후 수락 판단이 새 차량 기준 |

## 환경별 결과

| 환경 | 실행 내용 | 결과 |
| --- | --- | --- |
| H2 | 시나리오 19개와 백엔드 전체 테스트 | 통과 |
| 로컬 MariaDB 12.3.3 | `MatchingConcurrencyTest`, `DeliveryConcurrencyTest`, 시나리오 16개 | 통과 |
| Swagger 화면 | 시드 계정으로 등록, 수락, 상차, 하차, 확인, 결제 조회 | 모두 200, 결제 RELEASED, `CHARGE` → `PAYOUT` |
| 실제 스케줄러 | 자동 확인 0시간, 20초 주기로 앱 실행 | 하차 12.6초 뒤 자동 완료, 지급 1건 |
| 시드 단가표 | 추천 운임을 공식으로 직접 계산해 비교 | 일치 |
| 실제 카카오 API | 주소 좌표 변환, 길찾기 거리 | 성공 |

MariaDB에서 돌린 시나리오 16개는 뒤에 추가한 운임 인하, 단가표 수정, 차량 수정 테스트를 뺀 것이다.

카카오 호출 결과의 예시는 다음과 같다. 추천 운임은 할증이 없는 조건이다.

| 구간 | 거리 | 추천 운임 |
| --- | --- | --- |
| 서울 강남구 테헤란로 152 → 부산 해운대구 센텀중앙로 79 (5톤) | 395.6km | 832,000원 |
| 서울시청 → 서울 강남구 테헤란로 152 (1톤) | 11.2km | 41,000원 |

카카오 좌표 변환을 쓰려면 개발자 콘솔에서 앱의 카카오맵 사용을 켜야 한다. 꺼져 있으면 `OPEN_MAP_AND_LOCAL` 403이 난다. 이 프로젝트는 카카오 로그인을 쓰지 않으므로 리다이렉트 URI는 필요 없다.

## 발견한 문제

| 문제 | 상태 | 담당 |
| --- | --- | --- |
| 운임 수정 메모에 쉼표가 없어 설계 문서 3장 형식과 달랐다 | PR #39에서 수정. 이미 저장된 메모는 그대로다 | C |
| `app.order.auto-confirm-hours`가 정수 시간 단위라 로드맵의 "1분" 설정이 불가능하다. 소수를 넣으면 앱이 시작하지 못한다 | 코드는 고치지 않고 아래 시연 설정을 쓴다. 로드맵 문구 수정이 남았다 | 팀 |
| 없는 주소나 카카오 호출 실패 시 `GET /api/fares/geocode`가 서울시청 좌표를 200으로 돌려준다. 없는 주소는 경고 로그도 남지 않는다 | 미해결. 잘못된 거리와 추천 운임이 나올 수 있다 | B |

## 시나리오 7 시연 설정

앱을 띄울 때 아래 환경변수를 준다. cron을 함께 줄이지 않으면 기본 주기 때문에 최대 10분을 기다린다.

```bash
APP_ORDER_AUTO_CONFIRM_HOURS=0
APP_ORDER_AUTO_CONFIRM_CRON='*/20 * * * * *'
```

이 설정에서는 하차 후 최대 20초 안에 자동 완료되어 화주가 확인하거나 신고할 시간이 없다. 수령 확인과 문제 신고는 기본 설정으로 먼저 시연하고, 앱을 다시 띄워 자동 확인을 보여 준다.

## 확인하지 않은 것

- MariaDB 11.4에서의 실행 (설계 문서 기준 버전. 이번에는 12.3.3에서만 실행했다)
- 기본 설정(24시간, 10분 주기)으로 앱을 띄운 자동 확인. 24시간 판정은 테스트에서 하차 시각을 옮겨 확인했다
- Swagger 화면에서의 실패 경로. 같은 경로를 자동 테스트로 확인했다
- 지도 표시. `OrderMap`이 아직 없어 3주차에 확인한다. 웹 도메인 `http://localhost:5173` 등록과 `VITE_KAKAO_MAP_KEY` 설정이 필요하다
- 브라우저 화면의 전체 시나리오. 3주차 완료 기준이다
