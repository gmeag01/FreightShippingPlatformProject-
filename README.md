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

## 동시 수락 방지 방식 비교 (matching 도메인)

한 오더(`REGISTERED`)에 여러 차주가 동시에 수락 요청을 보낼 때 정확히 1명만 배차(`ASSIGNED`)되도록 제어하는 세 가지 방식을 비교하고 **JPA 낙관적 락(`@Version`)**을 채택했습니다. (`MatchingConcurrencyTest`에서 10개 스레드 동시 수락 시 성공 1건, `ORDER_ALREADY_ASSIGNED` 9건 검증)

| 방식 | 동작 원리 | 장점 | 단점 | 채택 여부 |
| --- | --- | --- | --- | --- |
| **JPA 낙관적 락 (`@Version`)** | `UPDATE orders SET ..., version = version + 1 WHERE id = ? AND version = ?`로 커밋 시점 충돌 감지 | DB 락 대기 없음, **차주가 조회한 뒤 화주가 수정한 오더(`ORDER_CHANGED`) 감지까지 하나의 `version` 필드로 함께 해결**, 엔티티 상태 전이 메서드(`Order.accept`) 규칙 그대로 유지 | 충돌 시 예외(`ObjectOptimisticLockingFailureException`) 변환 처리 필요 | **채택** |
| **비관적 락 (`SELECT ... FOR UPDATE`)** | 조회 시점에 DB 행 락(`PESSIMISTIC_WRITE`)을 걸어 직렬화 | 충돌 시 재시도/예외 비용이 직관적 | 트래픽 집중 시 커넥션 점유·락 대기 증가, 조회 시점부터 락을 잡아야 하며 조회 후 수정 감지(`ORDER_CHANGED`)는 별도 버전 비교가 여전히 필요 | 미채택 |
| **조건부 UPDATE (`WHERE status = 'REGISTERED'`)** | JPQL/SQL 벌크 업데이트 반환 행 수(`1` 또는 `0`)로 판정 | 단일 쿼리로 빨라 락 경합이 적음 | JPA 영속성 컨텍스트를 우회하므로 `Order` 엔티티의 도메인 상태 전이 메서드(`order.accept`)와 감사(`updatedAt`) 규칙이 분리됨 | 미채택 |

시드 계정과 Swagger 주소는 이후 작업(Task 6)에서 추가합니다.
