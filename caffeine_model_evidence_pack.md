# 카페인 민감도 모델 근거자료 패키지

작성일: 2026-07-01
정정일: 2026-11-08

> 2026-11-08 검토: 기존 점수와 가중치는 이전 결과의 재현을 위해 유지한다. 아래 공식은 임상적으로 검증된 민감도·수면 예측식이 아니다. rs2472297 및 rs6968865의 T allele에는 커피 섭취량 증가에 대한 직접 GWAS 근거가 있으나, 그 방향을 민감도·카페인 잔류 증가로 변환하는 것은 별도의 모형 가정이다. 종합점수만으로 빠른/느린 대사자나 수면 유형을 판정하지 않는다.

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
FinalScore 높음 = 프로젝트 모형에서 높은 지수 구간
FinalScore 낮음 = 프로젝트 모형에서 낮은 지수 구간
```

점수는 실제 분해 속도, 반감기, 각성 강도, 내성, 수면의 질 또는 안전 섭취량의 측정값이 아니다. 대사 관련 지표와 섭취/조절 지표를 합한 종합값이므로, 높은/낮은 종합점수를 곧바로 느린/빠른 대사자에 대응시키지 않는다. 기존 별칭 ‘각성형·잠잠형·잠꾸러기형’은 ‘민감도 지수 낮음·중간·높음’으로 교체한다.

앱 내 유전자형 점수화:

```text
score_rs762551: AA = 0, AC = 0.5, CC = 1
  - C allele 수를 기존 모형에서 높은 대사 관련 지표 방향으로 반영

score_rs2069514: GG = 0, AG = 0.5, AA = 1
  - A allele을 보조적인 민감도 증가 방향으로 반영
