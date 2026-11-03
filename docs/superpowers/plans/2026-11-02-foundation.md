# 공통 기반(첫 주) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5명이 둘째 주부터 각자 도메인을 병렬로 만들 수 있도록, 실행되는 백엔드·프론트 뼈대와 공통 규칙, ERD, 오더 상태 전이, 인증, 견본 도메인(member)을 완성한다.

**Architecture:** 저장소 하나에 `backend/`(Spring Boot 단일 앱, 도메인 폴더 + 내부 계층 구조)와 `frontend/`(React + Vite)를 둔다. 오더 상태 전이는 `Order` 엔티티 메서드에만 있고, 서비스는 그 결과(`StatusChange`)로 이력을 남긴다. 인증은 JWT, 권한은 `Role` 3종.

**Tech Stack:** Java 21(Gradle toolchain), Spring Boot 3.5.x, Spring Data JPA, Spring Security, jjwt 0.12.x, springdoc-openapi 2.x, MariaDB 11.4 LTS(로컬) / H2 MariaDB 모드(테스트), JUnit 5, ArchUnit, Spotless, React 18 + Vite + React Router + axios, ESLint + Prettier, GitHub Actions

**Spec:** 화물운송플랫폼 설계 문서 — https://claude.ai/artifact/LENc6NFFQ9vxeBMQ7rdpgb (확정 후 `docs/superpowers/specs/2026-11-02-freight-platform-design.md`로 저장소에 넣는다. Claude 문서에서 Markdown으로 내보내기)

**전체 로드맵:** `docs/superpowers/plans/2026-11-02-roadmap.md`

## Global Constraints

- 패키지: `com.freight.<도메인>.{controller,service,repository,entity,dto}`, 공통은 `com.freight.global`
- 도메인: member, vehicle, fare, order, matching, delivery, payment
- 다른 도메인의 repository를 직접 쓰지 않는다. 그 도메인의 service를 호출한다.
- 오더 상태는 `Order`의 상태 전이 메서드로만 바꾼다. `setStatus`는 만들지 않는다.
- 컨트롤러는 DTO를 반환하고, 응답은 `ApiResponse` 형식: `{ "success", "data", "error": { "code", "message" } }`
- 예외는 `BusinessException(ErrorCode)`, 오류 코드는 `global/exception/ErrorCode` 한 곳
- API 경로 `/api/<복수형 자원>`, 관리자 `/api/admin/**`(ADMIN만). DTO 이름 `<동작><대상>Request` / `<대상>Response`
- 테이블·컬럼 snake_case, 엔티티 필드 camelCase
- 비밀번호·API 키는 커밋하지 않는다. `application-local.properties`는 `.gitignore`, `application-local.example.properties`만 공유
- 로컬 DB: MariaDB, DB 이름 `freight`, 계정 `freight`. `ddl-auto: update`, 시드는 `data.sql`
- 실행 환경: 배포 없이 각자 PC에서 백엔드는 STS(Boot Dashboard), 프론트는 `npm run dev`로 띄운다. STS는 `backend/`를 Existing Gradle Project로 불러오고, 워크스페이스 인코딩 UTF-8, Lombok 설치, 저장 시 자동 정렬 끔(형식은 `gradlew spotlessApply`가 맞춘다)
- 브랜치: `main`, `develop` 보호. 작업은 `feat|fix|chore/<도메인>-<기능>` → `develop` PR(CI 통과, 승인 필수 아님), Squash merge. `main` 배포는 설계 문서 9장 '배포 절차'대로 `release/<태그>` 브랜치를 거친다
- 커밋 접두어: `feat:` `fix:` `refactor:` `test:` `docs:` `chore:`
- `docs/`(설계 문서, 계획)는 팀 공통 기준이다. 작업 중에 고치지 않는다. 틀려서 구현이 막히는 경우에만 팀에 먼저 공유하고, 기능 PR과 분리한 별도 PR로 고친다. 사람마다 다른 값(DB 이름, 계정, IDE 설정)은 `application-local.properties` 같은 로컬 파일에 둔다. 새 도메인 계획 파일을 추가하는 것은 수정이 아니다
- 완료 조건: `./gradlew spotlessApply test`, `npm run lint`, `npm run build` 통과

## 담당과 순서

| Task | 담당 | 먼저 끝나야 하는 Task |
| --- | --- | --- |
| 1. 저장소·백엔드 뼈대·품질 도구 | E | — (첫날 오전) |
| 2. global 공통 응답·예외·감사 | B | 1 |
| 3. ERD: 공유 enum과 엔티티 | D | 1 |
| 4. 오더 상태 전이 | C | 2, 3 |
| 5. 인증(JWT)과 member 견본 도메인 | A | 2, 3 |
| 6. 시드 데이터와 AI 규칙 파일 | B | 3, 5 |
| 7. 프론트 뼈대와 로그인 | E | 1 (API 연결은 5 이후) |

Task 2·3·7은 동시에, 그다음 4·5를 동시에 진행한다. 각 Task는 자기 브랜치에서 PR로 `develop`에 합친다. Task 3의 엔티티는 둘째 주 모든 도메인이 쓰므로, PR 리뷰는 5명 전원이 본다.

## Review Focus

테스트가 따로 없으면 놓치기 쉬운 입력과 상황들이다. 각 항목의 테스트는 담당 Task에 넣었다.

