# AGENTS.md

이 파일은 이 저장소에서 일하는 모든 AI 도구가 따르는 규칙이다.
설계는 docs/superpowers/specs/2026-11-02-freight-platform-design.md를 기준으로 한다.

## 작업 전에 읽을 문서
- 설계(기준): docs/superpowers/specs/2026-11-02-freight-platform-design.md
- 전체 로드맵(일정, 담당, 도메인 사이의 약속): docs/superpowers/plans/2026-11-02-roadmap.md
- 첫 주 공통 기반 계획: docs/superpowers/plans/2026-11-02-foundation.md
- 그 밖의 계획: docs/superpowers/plans/ 아래에서 맡은 작업에 해당하는 파일
- 문서와 다르게 구현해야 하면 먼저 팀에 공유하고 문서를 고친 뒤 진행한다.

## 프로젝트
- 화물 중개 웹 플랫폼. 백엔드 Spring Boot 3 / Java 21 / JPA / MariaDB, 프론트 React(Vite).
- 역할: SHIPPER(화주), DRIVER(차주), ADMIN(관리자).

## 패키지 구조
- com.freight.<도메인>.{controller,service,repository,entity,dto}
- 도메인: member, vehicle, fare, order, matching, delivery, payment. 공통은 global.
- 새 도메인 코드는 member 도메인을 견본으로 같은 모양으로 만든다.

## 반드시 지킬 것
- 다른 도메인의 repository를 직접 쓰지 않는다. 필요하면 그 도메인의 service를 호출한다.
- 오더 상태는 Order 엔티티의 상태 전이 메서드로만 바꾼다. setStatus를 만들거나 부르지 않는다.
- 컨트롤러는 엔티티가 아니라 DTO를 반환한다. 응답은 공통 응답 형식(ApiResponse)을 쓴다.
- 예외는 BusinessException(ErrorCode)로 던지고, 오류 코드는 ErrorCode enum에 추가한다.
- 상태 전이, 동시 수락, 추천 운임 코드를 바꾸면 관련 테스트도 함께 고친다.
- 비밀번호, API 키를 코드나 커밋에 넣지 않는다.
- 맡은 도메인 밖의 파일(global 포함)을 고칠 때는 PR 설명에 이유를 적는다.

## 이름 규칙
- API: /api/<복수형 자원> (예: /api/orders/{id}/accept), 관리자는 /api/admin/...
- DTO: <동작><대상>Request / <대상>Response (예: CreateOrderRequest, OrderResponse)
- 테이블·컬럼: snake_case, 엔티티 필드: camelCase

## superpowers
- 설계 기준은 docs/superpowers/specs/2026-11-02-freight-platform-design.md 다. 기능별 브레인스토밍은 이 문서가 비워 둔 부분만 정한다.
- 계획은 docs/superpowers/plans/ 에 커밋한다.
- 상태 전이, 동시 수락, 추천 운임은 테스트를 먼저 쓴다.
- superpowers를 지원하지 않는 도구도 이 파일의 규칙은 똑같이 따른다.

## 작업 전후 확인
- 커밋 전에 ./gradlew spotlessApply test 가 통과해야 한다.
- 프론트는 npm run lint 가 통과해야 한다.
- main, develop에 직접 push하지 않는다. 작업 브랜치에서 PR을 올리고, 승인은 필수가 아니므로 검사가 통과하면 올린 사람이 직접 합친다.
- develop을 main으로 바로 PR하지 않는다. 배포는 설계 문서 9장 '배포 절차'(release/<태그> 브랜치 + git merge -s ours origin/main)대로만 한다.
