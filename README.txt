EXP Stock Game — PWA 배포 안내

[파일 구성]
index.html              앱 본체 (PWA 연결 추가)
manifest.webmanifest    앱 이름·아이콘·색상·바로가기
sw.js                   서비스워커 (오프라인 실행 / 업데이트)
_headers                Cloudflare Pages·Netlify 캐시 설정
icons/                  앱 아이콘 (192·512·maskable·Apple·favicon)

[배포]
1. 압축을 풀고 폴더 안 파일 전체를 기존 배포 위치(Cloudflare Pages 등)에 그대로 덮어 올리세요.
2. 반드시 HTTPS 주소에서 열어야 설치가 됩니다. (파일을 더블클릭해 여는 file:// 에서는 동작하지 않아요)

[업데이트할 때]
index.html을 고친 뒤 sw.js 맨 위 VERSION 값을 올려 주세요. (v1.0.0 → v1.0.1)
사용자 화면 상단에 "새 버전이 준비됐어요 · 업데이트" 안내가 뜹니다.
