# 100종 스킨 제작 복구 체크포인트

## 완료와 미완료
- main: 혈철 집행군 10병종 WebP 10개와 검증된 원본 PNG 10개 반영 완료. 원본 SHA-256 일치.
- 이번 작업: 나머지 99개 콘셉트의 10병종×8포즈 RGBA 아틀라스 99장 생성 완료.
- 환경 단절 직전 확인: 신규 아틀라스 중 98세트의 추출 manifest가 존재했고, 모두 extractor_version 3이었다. 마지막 1세트와 전체 1,000개 WebP의 최종 일괄 검사는 완료 확인하지 못했다.
- 신규 99세트의 GitHub 이미지 배포는 미완료이다. 이 브랜치의 catalog는 혈철 집행군만 ready, 나머지는 planned로 유지한다.
- 신규 원본 중 일부는 GitHub blob 업로드가 이루어졌으나, 전체 tree/commit으로 고정되지 않았다. 배포된 것으로 취급하지 않는다.

## 보존 코드
- 100개 콘셉트의 고정 ID, 종족, 레벨: skin-catalog.json / skin-catalog.js.
- 공통 10병종 로더, 8포즈 좌표, 이미지 크기 검사, 실패 재시도, 캐시: blood-iron-art.js.
- 잠긴 스킨 미리보기, 정지 포즈 8개와 이동/공격 재생, 대화상자 키보드 처리: front-lobby.js.
- 싱글 배치 아이콘 및 실제 전투 외형 연결: game-v2.js / unit-motion.js.
- 멀티 엔진의 종족별 스킨 검증과 WebRTC appearance 패킷. 방 문서에는 기존 5종 값만 기록하므로 이전 Firestore 규칙에서도 방 생성/참가 가능.
- firestore.rules의 새 스킨 허용 목록은 저장했지만 실제 서버 규칙 배포는 수행하지 못했다. 클라우드 프로필의 신규 스킨 저장은 별도 배포 확인이 필요하다.
- UI/멀티 코드의 문법, 병종과 포즈 매핑, 종족 제한 및 전투 엔진의 스킨 보존은 독립 JavaScript 런타임에서 다시 검증했다.
- 환경 단절 전에 Node에서 카탈로그/로더 검사와 기존 1:1·3라인·협동·증강·프리즘 WebRTC 모의 통신 검사를 통과했다. 기록에서 재구성한 코드도 GitHub CI에서 새 카탈로그/로더, 문법, 주요 전투 및 멀티 통신 검사를 통과했다. 후반 장기 밸런스 벤치마크는 별도 진행 상태를 확인한다.
- 로컬 Chromium 다운로드는 실패했지만, GitHub Actions의 실제 Chromium 검증(run 41189498465)은 통과했다. 잠긴 스킨의 실제 픽셀, 10병종 로딩, 8포즈 선택, 사망/대기 차이, 해금, 종족 제한, 새로고침 후 선택 유지가 확인되었다.
- 신규 이미지 99세트의 전체 시각 검수 및 GitHub 배포는 여전히 미완료이다.

## 먼저 복구할 경로
기존 작업 루트: /workspace/scratch/49b87e536b56
- pvefps/desert-strike/assets/sprites/sources/{skin-id}/atlas.png
- pvefps/desert-strike/assets/sprites/sources/{skin-id}/manifest.json
- pvefps/desert-strike/assets/sprites/{skin-id}-{role}-actions.webp
- generated_images/*.png
- generation-records/{skin-id}.json : 원본 경로, 콘셉트 이름, 실제 생성 프롬프트.
- generation-records/{skin-id}.prompt.txt
- generation-map.json : 첫 19개 신규 아틀라스와 파일명 대응.
- github-upload-journal.jsonl : 완료된 신규 원본 blob 업로드 SHA.
기존 경로 복구를 먼저 시도하고, 원본 아틀라스를 확인하기 전에는 전체 이미지를 다시 생성하지 않는다. 생성 이미지가 자동 보관된 경우 해당 생성 프롬프트의 콘셉트 이름으로 식별하고 카탈로그 ID와 매칭한다. 보관 완료 여부는 별도로 확인한다.

## 마무리 순서
1. 신규 원본 99장과 생성 기록을 복구한다. 저격/암살은 역할 9/10이며 자원 시설 역할 8은 제외한다.
2. tools/import-skin-atlas.py로 10병종×8포즈의 4×2 WebP 시트를 만든다. 원본 PNG와 추출 좌표/해시를 보존한다.
3. tools/validate-skins.py를 실행하여 100세트, 1,000시트, 8,000포즈를 검사한다. 실패/빈 프레임/잘림을 실제 그림으로 확인한다.
4. Node 테스트와 모의 WebRTC 검사를 실행하고 실제 브라우저에서 잠금 미리보기, 포즈 전환, 싱글/연습/멀티를 확인한다.
5. 코드와 원본/변환 이미지 전부를 포함하여 main에 커밋한다. 원격 branch head와 파일 존재를 재확인한 후에만 전체 배포 완료로 표시한다.