1. **다른 사람의 오더에 대한 행동** (차주 B가 차주 A에게 배정된 오더를 상차 완료로 바꿈): `NOT_ORDER_OWNER`로 거부한다 → Task 4 `startTransit_byOtherDriver_fails`
2. **만료되거나 위조된 토큰**: HTML 오류 페이지가 아니라 401 `ApiResponse` JSON을 돌려준다 → Task 5 `me_withInvalidToken_returns401Json`
3. **서버 재시작**: `data.sql`이 다시 실행돼도 중복 키 오류 없이 뜬다 → Task 6 Step 3
4. **이메일 대소문자** (`A@x.com` 가입 후 `a@x.com` 가입): 같은 계정으로 보고 `DUPLICATE_EMAIL`을 반환한다 → Task 5 `signup_duplicateEmailIgnoringCase_fails`
5. **입력 검증 실패**: 400 `INVALID_INPUT`과 필드별 메시지를 돌려주고, 500으로 새지 않는다 → Task 2 `invalidBody_returns400WithFieldErrors`

---

### Task 1: 저장소·백엔드 뼈대·품질 도구 (담당 E)

**Files:**
- Create: `.gitignore`, `README.md`
- Create: `backend/settings.gradle`, `backend/build.gradle`, Gradle wrapper
- Create: `backend/src/main/java/com/freight/FreightApplication.java`
- Create: `backend/src/main/resources/application.properties`, `application-local.example.properties`
- Create: `backend/src/test/resources/application-test.properties`
- Create: `backend/src/test/java/com/freight/FreightApplicationTests.java`
- Create: `backend/src/test/java/com/freight/ArchitectureTest.java`
- Create: `.github/workflows/ci.yml`, `.github/pull_request_template.md`

**Interfaces:**
- Produces: 테스트 프로필 `test`(H2), 로컬 프로필 `local`(MariaDB). 모든 통합 테스트는 `@ActiveProfiles("test")`를 붙인다.
- Produces: ArchUnit 규칙 `ArchitectureTest.noCrossDomainRepositoryAccess`. 이후 모든 Task가 통과해야 한다.

- [ ] **Step 1: 저장소와 브랜치 규칙**

GitHub 저장소를 만들고 `main`에서 `develop`을 딴다. 두 브랜치에 보호 규칙(PR 필수, 승인 0명, CI 통과 필수)을 건다. `.gitignore`에 `backend/build/`, `.gradle/`, `**/application-local.properties`, `frontend/node_modules/`, `frontend/dist/`, `.idea/`, `.env*`와 STS(Eclipse) 파일 `.project`, `.classpath`, `.settings/`, `bin/`, `.metadata/`, `.sts4-cache/`를 넣는다.

- [ ] **Step 2: Spring Initializr로 `backend/` 생성**

Gradle - Groovy, Java 21, Spring Boot 3.5.x 최신 패치, group `com.freight`, artifact `freight`, package `com.freight`. 의존성: Web, Validation, Data JPA, Security, MariaDB Driver, Lombok. 추가로 `build.gradle`에 넣는다:
- `org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.x`
- `io.jsonwebtoken:jjwt-api:0.12.x`, `jjwt-impl`, `jjwt-jackson`(runtimeOnly)
- testImplementation `com.h2database:h2`, `com.tngtech.archunit:archunit-junit5:1.3.x`, `org.springframework.security:spring-security-test`
- 플러그인 `com.diffplug.spotless`: `java { palantirJavaFormat(); removeUnusedImports() }`
- `java { toolchain { languageVersion = JavaLanguageVersion.of(21) } }`
- `tasks.withType(JavaCompile).configureEach { options.encoding = 'UTF-8' }` (Windows 기본 인코딩 MS949로 한글이 깨지지 않게)

- [ ] **Step 3: 설정 파일**

`application.properties`: `spring.profiles.default=local`, `spring.jpa.open-in-view=false`, `app.jwt.validity=PT12H`, `app.order.auto-confirm-hours=24`, `app.order.driver-cancel-cutoff-hours=2`.
`application-local.example.properties`: `jdbc:mariadb://localhost:3306/freight`, 계정 `freight` / `<비밀번호>`, `ddl-auto=update`, `spring.sql.init.mode=always`, `spring.jpa.defer-datasource-initialization=true`, `app.jwt.secret=<32바이트 이상 임의 문자열>`, `app.kakao.rest-api-key=<키>`.
`application-test.properties`: `jdbc:h2:mem:freight;MODE=MariaDB;DATABASE_TO_LOWER=TRUE`, `ddl-auto=create-drop`, `spring.sql.init.mode=never`, 테스트용 `app.jwt.secret`.

- [ ] **Step 4: 아키텍처 테스트 작성**

```java
@AnalyzeClasses(packages = "com.freight", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {
    static final String[] DOMAINS = {"member", "vehicle", "fare", "order", "matching", "delivery", "payment"};

    @ArchTest
    static void noCrossDomainRepositoryAccess(JavaClasses classes) {
        for (String d : DOMAINS) {
            noClasses().that().resideOutsideOfPackage("..freight." + d + "..")
                .should().dependOnClassesThat().resideInAPackage("..freight." + d + ".repository..")
                .allowEmptyShould(true)
                .check(classes);
        }
    }

    @ArchTest
    static final ArchRule controllersDoNotReturnEntities = methods()
        .that().areDeclaredInClassesThat().resideInAPackage("..controller..")
        .and().arePublic()
        .should().notHaveRawReturnType(resideInAPackage("..entity.."))
        .allowEmptyShould(true);
}
```

- [ ] **Step 5: 실행 확인**

Run: `cd backend && ./gradlew spotlessApply test`
Expected: `BUILD SUCCESSFUL`. `FreightApplicationTests.contextLoads`(`@SpringBootTest @ActiveProfiles("test")`)와 `ArchitectureTest` 통과.

- [ ] **Step 6: CI와 PR 템플릿**

