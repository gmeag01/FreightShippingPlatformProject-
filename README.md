# 화물운송플랫폼 (FreightShippingPlatform)

화주가 운송 의뢰를 올리고, 차주가 골라 수락해 운송하면, 화주의 수령 확인 후 플랫폼이 보관하던 운임을 차주에게 지급하는(에스크로, 더미 결제) 화물 중개 웹 플랫폼입니다.

- 설계: [docs/superpowers/specs/2026-11-02-freight-platform-design.md](docs/superpowers/specs/2026-11-02-freight-platform-design.md)
- 로드맵: [docs/superpowers/plans/2026-11-02-roadmap.md](docs/superpowers/plans/2026-11-02-roadmap.md)
- AI 도구 규칙: [AGENTS.md](AGENTS.md)

## 구성

| 폴더 | 내용 |
| --- | --- |
| `backend/` | Spring Boot 3.5 / Java 21 / Gradle |
| `frontend/` | React + Vite (Task 7에서 추가) |

## 백엔드 로컬 실행 (STS)

1. JDK 21 설치, STS의 Window → Preferences → Java → Installed JREs에 JDK 21 추가
2. Preferences → General → Workspace → Text file encoding을 **UTF-8**로 변경
3. STS에 Lombok 설치 (lombok.jar 실행 후 STS 설치 경로 선택)
4. 저장 시 자동 정렬은 끈다. 코드 형식은 커밋 전에 `gradlew spotlessApply`로 맞춘다
5. File → Import → Existing Gradle Project → `backend` 폴더
6. MariaDB에 DB와 계정을 만들고 `backend/src/main/resources/application-local.example.yml`을 복사해 `application-local.yml`을 만든 뒤 값을 채운다 (Git에 올라가지 않음)
7. Boot Dashboard에서 `freight` → Start (또는 `cd backend && ./gradlew bootRun`)

## 커밋 전 확인

```bash
cd backend && ./gradlew spotlessApply test
```

시드 계정, Swagger 주소, 프론트 실행 방법은 이후 작업(Task 6, 7)에서 추가합니다.
