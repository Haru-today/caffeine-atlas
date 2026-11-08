# Caffeine Atlas — 2026-11-14 서울성모병원 학생포럼 공개 시연

상태: GitHub 코드 릴리스 검토용. 2026년 11월 14일 포스터에 삽입된 기존 QR코드와 단축주소는 새로 만들거나 변경하지 않습니다.

## 방문객용 공개 체험

- Caffeine Atlas 공개 주소 `https://haru-today.github.io/caffeine-atlas/` 유지
- 기존 루트 리다이렉트 `./caffeine-sensitivity-app/index.html` 유지
- 로그인, 회원가입, 비밀번호 입력 없이 `./analyzer.html` 진입
- 4개 SNP 유전자형을 선택해 교육용 모델 지표·해석 확인
- 상세 리포트, PDF 파일, 결과 복사 기능 유지
- 공개 체험에서 연구용 Google Sheets POST/JSONP 비활성화 및 직접 Apps Script URL 제거
- 엑셀 양식 다운로드 → 최대 200명·5 MB 일괄 업로드 → 브라우저 내부 분석 → 결과 XLSX 다운로드 공개
- 결과 파일의 ‘분석 결과’에는 전체 입력 행, ‘입력 오류’에는 수정할 행과 원본 입력, ‘해석 안내’에는 기준·한계 포함
- 명시적인 ‘모름’은 입력 오류와 구분하며 rs762551가 모름이면 최종 점수·유형 판정 보류
- 저장 동의/클라우드 저장 버튼은 공개 화면에서 숨김. 로컬 일괄 분석은 연구용 서버 저장과 별개
- 각성형·잠잠형·잠꾸러기형을 ‘민감도 지수 낮음·중간·높음’으로 교체하고 홈·화면·PDF·엑셀 문구 통일
- 실명·환자번호·학번·식별 가능한 실제 유전자형 자료는 공개 체험에 입력하지 않도록 안내

**중요:** 이 웹페이지가 저장 요청을 막아도 과거에 Google Apps Script가 이미 배포한 공개 /exec URL이 자동 폐쇄되는 것은 아닙니다. 기존 공개 Apps Script 배포의 접근권한·기존 URL을 운영자가 별도로 점검하고 차단해야 연구 데이터 저장이 실제로 보호됩니다.

## 연구자 전용 저장 경로

LABDAM 공통 인증 PR #7은 공개 Caffeine Atlas와 **별도 보호된 호스트**에 연구자용 복사본을 생성합니다. 서버에서 검증한 Cloudflare Access 계정과 저장 권한이 모두 있는 사용자는 `/api/caffeine-atlas`를 통해 Google Apps Script 요청에 서명을 붙여 저장할 수 있도록 설계했습니다.

대응 PR:
- 인증 보호 호스트: https://github.com/Haru-today/haru-today.github.io/pull/7
- 서명 검증 Apps Script: https://github.com/Haru-today/caffeine-atlas/pull/4

두 PR이 실제 Cloudflare/Google 운영 계정에 설정·배포되기 전에는 **클라우드 연구 저장 보호가 완료되지 않습니다.** 현 공개 사이트의 제한은 브라우저 전송 코드를 제거한 것이며, 이미 배포한 과거 Apps Script 서비스를 삭제하거나 변경한 것은 아닙니다.

## 학회 전 직접 확인해야 하는 항목

- [ ] 포스터의 실제 QR을 iPhone/Android로 스캔하여 목적지 확인 (네이버 단축 주소 자체는 개발자가 통제하지 못할 수 있음)
- [ ] QR이 `https://haru-today.github.io/caffeine-atlas/` 또는 기존 홈 화면으로 연결되는지 확인
- [ ] 모바일 320px 및 375px에서 홈 → 4 SNP 선택 → 분석 → PDF 다운로드 동작
- [ ] QR 열기만으로 로그인 화면이 나타나지 않는지 확인
- [ ] 브라우저 개발자 도구 Network에서 `script.google.com/macros`로 분석 데이터 요청이 발생하지 않는지 확인
- [ ] 가상 Sample ID DEMO-001 등만 사용 (실명·연구 참여자·실제 유전자형 데이터 입력 금지)
- [ ] PDF 파일 이름·한글·표·모델 한계 문구 정상인지 확인
- [ ] ‘엑셀 일괄 업로드’에서 양식 다운로드 및 가상 데이터 업로드 → 결과 XLSX 3개 시트 확인
- [ ] 정상·모름·중복 ID·잘못된 날짜/allele을 포함한 파일에서 오류 행의 점수 미산출 확인
- [ ] 실패한 재업로드 이후 이전 결과를 내려받지 못하는지 확인
- [ ] 개인정보·이용약관 링크, 에러 표시와 누락 유전자형 판정 보류 확인
- [ ] 인터넷·QR 단축 주소 장애 시 사용할 **직접 URL 안내**와 행사장 모바일 데이터 확보

테스트는 `node --test tests/*.test.cjs` 로 실행하며 가상 데이터만 사용합니다. QR 단축 주소의 외부 리다이렉트 결과는 GitHub 코드 테스트로 증명할 수 없으므로 현장 테스트가 반드시 필요합니다.

## 2026-11-08 후속 개발 확인

- `node --check caffeine-sensitivity-app/app.js`
- `node --test tests/*.test.cjs`: 기존 저장·개인정보·QR 흐름과 실제 XLSX 읽기/쓰기·256개 유전자형 조합·로컬 처리 흐름 검증
- `tests/symposium-browser.cjs`: Chromium 320px/데스크톱 및 iPhone WebKit에서 양식·업로드·다운로드를 검증하는 시나리오 포함
- 개발 환경에서 브라우저 미리보기의 로컬 HTTP 연결 및 파일 URL 접근이 제한되어 실제 브라우저 실행·반응형 화면·인쇄 배치는 이번 로컬 검증에 포함되지 않음. 브라우저 CI/현장 검증 항목으로 유지
- 점수식과 기존 입력 양식 9열 유지. 과거 star allele 열 이름은 호환용이며 실제 haplotype 판정이 아님
- 학회 브라우저 스크린샷의 신규 Actions 보관기간은 3일로 설정. 기존 저장소 사용량은 별도 정리 필요