```

## 3. SNP별 점수화 근거

| SNP | 유전자/좌위 | 앱 내 역할 | 점수화 방향 | 근거 수준 |
|---|---|---:|---|---|
| rs762551 | CYP1A2 (구 명칭 *1F 관련) | 대사 핵심 변수 | C allele 수를 높은 대사 관련 모형값 방향으로 반영 | 대사 유도성 연구; 단일 SNP로 star allele 또는 생체 대사 표현형 확정 불가 |
| rs2069514 | CYP1A2*1C | 대사 보조 변수 | A allele 증가를 보조적으로 민감도 증가 방향으로 반영 | 내부 기능자료상 효과 약함 |
| rs2472297 | CYP1A1-CYP1A2 locus | 섭취/조절 변수 | 프로젝트 기존 계수 기반 | T allele의 커피 섭취량 증가 연관이 원논문에 보고됨; 민감도·잔류 방향은 미검증 |
| rs6968865 | AHR 인근 | AHR 실험 타깃/조절 변수 | 프로젝트 기존 계수 기반 | T allele의 커피 섭취량 증가 연관이 원논문에 보고됨; 민감도·잔류 방향은 미검증 |

**명칭 주의:** PharmVar GeneFocus (2026, DOI: 10.1002/cpt.70286)는 rs762551의 -163C>A가 과거 *1F 관련 변이이며 현재 *30 계열 등의 여러 haplotype에 존재한다고 설명한다. 따라서 C allele을 ‘*1F carrier’로 단정하지 않고 rsID와 실제 입력 염기를 기준으로 기술한다. *1C 역시 이전 문헌의 명칭이며 최신 PharmVar의 완전한 haplotype 정의와 동의어로 취급하지 않는다.

## 4. 1F:1C 가중치 도출

업로드 자료 `1C, 1F 어떻게 할지.pdf`에 정리된 CYP1A2 기능 자료는 기존 대사 레이어의 상대 가중치 설계에 사용했다. 이하 수치는 이전 내부 메모를 보존한 것이며, 이번 검토에서 원자료·대조군·활성 지표 정의를 확인한 값은 아니다. rs762551 입력 염기에 부여한 점수 방향은 이전 결과 재현을 위해 유지하되, SNP만으로 생체 대사 표현형을 확정하지 않는다.

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
이전 앱은 rs762551 AA에 낮은 값, AC/CC에 높은 값을 부여하며 이를 빠른/느린 대사형 방향으로 설명했다.
즉 C allele 수를 높은 모형값 방향으로 반영한다. 이를 *1F carrier 판정으로 표현하지 않는다.
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

기존 프로젝트는 이 비율을 참고해 대사 레이어 내부 가중치를 다음처럼 설정했다:

```text
CYP1A2*1F = 0.82
CYP1A2*1C = 0.18
```

주의: 0.55 / 3.06 ≈ 0.18은 두 효과크기의 비율이며, 두 가중치를 합이 1이 되도록 정규화한 값은 아니다. 직접 정규화하면 3.06 / (3.06 + 0.55) ≈ 0.848, 0.55 / (3.06 + 0.55) ≈ 0.152이다. 따라서 0.82/0.18은 원논문에서 검증된 효과 가중치가 아닌 프로젝트 설계값으로 기술해야 한다. 이번 변경에서 수치는 변경하지 않았다. 원논문 PDF/DOI, allele coding 및 효과 추정 방법의 확인이 필요하다.

## 5. 대사 70%, 조절 30% 설계 근거

기존 프로젝트는 CYP1A2 관련 변이를 메인 레이어로 두고, AHR/CYP1A1-CYP1A2 조절/섭취 관련 변이를 보조 레이어로 두었다. 카페인 처리 과정과 각성·수면 반응은 구분해야 하며, 이 설계만으로 실제 민감도 예측 성능이 입증되는 것은 아니다.

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

업로드 자료 `11111.pdf`의 이전 SNP 표기와 별개로, Sulem et al. (2011)은 앱에 사용한 rs2472297와 rs6968865 자체의 T allele이 커피 섭취량 증가와 연관됨을 직접 보고했다. 따라서 rs6968865에 SNP 수준 근거가 없다는 기존 설명은 정정한다. 다만 커피 섭취량 관련 계수를 민감도·잔류 증가 점수로 사용하는 것은 원논문에서 검증한 변환이 아니며, 현재 0.54/0.46은 프로젝트 가중치다. rs4410790 등 다른 SNP의 효과를 rs6968865에 그대로 대입하지 않는다.

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
- 논문에서 사용한 당시의 빠른/느린 대사 분류를 기존 프로젝트가 rs762551 점수 방향의 참고로 사용했다.
- 앱은 rs762551 AA에 낮은 모형값, AC/CC에 높은 모형값을 부여하며, 이를 개인의 실제 대사 속도 판정으로 제시하지 않는다.
- 당시 논문의 star allele 표현을 최신 PharmVar 정의와 동일하게 사용하지 않는다. 심근경색 연관 연구를 수면·각성 예측의 검증 자료로 사용할 수 없다.

논문 링크:

https://jamanetwork.com/journals/jama/fullarticle/202502

추천 인용:

Cornelis MC, El-Sohemy A, Kabagambe EK, Campos H. Coffee, CYP1A2 Genotype, and Risk of Myocardial Infarction. JAMA. 2006;295(10):1135-1141. doi:10.1001/jama.295.10.1135.

### C. rs2472297 / CYP1A1-CYP1A2 / AHR coffee consumption

원문 확인 논문 (2026-11-08):

Sulem P, Gudbjartsson DF, Geller F, et al. Sequence variants at CYP1A1-CYP1A2 and AHR associate with coffee consumption. Human Molecular Genetics. 2011;20(10):2071-2077. doi:10.1093/hmg/ddr086.

원문: https://pmc.ncbi.nlm.nih.gov/articles/PMC3080612/

rs2472297-T 및 rs6968865-T 모두 커피 섭취량 증가와 연관되었다. 논문은 높은 카페인 제거율이 가능한 설명이라고 제안하지만 실험 검증이 필요하다고 명시한다. 따라서 이 결과를 카페인 잔류 증가 또는 불면의 직접 근거로 사용하지 않는다.

### D. 분해·각성·수면 및 CYP1A2 명칭의 구분

Rétey JV et al. Clin Pharmacol Ther. 2007;81(5):692-698. DOI: 10.1038/sj.clpt.6100102. PMID: 17329997. https://pubmed.ncbi.nlm.nih.gov/17329997/

이 인간 연구에서는 ADORA2A 변이와 카페인의 주관적·객관적 수면 반응 차이를 보고했다. 현재 앱은 ADORA2A를 포함하지 않으며, 4개 SNP만으로 수면·각성 반응이나 내성을 판정하지 않는다.

PharmVar GeneFocus: CYP1A2—Clinical Impact, Genetic Variation, and Updated Nomenclature. Clin Pharmacol Ther. 2026;120(2):313-323. DOI: 10.1002/cpt.70286. PMID: 41992662. https://doi.org/10.1002/cpt.70286

PharmVar 공식 명명 검토에 따르면 단일 rs762551 검사는 완전한 CYP1A2 haplotype 또는 생체 내 대사 표현형을 확정하는 검사가 아니다. 기존 *1F 관련 -163C>A 변이는 최신 명명에서 *30 계열 등을 포함한 여러 haplotype과 연결된다. 앱에서는 rsID·유전자형을 우선 제시한다.

### E. 프로젝트 내부 베이스 자료

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

> We implemented a research-use genotype interpretation index using two CYP1A2 variants and two coffee-intake-associated loci. The legacy metabolism and regulation components were combined using project-defined weights of 70% and 30%, respectively, and scaled to a 0–100 index. Legacy coefficients were preserved for reproducibility. The index has not been validated to estimate individual caffeine clearance, sensitivity, sleep responses, or safe intake.

## 9. 논문 Limitations에 넣을 수 있는 문장 초안

> The index is intended for research and education. Although rs2472297-T and rs6968865-T have reported associations with greater coffee intake, translating intake associations into sensitivity or persistence scores remains an unvalidated project assumption. CYP1A2 SNP genotypes alone do not establish a complete star-allele assignment or an in vivo metabolic phenotype. The index requires independent calibration against measured pharmacokinetics and response outcomes, including sleep, before individual prediction claims can be made.

## 10. 후속 보강 필요사항

논문 제출 전 반드시 확인하면 좋은 항목:

1. CYP1A2*1F/*1C 기능 자료의 원논문 PDF/DOI 확보
2. rs762551 내부 요약 통계와 JAMA 2006 allele coding 차이 재확인
3. rs2472297 및 rs6968865의 커피 섭취량 연관성을 실제 민감도·잔류 지수로 변환하는 방향과 가중치 재검토
4. rs6968865에 대한 dbSNP/NCBI 위치, allele, nearby gene annotation 정리
5. 완전한 haplotype 검사 없이 CYP1A2 star allele을 단정하지 않도록 rsID 중심 명칭 및 최신 PharmVar 표기 검토
6. 앱 점수와 실제 카페인 증상 설문 또는 대사체 측정값 간 correlation 검증
