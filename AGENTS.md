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
- 화물 중개 웹 플랫폼. 백엔드 Spring Boot 3 / Java 21 / JPA / MariaDB, 프론트 React 19 / Vite / Tailwind CSS.
- 역할: SHIPPER(화주), DRIVER(차주), ADMIN(관리자).

## 패키지 구조
- com.freight.<도메인>.{controller,service,repository,entity,dto}
- 도메인: member, vehicle, fare, order, matching, delivery, payment. 공통은 global.
- 새 도메인 코드는 member 도메인을 견본으로 같은 모양으로 만든다.

## 프론트 규칙
- 컴포넌트 파일도 .js로 만든다. .jsx는 쓰지 않는다(vite.config.js의 jsx-in-js 플러그인이 .js 안의 JSX를 처리한다).
- 스타일은 Tailwind CSS 클래스(className)로만 쓴다. 화면마다 CSS 파일이나 style 속성을 만들지 않는다. 공통 값은 src/index.css의 @theme에 둔다.
- API 호출은 src/api/client.js(axios 인스턴스)를 쓰고, 도메인별 함수는 src/api/<도메인>.js에 둔다.
- 로그인 상태는 useAuth(), 역할 확인은 RequireRole을 쓴다. 화면은 src/pages/에 만들고, App.js의 PlaceholderPage 자리를 자기 화면으로 바꾼다.

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

## 코드 스타일과 주석
처음 보는 팀원도 읽고 이해할 수 있는 코드를 우선한다. 짧게 줄인 코드보다 이름과 구조로 의도가 드러나는 코드를 쓴다.
- 이름: 줄임말 대신 뜻이 드러나는 이름을 쓴다(cnt → count, ord → order). boolean은 is/has/can으로, 메서드·함수는 동사로 시작한다.
- 한 메서드(함수)는 한 가지 일만 한다. 30줄쯤 넘거나 단계가 여러 개면 이름 있는 작은 메서드로 나눈다.
- 중첩은 2단계까지만 둔다. 예외·잘못된 입력은 먼저 검사하고 바로 return/throw 한다.
- 의미 있는 숫자·문자열은 상수나 enum으로 둔다(예: 24 → AUTO_CONFIRM_HOURS).
- 주석은 한국어로 쓴다.
- 클래스, public 메서드(controller, service, 엔티티 상태 전이), React 컴포넌트·훅 위에는 무엇을 하는지 한두 줄 기능 주석을 단다. Java는 /** */, JS는 //.
- 코드만 보고 알기 어려운 '왜'를 주석으로 남긴다: 업무 규칙, 예외 처리 이유, 설계 문서 근거(예: // 설계 문서 3장: 상차 2시간 전부터는 차주가 직접 취소할 수 없다).
- 코드를 그대로 읽어 주는 주석(// i를 1 증가)은 쓰지 않는다. 코드를 바꾸면 그 주석도 같이 고친다.
- 할 일은 // TODO(담당): 내용 형식으로 남긴다(예: // TODO(E): 분쟁 사유 길이 제한).
- 테스트 이름은 무엇을 확인하는지 드러나게 짓는다(예: startTransit_byOtherDriver_fails).
- 줄 바꿈·들여쓰기는 Spotless(백엔드)와 Prettier(프론트)가 맞추므로 손으로 맞추지 않는다.

## superpowers
- 설계 기준은 docs/superpowers/specs/2026-11-02-freight-platform-design.md 다. 기능별 브레인스토밍은 이 문서가 비워 둔 부분만 정한다.
- 계획은 docs/superpowers/plans/ 에 커밋한다.
- 상태 전이, 동시 수락, 추천 운임은 테스트를 먼저 쓴다.
- superpowers를 지원하지 않는 도구도 이 파일의 규칙은 똑같이 따른다.

## 작업 전후 확인
- 커밋 전에 ./gradlew spotlessApply test 가 통과해야 한다.
- 프론트는 npm run format 후 npm run lint, npm run build 가 통과해야 한다.

## 브랜치와 PR
- main, develop에 직접 push하지 않는다.
- 작업(Task) 하나에 브랜치 하나, PR 하나만 쓴다. 수정할 때마다 새 브랜치나 새 PR을 만들지 않는다.
- 새 브랜치를 만들기 전에 같은 작업의 브랜치나 열린 PR이 있는지 먼저 확인하고, 있으면 그 브랜치로 바꿔 이어서 커밋한다. (AI 도구가 세션마다 새 브랜치를 만들어도 기존 작업 브랜치로 옮겨서 한다.)
- 첫 push 때 Draft PR을 열고(gh pr create --draft), 이후 커밋은 같은 브랜치에 push해 그 PR에 쌓는다.
- 작업이 끝나면 PR을 Ready for review로 바꾸고, 검사가 통과하면 올린 사람이 Squash로 직접 합친다. 승인은 필수가 아니다.
- 문서(docs/, AGENTS.md) 수정은 기능 PR에 섞지 않는다. 그 주의 문서 수정은 chore/docs-week<N> 브랜치 하나(PR 하나)에 모은다.
- develop을 main으로 바로 PR하지 않는다. 배포는 설계 문서 9장 '배포 절차'(release/<태그> 브랜치 + git merge -s ours origin/main)대로만 한다.
