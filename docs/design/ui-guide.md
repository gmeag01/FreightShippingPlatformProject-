# 화면 디자인 기준

화면을 만들거나 고치기 전에 이 문서를 읽는다. 담당이 달라도 같은 제품처럼 보이게 하는 것이 목적이다.

- 업무 규칙(누가 무엇을 볼 수 있는가, 어떤 상태에서 무엇을 할 수 있는가)은 설계 문서가 기준이다. 이미지와 설계 문서가 다르면 설계 문서를 따르고 팀에 공유한다.
- 보이는 모습은 이 문서와 `screens/`의 이미지가 기준이다.
- 상황별 화면(오류, 빈 목록, 경고창)까지 모두 보려면 [화면 시안](https://claude.ai/artifact/1wTHqFuHmjx5Dq6s2mHhfW)을 연다.
- 시안의 HTML과 CSS는 복사하지 않는다. 화면은 AGENTS.md의 프론트 규칙대로 `.js` 컴포넌트와 Tailwind 클래스로 만든다.
- 이미지에 나온 이름, 금액, 주소는 예시 값이다.

## 색

값은 `frontend/src/index.css`의 `@theme`에 있다. 화면에서 `#172554` 같은 색 코드나 `bg-blue-600` 같은 기본 팔레트를 직접 쓰지 않고 아래 이름을 쓴다.

| 이름 | 값 | 클래스 예 | 쓰는 곳 |
| --- | --- | --- | --- |
| `ink` | `#172554` | `text-ink`, `bg-ink` | 제목, 금액, 강조 글자, 머리말 배경, 선택된 탭 |
| `copy` | `#1e293b` | `text-copy` | 본문 글자 |
| `muted` | `#475569` | `text-muted` | 보조 설명 |
| `subtle` | `#64748b` | `text-subtle` | 항목 이름, 시각 |
| `line` | `#dbeafe` | `border-line` | 카드와 표의 테두리 |
| `line-strong` | `#cbd5e1` | `border-line-strong` | 입력칸, 보조 버튼의 테두리 |
| `ground` | `#eff6ff` | `bg-ground` | 페이지 배경 |
| `card` | `#ffffff` | `bg-card` | 카드 배경 |
| `primary` | `#2563eb` | `bg-primary` | 주 버튼, 진행 단계 |
| `primary-dark` | `#1d4ed8` | `hover:bg-primary-dark` | 주 버튼에 마우스를 올렸을 때 |
| `primary-soft` | `#eff6ff` | `bg-primary-soft` | 안내 알림, 보관중 태그 |
| `signal` | `#ea580c` | `bg-signal` | 브랜드 표시, 지금 단계, 사용자가 처리할 일 |
| `signal-soft` | `#ffedd5` | `bg-signal-soft` | 처리 요청 알림, 경고 태그 |
| `signal-ink` | `#7c2d12` | `text-signal-ink` | `signal-soft` 위의 글자 |
| `danger` | `#b91c1c` | `text-danger` | 취소·정지 버튼, 오류 문구, 필수 표시 |
| `danger-soft` | `#fef2f2` | `bg-danger-soft` | 오류 알림 |

주황(`signal`)은 사용자가 지금 해야 할 일에만 쓴다. 장식으로 쓰면 강조가 약해진다.

## 오더 상태 뱃지

상태는 글자와 색을 함께 보여 준다. 색만으로 구분하지 않는다.

| 상태 | 화면 글자 | 클래스 |
| --- | --- | --- |
| `REGISTERED` | 등록됨 | `bg-status-registered text-status-registered-ink` |
| `ASSIGNED` | 배차완료 | `bg-status-assigned text-status-assigned-ink` |
| `IN_TRANSIT` | 운송중 | `bg-status-transit text-status-transit-ink` |
| `AWAITING_CONFIRM` | 수령확인대기 | `bg-status-awaiting text-status-awaiting-ink` |
| `COMPLETED` | 운송완료 | `bg-status-completed text-status-completed-ink` |
| `DISPUTED` | 분쟁 | `bg-status-disputed text-status-disputed-ink` |
| `CANCELLED` | 취소됨 | `bg-status-cancelled text-status-cancelled-ink` |

뱃지 모양: `inline-flex min-h-6 items-center rounded-sm px-2.5 text-caption font-semibold whitespace-nowrap`

## 글자

글꼴은 IBM Plex Sans KR(`font-sans`)이고, 오더 번호와 차량번호는 IBM Plex Mono(`font-mono`)를 쓴다.

| 쓰임 | 클래스 |
| --- | --- |
| 화면 제목 | `text-h1 font-bold text-ink` (360px 폭에서는 `text-h1-sm`) |
| 카드 제목 | `text-h2 font-bold text-ink` |
| 본문 | `text-body text-copy` |
| 보조 설명 | `text-sm text-muted` |
| 항목 이름, 힌트 | `text-caption text-subtle` |
| 금액 | `text-fare font-bold text-ink tabular-nums` |
| 상세 화면의 큰 금액 | `text-fare-lg font-bold text-ink tabular-nums` |
| 오더 번호 | `font-mono text-caption text-muted` |

금액, 시각, 거리, 중량처럼 숫자를 비교하는 값에는 `tabular-nums`를 붙인다. 한글이 단어 중간에서 끊기지 않게 페이지 바깥 틀에 `break-keep`을 둔다.

## 화면 틀

- 머리말: `bg-ink`, 높이 60px. 왼쪽에 주황 막대와 서비스 이름, 그 옆에 역할별 메뉴, 오른쪽에 역할·이름·로그아웃을 둔다. 현재 메뉴는 아래에 3px 주황 선을 긋는다.
- 본문: `mx-auto flex max-w-280 flex-col gap-5 px-6 pt-7 pb-14`. 360px 폭에서는 좌우 여백을 `px-4`로 줄인다.
- 상세 화면: 왼쪽에 넓은 본문, 오른쪽에 운임과 결제 같은 보조 카드를 둔다. 좁아지면 한 줄로 쌓는다.

## 구성 요소

| 요소 | 클래스 |
| --- | --- |
| 카드 | `rounded-lg border border-line bg-card p-5` (360px 폭에서는 `p-4`) |
| 버튼 공통 | `inline-flex min-h-11 items-center justify-center rounded-md border px-4.5 font-semibold whitespace-nowrap` |
| 주 버튼 | `border-transparent bg-primary text-white hover:bg-primary-dark` |
| 보조 버튼 | `border-line-strong bg-white text-copy hover:bg-slate-50` |
| 위험 버튼 | `border-red-300 bg-white text-danger` |
| 비활성 버튼 | `disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-200 disabled:text-muted` |
| 입력칸 | `min-h-11 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-ink` |
| 입력 이름 | `text-sm font-medium text-copy`, 필수 표시는 `text-danger`의 `*` |
| 오류 입력칸 | `border-2 border-danger`, 아래에 `text-caption font-medium text-danger`로 사유 |
| 탭 | `min-h-11 rounded-md border border-line-strong bg-white px-3.5 font-medium text-copy` |
| 선택된 탭 | `border-ink bg-ink text-white` |
| 태그 | `inline-flex min-h-6 items-center rounded-sm bg-slate-200 px-2 text-caption font-medium text-slate-700` |
| 표 틀 | `overflow-x-auto rounded-lg border border-line bg-white` |
| 표 머리 | `bg-slate-50 text-sm font-semibold text-muted` |
| 안내 알림 | `rounded-lg border border-blue-200 bg-primary-soft px-4 py-3.5 text-sm text-blue-900` |
| 처리 요청 알림 | `rounded-lg border border-orange-300 bg-signal-soft px-4 py-3.5 text-sm text-signal-ink` |
| 오류 알림 | `rounded-lg border border-red-200 bg-danger-soft px-4 py-3.5 text-sm text-red-800` |
| 경고창 | 폭 420px, `rounded-[10px] bg-white p-6`, 뒤 배경은 `ink`를 반투명하게 덮는다 |

구간 표시는 출발지와 도착지 사이에 선을 긋고, 출발지 쪽은 파란 원, 도착지 쪽은 `ink` 사각형으로 둔다. 지도의 상차지·하차지 표시도 같은 모양을 쓴다.

진행 단계는 다섯 칸으로 나누고, 끝난 단계는 `primary`, 지금 단계는 `signal`로 채운다.

## 지켜야 할 것

- 버튼, 탭, 입력칸의 높이는 44px(`min-h-11`) 이상으로 둔다. 휴대폰에서 누르기 위해서다.
- 360px 폭에서 가로 스크롤이 생기지 않아야 한다. 표는 표 틀 안에서만 스크롤한다.
- 카드 안의 주요 행동은 하나만 주 버튼으로 둔다. 나머지는 보조 버튼이다.
- 되돌릴 수 없는 처리(취소, 환불, 지급)는 확인창을 띄우고 금액을 문구에 적는다.
- 그림자와 그라데이션은 쓰지 않는다. 경고창만 그림자를 둔다.

## 화면 이미지

| 주소 | 화면 | 담당 | 이미지 |
| --- | --- | --- | --- |
| `/shipper/orders` | 내 오더 목록 | C | [shipper-orders](screens/shipper-orders.png) |
| `/shipper/orders/new` | 오더 등록 | C, B | [shipper-order-new](screens/shipper-order-new.png) |
| `/shipper/orders/:id/edit` | 오더 수정 | C | [shipper-order-edit](screens/shipper-order-edit.png) |
| `/shipper/orders/:id` | 오더 상세 | C, E | [shipper-order-detail](screens/shipper-order-detail.png) |
| `/driver/orders` | 의뢰 목록 | D | [driver-orders](screens/driver-orders.png) |
| `/driver/orders/:id` | 의뢰 상세 | D | [driver-order-detail](screens/driver-order-detail.png) |
| `/driver/jobs` | 내 운송 | E | [driver-jobs](screens/driver-jobs.png) |
| `/driver/jobs/:id` | 운송 상세 | E | [driver-job-detail](screens/driver-job-detail.png) |
| `/admin` | 대시보드 | A | [admin-dashboard](screens/admin-dashboard.png) |
| `/admin/orders` | 오더 관리 | C | [admin-orders](screens/admin-orders.png) |
| `/admin/orders/:id` | 관리자 오더 상세 | C, E | [admin-order-detail](screens/admin-order-detail.png) |
| `/admin/disputes` | 분쟁 처리 | E | [admin-disputes](screens/admin-disputes.png) |
| `/admin/fares` | 단가표 | B | [admin-fares](screens/admin-fares.png) |
| `/admin/members` | 회원 관리 | A | [admin-members](screens/admin-members.png) |

공통 상황과 휴대폰 폭의 예시는 아래 이미지를 본다.

- 상황별 화면: [common-states](screens/common-states.png), [common-dialogs](screens/common-dialogs.png)
- 휴대폰 폭: [mobile-driver-orders](screens/mobile-driver-orders.png), [mobile-driver-order-detail](screens/mobile-driver-order-detail.png), [mobile-driver-jobs](screens/mobile-driver-jobs.png), [mobile-shipper-order-detail](screens/mobile-shipper-order-detail.png)

와이어프레임은 화면 구조와 동작 메모를 볼 때 쓴다. 로그인, 회원가입, 내 차량처럼 위 표에 없는 화면은 와이어프레임의 구조에 이 문서의 색과 구성 요소를 입혀 만든다.

- [wire-common](screens/wire-common.png), [wire-shipper](screens/wire-shipper.png), [wire-driver](screens/wire-driver.png), [wire-admin](screens/wire-admin.png)

## 바꾸는 방법

- 색이나 글자 크기를 바꾸려면 `frontend/src/index.css`의 `@theme`과 이 문서를 함께 고친다. 한 화면에서만 값을 바꾸지 않는다.
- 이 문서에 없는 구성 요소가 필요하면 가장 비슷한 요소의 색과 크기를 따르고, 여러 화면에서 쓰게 되면 이 문서에 추가한다.
