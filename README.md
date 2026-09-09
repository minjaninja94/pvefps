# IRON SECTOR — PVE FPS v2

대상 저장소: https://github.com/minjaninja94/pvefps

## 게시

1. ZIP을 압축 해제합니다.
2. index.html, style.css, game.js를 저장소의 최상위 폴더에 함께 업로드하고 커밋합니다. 같은 이름의 기존 파일이 있다면 먼저 내용을 확인하세요.
3. 저장소 Settings → Pages에서 Source를 Deploy from a branch로 선택합니다.
4. 업로드한 브랜치(예: main)와 /(root)를 선택하고 Save를 누릅니다.
5. 게시가 완료되면 Pages 설정 화면에 표시되는 주소를 엽니다.

별도 설치나 빌드는 필요하지 않습니다. 현재 GitHub 업로드·게시 완료는 확인되지 않았습니다. 저장소 설정에 따라 Pages 사용 가능 여부가 달라질 수 있습니다.

공식 안내: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## 조작

WASD 이동 / Shift 달리기 / Space 점프 / 마우스 조준 / 좌클릭 사격 / 우클릭 정밀 조준 / R 재장전 / Esc 일시정지.
모바일 이동 패드와 터치 사격도 포함되어 있습니다.

## 버전 2 변경

- 청록·주황·보라 장갑, 긴 머리와 붉은 모노아이.
- 머리·팔·다리 파괴와 능력 변화.
- 다섯 전방 구역. 모든 적을 처치하면 다음 구역의 문이 열립니다.
- 체력이 낮을수록 회복 키트 드롭 확률 증가. 체력 1% 이하에서 쉬움 99%, 중간 50%, 극한 30%.
- 키트 회복량: 최대 체력의 50% / 30% / 20%. 가까이 가서 획득합니다.
- 양쪽 탄환의 벽 차단, 적 공격 경고·발사음, 공격 방향 표시.

## 알려진 한계

HK416 외부 모델은 아직 적용되지 않았으며 자체 제작한 임시 소총 모델입니다.
핵심 로직은 코드 테스트를 통과했으나 실제 브라우저 화면·플레이 테스트는 아직 하지 않았습니다.
