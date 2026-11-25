# API 명세

- 원본: Notion [4184LAB](https://app.notion.com/p/4184LAB-4085e0b9df8e8052b347c1f6f635a5a6) (읽기 전용 — Notion은 수정하지 않음)
- 정리 일자: 2026-11-20 (2026-11-25 Notion 재확인: 7건 내용 변경 없음)
- 원본에 없거나 애매한 내용은 **⚠️ 확인 필요**로 표시했다. `[코드 기준]`은 Notion에는 없고 `backend/src` 코드에서 확인한 내용이다.

## 공통

| 항목 | 내용 |
| --- | --- |
| Base path | `/api/v1` (Notion 경로 기준. 코드: `main.ts`의 global prefix `api` + URI versioning `v1`) |
| 인증 방식 | ⚠️ 확인 필요 — Notion 각 페이지에 인증 방식이 명시돼 있지 않음. `[코드 기준]` `Authorization: Bearer <accessToken>` (JWT, HS256). 만료 기본 900초(`JWT_EXPIRES_IN_SECONDS`) |
| 에러 형식 | `{ "message": string, "error": string, "statusCode": number }` (NestJS 기본 형식, Notion 예시 기준) |
| 검증 실패 | ⚠️ 확인 필요 — Notion에 400 예시 없음. `[코드 기준]` `400 { message: "Validation failed", errors: [{ path, message, code }] }` |

## 엔드포인트 요약 (Notion "API 명세서" DB, 총 7건)

| API | 메서드 | 경로 | 인증 |
| --- | --- | --- | --- |
| 회원가입 | POST | `/api/v1/auth/register` | 불필요 |
| 로그인 | POST | `/api/v1/auth/login` | 불필요 |
| 토큰 재발행 | POST | `/api/v1/auth/reissue` | 불필요 ⚠️ |
| 로그아웃 | POST | `/api/v1/auth/logout` | 필요 |
| 관리자 권한 확인 | GET | `/api/v1/auth/admin` | 필요 (ADMIN) |
| 내 정보 조회 | GET | `/api/v1/users/me` | 필요 |
| 내 정보 수정 | PATCH | `/api/v1/users/me` | 필요 |

인증 열은 Notion 응답 예시(401/403 유무)와 코드에서 추론한 것이다. ⚠️ 확인 필요.

---

## 1. 회원가입 — `POST /api/v1/auth/register`

회원가입 기능.

**파라미터 (body, JSON)**

| 이름 | 설명 | 필수 |
| --- | --- | --- |
| `username` | 사용자 아이디 | O |
| `password` | 사용자 비밀번호 | O |
| `name` | 사용자 이름 | O |
| `role` | 사용자 권한 (생략 시 USER 권한) | X |

- ⚠️ 확인 필요: 길이 제한이 원문에 없음. `[코드 기준]` username 1–50자, password 1–128자, name 1–100자, role은 `USER` \| `ADMIN`.
- ⚠️ 확인 필요: 클라이언트가 `role: "ADMIN"`을 보내면 그대로 관리자로 가입됨. `[코드 기준]` `user.service.ts`에 "파라미터 변조 실습" 주석이 있는 의도된 취약점이다.

**요청 예시**
```json
{ "username": "testuser", "password": "1234", "name": "테스트", "role": "USER" }
```

**응답 — 200 OK**
```json
{ "id": "8941305d-8822-4295-99cb-fa3f4f20df3d", "username": "testuser2", "name": "테스트2", "role": "USER" }
```
- 명세대로 200을 반환한다. 2026-11-25에 `auth.controller.ts`에 `@HttpCode(200)`을 추가했다 (이전에는 NestJS `@Post` 기본값인 201을 반환했다).

**에러**

| 상태 | 사유 | 본문 |
| --- | --- | --- |
| 409 Conflict | 이미 가입된 아이디 | `{ "message": "이미 사용 중인 아이디입니다.", "error": "Conflict", "statusCode": 409 }` |

## 2. 로그인 — `POST /api/v1/auth/login`

로그인 기능.

**파라미터 (body)**

| 이름 | 설명 | 필수 |
| --- | --- | --- |
| `username` | 사용자 아이디 | O |
| `password` | 사용자 비밀번호 | O |

**요청 예시**: ⚠️ 확인 필요. 원문 예시가 `{ "name": "수정한이름" }`인데, 내 정보 수정 예시를 복사한 것으로 보인다. 파라미터 표대로라면 다음과 같다.
```json
{ "username": "testuser", "password": "1234" }
```

**응답 — 200 OK**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...." }
```
JWT payload: `{ userId, userName, iat, exp }`

**에러**

| 상태 | 사유 | 본문 message |
| --- | --- | --- |
| 401 Unauthorized | 존재하지 않는 아이디 | `존재하지 않는 아이디입니다.` |
| 401 Unauthorized | 비밀번호 불일치 | `비밀번호가 틀렸습니다.` |

- 참고: 에러 메시지로 계정이 있는지 알 수 있다 (의도된 취약점, `auth.service.ts` 주석).
- ⚠️ 확인 필요: refresh token 발급 여부. 원문과 코드 모두 accessToken만 준다.

## 3. 토큰 재발행 — `POST /api/v1/auth/reissue`

accessToken 재발행 기능.

**파라미터 (body)**

| 이름 | 설명 | 필수 |
| --- | --- | --- |
| `userId` | 사용자 uuid | O |

**요청 예시**: ⚠️ 확인 필요. 원문 예시가 `{ "name": "수정한이름" }`로 잘못 들어가 있다. 파라미터 표대로라면 다음과 같다.
```json
{ "userId": "8941305d-8822-4295-99cb-fa3f4f20df3d" }
```

**응답 — 200 OK**
```json
{ "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...." }
```

**에러**

| 상태 | 사유 | 본문 message |
| --- | --- | --- |
| 401 Unauthorized | 존재하지 않는 사용자 | `존재하지 않는 사용자입니다.` |
| 400 Bad Request | ⚠️ 원문에 없음. `[코드 기준]` userId가 uuid 형식이 아님 | `Validation failed` |

- ⚠️ 확인 필요: 인증 없이 userId만으로 토큰을 발급한다. `[코드 기준]` "의도적인 인증 누락" 주석이 있다.

## 4. 로그아웃 — `POST /api/v1/auth/logout`

로그아웃 기능.

**파라미터**: 원문에 파라미터 표가 없다. 인증 헤더만 필요한 것으로 보인다.

**요청 예시**: ⚠️ 확인 필요. 원문 예시가 `{ "name": "수정한이름" }`인데, 실제로는 body가 필요 없다 `[코드 기준]`.

**응답 — 200 OK**
```json
{ "message": "로그아웃되었습니다." }
```

**에러**

| 상태 | 본문 |
| --- | --- |
| 401 Unauthorized | `{ "message": "Unauthorized", "statusCode": 401 }` |

- 참고: 서버에서 토큰을 폐기하지 않으므로, 로그아웃 후에도 같은 토큰을 다시 쓸 수 있다 `[코드 기준]`.

## 5. 관리자 권한 확인 — `GET /api/v1/auth/admin`

관리자 권한을 확인하는 기능.

**파라미터**: 없음 (원문에 표 없음)

**요청 예시**: ⚠️ 확인 필요. 원문 예시가 `{ "name": "수정한이름" }`인데, GET이라 body가 없어야 한다.

**응답 — 200 OK**
```json
{ "id": "8941305d-8822-4295-99cb-fa3f4f20df3d", "username": "testuser2", "name": "테스트2", "role": "ADMIN" }
```

**에러**

| 상태 | 사유 | 본문 |
| --- | --- | --- |
| 403 Forbidden | ADMIN 아님 | `{ "message": "관리자 권한이 필요합니다.", "error": "Forbidden", "statusCode": 403 }` |
| 401 Unauthorized | ⚠️ 원문에 없음. `[코드 기준]` 토큰 없음/만료 | `{ "message": "Unauthorized", "statusCode": 401 }` |

## 6. 내 정보 조회 — `GET /api/v1/users/me`

내 정보 조회하는 기능.

**파라미터**: ⚠️ 확인 필요. 원문 표에 템플릿 자리표시자("파라미터 1 / 파라미터 설명을 적어주세요.")만 2줄 남아 있다. `[코드 기준]` 파라미터는 없다.

**요청 예시**: ⚠️ 확인 필요. 원문 예시가 `{ "name": "수정한이름" }`인데, GET이라 body가 없어야 한다.

**응답 — 200 OK**
```json
{ "id": "8941305d-8822-4295-99cb-fa3f4f20df3d", "username": "testuser2", "name": "테스트2", "role": "ADMIN" }
```

**에러**

| 상태 | 본문 |
| --- | --- |
| 401 Unauthorized | `{ "message": "Unauthorized", "statusCode": 401 }` |

## 7. 내 정보 수정 — `PATCH /api/v1/users/me`

내 정보를 수정하는 기능.

**파라미터 (body)**

| 이름 | 설명 | 필수 |
| --- | --- | --- |
| `name` | 사용자 이름 | O |

`[코드 기준]` 앞뒤 공백을 제거한 뒤 1–100자.

**요청 예시**
```json
{ "name": "수정한이름" }
```

**응답 — 200 OK**
```json
{ "id": "8941305d-8822-4295-99cb-fa3f4f20df3d", "username": "testuser2", "name": "수정한이름", "role": "ADMIN" }
```

**에러**

| 상태 | 본문 |
| --- | --- |
| 401 Unauthorized | `{ "message": "Unauthorized", "statusCode": 401 }` |

---

## Notion에 없는 엔드포인트 (⚠️ 확인 필요)

아래 엔드포인트는 코드에는 있지만 Notion "API 명세서"에는 없다. 명세에 추가할지 확인이 필요하다. `[코드 기준]`

| 메서드 | 경로 | 인증 | 비고 |
| --- | --- | --- | --- |
| GET | `/api/v1/notices` | 불필요 | 공지 목록 |
| GET | `/api/v1/notices/:id` | 불필요 | 공지 상세 |
| POST / PATCH / DELETE | `/api/v1/notices`, `/api/v1/notices/:id` | 필요 (ADMIN) | 공지 작성/수정/삭제(soft delete) |
| POST | `/api/v1/notices/:id/files` | 필요 (ADMIN) | 첨부 업로드, multipart 필드 `file`, 최대 10MB |
| GET | `/api/v1/posts`, `/api/v1/posts/:id` | 필요 | 일반 게시글 목록/상세 |
| POST / PATCH / DELETE | `/api/v1/posts`, `/api/v1/posts/:id` | 필요 (작성자) | 일반 게시글 작성/수정/삭제 |
| POST | `/api/v1/posts/:id/files` | 필요 (작성자) | 첨부 업로드 |
| GET | `/api/v1/files/download?filename=<storedName>` | 공지 첨부: 불필요 / 그 외: 필요 | 파일 다운로드 |

### 프론트엔드 연동을 위해 추가한 엔드포인트 (2026-11-24) `[코드 기준]`

프론트엔드 화면 기능을 백엔드로 옮기면서 추가했다. Notion에는 없다.

| 메서드 | 경로 | 인증 | 비고 |
| --- | --- | --- | --- |
| GET | `/api/v1/posts?q=` | 필요 | 기존 목록에 제목·내용 검색(`q`, 대소문자 무시)과 `_count.comments` 추가. 응답은 여전히 배열 |
| GET | `/api/v1/posts/:id/comments` | 필요 | 댓글 목록 `[{ id, content, authorId, createdAt, author: { name } \| null }]` |
| POST | `/api/v1/posts/:id/comments` | 필요 | body `{ content }` (공백 제거 후 1–1000자) |
| DELETE | `/api/v1/posts/:id/comments/:commentId` | 필요 (작성자 또는 ADMIN) | 하드 삭제 |
| GET | `/api/v1/users/me` | 필요 | 응답에 `createdAt` 추가 |
| GET | `/api/v1/users/me/activity` | 필요 | `{ posts: [일반 게시글 요약], commentCount }` |
| PATCH | `/api/v1/users/me/password` | 필요 | body `{ currentPassword, newPassword }`. 현재 비밀번호가 틀리면 400 |
| DELETE | `/api/v1/users/me` | 필요 | body `{ password }`. 마지막 관리자는 400. 작성한 글·댓글은 남고 작성자는 null |
| GET | `/api/v1/admin/overview` | ADMIN | `{ stats: { users, posts, notices, comments, postsToday }, users: [... , postCount], recentPosts }` |
| PATCH | `/api/v1/admin/users/:id/role` | ADMIN | body `{ role: "USER" \| "ADMIN" }`. 자기 자신은 400 |
| DELETE | `/api/v1/admin/users/:id` | ADMIN | 강제 탈퇴. 자기 자신·마지막 관리자는 400 |
| DELETE | `/api/v1/admin/posts/:id` | ADMIN | 작성자와 관계없이 일반 게시글 soft delete |
| GET | `/api/v1/admin/backup` | ADMIN | `{ users(비밀번호 제외), posts, comments, attachments }` |
| GET | `/api/v1/search?q=&type=posts\|comments\|users&sort=latest\|oldest&from=YYYY-MM-DD&to=YYYY-MM-DD` | 선택 | 비로그인: 공지만 / 로그인: 일반 글·댓글 / ADMIN: 회원까지. 비로그인 댓글 검색은 401, 비관리자 회원 검색은 403. 응답 `{ params, count, rows: [{ id, postType, postId, title, detail, author, createdAt }] }` |

동작 변경:
- 회원가입: DB에 회원이 하나도 없으면 첫 가입자는 `role`과 관계없이 ADMIN이 된다. 그 외에는 요청의 `role`을 그대로 저장한다 (파라미터 변조 실습은 유지).
- 스키마: `Comment` 모델 추가, `Post.authorId`를 nullable(`onDelete: SetNull`)로 바꿨다 (마이그레이션 `20261124110850_add_comment_and_nullable_author`). 작성자가 null인 일반 게시글은 누구도 수정·삭제할 수 없고, 관리자 API로만 삭제할 수 있다.

## 백엔드 기능 명세서 (메인서비스) — 계획 단계

Notion "백엔드 기능 명세서" DB에 있는 6건이다. 모두 **진행 여부: 진행 전**이고, 서비스 분류는 메인 서비스다. 원문에 경로와 응답 형식이 없고 권한·비고 칸도 모두 비어 있다. 코드에도 아직 구현되지 않았다. ⚠️ 경로, 권한, 응답 스키마 모두 확인 필요.

| 화면 | 기능 | 메서드 | 포함 데이터 (원문) |
| --- | --- | --- | --- |
| 메인화면 | 모든 동아리 조회 | GET | 배열: 동아리 이름, 분과, 모집 여부 |
| 동아리 상세정보 화면 | 동아리 상세정보 조회 | GET | 동아리 이름, 분과, 회장 이름, 위치, 회장 연락처, 모집 기간, SNS(인스타 혹은 유튜브), 모집 여부, 동아리 소개, 활동보고서 리스트(썸네일·제목·작성일자), 동아리 썸네일 |
| 공지사항 화면 | 공지사항 조회 | GET | 배열: 공지사항 제목, 작성 일자, 작성자 |
| 공지사항 상세정보 화면 | 공지사항 상세정보 조회 | GET | 공지사항 제목, 작성 일자, 작성자, 공지사항 내용, 첨부파일 |
| 활동보고서 화면 | 활동보고서 조회 | GET | 배열: 활동보고서 썸네일, 작성 동아리, 제목, 작성 일자 |
| 활동보고서 상세정보 화면 | 활동보고서 상세정보 조회 | GET | 활동보고서 썸네일, 작성한 동아리 이름, 제목, 작성일자, 내용 |

- ⚠️ 확인 필요: "동아리 상세정보 조회"의 각 항목 뒤에 `d` 또는 `s` 표시가 붙어 있는데 의미가 설명돼 있지 않다. `s`가 붙은 항목은 회장 이름과 활동보고서 리스트이고, 나머지는 모두 `d`다.
- ⚠️ 확인 필요: 공지사항 조회/상세가 기존 `/api/v1/notices` API와 같은 것인지.
