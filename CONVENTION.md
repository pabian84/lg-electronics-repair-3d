# Commit Convention (Conventional Commits)

이 프로젝트는 커밋 메시지를 규칙적으로 작성해 변경 성격을 빠르게 파악하고,
릴리즈 노트/자동화에 활용할 수 있도록 Conventional Commits 형식을 사용합니다.

## 기본 형식

```
<type>(<scope>): <subject>
```

- type: 변경의 성격 (아래 목록 참조)
- scope: 변경이 영향을 주는 영역/폴더/기능
- subject: 한 줄 요약 (현재형, 마침표 없음, 50자 내외 권장)

## type 목록

- feat: 새로운 기능 추가
- fix: 버그 수정
- refactor: 리팩터링 (기능 변화 없음)
- perf: 성능 개선
- docs: 문서 변경
- test: 테스트 추가/수정
- style: 포맷/스타일 수정 (기능 변화 없음)
- rename: 파일 혹은 폴더명 수정
- remove: 파일 삭제
- chore: 빌드/설정/잡무
- build: 빌드 시스템 변경
- ci: CI 설정 변경

## scope 목록 (이 프로젝트 기준 예시)

- manual-editor: 타임라인/히스토리/에디터 화면
- animator: LLM 처리/AnimatorAgent
- viewer: 3D ModelViewer 및 카메라 포커싱
- ui: 공용 UI/스타일
- chat: AI 채팅 UI

필요하면 팀에서 scope를 추가/정리해서 사용합니다.

## 폴더 구조

- `src/pages`: 페이지(엔트리) 컴포넌트
- `src/components/pages/<page>`: 페이지 전용 하위 컴포넌트
- `src/components/shared/<domain>`: 여러 페이지에서 쓰는 공용 컴포넌트
- `src/components/shared/common`: 범용 UI/유틸 컴포넌트
- `src/shared`: UI가 아닌 공용 코드 (hooks/types/utils)
- `src/services`: API/LLM 등 서비스 로직
- `src/styles`: 전역 스타일

### import 규칙

- 페이지 컴포넌트는 `src/components/pages/<page>/index.ts`를 통해 가져옵니다.
- 공용 컴포넌트는 `src/components/shared/<domain>/index.ts`를 통해 가져옵니다.

## subject 규칙

- 현재형 동사로 시작 (Add, Fix, Update 등)
- 마침표 사용하지 않음
- 가능한 짧고 명확하게

## 본문/푸터 (선택)

복잡한 변경은 본문에 이유/배경/주의점을 작성합니다.

```
fix(manual-editor): keep timeline at end

Stop resetting timeline to 0s after completion to preserve final frame.
```

## Breaking Change

하위 호환이 깨지는 변경은 다음 중 하나로 표시합니다.

- `type(scope)!: subject`
- 본문/푸터에 `BREAKING CHANGE:` 추가

예시:

```
feat(animator)!: change command schema

BREAKING CHANGE: LLM response schema changed.
```

## 이 프로젝트 예시

- feat(manual-editor): add timeline replay button
- fix(manual-editor): allow replay after completion
- refactor(viewer): simplify camera focus handling
- style(ui): align history card width with timeline
- chore(deps): update threejs