`ci.yml`: `pull_request`와 `develop`·`main` push에서 두 job을 돌린다. `backend`(temurin 21, `./gradlew spotlessCheck test`), `frontend`(Node 20, `npm ci && npm run lint && npm run build`, working-directory `frontend`). job 단위 `if`에서는 `hashFiles`를 쓸 수 없으므로, frontend job은 항상 실행하고 첫 step에서 `hashFiles('frontend/package.json') != ''` 결과를 output으로 내보낸 뒤 나머지 step에 `if`를 건다. 그래야 Task 7 전에도 `frontend` 체크가 통과로 남아 두 job을 모두 필수 체크로 걸 수 있다. 같은 ref의 이전 실행은 `concurrency`(`cancel-in-progress: true`)로 취소하고, backend job에는 `gradlew` 실행 권한(`chmod +x gradlew`)을 준다. 필수 체크(`backend`, `frontend`)는 이 PR에서 CI가 한 번 돈 뒤 Rulesets의 Require status checks에 추가한다.
`pull_request_template.md`: `## 무엇을 바꿨나`, `## 어떻게 확인했나`, `## 다른 도메인에 영향`.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: 백엔드 뼈대, 아키텍처 테스트, CI 설정"
```

---

### Task 2: global 공통 응답·예외·감사 (담당 B)

**Files:**
- Create: `global/common/ApiResponse.java`, `global/common/BaseEntity.java`
- Create: `global/config/JpaConfig.java`, `global/config/SwaggerConfig.java`
- Create: `global/exception/ErrorCode.java`, `BusinessException.java`, `GlobalExceptionHandler.java`
- Test: `global/exception/GlobalExceptionHandlerTest.java` (테스트 전용 컨트롤러 포함)

(경로는 `backend/src/main/java/com/freight/` 기준, 테스트는 `backend/src/test/java/com/freight/` 기준. 이후 Task도 같다.)

**Interfaces:**
- Produces: `record ApiResponse<T>(boolean success, T data, ErrorBody error)`, `static <T> ApiResponse<T> ok(T data)`, `static ApiResponse<Void> fail(ErrorCode code)`, `static ApiResponse<Void> fail(ErrorCode code, Map<String, String> fieldErrors)`. `record ErrorBody(String code, String message, Map<String, String> fieldErrors)`(fieldErrors는 없으면 null, JSON에서 생략)
- Produces: `enum ErrorCode(HttpStatus status, String message)`. 초기 값:
  `INVALID_INPUT(400, "입력값이 올바르지 않습니다")`, `UNAUTHORIZED(401, "로그인이 필요합니다")`, `FORBIDDEN(403, "권한이 없습니다")`, `NOT_FOUND(404, "대상을 찾을 수 없습니다")`, `CONCURRENT_MODIFICATION(409, "다른 요청과 충돌했습니다. 다시 시도해 주세요")`, `INTERNAL_ERROR(500, "서버 오류가 발생했습니다")`,
  `DUPLICATE_EMAIL(409, "이미 가입된 이메일입니다")`, `INVALID_CREDENTIALS(401, "이메일 또는 비밀번호가 올바르지 않습니다")`,
  `ORDER_NOT_FOUND(404, "오더를 찾을 수 없습니다")`, `INVALID_STATUS_TRANSITION(409, "현재 상태에서는 할 수 없는 작업입니다")`, `NOT_ORDER_OWNER(403, "본인의 오더가 아닙니다")`, `DRIVER_CANCEL_CUTOFF_PASSED(409, "상차 2시간 전부터는 직접 취소할 수 없습니다. 관리자에게 요청하세요")`
- Produces: `class BusinessException extends RuntimeException { BusinessException(ErrorCode code); ErrorCode getErrorCode(); }`
- Produces: `abstract class BaseEntity`(`@MappedSuperclass`, `createdAt`, `updatedAt` — `@CreatedDate`, `@LastModifiedDate`, `LocalDateTime`)

- [ ] **Step 1: Write the failing test**

`@WebMvcTest(controllers = GlobalExceptionHandlerTest.TestController.class)` + `@Import(GlobalExceptionHandler.class)` + `@AutoConfigureMockMvc(addFilters = false)`. 테스트 안의 `TestController`: `GET /test/business` → `throw new BusinessException(ErrorCode.ORDER_NOT_FOUND)`, `POST /test/valid` → `@Valid @RequestBody Body(@NotBlank String name)`, `GET /test/boom` → `throw new IllegalStateException()`, `GET /test/ok` → `ApiResponse.ok("hi")`.

```java
@Test void businessException_returnsCodeAndStatus() throws Exception {
    mvc.perform(get("/test/business"))
       .andExpect(status().isNotFound())
       .andExpect(jsonPath("$.success").value(false))
       .andExpect(jsonPath("$.data").isEmpty())
       .andExpect(jsonPath("$.error.code").value("ORDER_NOT_FOUND"))
       .andExpect(jsonPath("$.error.message").value("오더를 찾을 수 없습니다"));
}
@Test void invalidBody_returns400WithFieldErrors() throws Exception {
    mvc.perform(post("/test/valid").contentType(APPLICATION_JSON).content("{\"name\":\"\"}"))
       .andExpect(status().isBadRequest())
       .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"))
       .andExpect(jsonPath("$.error.fieldErrors.name").exists());
}
@Test void malformedJson_returns400() throws Exception {
    mvc.perform(post("/test/valid").contentType(APPLICATION_JSON).content("{"))
       .andExpect(status().isBadRequest())
       .andExpect(jsonPath("$.error.code").value("INVALID_INPUT"));
}
@Test void unexpectedException_returns500WithoutStackTrace() throws Exception {
    mvc.perform(get("/test/boom"))
       .andExpect(status().isInternalServerError())
       .andExpect(jsonPath("$.error.code").value("INTERNAL_ERROR"));
}
@Test void ok_wrapsData() throws Exception {
    mvc.perform(get("/test/ok"))
       .andExpect(jsonPath("$.success").value(true))
       .andExpect(jsonPath("$.data").value("hi"))
       .andExpect(jsonPath("$.error").doesNotExist());
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "*GlobalExceptionHandlerTest"`
Expected: 컴파일 실패(`ApiResponse`, `ErrorCode` 없음)

- [ ] **Step 3: 구현**

`ApiResponse`, `ErrorCode`, `BusinessException`, `BaseEntity`를 위 Interfaces대로 만든다. `ApiResponse`는 `@JsonInclude(NON_NULL)`을 `error`에만 적용하고, `data`는 null이어도 항상 포함한다. `GlobalExceptionHandler`(`@RestControllerAdvice`)가 처리하는 예외:
- `BusinessException` → 그 코드의 상태
- `MethodArgumentNotValidException` → `INVALID_INPUT` + fieldErrors
- `HttpMessageNotReadableException`, `MethodArgumentTypeMismatchException` → `INVALID_INPUT`
- `ObjectOptimisticLockingFailureException` → `CONCURRENT_MODIFICATION`
- `AccessDeniedException` → `FORBIDDEN`
- `Exception` → `INTERNAL_ERROR` + 서버 로그에 스택트레이스

`JpaConfig`에 `@EnableJpaAuditing`을 단다. `SwaggerConfig`는 Bearer JWT 보안 스킴 하나를 등록한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew spotlessApply test --tests "*GlobalExceptionHandlerTest"`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: 공통 응답 형식, 오류 코드, 전역 예외 처리"
```

---

### Task 3: ERD — 공유 enum과 엔티티 (담당 D, 리뷰 전원)

필드와 연관관계만 정의한다. 도메인 로직은 각 담당이 나중에 추가한다. `Order`의 상태 전이 메서드는 Task 4에서 추가한다.

**Files:**
- Create: `member/entity/Member.java`, `member/entity/Role.java`
- Create: `vehicle/entity/Vehicle.java`, `vehicle/entity/VehicleType.java`, `vehicle/entity/BodyType.java`
- Create: `order/entity/Order.java`, `Location.java`, `Cargo.java`, `OrderStatus.java`, `CargoType.java`, `PackageUnit.java`, `LoadingMethod.java`, `OrderStatusHistory.java`
- Create: `fare/entity/FareRate.java`, `FareSurcharge.java`, `SurchargeType.java`
- Create: `payment/entity/Payment.java`, `PaymentStatus.java`, `PaymentTransaction.java`, `PaymentTransactionType.java`
- Test: `ErdMappingTest.java`

**Interfaces (Produces):**

| 타입 | 값 / 필드 |
| --- | --- |
| `Role` | `SHIPPER`, `DRIVER`, `ADMIN` |
| `VehicleType(int maxLoadKg, String label)` | `TON_1(1000,"1톤")`, `TON_2_5(2500,"2.5톤")`, `TON_5(5000,"5톤")`, `TON_11(11000,"11톤")`, `TON_25(25000,"25톤")` |
| `BodyType` | `CARGO`, `WING`, `BOX`, `REFRIGERATED` (카고·윙바디·탑차·냉장냉동) |
| `OrderStatus` | `REGISTERED`, `ASSIGNED`, `IN_TRANSIT`, `AWAITING_CONFIRM`, `COMPLETED`, `DISPUTED`, `CANCELLED` |
| `CargoType` | `GENERAL`, `PALLET`, `MACHINERY`, `CONSTRUCTION`, `FURNITURE_APPLIANCE`, `OTHER` |
| `PackageUnit` | `BOX`, `PALLET`, `PIECE` |
| `LoadingMethod` | `FORKLIFT`, `MANUAL` |
| `SurchargeType` | `NIGHT`, `WEEKEND`, `MANUAL_LOADING`, `URGENT` |
| `PaymentStatus` | `HELD`, `RELEASED`, `REFUNDED` |
| `PaymentTransactionType` | `CHARGE`, `ADDITIONAL_CHARGE`, `PARTIAL_REFUND`, `PAYOUT`, `REFUND` |
| `Member` (`members`) | id, email(unique, 소문자 저장), password(BCrypt), name, phone, role, `extends BaseEntity` |
| `Vehicle` (`vehicles`) | id, driver(`@OneToOne Member`, unique), vehicleType, plateNumber, bodyType |
| `Location` (`@Embeddable`) | address, detailAddress, region(목록 표시용 "시·구"), latitude, longitude, contactName, contactPhone |
| `Cargo` (`@Embeddable`) | itemName, cargoType, weightKg(int), quantity(int), packageUnit, widthCm·depthCm·heightCm(Integer, 선택), fragile(boolean), noStack(boolean) |
| `Order` (`orders`) | id, shipper(`@ManyToOne`), driver(`@ManyToOne`, null 가능), status, pickup(`@AttributeOverrides` prefix `pickup_`), dropoff(prefix `dropoff_`), pickupAt, arriveBy, cargo, requiredVehicleType, bodyType(null 가능), loadingMethod, memo, fare(long), recommendedFare(long), distanceKm(double), assignedAt, droppedOffAt, completedAt, `@Version long version`, `extends BaseEntity` |
| `OrderStatusHistory` (`order_status_history`) | id, order(`@ManyToOne`), fromStatus(null 가능), toStatus, actor(`@ManyToOne Member`, 시스템이면 null), memo, createdAt |
| `FareRate` (`fare_rate`) | vehicleType(PK), baseFare(long), perKmFare(long) |
| `FareSurcharge` (`fare_surcharge`) | type(PK), rate(`BigDecimal`, 예: 0.20) |
| `Payment` (`payments`) | id, order(`@OneToOne`, unique), amount(long, 현재 보관 금액), status, `@Version long version`, `extends BaseEntity` |
| `PaymentTransaction` (`payment_transactions`) | id, payment(`@ManyToOne`), type, amount(long), createdAt |

모든 enum 컬럼은 `@Enumerated(EnumType.STRING)`. 엔티티는 `@NoArgsConstructor(access = PROTECTED)`, setter 없음, 생성은 정적 팩토리 또는 `@Builder`(private 생성자).

- [ ] **Step 1: Write the failing test**

`@DataJpaTest @ActiveProfiles("test")`. `TestEntityManager`로 Member(SHIPPER), Member(DRIVER), Vehicle, Order, OrderStatusHistory, FareRate, FareSurcharge, Payment, PaymentTransaction을 하나씩 저장하고 `flush()`, `clear()` 후 다시 읽는다.

```java
@Test void allEntitiesPersistAndReload() {
    // ... 저장 후 clear()
    Order found = em.find(Order.class, orderId);
    assertThat(found.getPickup().getRegion()).isEqualTo("서울 강남구");
    assertThat(found.getCargo().getWeightKg()).isEqualTo(1200);
    assertThat(found.getStatus()).isEqualTo(OrderStatus.REGISTERED);
    assertThat(found.getVersion()).isZero();
    assertThat(em.find(Payment.class, paymentId).getStatus()).isEqualTo(PaymentStatus.HELD);
}
@Test void vehicleTypeMaxLoads() {
    assertThat(VehicleType.TON_1.getMaxLoadKg()).isEqualTo(1000);
    assertThat(VehicleType.TON_25.getMaxLoadKg()).isEqualTo(25000);
}
```

테스트 데이터 만드는 코드는 `src/test/java/com/freight/support/Fixtures.java`에 정적 메서드로 둔다(`shipper()`, `driver()`, `admin()`, `vehicle(Member, VehicleType)`, `registeredOrder(Member shipper)`). 이후 모든 도메인이 이것을 쓴다.

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "*ErdMappingTest"`
Expected: 컴파일 실패

- [ ] **Step 3: 엔티티와 enum 구현**

위 표대로 만든다. `Order` 생성은 Task 4의 `Order.create`로 하므로, 이 Task에서는 테스트용으로 패키지 전용 생성자만 둔다. Task 4에서 이 생성자를 `create`로 바꾼다.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew spotlessApply test`
Expected: 전체 PASS (ArchitectureTest 포함)

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: ERD 엔티티와 공유 enum 정의"
```

---

### Task 4: 오더 상태 전이 (담당 C)

**Files:**
- Modify: `order/entity/Order.java`
- Create: `order/entity/OrderSpec.java`, `order/entity/StatusChange.java`, `order/entity/DisputeResolution.java`
- Test: `order/entity/OrderTransitionTest.java` (순수 단위 테스트, Spring 없이)

**Interfaces:**
- Consumes: Task 3의 `Order`, `Member`, `Role`, `OrderStatus`; Task 2의 `BusinessException`, `ErrorCode`
- Produces:
  - `record OrderSpec(Location pickup, Location dropoff, LocalDateTime pickupAt, LocalDateTime arriveBy, Cargo cargo, VehicleType requiredVehicleType, BodyType bodyType, LoadingMethod loadingMethod, String memo, long fare, long recommendedFare, double distanceKm)`
  - `record StatusChange(OrderStatus from, OrderStatus to)`
  - `enum DisputeResolution { PAY_DRIVER, REFUND_SHIPPER }`
  - `Order` 메서드(모두 위반 시 `BusinessException`):

| 메서드 | 허용 | 결과 |
| --- | --- | --- |
| `static Order create(Member shipper, OrderSpec spec)` | role=SHIPPER | REGISTERED |
| `long updateDetails(Member shipper, OrderSpec spec)` | 본인, REGISTERED | 상태 그대로, 내용 교체. 반환값은 바뀌기 전 fare(차액 결제·환불 계산용) |
| `StatusChange accept(Member driver, LocalDateTime now)` | role=DRIVER, REGISTERED | ASSIGNED, driver·assignedAt 설정 |
| `StatusChange cancelAssignment(Member driver, LocalDateTime now, Duration cutoff)` | 배정 차주, ASSIGNED, `now < pickupAt - cutoff` | REGISTERED, driver·assignedAt 비움 |
| `StatusChange cancel(Member actor)` | 화주 본인은 REGISTERED만, ADMIN은 REGISTERED·ASSIGNED | CANCELLED |
| `StatusChange startTransit(Member driver)` | 배정 차주, ASSIGNED | IN_TRANSIT |
| `StatusChange completeDropoff(Member driver, LocalDateTime now)` | 배정 차주, IN_TRANSIT | AWAITING_CONFIRM, droppedOffAt |
| `StatusChange confirmReceipt(Member shipper, LocalDateTime now)` | 화주 본인, AWAITING_CONFIRM | COMPLETED, completedAt |
| `StatusChange autoConfirm(LocalDateTime now, Duration after)` | AWAITING_CONFIRM, `now >= droppedOffAt + after` | COMPLETED |
| `StatusChange reportIssue(Member shipper)` | 화주 본인, AWAITING_CONFIRM | DISPUTED |
| `StatusChange resolveDispute(Member admin, DisputeResolution r, LocalDateTime now)` | ADMIN, DISPUTED | PAY_DRIVER→COMPLETED, REFUND_SHIPPER→CANCELLED |

  오류 코드: 상태가 안 맞으면 `INVALID_STATUS_TRANSITION`, 역할이 안 맞으면 `FORBIDDEN`, 본인/배정 차주가 아니면 `NOT_ORDER_OWNER`, 차주 취소 기한이 지나면 `DRIVER_CANCEL_CUTOFF_PASSED`. 판정 순서는 역할 → 소유 → 상태 → 기한.
  version 비교, 차종 불일치, 결제, 이력 저장은 이 엔티티의 일이 아니다(서비스 담당 D·E·C).

- [ ] **Step 1: Write the failing tests**

`Fixtures`로 shipper, otherShipper, driver, otherDriver, admin을 만들고(id 지정) `pickupAt = 2026-12-01T10:00`.

```java
@Test void happyPath_registeredToCompleted() {
    Order o = Order.create(shipper, spec());
    assertThat(o.accept(driver, T0)).isEqualTo(new StatusChange(REGISTERED, ASSIGNED));
    o.startTransit(driver);
    o.completeDropoff(driver, T1);
    assertThat(o.confirmReceipt(shipper, T2)).isEqualTo(new StatusChange(AWAITING_CONFIRM, COMPLETED));
    assertThat(o.getCompletedAt()).isEqualTo(T2);
}
@Test void accept_whenAlreadyAssigned_fails()            // INVALID_STATUS_TRANSITION
@Test void accept_byShipper_fails()                      // FORBIDDEN
@Test void startTransit_byOtherDriver_fails()            // NOT_ORDER_OWNER  (Review Focus 1)
@Test void cancel_byShipperAfterAssigned_fails()         // INVALID_STATUS_TRANSITION
@Test void cancel_byOtherShipper_fails()                 // NOT_ORDER_OWNER
@Test void cancel_byAdminWhenAssigned_succeeds()         // ASSIGNED -> CANCELLED
@Test void cancel_byAdminWhenInTransit_fails()           // INVALID_STATUS_TRANSITION
@Test void cancelAssignment_before2h_returnsToRegistered() {
    o.accept(driver, T0);
    assertThat(o.cancelAssignment(driver, pickupAt.minusHours(3), Duration.ofHours(2)))
        .isEqualTo(new StatusChange(ASSIGNED, REGISTERED));
    assertThat(o.getDriver()).isNull();
}
@Test void cancelAssignment_within2h_fails()             // pickupAt.minusMinutes(119) -> DRIVER_CANCEL_CUTOFF_PASSED
@Test void cancelAssignment_exactly2hBefore_fails()      // pickupAt.minusHours(2) -> DRIVER_CANCEL_CUTOFF_PASSED
@Test void autoConfirm_before24h_fails()                 // droppedOffAt + 23h59m -> INVALID_STATUS_TRANSITION
@Test void autoConfirm_after24h_completes()              // droppedOffAt + 24h -> COMPLETED
@Test void reportIssue_thenAdminPaysDriver_completes()   // DISPUTED -> COMPLETED
@Test void reportIssue_thenAdminRefunds_cancels()        // DISPUTED -> CANCELLED
@Test void updateDetails_whenAssigned_fails()            // INVALID_STATUS_TRANSITION
@Test void confirmReceipt_twice_secondFails()            // COMPLETED에서 다시 -> INVALID_STATUS_TRANSITION
```

주석으로 적은 테스트도 위 첫 두 개처럼 `assertThatThrownBy(...).extracting("errorCode").isEqualTo(...)`로 끝까지 쓴다.

- [ ] **Step 2: Run test to verify it fails**

Run: `./gradlew test --tests "*OrderTransitionTest"`
Expected: 컴파일 실패(`create`, `accept` 등 없음)

- [ ] **Step 3: 구현**

`Order`에 위 메서드를 추가하고, Task 3의 임시 생성자를 지운다(`ErdMappingTest`는 `Order.create`로 바꾼다). 공통 검사는 private 메서드 `requireRole(Member, Role)`, `requireOwner(Member)`, `requireAssignedDriver(Member)`, `requireStatus(OrderStatus...)`로 묶는다. 상태 변경은 private `StatusChange moveTo(OrderStatus next)` 하나로만 한다.

- [ ] **Step 4: Run test to verify it passes**

Run: `./gradlew spotlessApply test`
Expected: 전체 PASS

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: 오더 상태 전이 메서드와 전이 규칙 테스트"
```

---

### Task 5: 인증(JWT)과 member 견본 도메인 (담당 A)

이 도메인이 둘째 주 모든 도메인의 견본이다. controller → service → repository → dto 구성, 테스트 방식, 이름 짓기를 다른 사람이 그대로 따라 할 수 있게 만든다.

**Files:**
- Create: `global/security/JwtTokenProvider.java`, `JwtAuthenticationFilter.java`, `AuthMember.java`, `SecurityConfig.java`, `JsonAuthEntryPoint.java`, `JsonAccessDeniedHandler.java`
- Create: `member/repository/MemberRepository.java`
- Create: `member/service/MemberService.java`, `AuthService.java`
- Create: `member/controller/AuthController.java`, `MemberController.java`
- Create: `member/dto/SignupRequest.java`, `LoginRequest.java`, `TokenResponse.java`, `MemberResponse.java`
- Test: `member/service/MemberServiceTest.java`, `member/controller/AuthControllerTest.java`

**Interfaces:**
- Consumes: Task 2 `ApiResponse`, `ErrorCode`; Task 3 `Member`, `Role`
- Produces:
  - `record AuthMember(Long id, Role role)` — 컨트롤러에서 `@AuthenticationPrincipal AuthMember me`로 받는다
  - `JwtTokenProvider`: `String createToken(Long memberId, Role role)`, `AuthMember parse(String token)`(실패 시 `BusinessException(UNAUTHORIZED)`)
  - `MemberService.getById(Long id): Member` (없으면 `NOT_FOUND`). 다른 도메인은 회원이 필요하면 이 메서드를 쓴다.
  - 권한: `@EnableMethodSecurity`. 메서드에 `@PreAuthorize("hasRole('SHIPPER')")` 식으로 단다. URL 규칙은 `/api/auth/**`, `/swagger-ui/**`, `/v3/api-docs/**` 허용, `/api/admin/**`는 `hasRole('ADMIN')`, 나머지 인증 필요.
  - API: `POST /api/auth/signup` `{email, password, name, phone, role}` → `MemberResponse{id, email, name, phone, role}`; `POST /api/auth/login` `{email, password}` → `TokenResponse{accessToken, role}`; `GET /api/members/me` → `MemberResponse`
  - 검증: email `@Email @NotBlank`, password 8자 이상, role은 SHIPPER 또는 DRIVER만(ADMIN은 시드로만 만든다)

- [ ] **Step 1: Write the failing tests**

`MemberServiceTest`(`@SpringBootTest @ActiveProfiles("test") @Transactional`):
```java
@Test void signup_storesLowercaseEmailAndHashedPassword()   // "A@X.com" -> 저장된 email "a@x.com", password != 원문
@Test void signup_duplicateEmailIgnoringCase_fails()        // "a@x.com" 후 "A@x.com" -> DUPLICATE_EMAIL (Review Focus 4)
@Test void signup_asAdmin_fails()                           // role ADMIN -> INVALID_INPUT
@Test void login_wrongPassword_fails()                      // INVALID_CREDENTIALS
@Test void login_unknownEmail_failsWithSameCode()           // INVALID_CREDENTIALS (이메일 존재 여부를 드러내지 않음)
```
`AuthControllerTest`(`@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles("test")`):
```java
@Test void signupLoginMe_flow() {
    // signup 200 -> login 200, $.data.accessToken 존재 -> GET /api/members/me with Bearer -> $.data.email
}
@Test void me_withoutToken_returns401Json() {
    mvc.perform(get("/api/members/me"))
       .andExpect(status().isUnauthorized())
       .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
}
@Test void me_withInvalidToken_returns401Json()            // "Bearer abc.def.ghi" -> 401, UNAUTHORIZED (Review Focus 2)
@Test void me_withExpiredToken_returns401Json()            // validity -1초로 만든 토큰 -> 401
@Test void adminPath_withShipperToken_returns403Json()     // GET /api/admin/ping(테스트 전용 컨트롤러) -> 403, FORBIDDEN
@Test void signup_invalidEmail_returns400()                // INVALID_INPUT, fieldErrors.email
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `./gradlew test --tests "*member*"`
Expected: 컴파일 실패

- [ ] **Step 3: 구현**

`SecurityConfig`: CSRF 끔, 세션 STATELESS, `JwtAuthenticationFilter`를 `UsernamePasswordAuthenticationFilter` 앞에 둔다. 권한 이름은 `ROLE_` + role. 인증 실패와 권한 부족은 각각 `JsonAuthEntryPoint`, `JsonAccessDeniedHandler`가 `ApiResponse.fail(UNAUTHORIZED|FORBIDDEN)` JSON으로 쓴다. 필터는 토큰이 없으면 통과시키고, 있는데 틀리면 인증 없이 통과시켜 EntryPoint가 401을 내게 한다. `PasswordEncoder`는 `BCryptPasswordEncoder`. jjwt는 `Keys.hmacShaKeyFor(secret.getBytes(UTF_8))`, HS256, subject=memberId, claim `role`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `./gradlew spotlessApply test`
Expected: 전체 PASS. 서버를 띄우고 `http://localhost:8080/swagger-ui/index.html`에서 세 API가 보인다.

- [ ] **Step 5: Commit**

```bash
git commit -am "feat: JWT 인증과 회원가입·로그인 견본 도메인"
```

---

### Task 6: 시드 데이터와 AI 규칙 파일 (담당 B)

**Files:**
- Create: `backend/src/main/resources/data.sql`
- Modify: `AGENTS.md`, `README.md` (`AGENTS.md`, `CLAUDE.md`는 이미 저장소에 있다)

**Interfaces:**
- Consumes: Task 3 테이블 이름과 컬럼, Task 5 BCrypt
- Produces: 로컬 시드 계정. `admin@freight.test`(ADMIN), `shipper1@freight.test`(SHIPPER), `driver1@freight.test`(DRIVER, 5톤 카고 차량), `driver2@freight.test`(DRIVER, 1톤 탑차 차량). 비밀번호는 팀 공통 테스트 비밀번호 하나로 정하고 README에만 적는다.

- [ ] **Step 1: `data.sql` 작성**

모든 INSERT는 `INSERT IGNORE`이고, 고정 id(1~4)를 쓴다. 비밀번호 컬럼에는 공통 테스트 비밀번호의 BCrypt 해시를 넣는다(`new BCryptPasswordEncoder().encode(...)`로 한 번 만들어 붙여 넣는다).
`fare_rate`: 설계 문서 4장 표 그대로 — `TON_1` 30000/1000, `TON_2_5` 50000/1400, `TON_5` 80000/1900, `TON_11` 130000/2600, `TON_25` 200000/3500.
`fare_surcharge`: `NIGHT` 0.20, `WEEKEND` 0.10, `MANUAL_LOADING` 0.15, `URGENT` 0.30 (할증률 초기값은 설계 문서가 구현자에게 맡긴 값. 바꾸면 README에 기록).

- [ ] **Step 2: 로컬 실행 확인**

로컬 MariaDB에 `freight` DB와 계정을 만들고 `application-local.properties`를 채운다.
Run: STS Boot Dashboard에서 `freight` Start (또는 `./gradlew bootRun`)
Expected: 기동 성공. `shipper1@freight.test`로 `POST /api/auth/login`이 200을 돌려준다.

- [ ] **Step 3: 재시작 확인 (Review Focus 3)**

서버를 끄고 STS에서 다시 Start한다.
Expected: 중복 키 오류 없이 기동되고, `members`는 4행 그대로다.

- [ ] **Step 4: AI 규칙 파일**

`AGENTS.md`: 이미 있는 파일(설계 문서 10장 초안 기반)에 아래 세 줄을 추가한다.
- `새 도메인은 member 도메인(Task 5 결과)을 견본으로 같은 구조, 같은 테스트 방식으로 만든다.`
- `테스트 데이터는 src/test/java/.../support/Fixtures.java를 쓴다.`
- `docs/는 팀 공통 기준이다. 작업 중에 고치지 말고, 고칠 필요가 있으면 팀에 먼저 공유한 뒤 별도 PR로 고친다.`
`CLAUDE.md`: 이미 `@AGENTS.md`로 AGENTS.md를 불러오므로 고치지 않는다. Codex, Copilot, Antigravity는 AGENTS.md를 직접 읽으므로 `GEMINI.md`는 두지 않는다.
`README.md`: 실행 방법(MariaDB 준비, STS 설정(JDK 21, Gradle 프로젝트 불러오기, UTF-8, Lombok, 자동 정렬 끄기), `application-local.properties` 만들기, Boot Dashboard 실행, `npm run dev`), 시드 계정과 공통 테스트 비밀번호, Swagger 주소, 브랜치·커밋 규칙.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/resources/data.sql AGENTS.md README.md
git commit -m "chore: 시드 데이터, AI 규칙 파일, README"
```

---

### Task 7: 프론트 뼈대와 로그인 (담당 E)

**Files:**
- Create: `frontend/` (Vite React, JavaScript)
- Create: `frontend/vite.config.js`, `eslint.config.js`, `.prettierrc`
- Create: `frontend/src/api/client.js`, `src/api/auth.js`
- Create: `frontend/src/auth/AuthContext.jsx`, `src/auth/RequireRole.jsx`
- Create: `frontend/src/layouts/AppLayout.jsx`
- Create: `frontend/src/pages/LoginPage.jsx`, `SignupPage.jsx`, `NotFoundPage.jsx`, 역할별 자리 표시 페이지
- Create: `frontend/src/App.jsx`(라우터)

**Interfaces:**
- Consumes: Task 5 API, `ApiResponse` 형식
- Produces:
  - `client`(axios 인스턴스): baseURL `/api`, 요청마다 `localStorage.accessToken`을 `Authorization: Bearer`로 붙인다. 응답이 401이면 토큰을 지우고 `/login`으로 보낸다. 성공 시 `response.data.data`를, 실패 시 `{ code, message, fieldErrors }`를 담은 Error를 던진다.
  - `useAuth()`: `{ me: {id, email, name, role} | null, login(email, password), logout() }`
  - `<RequireRole role="SHIPPER|DRIVER|ADMIN">`: 로그인하지 않았으면 `/login`, 역할이 다르면 그 역할의 첫 화면으로 보낸다.
  - 라우트(설계 문서 6장): `/login`, `/signup`, `/shipper/orders/new`, `/shipper/orders`, `/shipper/orders/:id`, `/driver/vehicle`, `/driver/orders`, `/driver/jobs`, `/admin`, `/admin/fares`, `/admin/orders`, `/admin/disputes`, `/admin/members`. 이 Task에서는 로그인·회원가입 외 화면은 제목만 있는 자리 표시 페이지다.
  - 역할별 첫 화면: SHIPPER → `/shipper/orders`, DRIVER → `/driver/orders`, ADMIN → `/admin`

- [ ] **Step 1: 생성과 도구 설정**

```bash
npm create vite@latest frontend -- --template react
cd frontend && npm i react-router-dom axios && npm i -D prettier eslint-config-prettier
```
`vite.config.js`에 `server.proxy['/api'] = 'http://localhost:8080'`. `package.json` scripts에 `"lint": "eslint ."`, `"format": "prettier --write src"`.

- [ ] **Step 2: 구현**

위 Interfaces대로 만든다. 레이아웃은 360px 폭에서 가로 스크롤이 생기지 않게 한다. 상단에 역할 이름과 로그아웃 버튼을 둔다. UI 라이브러리는 팀이 정한 뒤 이 Task 안에서 설치한다(설계 문서 11장: 팀이 하나로 통일).

- [ ] **Step 3: 확인**

Run: `npm run lint && npm run build`
Expected: 오류 0, 빌드 성공.
수동 확인(백엔드 실행 중): `npm run dev` → 각 시드 계정으로 로그인하면 역할별 첫 화면으로 이동한다 / 차주로 로그인한 상태에서 `/admin` 주소를 직접 열면 `/driver/orders`로 돌아간다 / localStorage의 토큰을 아무 문자열로 바꾸고 새로고침하면 `/login`으로 간다.

- [ ] **Step 4: Commit**

```bash
git add frontend
git commit -m "feat: 프론트 뼈대, 라우팅, 로그인·회원가입"
```

---

## 첫 주 완료 기준

- `develop`에 Task 1~7이 모두 합쳐져 있고 CI가 초록색이다.
- 5명 모두 자기 PC에서 STS 서버 + `npm run dev`로 시드 계정 로그인까지 된다.
- 각자 쓰는 AI 도구에서 superpowers 설치 여부를 확인했다(설계 문서 10장).
- 둘째 주 시작 전에 각 담당이 로드맵을 보고 자기 도메인 계획을 `docs/superpowers/plans/`에 커밋한다.
