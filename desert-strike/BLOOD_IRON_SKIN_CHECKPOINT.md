# 혈철 집행군 스킨 체크포인트 (2026-10-31)

- 철갑연합(0) 전용, 10병종(0~7, 9, 10), 병종별 8포즈.
- assets/sprites/blood-iron-{role}-actions.webp 10개를 main에 배포 완료. 384×192 RGBA, 4열×2행, 셀 96px.
- assets/sprites/sources/blood-iron/{role}.png 원본 10개를 복구 보존. 원본 SHA-256 10개가 기존 blood-iron-sources.json 기록과 모두 일치함.
- 최초 이미지 배포 커밋: 3a0913f352b557f045edee8efad8f7fcd3af2999.
- 100종 로드맵의 나머지 99세트는 이번 작업에서 원본 아틀라스를 생성했으나, 실행 환경 연결이 끊겨 전체 WebP 최종 검증과 GitHub 반영은 완료되지 않음. 완성 배포로 표시하지 않음.
- 현재 main의 기존 로더와 잠금 미리보기는 혈철 집행군만 지원. 100종 공통 로더, 개별 포즈 미리보기, WebRTC 외형 호환 작업은 최종 반영 대기.
