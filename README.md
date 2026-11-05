# 화물운송플랫폼 (FreightShippingPlatform)

화주가 운송 의뢰를 올리고, 차주가 골라 수락해 운송하면, 화주의 수령 확인 후 플랫폼이 보관하던 운임을 차주에게 지급하는(에스크로, 더미 결제) 화물 중개 웹 플랫폼입니다.

- 설계: [docs/superpowers/specs/2026-11-02-freight-platform-design.md](docs/superpowers/specs/2026-11-02-freight-platform-design.md)
- 로드맵: [docs/superpowers/plans/2026-11-02-roadmap.md](docs/superpowers/plans/2026-11-02-roadmap.md)
- AI 도구 규칙: [AGENTS.md](AGENTS.md)

## 구성

| 폴더 | 내용 |
| --- | --- |
| `backend/` | Spring Boot 3.5 / Java 21 / Gradle |
| `frontend/` | React 19 + Vite + Tailwind CSS (컴포넌트 파일은 `.js`) |

## 백엔드 로컬 실행 (STS)

1. JDK 21 설치, STS의 Window → Preferences → Java → Installed JREs에 JDK 21 추가
2. Preferences → General → Workspace → Text file encoding을 **UTF-8**로 변경
3. STS에 Lombok 설치 (lombok.jar 실행 후 STS 설치 경로 선택)
4. 저장 시 자동 정렬은 끈다. 코드 형식은 커밋 전에 `gradlew spotlessApply`로 맞춘다
5. File → Import → Existing Gradle Project → `backend` 폴더
6. MariaDB에 DB와 계정을 만들고 `backend/src/main/resources/application-local.example.properties`를 복사해 `application-local.properties`를 만든 뒤 값을 채운다 (Git에 올라가지 않음)
7. Boot Dashboard에서 `freight` → Start (또는 `cd backend && ./gradlew bootRun`)

## 프론트 로컬 실행

1. Node.js 20.19 이상 설치
2. `cd frontend && npm install`
3. 백엔드를 띄운 상태에서 `npm run dev` → http://localhost:5173 (`/api` 요청은 `localhost:8080`으로 전달)

## 커밋 전 확인

```bash
cd backend && ./gradlew spotlessApply test
```

```bash
cd frontend && npm run format && npm run lint && npm run build
```

## 테스트용 시드 계정

서버 기동 시 `backend/src/main/resources/data.sql`에 의해 로컬 DB에 자동 등록됩니다.

- **공통 테스트 비밀번호**: `pass1234`

| 역할 | 이메일 | 비밀번호 | 비고 |
| --- | --- | --- | --- |
| **관리자(ADMIN)** | `admin@freight.test` | `pass1234` | 전체 오더·분쟁 관리 |
| **화주(SHIPPER)** | `shipper1@freight.test` | `pass1234` | 오더 등록 및 수령 확인 |
| **차주(DRIVER)** | `driver1@freight.test` | `pass1234` | 차량: 5톤 카고 (80가1234) |
| **차주(DRIVER)** | `driver2@freight.test` | `pass1234` | 차량: 1톤 탑차 (81나5678) |

## API 문서 (Swagger)

백엔드 서버 기동 후 브라우저에서 확인할 수 있습니다:
- **Swagger UI**: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- **OpenAPI JSON**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

## 차주 동시 수락 제어 방식 비교 (matching 도메인)

동일한 배차 대기(`REGISTERED`) 오더에 여러 차주가 동시에 수락을 요청할 때 **정확히 1명만 배차(`ASSIGNED`)**되도록 보장하기 위해 세 가지 방식을 비교 검토하고 **JPA 낙관적 락(`@Version`)**을 채택했습니다.

| 방식 | 동작 원리 | 장점 | 단점 | 채택 여부 |
| --- | --- | --- | --- | --- |
| **낙관적 락 (`@Version`)** | `Order` 엔티티의 `version` 컬럼을 기준으로 커밋 시점(`UPDATE ... WHERE id = ? AND version = ?`)에 충돌을 감지하고, 패배한 트랜잭션의 `ObjectOptimisticLockingFailureException`을 `409 ORDER_ALREADY_ASSIGNED`로 변환 | - DB 락 점유 시간을 최소화해 조회·일반 트랜잭션 처리량이 높음<br>- 도메인 엔티티 메서드(`order.accept(...)`)의 상태 전이 규칙·이력 기록과 자연스럽게 결합됨<br>- 화주의 오더 수정 시 차주가 구버전 화면으로 수락하는 문제(`ORDER_CHANGED`)까지 같은 `version` 필드로 한 번에 해결 | 충돌 시 예외 변환 및 롤백 처리가 필요함 (재시도 없이 즉시 실패 응답하는 업무 규칙과 부합) | **채택** |
| **비관적 락 (`SELECT ... FOR UPDATE`)** | 오더 조회 시점부터 DB 배타 락(X-Lock)을 걸어 다른 트랜잭션을 대기시킴 | 충돌이 매우 잦고 순차 대기 후 재처리가 필요한 작업에서 확실한 직렬화 보장 | - 첫 요청이 끝날 때까지 나머지 9개 스레드가 커넥션을 점유한 채 대기하여 커넥션 풀 고갈 및 데드락 위험 증가<br>- 화주가 오더를 읽은 뒤 수정했는지(`ORDER_CHANGED`)는 별도 버전 값 없이 판별하기 어려움 | 미채택 |
| **조건부 UPDATE (`WHERE status = 'REGISTERED'`)** | `UPDATE orders SET status = 'ASSIGNED', driver_id = ? WHERE id = ? AND status = 'REGISTERED'` 실행 후 영향받은 행 수(`updatedRows == 1`)로 성공 판별 | 단일 쿼리로 동작하여 DB 왕복이 적고 빠름 | - JPA 영속성 컨텍스트를 우회(벌크 연산)하므로 `Order` 엔티티의 도메인 캡슐화(상태 전이 검증 메서드)와 `order_status_history` 감사 이력 기록 흐름이 분리됨<br>- 차종·중량 불일치(`VEHICLE_MISMATCH`) 및 오더 수정 여부(`ORDER_CHANGED`)를 사전 구분하기 위해 결국 조회 쿼리가 추가로 필요함 | 미채택 |

### 동시성 검증 (`MatchingConcurrencyTest`)

- **시나리오**: 등록된 5톤 오더 1건에 대해 차주 10명(스레드 10개)이 `CountDownLatch`로 동시에 `acceptOrder`를 호출
- **검증 결과 (H2 테스트 환경 및 로컬 MariaDB 11.4/12.3 동일 확인)**:
  - **성공(`200 OK`, `ASSIGNED`)**: 정확히 **1건**
  - **실패(`409 Conflict`, `ORDER_ALREADY_ASSIGNED`)**: 정확히 **9건**
  - 최종 오더 상태 `ASSIGNED`, `version = 1`, `order_status_history`의 `REGISTERED → ASSIGNED` 이력 **1건** 기록 확인

