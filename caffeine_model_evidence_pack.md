# 카페인 민감도 모델 근거자료 패키지

작성일: 2026-07-01
정정일: 2026-07-02

## 1. 현재 앱 모델의 성격

현재 웹앱의 계산식은 특정 논문에 그대로 제시된 임상 PRS가 아니라, 다음 자료들을 조합한 연구용 점수화 모델이다.

1. CYP1A2 기능 변이 자료: CYP1A2*1F(rs762551), CYP1A2*1C(rs2069514)
2. 카페인 섭취/대사 관련 GWAS 근거: AHR 및 CYP1A1-CYP1A2 locus
3. 프로젝트 내부 기존 HTML의 SNP 구성 및 계수
4. 프로젝트 AHR 실험 타깃: rs6968865
5. 참조표준 PRS 분포 자료

따라서 논문이나 서비스 소개에서는 "validated clinical PRS" 또는 "진단 검사 기술"이 아니라 "evidence-informed scoring model", "research-use genotype scoring model", "근거 기반 리포트/해석 기술"로 표현하는 것이 안전하다.

## 2. 최종 모델 공식

```text
FinalScore = 100 x (0.7 x MetabolismScore + 0.3 x RegulationScore)
```

```text
MetabolismScore =
0.82 x score_rs762551
+ 0.18 x score_rs2069514
```

```text
RegulationScore =
0.54 x score_rs2472297
+ 0.46 x score_rs6968865
```

점수 방향:

```text
FinalScore 높음 = 카페인 잔류 가능성/민감 반응 가능성 높음
FinalScore 낮음 = 카페인 빠른 처리 가능성 높음
```

앱 내 유전자형 점수화:

```text
score_rs762551: AA = 0, AC = 0.5, CC = 1
  - C allele / CYP1A2*1F carrier를 느린 대사형 방향으로 반영

score_rs2069514: GG = 0, AG = 0.5, AA = 1
  - A allele을 보조적인 민감도 증가 방향으로 반영
```

## 3. SNP별 점수화 근거

| SNP | 유전자/좌위 | 앱 내 역할 | 점수화 방향 | 근거 수준 |
|---|---|---:|---|---|
| rs762551 | CYP1A2*1F | 대사 핵심 변수 | C allele / *1F carrier를 민감도 증가 방향으로 반영 | JAMA 2006의 *1F slow metabolizer 구분 + 기능 자료 |
| rs2069514 | CYP1A2*1C | 대사 보조 변수 | A allele 증가를 보조적으로 민감도 증가 방향으로 반영 | 내부 기능자료상 효과 약함 |
| rs2472297 | CYP1A1-CYP1A2 locus | 섭취/조절 변수 | 프로젝트 기존 계수 기반 | GWAS locus-level 근거 필요 |
| rs6968865 | AHR | AHR 실험 타깃/조절 변수 | 프로젝트 실험 타깃으로 반영 | gene-level AHR 근거는 강함, rs6968865 SNP-specific 근거는 추가 확인 필요 |

## 4. 1F:1C 가중치 도출

