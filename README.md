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