업로드 자료 `1C, 1F 어떻게 할지.pdf`에 정리된 CYP1A2 기능 자료는 대사 레이어의 상대 가중치 산정에 사용했다. 다만 rs762551의 최종 점수 방향은 Cornelis et al. (2006), JAMA의 CYP1A2*1A/*1A rapid metabolizer 및 CYP1A2*1F carrier slow metabolizer 구분을 우선 적용한다.

### CYP1A2*1F, rs762551

유전자형별 CYP1A2 활성 평균:

```text
C/C: 16.09 ± 8.30 (n=23)
C/A: 18.22 ± 8.11 (n=51)
A/A: 14.50 ± 6.89 (n=63)
```

AA vs non-AA:

```text
A/A: 14.50 ± 6.89
non-A/A: 17.55 ± 8.17
P = 0.0208
```

내부 메모에서 계산한 평균차:

```text
beta ≈ 3.06
95% CI ≈ 0.51 to 5.60
```

초기 내부 해석:

```text
AA가 non-AA보다 CYP1A2 활성이 낮음
→ 카페인 분해 느림 가능성
→ 민감도 점수 증가 방향
```

2026-07-02 정정:

```text
현재 앱의 rs762551 점수 방향은 AA = 빠른 대사형, AC/CC = 느린 대사형 방향이다.
즉 C allele / CYP1A2*1F carrier를 민감도 증가 방향으로 반영한다.
위 내부 요약 통계의 AA 방향 해석은 allele coding 또는 활성 지표 정의를 원논문에서 재확인하기 전까지 앱 점수 방향의 근거로 사용하지 않는다.
```

### CYP1A2*1C, rs2069514

유전자형별 CYP1A2 활성 평균:

```text
G/G: 16.24 ± 7.90 (n=77)
G/A: 16.33 ± 7.78 (n=55)
A/A: 12.73 ± 4.14 (n=5)
```

내부 메모에서 계산한 additive beta:

```text
beta ≈ -0.55
95% CI ≈ -2.86 to 1.76
```

해석:

```text
AA 평균이 낮아 A allele을 민감도 증가 쪽으로 볼 수 있으나 CI가 0을 지나며 표본 수가 작음
→ 핵심 변수가 아니라 보조 변수로 사용
```

### 가중치 변환

```text
1F 효과크기 ≈ 3.06
1C 효과크기 ≈ 0.55

1C / 1F = 0.55 / 3.06 ≈ 0.18
```

따라서 대사 레이어 내부 가중치를 다음처럼 설정:

```text
CYP1A2*1F = 0.82
CYP1A2*1C = 0.18
```

주의: 이 수치는 원자료가 아닌 업로드된 분석 메모의 요약 통계에서 유도한 상대 가중치다. rs762551의 점수 방향은 JAMA 2006의 *1F slow metabolizer 구분을 우선 적용하며, 논문에 최종 인용하려면 원논문 PDF/DOI와 allele coding 확인이 필요하다.

## 5. 대사 70%, 조절 30% 설계 근거

카페인 민감도는 단순 섭취량보다 체내 처리 속도와 더 직접적으로 연결된다. 그러므로 CYP1A2 기능 변이를 메인 레이어로 두고, AHR/CYP1A1-CYP1A2 조절/섭취 관련 변이를 보조 레이어로 둔다.

```text
Metabolism layer: CYP1A2*1F + CYP1A2*1C
Regulation layer: CYP1A1-CYP1A2 locus + AHR
```

가중합:

```text
0.7 x Metabolism + 0.3 x Regulation
```

이 비율은 검증된 임상 표준값이 아니라, 생물학적 직접성에 기반한 프로젝트 설계값이다. 논문에는 "weighted more heavily because CYP1A2 enzymatic activity is more directly related to caffeine clearance than habitual intake loci"처럼 설명하는 것이 적절하다.

### 유전자형 `모름` 처리 원칙

- `모름`으로 선택한 SNP는 임의의 평균 유전자형으로 대체하지 않고 점수 계산에서 제외한다.
- 같은 레이어에 확인된 SNP가 남아 있으면, 확인된 SNP의 상대 가중치 합으로 해당 레이어 점수를 다시 정규화한다.
- 두 레이어가 모두 계산되면 기존의 대사 70%, 조절 30% 비율을 유지한다. 조절 레이어 전체가 `모름`이어도 핵심 CYP1A2*1F가 확인되면 대사 레이어만으로 제한적 점수를 만들고 분석 완성도를 낮춰 표시한다.
- 핵심 CYP1A2*1F rs762551가 `모름`이면 다른 보조 SNP가 확인되어도 최종 점수, 백분위, 순위를 산출하지 않는다. 이 경우와 4개 SNP가 모두 `모름`인 경우에는 `정보 부족형` 리포트를 생성한다. `정보 부족형`은 유전적 반응 유형이 아니라 유형 판정이 보류되었음을 나타내는 보고 상태다.

현재 프로젝트에는 SNP별 기준 대립유전자 빈도 또는 검증된 결측 대체값이 없으므로, `모름`을 일괄 0.5점으로 치환해 평균형으로 분류하지 않는다. 확인된 SNP 수는 전체 4개 대비 분석 완성도로 함께 기록한다.

## 6. rs2472297 / AHR 조절 레이어 가중치

프로젝트 기존 HTML/자료의 계수:

```text
rs2472297 = 0.31
AHR = 0.26
```

이를 조절 레이어 내 상대비로 변환:

```text
rs2472297 = 0.31 / (0.31 + 0.26) = 0.544 ≈ 0.54
AHR = 0.26 / (0.31 + 0.26) = 0.456 ≈ 0.46
```

주의:

업로드 자료 `11111.pdf`에는 AHR 후보 SNP로 `rs6968554-A`가 기록되어 있고, 외부 GWAS 문헌에서는 AHR locus 대표 SNP로 `rs4410790`이 자주 보고된다. 현재 앱의 `rs6968865`는 프로젝트의 AHR 실험 타깃이다. 따라서 `rs6968865`는 "AHR gene-level biological plausibility를 가진 project assay marker"로 표현해야 하며, `rs4410790` 또는 `rs6968554`와 동일한 문헌 근거 수준이라고 쓰면 안 된다.

## 7. 논문/공식 근거자료

### A. GWAS: AHR 및 CYP1A1-CYP1A2 locus

Cornelis et al. (2011), PLOS Genetics.

핵심 근거:

- 첫 대규모 habitual caffeine intake GWAS.
- 47,341명 유럽계 자료 기반.
- 7p21 AHR 및 15q24 CYP1A2/CYP1A1-CYP1A2 locus가 genome-wide significance에 도달.
- 논문은 CYP1A2가 caffeine을 대사하고 AHR이 CYP1A2를 조절하므로 생물학적으로 타당하다고 설명.

논문 링크:

https://journals.plos.org/plosgenetics/article?id=10.1371/journal.pgen.1002033

추천 인용:

Cornelis MC, Monda KL, Yu K, Paynter N, Azzato EM, Bennett SN, et al. Genome-Wide Meta-Analysis Identifies Regions on 7p21 (AHR) and 15q24 (CYP1A2) As Determinants of Habitual Caffeine Consumption. PLoS Genet. 2011;7(4):e1002033. doi:10.1371/journal.pgen.1002033.

### B. CYP1A2*1F와 카페인 반응

Cornelis et al. (2006), JAMA.

핵심 근거:

- 커피 섭취와 비치명적 심근경색 위험의 관련성이 CYP1A2 genotype에 따라 달라지는지 분석.
- 논문은 CYP1A2*1A/*1A를 rapid metabolizer, CYP1A2*1F carrier를 slow metabolizer로 구분.
- 현재 앱은 이 구분에 맞춰 rs762551 AA를 빠른 대사형 방향, AC/CC를 느린 대사형 방향으로 점수화.
- *1F carrier에서 높은 커피 섭취와 MI risk 증가가 더 뚜렷하게 나타남.

논문 링크:

https://jamanetwork.com/journals/jama/fullarticle/202502

추천 인용:

Cornelis MC, El-Sohemy A, Kabagambe EK, Campos H. Coffee, CYP1A2 Genotype, and Risk of Myocardial Infarction. JAMA. 2006;295(10):1135-1141. doi:10.1001/jama.295.10.1135.

### C. rs2472297 / CYP1A1-CYP1A2 / AHR coffee consumption

추가 확인 권장 논문:

Sulem P, Gudbjartsson DF, Geller F, et al. Sequence variants at CYP1A1-CYP1A2 and AHR associate with coffee consumption. Human Molecular Genetics. 2011;20(10):2071-2077. doi:10.1093/hmg/ddr086.

이 논문은 rs2472297 및 AHR/CYP1A1-CYP1A2 coffee consumption association 확인용 후보로 사용해야 한다. 최종 논문 작성 전 원문에서 effect allele, beta, population을 직접 확인하는 것이 필요하다.

### D. 프로젝트 내부 베이스 자료

1. `1C, 1F 어떻게 할지.pdf`
   - CYP1A2*1F, CYP1A2*1C 기능 자료 요약
   - 현재 대사 레이어 가중치의 직접 근거
   - 단, 원논문 PDF가 아니라 분석 메모이므로 참고문헌에는 원논문 확인 필요

2. `11111.pdf`
   - GWAS beta, CI, candidate SNP 정리
   - rs2472297, AHR 계수 및 방향성 검토에 사용
   - AHR SNP가 현재 앱의 rs6968865와 정확히 일치하지 않으므로 주의

3. `참조표준SNP 샘플별 유전형(김덕원).pdf`
   - 참조표준 PRS 분포 및 히스토그램/백분위 시각화의 근거
   - 생물학적 연관성 검증 자료는 아니며, 점수 분포 기준으로만 사용

4. AHR 실험자료 폴더
   - `AHR(rs6968865)_1000bp.pdf`
   - `NCBI rs6968865 .png`
   - `AHR_rs6968865_Cloning_Primer-BLAST_Result_GRCh38_NC000007.14.pdf`
   - `최종 실험재료 및 방법.pdf`
   - rs6968865가 프로젝트 실험 타깃임을 뒷받침

## 8. 논문 Methods에 넣을 수 있는 문장 초안

> We developed an evidence-informed caffeine response interpretation score by integrating two CYP1A2 variants and two regulatory/intake-related loci. The metabolism layer included CYP1A2*1F (rs762551), scored in the slow-metabolizer direction for CYP1A2*1F carriers, and CYP1A2*1C (rs2069514), scored as a supportive marker. The regulation layer included a CYP1A1-CYP1A2 locus marker and an AHR assay marker. The final score was calculated as a weighted sum of the metabolism layer (70%) and the regulation layer (30%), then scaled to a 0-100 index, where higher values indicate greater predicted caffeine persistence or sensitivity.

## 9. 논문 Limitations에 넣을 수 있는 문장 초안

> This report and interpretation model is intended for research, education, and wellness guidance and has not been clinically validated as a diagnostic or prescribing tool. The AHR marker rs6968865 was selected as a project assay target; although AHR has strong biological plausibility and GWAS support at the gene/locus level, SNP-specific evidence for rs6968865 requires further validation. The assigned layer weights were derived from available summary statistics and project-specific assumptions and should be recalibrated in an independent cohort with measured caffeine pharmacokinetic or symptom-response phenotypes.

## 10. 후속 보강 필요사항

논문 제출 전 반드시 확인하면 좋은 항목:

1. CYP1A2*1F/*1C 기능 자료의 원논문 PDF/DOI 확보
2. rs762551 내부 요약 통계와 JAMA 2006 allele coding 차이 재확인
3. rs2472297의 effect allele, beta, phenotype 확인
4. rs6968865에 대한 dbSNP/NCBI 위치, allele, nearby gene annotation 정리
5. rs6968865와 caffeine phenotype의 직접 association이 없으면 "project assay marker"로 명확히 제한
6. 앱 점수와 실제 카페인 증상 설문 또는 대사체 측정값 간 correlation 검증
