(function () {
  "use strict";

  var genes = [
    {
      id: "rs762551",
      name: "CYP1A2*1F",
      rsid: "rs762551",
      layer: "metabolism",
      layerLabel: "대사",
      allele: "C",
      description: "CYP1A2 유도성과 관련된 rs762551 변이입니다. 본 모델은 C 대립유전자 수를 연구용 점수에 반영하며, 실제 대사 속도를 확정하지 않습니다.",
      evidence: "C allele 느린 대사",
      source: "기능 연구",
      evidenceGrade: "High",
      weightText: "대사 82%",
      genotypes: [
        { code: "CC", alleleCount: 2, evidenceScore: 1, label: "저속" },
        { code: "AC", alleleCount: 1, evidenceScore: 0.5, label: "중간" },
        { code: "AA", alleleCount: 0, evidenceScore: 0, label: "고속" },
        { code: "unknown", alleleCount: null, evidenceScore: null, label: "모름" }
      ]
    },
    {
      id: "rs2069514",
      name: "CYP1A2*1C",
      rsid: "rs2069514",
      layer: "metabolism",
      layerLabel: "대사",
      allele: "A",
      description: "CYP1A2 기능 보조 변수입니다. A allele이 많을수록 카페인 잔류 가능성 증가 방향으로 보조 반영합니다.",
      evidence: "A allele 민감도 증가 가능",
      source: "기능 연구",
      evidenceGrade: "Supportive",
      weightText: "대사 18%",
      genotypes: [
        { code: "GG", alleleCount: 0, evidenceScore: 0, label: "A 0개" },
        { code: "AG", alleleCount: 1, evidenceScore: 0.5, label: "A 1개" },
        { code: "AA", alleleCount: 2, evidenceScore: 1, label: "A 2개" },
        { code: "unknown", alleleCount: null, evidenceScore: null, label: "모름" }
      ]
    },
    {
      id: "rs2472297",
      name: "CYP1A1-CYP1A2",
      rsid: "rs2472297",
      layer: "behavior",
      layerLabel: "섭취/조절",
      allele: "T",
      description: "CYP1A1-CYP1A2 좌위의 섭취 성향 및 조절 신호를 보조 레이어로 계산합니다.",
      evidence: "GWAS 기반",
      source: "GWAS",
      evidenceGrade: "Moderate",
      weightText: "조절 54%",
      genotypes: [
        { code: "CC", alleleCount: 0, evidenceScore: 0, label: "T 0개" },
        { code: "CT", alleleCount: 1, evidenceScore: 0.5, label: "T 1개" },
        { code: "TT", alleleCount: 2, evidenceScore: 1, label: "T 2개" },
        { code: "unknown", alleleCount: null, evidenceScore: null, label: "모름" }
      ]
    },
    {
      id: "rs6968865",
      name: "AHR",
      rsid: "rs6968865",
      layer: "behavior",
      layerLabel: "섭취/조절",
      allele: "T",
      description: "AHR은 CYP1A2 발현 조절 축과 연결됩니다. rs6968865를 조절 레이어에 반영합니다.",
      evidence: "AHR 조절자",
      source: "AHR 후보",
      evidenceGrade: "Moderate",
      weightText: "조절 46%",
      genotypes: [
        { code: "AA", alleleCount: 0, evidenceScore: 0, label: "T 0개" },
        { code: "AT", alleleCount: 1, evidenceScore: 0.5, label: "T 1개" },
        { code: "TT", alleleCount: 2, evidenceScore: 1, label: "T 2개" },
        { code: "unknown", alleleCount: null, evidenceScore: null, label: "모름" }
      ]
    }
  ];

  var evidenceWeights = {
    rs762551: 0.82,
    rs2069514: 0.18,
    rs2472297: 0.54,
    rs6968865: 0.46
  };

  var TYPE_THRESHOLDS = [33.34, 66.67];

  var referenceBins = [
    { raw: -0.5, level: 1 },
    { raw: -0.25, level: 3 },
    { raw: 0, level: 5 },
    { raw: 0.25, level: 5 },
    { raw: 0.5, level: 4 },
    { raw: 0.75, level: 2 },
    { raw: 1, level: 1 }
  ];

  var REFERENCE_SOURCE_NOTE = "Caffeine Atlas 모델 근거 문서 D.3의 내부 참조표준 SNP 유전형 자료를 참고한 모형 내 고정 7구간입니다. 내 점수보다 낮은 구간의 가중치를 누적합니다. 참조 표본 수와 구간 가중치의 원자료 대조는 확인이 필요합니다.";

  // The public QR demo is offline-first for analysis: no research upload API.
  // A separately hosted, Access-authenticated research build enables storage.
  var RESEARCH_STORAGE_MODE = false;
  var GOOGLE_SHEETS_ENDPOINT = "";
  var FIXED_INSTITUTION = "동의대학교 임상병리학과 분자진단연구실";
  var KOREA_TIME_ZONE = "Asia/Seoul";
  var BATCH_SHEET_NAME = "일괄 입력";
  var BATCH_EXAMPLE_SAMPLE_ID = "예시-저장안됨";
  var MAX_BATCH_ROWS = 200;
  var MAX_BATCH_FILE_BYTES = 5 * 1024 * 1024;
  var batchBusy = false;
  var BATCH_HEADERS = [
    "Sample ID",
    "리포트 날짜",
    "채취일",
    "검체 종류",
    "성별",
    "CYP1A2*1F rs762551",
    "CYP1A2*1C rs2069514",
    "CYP1A1-CYP1A2 rs2472297",
    "AHR rs6968865"
  ];
  var selections = {};
  var lastResult = null;
  var atlasWorkspace = null;
  var hasSubmitted = false;
  var chartResizeTimer = null;
  var batchFile = null;
  var batchRows = [];
  var batchResults = [];

  var elements = {
    geneGrid: document.getElementById("geneGrid"),
    exampleDemoBtn: document.getElementById("exampleDemoBtn"),
    sampleId: document.getElementById("sampleId"),
    specimenDetails: document.getElementById("specimenDetails"),
    reportDate: document.getElementById("reportDate"),
    collectionDate: document.getElementById("collectionDate"),
    sampleType: document.getElementById("sampleType"),
    sex: document.getElementById("sex"),
    institution: document.getElementById("institution"),
    reportMeta: document.getElementById("reportMeta"),
    inputScreen: document.getElementById("inputScreen"),
    resultReport: document.getElementById("resultReport"),
    analyzeBtn: document.getElementById("analyzeBtn"),
    editBtn: document.getElementById("editBtn"),
    resetBtn: document.getElementById("resetBtn"),
    saveBtn: document.getElementById("saveBtn"),
    pdfBtn: document.getElementById("pdfBtn"),
    sheetSaveBtn: document.getElementById("sheetSaveBtn"),
    sheetConsent: document.getElementById("sheetConsent"),
    sheetSyncStatus: document.getElementById("sheetSyncStatus"),
    copyBtn: document.getElementById("copyBtn"),
    singleModeBtn: document.getElementById("singleModeBtn"),
    batchModeBtn: document.getElementById("batchModeBtn"),
    singleModePanel: document.getElementById("singleModePanel"),
    batchModePanel: document.getElementById("batchModePanel"),
    batchFile: document.getElementById("batchFile"),
    batchFileSummary: document.getElementById("batchFileSummary"),
    batchConsent: document.getElementById("batchConsent"),
    batchAnalyzeSaveBtn: document.getElementById("batchAnalyzeSaveBtn"),
    batchAnalyzeBtn: document.getElementById("batchAnalyzeBtn"),
    batchClearBtn: document.getElementById("batchClearBtn"),
    batchDownloadBtn: document.getElementById("batchDownloadBtn"),
    batchPdfZipBtn: document.getElementById("batchPdfZipBtn"),
    batchStatus: document.getElementById("batchStatus"),
    batchResults: document.getElementById("batchResults"),
    batchResultCounts: document.getElementById("batchResultCounts"),
    batchResultsBody: document.getElementById("batchResultsBody"),
    batchSheetStatus: document.getElementById("batchSheetStatus"),
    validationText: document.getElementById("validationText"),
    resultPlaceholder: document.getElementById("resultPlaceholder"),
    resultContent: document.getElementById("resultContent"),
    reportHero: document.getElementById("atlas-report-hero"),
    methodScore: document.getElementById("atlas-method-score"),
    scoreValue: document.getElementById("scoreValue"),
    scoreUnit: document.getElementById("atlas-score-unit"),
    metabolismSummary: document.getElementById("atlas-metabolism-summary"),
    behaviorSummary: document.getElementById("atlas-behavior-summary"),
    snpSort: document.getElementById("atlas-snp-sort"),
    scoreLabel: document.getElementById("scoreLabel"),
    scoreCoverageNote: document.getElementById("scoreCoverageNote"),
    coverageText: document.getElementById("coverageText"),
    scorePosition: document.getElementById("scorePosition"),
    scenarioDetails: document.getElementById("scenarioDetails"),
    scenarioSummary: document.getElementById("scenarioSummary"),
    scenarioRows: document.getElementById("scenarioRows"),
    gaugeFill: document.getElementById("gaugeFill"),
    gaugeMarker: document.getElementById("gaugeMarker"),
    metabolismScore: document.getElementById("metabolismScore"),
    behaviorScore: document.getElementById("behaviorScore"),
    confidenceScore: document.getElementById("confidenceScore"),
    metabolismBar: document.getElementById("metabolismBar"),
    behaviorBar: document.getElementById("behaviorBar"),
    confidenceBar: document.getElementById("confidenceBar"),
    referencePositionText: document.getElementById("referencePositionText"),
    referenceSourceNote: document.getElementById("referenceSourceNote"),
    interpretationTitle: document.getElementById("interpretationTitle"),
    interpretationSummary: document.getElementById("atlas-interpretation-summary"),
    interpretationMore: document.getElementById("atlas-interpretation-more"),
    interpretationText: document.getElementById("interpretationText"),
    typeEmoji: document.getElementById("typeEmoji"),
    typeIllustration: document.getElementById("typeIllustration"),
    typeBadge: document.getElementById("typeBadge"),
    typeName: document.getElementById("typeName"),
    typeDesc: document.getElementById("typeDesc"),
    detailCategory: document.getElementById("detailCategory"),
    detailInputQuality: document.getElementById("detailInputQuality"),
    metabolismTypeName: document.getElementById("metabolismTypeName"),
    metabolismTypeDesc: document.getElementById("metabolismTypeDesc"),
    lifestyleFocus: document.getElementById("atlas-life-focus"),
    recommendList: document.getElementById("recommendList"),
    summaryGrid: document.getElementById("summaryGrid"),
    chart: document.getElementById("referenceChart")
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getKoreaDateParts(date) {
    var parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: KOREA_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).formatToParts(date || new Date());

    return parts.reduce(function (result, part) {
      if (part.type !== "literal") {
        result[part.type] = part.value;
      }
      return result;
    }, {});
  }

  function getKoreaDateString(date) {
    var parts = getKoreaDateParts(date);
    return parts.year + "-" + parts.month + "-" + parts.day;
  }

  function getKoreaDateTimeString(date) {
    var parts = getKoreaDateParts(date);
    return [
      parts.year, "-", parts.month, "-", parts.day,
      " ", parts.hour, ":", parts.minute, ":", parts.second,
      " KST"
    ].join("");
  }

  function normalizeReference(raw) {
    return ((raw + 0.5) / 1.5) * 100;
  }

  function createGeneCards() {
    var html = genes.map(function (gene) {
      var buttons = gene.genotypes.map(function (gt) {
        var code = gt.code === "unknown" ? "모름" : gt.code;
        return [
          '<button class="gt-button" type="button" data-gene="', gene.id,
          '" data-genotype="', gt.code, '" aria-pressed="false">',
          '<strong>', code, '</strong>',
          '<small>', gt.label, '</small>',
          '</button>'
        ].join("");
      }).join("");

      return [
        '<article class="gene-card ', gene.layer, '" id="card-', gene.id, '">',
        '<div class="gene-top">',
        '<div><div class="gene-name">', gene.name.replace(" · " + gene.rsid, ""), '</div><div class="rsid">', gene.rsid, '</div></div>',
        '<span class="layer-badge">', gene.layerLabel, '</span>',
        '</div>',
        '<div class="genotype-options">', buttons, '</div>',
        '<details class="gene-evidence"><summary>근거 보기</summary>',
        '<p class="gene-desc">', gene.description, '</p>',
        '<dl class="gene-meta">',
        '<div class="meta-item"><dt>반영 대립유전자</dt><dd>', gene.allele, '</dd></div>',
        '<div class="meta-item"><dt>근거 분류</dt><dd>', gene.source, '</dd></div>',
        '<div class="meta-item"><dt>영역 내 가중치</dt><dd>', gene.weightText, '</dd></div>',
        '</dl></details>',
        '</article>'
      ].join("");
    }).join("");

    elements.geneGrid.innerHTML = html;
  }

  function getGene(id) {
    for (var i = 0; i < genes.length; i += 1) {
      if (genes[i].id === id) return genes[i];
    }
    return null;
  }

  function getGenotype(gene, code) {
    for (var i = 0; i < gene.genotypes.length; i += 1) {
      if (gene.genotypes[i].code === code) return gene.genotypes[i];
    }
    return null;
  }

  function setSelection(geneId, genotypeCode) {
    var gene = getGene(geneId);
    var genotype = getGenotype(gene, genotypeCode);
    selections[geneId] = genotype;

    var card = document.getElementById("card-" + geneId);
    var buttons = card.querySelectorAll(".gt-button");
    for (var i = 0; i < buttons.length; i += 1) {
      var selected = buttons[i].getAttribute("data-genotype") === genotypeCode;
      buttons[i].classList.toggle("active", selected);
      buttons[i].setAttribute("aria-pressed", String(selected));
    }
    markInputChanged();
  }

  function computeEvidenceModel(valid) {
    var layerData = {
      metabolism: { weighted: 0, weight: 0, count: 0 },
      behavior: { weighted: 0, weight: 0, count: 0 }
    };

    valid.forEach(function (item) {
      var weight = evidenceWeights[item.gene.id];
      var score = item.genotype.evidenceScore;
      var layer = layerData[item.gene.layer];
      layer.weighted += score * weight;
      layer.weight += weight;
      layer.count += 1;
    });

    var met = layerData.metabolism.weight > 0 ? layerData.metabolism.weighted / layerData.metabolism.weight : null;
    var beh = layerData.behavior.weight > 0 ? layerData.behavior.weighted / layerData.behavior.weight : null;

    return combineLayers(met, beh, layerData);
  }

  function combineLayers(met, beh, layerData) {
    var finalNorm;
    if (met !== null && beh !== null) {
      finalNorm = 0.7 * met + 0.3 * beh;
    } else if (met !== null) {
      finalNorm = met;
    } else if (beh !== null) {
      finalNorm = beh;
    } else {
      finalNorm = null;
    }

    return {
      metabolismNorm: met,
      behaviorNorm: beh,
      finalNorm: finalNorm,
      layerData: layerData
    };
  }

  function getValidSelectionsFor(selectionMap) {
    var valid = [];
    genes.forEach(function (gene) {
      var genotype = selectionMap[gene.id];
      if (genotype && genotype.code !== "unknown" && genotype.evidenceScore !== null) {
        valid.push({ gene: gene, genotype: genotype });
      }
    });
    return valid;
  }

  function getValidSelections() {
    return getValidSelectionsFor(selections);
  }

  function getUnknownCountFor(selectionMap) {
    return genes.filter(function (gene) {
      return selectionMap[gene.id] && selectionMap[gene.id].code === "unknown";
    }).length;
  }

  function simulateMissingGenotypes(valid) {
    var observed = new Set(valid.map(function (item) { return item.gene.id; }));
    var missing = genes.filter(function (gene) { return !observed.has(gene.id); });
    if (!valid.length || !missing.length) return null;

    var cases = missing.reduce(function (partials, gene) {
      var possible = gene.genotypes.filter(function (genotype) { return genotype.evidenceScore !== null; });
      return partials.flatMap(function (partial) {
        return possible.map(function (genotype) {
          return partial.concat({ gene: gene, genotype: genotype });
        });
      });
    }, [[]]).map(function (assumed) {
      var model = computeEvidenceModel(valid.concat(assumed));
      var score = clamp(model.finalNorm * 100, 0, 100);
      return {
        genotypes: assumed.map(function (item) { return item.gene.rsid + " " + item.genotype.code; }).join(" · "),
        score: score,
        category: classify(score).label
      };
    }).sort(function (a, b) { return a.score - b.score; });

    return {
      cases: cases,
      minimum: cases[0].score,
      maximum: cases[cases.length - 1].score,
      categories: Array.from(new Set(cases.map(function (item) { return item.category; })))
    };
  }

  function formatScenarioSummary(sensitivity) {
    return sensitivity.minimum.toFixed(1) + "–" + sensitivity.maximum.toFixed(1) +
      "점 · " + sensitivity.cases.length + "개 조합 · " + sensitivity.categories.join(" / ");
  }

  function describeTypePosition(score) {
    var lower = TYPE_THRESHOLDS[0];
    var upper = TYPE_THRESHOLDS[1];
    if (score < lower) return "잠잠형 경계까지 " + (lower - score).toFixed(2) + "점";
    if (score >= upper) return "잠잠형과의 경계보다 " + (score - upper).toFixed(2) + "점 높음";
    return "잠꾸러기형과의 경계보다 " + (score - lower).toFixed(2) + "점 높음 · 각성형 경계까지 " +
      (upper - score).toFixed(2) + "점";
  }

  function buildComputedResult(selectionMap) {
    var valid = getValidSelectionsFor(selectionMap);
    var unknownCount = getUnknownCountFor(selectionMap);
    var result = computeEvidenceModel(valid);
    var hasCoreGenotype = valid.some(function (item) {
      return item.gene.id === "rs762551";
    });
    var hasScore = hasCoreGenotype && result.finalNorm !== null && typeof result.finalNorm === "number";
    var score = hasScore ? clamp(result.finalNorm * 100, 0, 100) : null;
    var percentile = hasScore ? calculatePercentile(score) : { percentile: null, total: 0 };
    var confidence = Math.round((valid.length / genes.length) * 100);
    var category = hasScore ? classify(score) : getInsufficientCategory(valid.length);
    var habitGuide = buildCaffeineHabitGuide(category.illustration);
    category.recommendations = habitGuide.map(function (item) {
      return item.title + " " + item.value + " · " + item.text;
    });
    var metabolismSubtype = hasCoreGenotype
      ? getMetabolismSubtype(result.metabolismNorm)
      : {
        name: "판정 보류",
        displayName: "판정 보류",
        desc: "핵심 대사 표지자인 CYP1A2*1F rs762551가 '모름'이어서 카페인이 몸에 남는 시간을 판정하지 않았습니다."
      };
    // Preserve the existing research-storage field; public reports use the cumulative position.
    var sensitivityRank = hasScore ? calculateRankFromPercentile(percentile.percentile) : null;
    var coverageLabel = hasScore && unknownCount
      ? "제한적 결과 · " + valid.length + "/" + genes.length + " SNP 확인"
      : "";
    var coverageNote = unknownCount > 0 && hasScore
      ? "'모름' " + unknownCount + "개는 제외하고 확인된 " + valid.length + "개 유전자형만 반영한 제한적 결과입니다."
      : "";

    var interpretation = category.text.split("\n\n");
    if (metabolismSubtype.effect) interpretation[0] += " 대사 모형에서는 " + metabolismSubtype.displayName + "이에요. " + metabolismSubtype.effect;
    if (coverageNote) interpretation.push(coverageNote);

    return {
      score: score,
      percentile: percentile.percentile,
      sensitivityRank: sensitivityRank,
      confidence: confidence,
      sensitivity: simulateMissingGenotypes(valid),
      typePosition: hasScore ? describeTypePosition(score) : "",
      coverageLabel: coverageLabel,
      category: category,
      habitGuide: habitGuide,
      typeDescription: coverageNote ? category.desc + " " + coverageNote : category.desc,
      interpretation: interpretation.join("\n\n"),
      metabolismSubtype: metabolismSubtype,
      valid: valid,
      unknownCount: unknownCount,
      metabolismNorm: result.metabolismNorm,
      behaviorNorm: result.behaviorNorm
    };
  }

  function calculatePercentile(score) {
    var total = 0;
    var below = 0;
    referenceBins.forEach(function (bin) {
      var binScore = normalizeReference(bin.raw);
      total += bin.level;
      if (binScore < score) below += bin.level;
    });
    return {
      percentile: total > 0 ? (below / total) * 100 : 0,
      total: total
    };
  }

  function calculateRankFromPercentile(percentile) {
    return clamp(Math.round(100 - percentile), 1, 100);
  }

  var caffeineHabitPlans = {
    awake: {
      cups: 2,
      hoursBeforeBed: 9,
      coffee: "두 잔을 마시는 날엔 오전과 점심 무렵에 나눠 보세요.",
      alternative: "녹차 · 보리차",
      swap: "커피를 녹차로 바꿔 보세요. 녹차에도 카페인이 있으니 마감 전에 마시고, 이후에는 보리차나 물을 골라 보세요."
    },
    calm: {
      cups: 1,
      hoursBeforeBed: 10,
      coffee: "커피를 마신다면 오전에 한 잔으로 계획해 보세요.",
      alternative: "디카페인 · 루이보스차",
      swap: "오전에는 카페인 함량을 확인한 디카페인 커피를, 마감 이후에는 순수 루이보스차를 골라 보세요."
    },
    sleepy: {
      cups: 0.5,
      hoursBeforeBed: 11,
      coffee: "커피를 마신다면 오전에 반 잔 정도로 줄여 보세요.",
      alternative: "보리차 · 루이보스차",
      swap: "커피가 생각날 때 순수 보리차나 루이보스차를 먼저 골라 보세요."
    },
    pending: {
      cups: null,
      hoursBeforeBed: 9,
      coffee: "평소 마시는 양과 메뉴에 표시된 카페인 함량을 함께 적어 보세요.",
      alternative: "보리차 · 물",
      swap: "카페인을 줄여 보고 싶다면 커피 한 잔을 보리차나 물로 바꿔 보세요."
    }
  };

  function buildCaffeineHabitGuide(illustration) {
    // Preserve the existing score-tier guidance until the guide itself is reviewed.
    var guideKey = illustration === "sleepy" ? "awake" : illustration === "awake" ? "sleepy" : illustration;
    var plan = caffeineHabitPlans[guideKey] || caffeineHabitPlans.pending;
    var dailyCoffee = { title: "하루 커피", value: "평소 양 확인", text: plan.coffee };
    if (plan.cups !== null) {
      dailyCoffee.value = (plan.cups === 0.5 ? "반 잔" : plan.cups + "잔") + " 이내";
      dailyCoffee.text = "카페인 100 mg을 1잔으로 잡으면 " + (plan.cups * 100) +
        " mg 이내인 성인 생활 예시예요. " + plan.coffee;
    }
    var cutoffHour = 23 - plan.hoursBeforeBed;
    var cutoffTime = cutoffHour === 12 ? "정오" : "오후 " + (cutoffHour - 12) + "시";
    return [
      dailyCoffee,
      {
        title: "카페인 마감",
        value: cutoffTime + " 이후",
        text: "밤 11시 취침 기준 " + plan.hoursBeforeBed + "시간 전이에요. 이 시각부터 카페인 음료를 피해 보세요."
      },
      {
        title: "대체 음료",
        value: plan.alternative,
        text: plan.swap
      }
    ];
  }

  function classify(score) {
    if (score < TYPE_THRESHOLDS[0]) {
      return {
        label: "잠꾸러기형",
        illustration: "sleepy",
        badge: "민감도 지수 낮음",
        emoji: "🌙",
        desc: "연구용 카페인 민감도 지수가 낮은 구간이에요.",
        title: "카페인 민감도 지수가 낮은 편이에요!",
        text: "카페인 대사와 섭취에 관련된 유전자형을 종합했을 때, 민감도를 높이는 방향으로 반영된 점수가 낮은 구간이에요.\n\n커피를 마신 시각과 양, 잠들기까지 걸린 시간을 함께 살펴보세요."
      };
    }
    if (score < TYPE_THRESHOLDS[1]) {
      return {
        label: "잠잠형",
        illustration: "calm",
        badge: "민감도 지수 중간",
        emoji: "🌿",
        desc: "연구용 카페인 민감도 지수가 중간 구간이에요.",
        title: "카페인 민감도 지수가 중간 구간이에요!",
        text: "카페인 대사와 섭취에 관련된 유전자형을 종합한 연구용 민감도 지수가 중간 구간이에요.\n\n커피를 마신 시각과 양, 잠들기까지 걸린 시간을 함께 살펴보세요."
      };
    }
    return {
      label: "각성형",
      illustration: "awake",
      badge: "민감도 지수 높음",
      emoji: "⚡",
      desc: "연구용 카페인 민감도 지수가 높은 구간이에요.",
      title: "카페인 민감도 지수가 높은 편이에요!",
      text: "카페인 대사와 섭취에 관련된 유전자형을 종합했을 때, 민감도를 높이는 방향으로 반영된 점수가 높은 구간이에요.\n\n커피를 마신 시각과 양, 잠들기까지 걸린 시간을 함께 살펴보세요."
    };
  }

  function getInsufficientCategory(confirmedCount) {
    var hasSupportingData = confirmedCount > 0;
    return {
      label: "정보 부족형",
      badge: "유형 판정 보류",
      emoji: "?",
      desc: hasSupportingData
        ? "확인된 보조 유전자형은 있지만 핵심 CYP1A2*1F가 '모름'이어서 카페인 민감도 유형을 판정하지 않았습니다."
        : "확인된 유전자형이 없어 카페인 민감도 유형을 판정하지 않았습니다.",
      title: "핵심 유전자형을 확인하면 유형을 계산할 수 있어요",
      text: hasSupportingData
        ? "확인된 " + confirmedCount + "개 유전자형의 레이어 값은 리포트에 표시하지만, 핵심 대사 표지자인 CYP1A2*1F rs762551가 '모름'이므로 최종 민감도 점수와 비교 위치는 산출하지 않았습니다."
        : "4개 유전자형이 모두 '모름'으로 입력되어 민감도 점수와 비교 위치를 산출하지 않았습니다. 임의의 평균값으로 대체하지 않고, 입력 내용과 일반적인 카페인 섭취 주의사항을 담은 정보 부족 리포트를 제공합니다."
    };
  }

  function getMetabolismSubtype(metabolismNorm) {
    if (metabolismNorm === null || typeof metabolismNorm !== "number") {
      return {
        name: "판정 보류",
        displayName: "판정 보류",
        desc: "확인된 대사 관련 유전자형이 없어 카페인이 몸에서 빠져나가는 속도를 판정하지 않았습니다."
      };
    }

    var score = clamp(metabolismNorm * 100, 0, 100);
    if (score <= 33.33) {
      return {
        name: "고속 대사형",
        displayName: "카페인 고속 대사형",
        effect: "같은 양을 마셨을 때 카페인 분해가 빠르면, 몸에 남는 시간이 짧아져 잠이 깨는 느낌도 더 일찍 잦아들 수 있어요.",
        desc: "대사 관련 유전자형을 모형에 반영했을 때 빠른 분해 쪽으로 분류됐어요."
      };
    }
    if (score <= 66.67) {
      return {
        name: "중간 대사형",
        displayName: "카페인 중간 대사형",
        effect: "커피를 마신 뒤 느끼는 각성과 수면 반응은 섭취량과 시각에 따라 달라질 수 있어요.",
        desc: "대사 모형 점수가 빠른 분해와 느린 분해 사이 구간에 있어요."
      };
    }
    return {
      name: "저속 대사형",
      displayName: "카페인 저속 대사형",
      effect: "실제로 카페인이 몸에서 천천히 줄어들면 각성 효과가 더 오래 이어져, 늦게 마신 날에는 잠들기 어려울 수 있어요.",
      desc: "대사 관련 유전자형을 모형에 반영했을 때 느린 분해 쪽으로 분류됐어요."
    };
  }

  function formatReferencePosition(percentile) {
    return typeof percentile === "number"
      ? "낮은 점수부터 누적 " + percentile.toFixed(1) + "%"
      : "핵심 SNP 미확인으로 참조 위치 산출 보류";
  }

  function formatCollectionDate(value) {
    return value && value !== "--" ? value : "미기재";
  }

  function getReportInfo() {
    return {
      sampleId: elements.sampleId.value.trim() || "미입력",
      reportDate: elements.reportDate.value || "--",
      collectionDate: elements.collectionDate.value || "--",
      sampleType: elements.sampleType.options[elements.sampleType.selectedIndex].text,
      sampleTypeValue: elements.sampleType.value,
      sex: elements.sex.options[elements.sex.selectedIndex].text,
      sexValue: elements.sex.value,
      institution: FIXED_INSTITUTION
    };
  }

  function updateReportMeta() {
    var info = getReportInfo();
    elements.reportMeta.innerHTML = [
      "<span>Sample ID: " + escapeHtml(info.sampleId) + "</span>",
      "<span>Report date: " + escapeHtml(info.reportDate) + "</span>",
      "<span>Collection date: " + escapeHtml(formatCollectionDate(info.collectionDate)) + "</span>",
      "<span>Specimen: " + escapeHtml(info.sampleType) + "</span>",
      "<span>Sex: " + escapeHtml(info.sex) + "</span>",
      "<span>운영기관: " + escapeHtml(info.institution) + "</span>"
    ].join("");
  }

  function setResultVisible(visible) {
    elements.resultReport.hidden = !visible;
    elements.inputScreen.hidden = visible;
    elements.resultContent.hidden = !visible;
    elements.resultPlaceholder.hidden = visible;
    if (!visible) {
      elements.coverageText.textContent = "리포트 생성 버튼을 누르면 결과가 생성됩니다.";
    }
  }

  function showInputScreen() {
    hasSubmitted = false;
    elements.resultReport.hidden = true;
    elements.inputScreen.hidden = false;
    window.location.hash = "report-form";
    elements.inputScreen.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function getMissingGenes() {
    return genes.filter(function (gene) {
      return !selections[gene.id];
    });
  }

  function getUnknownGenes() {
    return genes.filter(function (gene) {
      var genotype = selections[gene.id];
      return genotype && genotype.code === "unknown";
    });
  }

  function updateValidationMessage(message, isError) {
    if (message) {
      elements.validationText.textContent = message;
    } else {
      var selectedCount = genes.length - getMissingGenes().length;
      var unknownCount = getUnknownGenes().length;
      var confirmedCount = selectedCount - unknownCount;
      elements.validationText.textContent = "입력 진행률 " + selectedCount + "/4 (확인 " + confirmedCount + "개, 모름 " + unknownCount + "개). '모름'도 선택할 수 있으며, 핵심 CYP1A2*1F가 '모름'이면 유형 판정은 보류됩니다.";
    }
    elements.validationText.classList.toggle("error", Boolean(isError));
  }

  function validateSubmission() {
    var errors = [];
    var missingGenes = getMissingGenes();

    if (!elements.sampleId.value.trim()) {
      errors.push("Sample ID를 입력해 주세요.");
    } else if (elements.sampleId.value.trim().length > 120) {
      errors.push("Sample ID는 120자 이내로 입력해 주세요.");
    }
    var reportDate = normalizeBatchDate(elements.reportDate.value, true);
    var collectionDate = normalizeBatchDate(elements.collectionDate.value, false);
    if (!reportDate) {
      elements.specimenDetails.open = true;
      errors.push("유효한 보고일을 입력해 주세요.");
    }
    if (!collectionDate) {
      elements.specimenDetails.open = true;
      errors.push("유효한 채취일을 입력해 주세요.");
    } else if (reportDate && collectionDate !== "--" && collectionDate > reportDate) {
      elements.specimenDetails.open = true;
      errors.push("채취일은 리포트 날짜보다 늦을 수 없습니다.");
    }
    if (missingGenes.length > 0) {
      errors.push("아직 입력하지 않은 유전자형 항목: " + missingGenes.map(function (gene) {
        return gene.name + " " + gene.rsid;
      }).join(", "));
    }
    return errors;
  }

  function markInputChanged() {
    hasSubmitted = false;
    lastResult = null;
    setSheetStatus("Google Sheets 저장은 결과 생성 후 실행할 수 있습니다.");
    updateReportMeta();
    renderEmpty();
    drawReferenceChart(null);
    setResultVisible(false);
    updateValidationMessage();
  }

  function analyze(mode, savedId) {
    var errors = validateSubmission();
    if (errors.length > 0) {
      hasSubmitted = false;
      lastResult = null;
      renderEmpty();
      drawReferenceChart(null);
      setResultVisible(false);
      updateValidationMessage(errors.join(" "), true);
      return;
    }

    hasSubmitted = true;
    updateValidationMessage("리포트가 생성되었습니다. 결과 화면으로 이동합니다.", false);
    render();
    setResultVisible(true);
    if (atlasWorkspace) {
      atlasWorkspace.showResult({
        id: savedId || null,
        kind: mode === "example" ? "example" : "personal",
        date: elements.reportDate.value,
        genotypes: genes.map(function (gene) { return selections[gene.id].code; }),
        score: lastResult.score,
        category: lastResult.category.label
      });
    }
    window.requestAnimationFrame(function () {
      document.getElementById("result-title").focus({ preventScroll: true });
      drawReferenceChart(lastResult && typeof lastResult.score === "number" ? lastResult.score : null);
    });
    window.location.hash = "resultReport";
    elements.resultReport.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    updateReportMeta();

    if (!hasSubmitted) {
      lastResult = null;
      renderEmpty();
      drawReferenceChart(null);
      return;
    }

    lastResult = buildComputedResult(selections);
    var valid = lastResult.valid;
    var unknownCount = lastResult.unknownCount;
    var score = lastResult.score;
    var hasScore = typeof score === "number";
    var category = lastResult.category;
    var confidence = lastResult.confidence;
    var coverageLabel = lastResult.coverageLabel;
    var metabolismSubtype = lastResult.metabolismSubtype;

    elements.reportHero.style.setProperty("--atlas-score", hasScore ? score.toFixed(2) + "%" : "0%");
    elements.reportHero.dataset.mascot = category.illustration || "pending";
    elements.scoreValue.textContent = hasScore ? score.toFixed(1) : "--";
    elements.scoreUnit.hidden = !hasScore;
    elements.scoreLabel.textContent = hasScore ? category.label : "산출 보류";
    elements.scoreLabel.hidden = hasScore;
    elements.scoreCoverageNote.textContent = coverageLabel;
    elements.scoreCoverageNote.hidden = !coverageLabel;
    renderScoreDetails(lastResult);
    elements.typeEmoji.textContent = category.emoji;
    elements.typeEmoji.hidden = Boolean(category.illustration);
    elements.typeIllustration.innerHTML = typeArtworkHtml(category.illustration);
    elements.typeIllustration.hidden = !category.illustration;
    elements.typeBadge.textContent = category.badge;
    elements.typeName.textContent = category.label;
    elements.typeDesc.textContent = hasScore ? metabolismSubtype.displayName : lastResult.typeDescription;
    elements.coverageText.textContent = "입력 완성도 " + confidence + "% (확인 " + valid.length + "/4 · 모름 " + unknownCount + "/4)";
    elements.gaugeFill.style.width = hasScore ? score.toFixed(2) + "%" : "0%";
    elements.gaugeMarker.style.left = hasScore ? score.toFixed(2) + "%" : "0%";
    elements.gaugeMarker.hidden = !hasScore;
    elements.methodScore.hidden = !hasScore;

    setLayer("metabolism", lastResult.metabolismNorm);
    setLayer("behavior", lastResult.behaviorNorm);
    elements.confidenceScore.textContent = confidence + "%";
    elements.confidenceBar.style.width = confidence + "%";

    elements.referencePositionText.textContent = formatReferencePosition(lastResult.percentile);
    elements.detailCategory.textContent = category.label;
    elements.detailInputQuality.textContent = "확인 " + valid.length + "개 · 모름 " + unknownCount + "개";
    elements.metabolismTypeName.textContent = metabolismSubtype.displayName;
    elements.metabolismTypeDesc.textContent = metabolismSubtype.desc;
    elements.interpretationTitle.textContent = category.title;
    var paragraphs = lastResult.interpretation.split("\n\n");
    elements.interpretationSummary.textContent = hasScore ? metabolismSubtype.effect || category.desc : category.title;
    elements.interpretationText.textContent = paragraphs.join("\n\n");
    elements.interpretationMore.hidden = false;
    elements.interpretationMore.open = false;
    elements.lifestyleFocus.textContent = (hasScore ? category.label : "일반") + " 생활 계획 예시";
    elements.recommendList.innerHTML = lastResult.habitGuide.map(function (item) {
      return '<div class="atlas-life-row"><dt>' + escapeHtml(item.title) +
        '</dt><dd class="atlas-life-value">' + escapeHtml(item.value) +
        '</dd><dd class="atlas-life-text">' + escapeHtml(item.text) + '</dd></div>';
    }).join("");

    renderSummary();
    drawReferenceChart(hasScore ? score : null);
  }

  function setLayer(layer, norm) {
    var scoreElement = layer === "metabolism" ? elements.metabolismScore : elements.behaviorScore;
    var barElement = layer === "metabolism" ? elements.metabolismBar : elements.behaviorBar;
    var summary = layer === "metabolism" ? elements.metabolismSummary : elements.behaviorSummary;
    summary.textContent = formatLayer(norm);
    summary.parentElement.style.setProperty("--atlas-area-score", (norm === null ? 0 : clamp(norm * 100, 0, 100)) + "%");
    if (norm === null) {
      scoreElement.textContent = "없음";
      barElement.style.width = "0%";
      return;
    }
    var value = clamp(norm * 100, 0, 100);
    scoreElement.textContent = value.toFixed(1);
    barElement.style.width = value.toFixed(2) + "%";
  }

  function renderScoreDetails(result) {
    var sensitivity = result && result.sensitivity;
    elements.scorePosition.textContent = result ? result.typePosition : "";
    elements.scorePosition.hidden = !elements.scorePosition.textContent;
    elements.scenarioDetails.hidden = !sensitivity;
    elements.scenarioDetails.open = Boolean(sensitivity);
    elements.scenarioSummary.textContent = sensitivity ? formatScenarioSummary(sensitivity) : "";
    elements.scenarioRows.innerHTML = sensitivity ? sensitivity.cases.map(function (item) {
      return "<tr><td>" + escapeHtml(item.genotypes) + "</td><td>" + item.score.toFixed(1) +
        "</td><td>" + escapeHtml(item.category) + "</td></tr>";
    }).join("") : "";
  }

  function typeArtworkHtml(key) {
    var labels = { awake: "각성형 커피콩 캐릭터", calm: "잠잠형 커피콩 캐릭터", sleepy: "잠꾸러기형 커피콩 캐릭터" };
    if (!Object.prototype.hasOwnProperty.call(labels, key)) return "";
    var imageUrl = new URL("./assets/atlas-mascots.webp", window.location.href).href;
    return '<span class="type-art type-art--' + key + '" role="img" aria-label="' + labels[key] +
      '"><img src="' + escapeHtml(imageUrl) + '" alt="" width="2172" height="724"></span>';
  }

  function renderEmpty() {
    elements.reportHero.style.removeProperty("--atlas-score");
    elements.reportHero.removeAttribute("data-mascot");
    elements.scoreValue.textContent = "--";
    elements.scoreUnit.hidden = true;
    elements.scoreLabel.textContent = "대기 중";
    elements.scoreLabel.hidden = false;
    elements.scoreCoverageNote.textContent = "";
    elements.scoreCoverageNote.hidden = true;
    renderScoreDetails(null);
    elements.coverageText.textContent = "선택한 유전자형이 결과에 반영됩니다.";
    elements.gaugeFill.style.width = "0%";
    elements.gaugeMarker.style.left = "0%";
    elements.gaugeMarker.hidden = false;
    elements.metabolismScore.textContent = "--";
    elements.behaviorScore.textContent = "--";
    elements.confidenceScore.textContent = "--";
    elements.metabolismBar.style.width = "0%";
    elements.behaviorBar.style.width = "0%";
    elements.confidenceBar.style.width = "0%";
    elements.referencePositionText.textContent = "--";
    elements.typeEmoji.textContent = "--";
    elements.typeEmoji.hidden = false;
    elements.typeIllustration.innerHTML = "";
    elements.typeIllustration.hidden = true;
    elements.typeBadge.textContent = "대기 중";
    elements.typeName.textContent = "리포트 결과 대기";
    elements.typeDesc.textContent = "리포트 정보와 유전자형을 입력하면 개인 유형이 표시됩니다.";
    elements.detailCategory.textContent = "--";
    elements.detailInputQuality.textContent = "--";
    elements.metabolismTypeName.textContent = "--";
    elements.metabolismTypeDesc.textContent = "유전자형을 바탕으로 카페인이 비교적 빨리 빠지는지, 오래 남는지 보여드립니다.";
    elements.interpretationTitle.textContent = "유전자형을 선택해 주세요";
    elements.interpretationSummary.textContent = "리포트 정보와 4개 유전자형 항목을 선택한 뒤 리포트 생성 버튼을 누르면 결과가 생성됩니다.";
    elements.interpretationText.textContent = "";
    elements.interpretationMore.hidden = true;
    elements.lifestyleFocus.textContent = "";
    elements.recommendList.textContent = "";
    Array.prototype.forEach.call(elements.summaryGrid.querySelectorAll("[data-report-layer]"), function (list) {
      list.textContent = "";
    });
  }

  function renderSummary() {
    elements.summaryGrid.querySelectorAll("[data-report-layer]").forEach(function (list) {
      var layer = list.dataset.reportLayer;
      list.innerHTML = genes.filter(function (gene) {
        return gene.layer === layer;
      }).map(function (gene, index) {
        var genotype = selections[gene.id];
        var known = genotype && genotype.code !== "unknown";
        var value = known ? genotype.code : "모름";
        var points = known ? Math.round(genotype.evidenceScore * 100) : null;
        var name = gene.name.replace(" · " + gene.rsid, "");
        return [
          '<details class="atlas-snp" data-order="', index, '" data-points="', known ? points : "", '"><summary>',
          '<span class="atlas-snp-name"><strong>', escapeHtml(name), '</strong><small>', escapeHtml(gene.rsid), '</small></span>',
          '<span class="atlas-snp-result"><span class="atlas-genotype">', escapeHtml(value), '</span>',
          known
            ? '<span class="atlas-snp-points"><strong>' + points + '</strong><small>점</small></span>'
            : '<span class="atlas-snp-points atlas-snp-missing">미확인</span>',
          '</span></summary>',
          '<div class="atlas-snp-body"><dl>',
          '<dt>반영 대립유전자</dt><dd>', escapeHtml(gene.allele), '</dd>',
          '<dt>반영 수</dt><dd>', known ? genotype.alleleCount + "개" : "미확인", '</dd>',
          '<dt>항목 점수</dt><dd>', known ? points + " / 100" : "반영 없음", '</dd>',
          '<dt>영역 내 가중치</dt><dd>', Math.round(evidenceWeights[gene.id] * 100), '%</dd>',
          '<dt>근거 분류</dt><dd>', escapeHtml(gene.source), '</dd>',
          '</dl></div></details>'
        ].join("");
      }).join("");
    });
    sortSummary();
  }

  function sortSummary() {
    var order = elements.snpSort.value;
    var direction = order === "highest" ? -1 : 1;
    elements.summaryGrid.querySelectorAll("[data-report-layer]").forEach(function (list) {
      var items = Array.from(list.children);
      items.sort(function (a, b) {
        var defaultOrder = Number(a.dataset.order) - Number(b.dataset.order);
        if (order === "default") return defaultOrder;
        if (a.dataset.points === "") return b.dataset.points === "" ? defaultOrder : 1;
        if (b.dataset.points === "") return -1;
        return direction * (Number(a.dataset.points) - Number(b.dataset.points)) || defaultOrder;
      });
      list.append.apply(list, items);
    });
  }

  function drawReferenceChart(userScore) {
    var canvas = elements.chart;
    var ctx = canvas.getContext("2d");
    var measuredWidth = Math.round(canvas.getBoundingClientRect().width);
    var width = measuredWidth > 0 ? measuredWidth : 760;
    var height = Math.round(width * 300 / 680);
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    var compact = width < 500;
    var padLeft = compact ? 38 : 58;
    var padRight = compact ? 12 : 28;
    var padTop = compact ? 22 : 26;
    var padBottom = compact ? 38 : 52;
    var chartW = width - padLeft - padRight;
    var chartH = height - padTop - padBottom;
    var maxLevel = referenceBins.reduce(function (max, bin) {
      return Math.max(max, bin.level);
    }, 1);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#e2e9f0";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#657487";
    ctx.font = (compact ? "10px" : "12px") + " sans-serif";
    ctx.textAlign = "right";
    for (var i = 0; i <= 4; i += 1) {
      var y = padTop + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
    }

    var points = referenceBins.map(function (bin) {
      return {
        x: padLeft + normalizeReference(bin.raw) / 100 * chartW,
        y: padTop + chartH - (bin.level / maxLevel) * chartH
      };
    });

    ctx.beginPath();
    ctx.moveTo(points[0].x, padTop + chartH);
    points.forEach(function (point) {
      ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(points[points.length - 1].x, padTop + chartH);
    ctx.closePath();
    var areaGradient = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    areaGradient.addColorStop(0, "rgba(8, 127, 140, 0.28)");
    areaGradient.addColorStop(1, "rgba(8, 127, 140, 0.04)");
    ctx.fillStyle = areaGradient;
    ctx.fill();

    ctx.beginPath();
    points.forEach(function (point, index) {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.strokeStyle = "#087f8c";
    ctx.lineWidth = 4;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    points.forEach(function (point, index) {
      ctx.fillStyle = "#087f8c";
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#657487";
      ctx.textAlign = "center";
      ctx.font = (compact ? "10px" : "12px") + " sans-serif";
      ctx.fillText(Math.round(normalizeReference(referenceBins[index].raw)), point.x, height - 24);
    });

    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.font = "bold " + (compact ? "10px" : "13px") + " sans-serif";
    ctx.fillText("민감도 점수 환산값", padLeft + chartW / 2, height - 7);

    ctx.save();
    ctx.translate(16, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("연구 참조분포", 0, 0);
    ctx.restore();

    if (typeof userScore === "number") {
      var safeScore = clamp(userScore, 0, 100);
      var markerX = padLeft + safeScore / 100 * chartW;
      var markerLevel = getReferenceLevelAtScore(safeScore);
      var markerY = padTop + chartH - (markerLevel / maxLevel) * chartH;
      ctx.strokeStyle = "#d95d39";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(markerX, markerY);
      ctx.lineTo(markerX, padTop + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#d95d39";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(markerX, markerY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      var label = "내 위치 " + userScore.toFixed(1);
      var labelFontSize = compact ? 10 : 13;
      var labelHeight = compact ? 20 : 24;
      ctx.font = "bold " + labelFontSize + "px sans-serif";
      var labelW = ctx.measureText(label).width + (compact ? 12 : 18);
      var labelX = clamp(markerX - labelW / 2, padLeft, width - padRight - labelW);
      var labelY = Math.max(3, markerY - (compact ? 28 : 34));
      ctx.fillStyle = "#d95d39";
      ctx.fillRect(labelX, labelY, labelW, labelHeight);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(label, labelX + labelW / 2, labelY + labelHeight - (compact ? 6 : 7));
    }
  }

  function getReferenceLevelAtScore(score) {
    var safeScore = clamp(score, 0, 100);
    var normalizedBins = referenceBins.map(function (bin) {
      return { score: normalizeReference(bin.raw), level: bin.level };
    });

    for (var i = 0; i < normalizedBins.length - 1; i += 1) {
      var current = normalizedBins[i];
      var next = normalizedBins[i + 1];
      if (safeScore <= next.score) {
        var span = next.score - current.score;
        var ratio = span ? (safeScore - current.score) / span : 0;
        return current.level + (next.level - current.level) * ratio;
      }
    }

    return normalizedBins[normalizedBins.length - 1].level;
  }

  // Fictional demonstration values ONLY. These do not represent a real
  // individual, population baseline, medical interpretation or a sample
  // collected for research. A manual user input takes precedence unless
  // this button is explicitly pressed.
  function showExampleReport(variant) {
    if (RESEARCH_STORAGE_MODE) return;
    var exampleGenotypes = [
      ["rs762551", "AA"],
      ["rs2069514", "GG"],
      ["rs2472297", "CC"],
      ["rs6968865", "AT"]
    ];
    elements.sampleId.value = "DEMO-001";
    if (variant === "calm") {
      elements.sampleId.value = "DEMO-002";
      exampleGenotypes = [["rs762551", "AC"], ["rs2069514", "AG"], ["rs2472297", "CT"], ["rs6968865", "AT"]];
    } else if (variant === "awake" || variant === "sleepy") {
      elements.sampleId.value = "DEMO-003";
      exampleGenotypes = [["rs762551", "CC"], ["rs2069514", "AA"], ["rs2472297", "TT"], ["rs6968865", "TT"]];
    }
    elements.reportDate.value = getKoreaDateString();
    elements.collectionDate.value = "";
    elements.sampleType.value = "Raw genotype data";
    elements.sex.value = "Not provided";
    setInputMode("single");
    exampleGenotypes.forEach(function (pair) {
      setSelection(pair[0], pair[1]);
    });
    // The normal validation and report functions remain the sole analyzer.
    analyze("example");
  }

  function startPersonalReport() {
    resetAll();
    setInputMode("single");
    showInputScreen();
    window.requestAnimationFrame(function () {
      elements.sampleId.focus({ preventScroll: true });
    });
  }

  function reopenSavedReport(record) {
    if (RESEARCH_STORAGE_MODE || !normalizeBatchDate(record.date, true) ||
        !genes.every(function (gene, index) { return getGenotype(gene, record.genotypes[index]); })) return false;
    resetAll();
    setInputMode("single");
    elements.sampleId.value = "ATLAS-" + record.date.replace(/-/g, "") + "-" + record.id.slice(0, 5);
    elements.reportDate.value = record.date;
    elements.collectionDate.value = "";
    elements.sampleType.value = "Raw genotype data";
    elements.sex.value = "Not provided";
    genes.forEach(function (gene, index) { setSelection(gene.id, record.genotypes[index]); });
    analyze("saved", record.id);
    return true;
  }

  function resetAll() {
    selections = {};
    if (!RESEARCH_STORAGE_MODE) {
      // Important for a shared symposium demo device: do not carry an
      // identifier or genotype entry into the next visitor's session.
      elements.sampleId.value = "";
      elements.sampleType.value = "Buccal swab";
      elements.sex.value = "Not provided";
      elements.reportDate.value = getKoreaDateString();
      elements.collectionDate.value = "";
    }
    var buttons = document.querySelectorAll(".gt-button");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.remove("active");
      buttons[i].setAttribute("aria-pressed", "false");
    }
    markInputChanged();
  }

  function resultText() {
    if (!lastResult) return "카페인 민감도 결과가 아직 계산되지 않았습니다.";
    var reportInfo = getReportInfo();
    var layerText = [
      "대사 레이어: " + formatLayer(lastResult.metabolismNorm),
      "섭취/조절 레이어: " + formatLayer(lastResult.behaviorNorm),
      "분석 완성도: " + lastResult.confidence + "%"
    ];
    if (lastResult.typePosition) layerText.push("유형 경계: " + lastResult.typePosition);
    if (lastResult.sensitivity) layerText.push("미확인 SNP 대입 시나리오: " + formatScenarioSummary(lastResult.sensitivity));
    var genotypeText = getGenotypeRecords().map(function (item) {
      return [
        item.name,
        "(" + item.rsid + ")",
        item.genotype,
        "효과대립유전자 " + item.effectAllele,
        "반영점수 " + item.evidenceScore,
        item.evidenceGrade
      ].join(" / ");
    });
    var lines = [
      "카페인 반응 근거 기반 해석 리포트",
      "Sample ID: " + reportInfo.sampleId,
      "Report date: " + reportInfo.reportDate,
      "Collection date: " + formatCollectionDate(reportInfo.collectionDate),
      "Specimen: " + reportInfo.sampleType,
      "Sex: " + reportInfo.sex,
      "운영기관: " + reportInfo.institution,
      "",
      "점수: " + (typeof lastResult.score === "number" ? lastResult.score.toFixed(1) + "점" : "산출 없음")
        + (lastResult.coverageLabel ? " (" + lastResult.coverageLabel + ")" : ""),
      "유형: " + lastResult.category.label,
      "대사 레이어 판정: " + lastResult.metabolismSubtype.displayName,
      formatReferencePosition(lastResult.percentile),
      REFERENCE_SOURCE_NOTE,
      layerText.join("\n"),
      "",
      "[유전자형]",
      genotypeText.join("\n"),
      "",
      "[해석]",
      lastResult.category.title,
      lastResult.interpretation
    ];
    lines.push("", "[카페인 섭취 계획 예시]", lastResult.category.recommendations.map(function (item) {
      return "- " + item;
    }).join("\n"));
    lines.push("", "[주의]", "연구·교육용 해석 리포트이며 질병 진단, 의학적 처방, 치료 판단을 대체하지 않습니다.");
    return lines.join("\n");
  }

  function copyResult() {
    var text = resultText();
    function fallbackCopy() {
      window.prompt("결과 텍스트", text);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        elements.copyBtn.textContent = "복사 완료";
        setTimeout(function () {
          elements.copyBtn.innerHTML = '<span aria-hidden="true">⧉</span> 결과 복사';
        }, 1400);
      }).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function formatLayer(norm) {
    if (norm === null || typeof norm !== "number") return "입력 없음";
    return (clamp(norm * 100, 0, 100)).toFixed(1) + "점";
  }

  function getGenotypeRecordsFor(selectionMap) {
    return genes.map(function (gene) {
      var genotype = selectionMap[gene.id];
      var hasValue = genotype && genotype.code !== "unknown";
      return {
        geneId: gene.id,
        name: gene.name,
        rsid: gene.rsid,
        layer: gene.layerLabel,
        genotype: genotype ? (genotype.code === "unknown" ? "모름" : genotype.code) : "미선택",
        effectAllele: gene.allele,
        effectAlleleCount: hasValue ? genotype.alleleCount : null,
        evidenceScore: hasValue ? Math.round(genotype.evidenceScore * 100) + "%" : "반영 없음",
        evidenceGrade: gene.evidenceGrade,
        source: gene.source,
        weight: gene.weightText,
        description: gene.description
      };
    });
  }

  function getGenotypeRecords() {
    return getGenotypeRecordsFor(selections);
  }

  function buildReportDataFor(result, reportInfo, selectionMap) {
    if (!result) return null;

    return {
      reportTitle: "카페인 반응 근거 기반 해석 리포트",
      generatedAt: getKoreaDateTimeString(),
      timeZone: KOREA_TIME_ZONE,
      reportInfo: reportInfo,
      result: {
        score: typeof result.score === "number" ? Number(result.score.toFixed(1)) : null,
        category: result.category.label,
        title: result.category.title,
        badge: result.category.badge,
        emoji: result.category.emoji,
        typeDescription: result.typeDescription,
        interpretation: result.interpretation,
        percentile: typeof result.percentile === "number" ? Number(result.percentile.toFixed(1)) : null,
        sensitivityRank: result.sensitivityRank,
        confidence: result.confidence,
        coverageLabel: result.coverageLabel,
        typePosition: result.typePosition,
        sensitivitySummary: result.sensitivity ? formatScenarioSummary(result.sensitivity) : "",
        metabolismScore: result.metabolismNorm === null ? null : Number((result.metabolismNorm * 100).toFixed(1)),
        regulationScore: result.behaviorNorm === null ? null : Number((result.behaviorNorm * 100).toFixed(1)),
        metabolismSubtype: result.metabolismSubtype
      },
      genotypes: getGenotypeRecordsFor(selectionMap),
      recommendations: result.category.recommendations,
      limitations: [
        "본 결과는 연구·교육용 해석 리포트이며 질병 진단, 의학적 처방, 치료 판단을 대체하지 않습니다.",
        "실제 카페인 반응은 수면, 약물, 간 기능, 임신, 흡연, 스트레스, 섭취량과 섭취 시간의 영향을 받을 수 있습니다.",
        result.confidence < 100 ? "'모름'으로 선택한 유전자형은 점수에서 제외했으며, 분석 완성도가 낮을수록 결과의 불확실성이 큽니다." : ""
      ].filter(Boolean)
    };
  }

  function buildReportData() {
    if (!lastResult) {
      return null;
    }
    return buildReportDataFor(lastResult, getReportInfo(), selections);
  }

  function getGenotypeValueFor(selectionMap, rsid) {
    var genotype = selectionMap[rsid];
    if (!genotype) return "미선택";
    return genotype.code === "unknown" ? "모름" : genotype.code;
  }

  function getGenotypeValue(rsid) {
    return getGenotypeValueFor(selections, rsid);
  }

  function buildSheetPayloadFor(data, selectionMap, consent) {
    if (!data) return null;

    return {
      submittedAt: getKoreaDateTimeString(),
      sampleId: data.reportInfo.sampleId,
      reportDate: data.reportInfo.reportDate,
      collectionDate: data.reportInfo.collectionDate,
      specimen: data.reportInfo.sampleType,
      sex: data.reportInfo.sex,
      institution: data.reportInfo.institution,
      rs762551: getGenotypeValueFor(selectionMap, "rs762551"),
      rs2069514: getGenotypeValueFor(selectionMap, "rs2069514"),
      rs2472297: getGenotypeValueFor(selectionMap, "rs2472297"),
      rs6968865: getGenotypeValueFor(selectionMap, "rs6968865"),
      score: data.result.score,
      category: data.result.category,
      metabolismSubtype: data.result.metabolismSubtype.name,
      percentile: data.result.percentile,
      confidence: data.result.confidence,
      metabolismScore: data.result.metabolismScore,
      regulationScore: data.result.regulationScore,
      consent: Boolean(consent),
      rankOutOf100: data.result.sensitivityRank,
      reportJson: data
    };
  }

  function buildSheetPayload() {
    var data = buildReportData();
    return buildSheetPayloadFor(data, selections, elements.sheetConsent && elements.sheetConsent.checked);
  }

  function setSheetStatus(message, type) {
    if (!elements.sheetSyncStatus) return;
    elements.sheetSyncStatus.textContent = message;
    elements.sheetSyncStatus.classList.toggle("error", type === "error");
    elements.sheetSyncStatus.classList.toggle("success", type === "success");
  }

  function saveToGoogleSheets() {
    if (!RESEARCH_STORAGE_MODE || !GOOGLE_SHEETS_ENDPOINT) {
      setSheetStatus("공개 체험에서는 연구 데이터가 서버에 저장되지 않습니다. 리포트 PDF 다운로드를 이용하세요.", "error");
      return;
    }
    var payload = buildSheetPayload();
    if (!payload) {
      setSheetStatus("먼저 리포트 생성 버튼을 눌러 결과를 생성해 주세요.", "error");
      return;
    }
    if (!elements.sheetConsent.checked) {
      setSheetStatus("리포트 데이터 저장 동의에 체크해야 시트에 저장할 수 있습니다.", "error");
      return;
    }
    if (!GOOGLE_SHEETS_ENDPOINT) {
      setSheetStatus("Google Apps Script 배포 URL이 아직 설정되지 않았습니다. app.js의 GOOGLE_SHEETS_ENDPOINT에 URL을 넣어주세요.", "error");
      return;
    }

    elements.sheetSaveBtn.disabled = true;
    setSheetStatus("Google Sheets로 저장 요청을 보내는 중입니다.");

    saveConfirmedPayload(payload, 1).then(function () {
      setSheetStatus("Google Sheets에 1명 저장 완료. 서버에서 기록된 행을 확인했습니다.", "success");
    }).catch(function (error) {
      setSheetStatus(error.message, "error");
    }).finally(function () {
      elements.sheetSaveBtn.disabled = false;
    });
  }

  function setInputMode(mode) {
    var isBatch = mode === "batch";
    elements.singleModeBtn.classList.toggle("active", !isBatch);
    elements.batchModeBtn.classList.toggle("active", isBatch);
    elements.singleModeBtn.setAttribute("aria-selected", String(!isBatch));
    elements.batchModeBtn.setAttribute("aria-selected", String(isBatch));
    elements.singleModeBtn.tabIndex = isBatch ? -1 : 0;
    elements.batchModeBtn.tabIndex = isBatch ? 0 : -1;
    elements.singleModePanel.hidden = isBatch;
    elements.batchModePanel.hidden = !isBatch;
    elements.resetBtn.hidden = isBatch;
  }

  function setBatchStatus(message, type) {
    elements.batchStatus.textContent = message;
    elements.batchStatus.classList.toggle("error", type === "error");
    elements.batchStatus.classList.toggle("success", type === "success");
  }

  function setBatchSheetStatus(message, type) {
    elements.batchSheetStatus.textContent = message;
    elements.batchSheetStatus.classList.toggle("error", type === "error");
    elements.batchSheetStatus.classList.toggle("success", type === "success");
  }

  function resetBatchOutput() {
    batchRows = [];
    batchResults = [];
    elements.batchDownloadBtn.disabled = true;
    elements.batchPdfZipBtn.disabled = true;
    elements.batchResults.hidden = true;
    elements.batchResultCounts.innerHTML = "";
    elements.batchResultsBody.innerHTML = "";
    setBatchSheetStatus("분석 결과는 이 브라우저에서만 처리됩니다. 결과 엑셀은 직접 내려받아 보관하세요.");
  }

  function handleBatchFileChange() {
    batchFile = elements.batchFile.files && elements.batchFile.files[0] ? elements.batchFile.files[0] : null;
    resetBatchOutput();
    elements.batchClearBtn.disabled = !batchFile;

    if (!batchFile) {
      elements.batchFileSummary.innerHTML = "<span>선택된 파일 없음</span><strong>엑셀 파일을 선택해 주세요</strong>";
      elements.batchAnalyzeSaveBtn.disabled = true;
      elements.batchAnalyzeBtn.disabled = true;
      setBatchStatus("양식을 작성한 뒤 엑셀 파일을 선택해 주세요. 파일 내용은 분석 전까지 외부로 전송되지 않습니다.");
      return;
    }

    var extension = batchFile.name.split(".").pop().toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      elements.batchFileSummary.innerHTML = "<span>지원하지 않는 파일</span><strong>" + escapeHtml(batchFile.name) + "</strong>";
      elements.batchAnalyzeSaveBtn.disabled = true;
      elements.batchAnalyzeBtn.disabled = true;
      setBatchStatus(".xlsx 또는 .xls 형식의 엑셀 파일만 업로드할 수 있습니다.", "error");
      return;
    }

    if (batchFile.size > MAX_BATCH_FILE_BYTES) {
      elements.batchAnalyzeSaveBtn.disabled = true;
      elements.batchAnalyzeBtn.disabled = true;
      elements.batchFileSummary.textContent = "파일이 5 MB를 초과합니다.";
      setBatchStatus("5 MB 이하의 엑셀 파일을 선택해 주세요.", "error");
      return;
    }

    elements.batchFileSummary.innerHTML = [
      "<span>선택된 파일 · ", formatFileSize(batchFile.size), "</span>",
      "<strong>", escapeHtml(batchFile.name), "</strong>"
    ].join("");
    elements.batchAnalyzeSaveBtn.disabled = false;
    elements.batchAnalyzeBtn.disabled = false;
    setBatchStatus("파일이 선택되었습니다. ‘일괄 분석’으로 입력을 확인한 뒤 결과 엑셀을 내려받으세요. 서버로 전송되지 않습니다.");
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function clearBatchInput() {
    if (batchBusy) return;
    elements.batchFile.value = "";
    elements.batchConsent.checked = false;
    handleBatchFileChange();
    setBatchStatus("선택한 파일과 일괄 분석 결과를 비웠습니다. 새 파일을 선택해 주세요.");
    elements.batchFile.focus();
  }

  function padDatePart(value) {
    return String(value).padStart(2, "0");
  }

  function isValidDateParts(year, month, day) {
    var date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  }

  function normalizeBatchDate(value, required) {
    if (value === null || value === undefined || String(value).trim() === "") {
      return required ? null : "--";
    }

    if (Object.prototype.toString.call(value) === "[object Date]" && !Number.isNaN(value.getTime())) {
      return value.getFullYear() + "-" + padDatePart(value.getMonth() + 1) + "-" + padDatePart(value.getDate());
    }

    if (typeof value === "number" && window.XLSX && window.XLSX.SSF) {
      var parsedSerial = window.XLSX.SSF.parse_date_code(value);
      if (parsedSerial && isValidDateParts(parsedSerial.y, parsedSerial.m, parsedSerial.d)) {
        return parsedSerial.y + "-" + padDatePart(parsedSerial.m) + "-" + padDatePart(parsedSerial.d);
      }
    }

    var text = String(value).trim();
    var match = text.match(/^(\d{4})[.\/-](\d{1,2})[.\/-](\d{1,2})$/);
    if (!match) return null;
    var year = Number(match[1]);
    var month = Number(match[2]);
    var day = Number(match[3]);
    if (!isValidDateParts(year, month, day)) return null;
    return year + "-" + padDatePart(month) + "-" + padDatePart(day);
  }

  function normalizeSpecimen(value) {
    var text = String(value || "").trim();
    var key = text.toLowerCase();
    var options = {
      "구강상피세포": { label: "구강상피세포", value: "Buccal swab" },
      "buccal swab": { label: "구강상피세포", value: "Buccal swab" },
      "타액": { label: "타액", value: "Saliva" },
      "saliva": { label: "타액", value: "Saliva" },
      "혈액": { label: "혈액", value: "Blood" },
      "blood": { label: "혈액", value: "Blood" },
      "기존 유전자형 데이터": { label: "기존 유전자형 데이터", value: "Raw genotype data" },
      "raw genotype data": { label: "기존 유전자형 데이터", value: "Raw genotype data" }
    };
    return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : null;
  }

  function normalizeSex(value) {
    var text = String(value || "").trim();
    var key = text.toLowerCase();
    var options = {
      "미기재": { label: "미기재", value: "Not provided" },
      "not provided": { label: "미기재", value: "Not provided" },
      "여성": { label: "여성", value: "Female" },
      "female": { label: "여성", value: "Female" },
      "남성": { label: "남성", value: "Male" },
      "male": { label: "남성", value: "Male" },
      "기타": { label: "기타", value: "Other" },
      "other": { label: "기타", value: "Other" }
    };
    return Object.prototype.hasOwnProperty.call(options, key) ? options[key] : null;
  }

  function normalizeGenotype(gene, value) {
    var text = String(value === null || value === undefined ? "" : value).trim().toUpperCase();
    if (text === "모름" || text === "UNKNOWN") return getGenotype(gene, "unknown");
    if (!/^[ACGT]\s*(?:[/|]\s*)?[ACGT]$/.test(text)) return null;
    text = text.replace(/[\s/|]+/g, "");

    var direct = getGenotype(gene, text);
    if (direct) return direct;
    if (text.length === 2) {
      return getGenotype(gene, text.charAt(1) + text.charAt(0));
    }
    return null;
  }

  function getBatchCell(row, headerMap, header) {
    return row[headerMap[header]];
  }

  function parseBatchRow(row, rowNumber, headerMap, seenSampleIds) {
    var errors = [];
    var sampleValue = getBatchCell(row, headerMap, "Sample ID");
    var sampleId = String(sampleValue === null || sampleValue === undefined ? "" : sampleValue).trim();
    var reportDate = normalizeBatchDate(getBatchCell(row, headerMap, "리포트 날짜"), true);
    var collectionRaw = getBatchCell(row, headerMap, "채취일");
    var collectionDate = normalizeBatchDate(collectionRaw, false);
    var specimen = normalizeSpecimen(getBatchCell(row, headerMap, "검체 종류"));
    var sex = normalizeSex(getBatchCell(row, headerMap, "성별"));
    var selectionMap = {};

    if (!sampleId) {
      errors.push("Sample ID 누락");
    } else if (sampleId.length > 120) {
      errors.push("Sample ID가 120자를 초과함");
    } else if (seenSampleIds[sampleId]) {
      errors.push("파일 안에서 Sample ID 중복 (" + seenSampleIds[sampleId] + "행과 동일)");
    } else {
      seenSampleIds[sampleId] = rowNumber;
    }

    if (!reportDate) errors.push("리포트 날짜 형식 오류 (YYYY-MM-DD)");
    if (reportDate && collectionDate && collectionDate !== "--" && collectionDate > reportDate) {
      errors.push("채취일이 리포트 날짜보다 늦음");
    }
    if (collectionRaw !== null && collectionRaw !== undefined && String(collectionRaw).trim() !== "" && !collectionDate) {
      errors.push("채취일 형식 오류 (YYYY-MM-DD)");
    }
    if (!specimen) errors.push("검체 종류 값 오류");
    if (!sex) errors.push("성별 값 오류");

    [
      ["rs762551", "CYP1A2*1F rs762551"],
      ["rs2069514", "CYP1A2*1C rs2069514"],
      ["rs2472297", "CYP1A1-CYP1A2 rs2472297"],
      ["rs6968865", "AHR rs6968865"]
    ].forEach(function (item) {
      var gene = getGene(item[0]);
      var genotype = normalizeGenotype(gene, getBatchCell(row, headerMap, item[1]));
      if (!genotype) {
        errors.push(item[0] + " 유전자형 값 오류");
      } else {
        selectionMap[item[0]] = genotype;
      }
    });

    return {
      rowNumber: rowNumber,
      sampleId: sampleId || "(미입력)",
      inputValues: BATCH_HEADERS.map(function (header) { return getBatchCell(row, headerMap, header); }),
      errors: errors,
      selectionMap: selectionMap,
      reportInfo: {
        sampleId: sampleId,
        reportDate: reportDate || "--",
        collectionDate: collectionDate || "--",
        sampleType: specimen ? specimen.label : "",
        sampleTypeValue: specimen ? specimen.value : "",
        sex: sex ? sex.label : "",
        sexValue: sex ? sex.value : "",
        institution: FIXED_INSTITUTION
      }
    };
  }

  function parseBatchWorkbook(file) {
    if (!window.XLSX) {
      return Promise.reject(new Error("엑셀 처리 모듈을 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요."));
    }
    if (!file || file.size > MAX_BATCH_FILE_BYTES) {
      return Promise.reject(new Error("5 MB 이하의 엑셀 파일을 선택해 주세요."));
    }

    return file.arrayBuffer().then(function (buffer) {
      if (buffer.byteLength > MAX_BATCH_FILE_BYTES) throw new Error("파일 크기가 5 MB를 초과합니다.");
      // Bound expansion of an accidentally oversized worksheet before building arrays.
      var workbook = window.XLSX.read(buffer, { type: "array", cellDates: false, sheetRows: 10002 });
      var sheet = workbook.Sheets[BATCH_SHEET_NAME];
      if (!sheet) {
        throw new Error("‘" + BATCH_SHEET_NAME + "’ 시트를 찾을 수 없습니다. 제공된 양식의 시트 이름을 바꾸지 말아 주세요.");
      }

      var range = window.XLSX.utils.decode_range(sheet["!fullref"] || sheet["!ref"] || "A1");
      if (range.e.r >= 10000 || range.e.c >= 32) {
        throw new Error("시트 범위가 너무 큽니다. 제공된 양식의 A:I열에 최대 200명만 작성해 주세요.");
      }
      var matrix = window.XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, raw: true, defval: "", blankrows: true });
      if (!matrix.length) throw new Error("‘" + BATCH_SHEET_NAME + "’ 시트가 비어 있습니다.");

      var headers = matrix[0].map(function (value) { return String(value || "").trim(); });
      var headerMap = Object.create(null);
      headers.forEach(function (header, index) {
        if (!header) return;
        if (headerMap[header] !== undefined) throw new Error("중복된 열 이름이 있습니다: " + header);
        headerMap[header] = index;
      });
      var missingHeaders = BATCH_HEADERS.filter(function (header) { return headerMap[header] === undefined; });
      if (missingHeaders.length) {
        throw new Error("필수 열이 없습니다: " + missingHeaders.join(", ") + ". 제공된 양식을 다시 내려받아 작성해 주세요.");
      }

      var dataRows = matrix.slice(1).map(function (row, index) {
        return { row: row, rowNumber: index + 2 };
      }).filter(function (entry) {
        return BATCH_HEADERS.some(function (header) {
          var value = getBatchCell(entry.row, headerMap, header);
          return value !== null && value !== undefined && String(value).trim() !== "";
        });
      }).filter(function (entry) {
        var sampleId = getBatchCell(entry.row, headerMap, "Sample ID");
        return String(sampleId || "").trim() !== BATCH_EXAMPLE_SAMPLE_ID;
      });

      if (!dataRows.length) throw new Error("입력된 대상자가 없습니다. 예시 행 아래의 3행부터 데이터를 입력해 주세요.");
      if (dataRows.length > MAX_BATCH_ROWS) {
        throw new Error("한 번에 최대 " + MAX_BATCH_ROWS + "명까지 처리할 수 있습니다. 현재 " + dataRows.length + "명이 입력되어 있습니다.");
      }

      var date1904 = Boolean(workbook.Workbook && workbook.Workbook.WBProps && workbook.Workbook.WBProps.date1904);
      var seenSampleIds = Object.create(null);
      var records = dataRows.map(function (entry) {
        var formulaHeaders = [];
        BATCH_HEADERS.forEach(function (header) {
          var col = headerMap[header];
          var cell = sheet[window.XLSX.utils.encode_cell({ r: entry.rowNumber - 1, c: col })];
          if (cell && cell.f) formulaHeaders.push(header);
          if (header === "Sample ID" && cell && cell.t === "n") {
            // Retain zero-padding from Excel number formats (e.g. 00001).
            entry.row[col] = window.XLSX.utils.format_cell(cell);
          }
          if ((header === "리포트 날짜" || header === "채취일") && typeof entry.row[col] === "number") {
            var parts = window.XLSX.SSF.parse_date_code(entry.row[col], { date1904: date1904 });
            entry.row[col] = parts && isValidDateParts(parts.y, parts.m, parts.d)
              ? parts.y + "-" + padDatePart(parts.m) + "-" + padDatePart(parts.d) : "날짜 오류";
          }
        });
        var record = parseBatchRow(entry.row, entry.rowNumber, headerMap, seenSampleIds);
        if (formulaHeaders.length) record.errors.push("수식 대신 값으로 입력해 주세요: " + formulaHeaders.join(", "));
        return record;
      });
      var idRows = Object.create(null);
      records.forEach(function (record) {
        if (record.reportInfo.sampleId) {
          var key = record.reportInfo.sampleId;
          (idRows[key] || (idRows[key] = [])).push(record.rowNumber);
        }
      });
      records.forEach(function (record) {
        var rows = idRows[record.reportInfo.sampleId];
        if (rows && rows.length > 1) {
          record.errors = record.errors.filter(function (message) { return message.indexOf("파일 안에서 Sample ID 중복") !== 0; });
          record.errors.push("파일 안에서 Sample ID 중복 (" + rows.join(", ") + "행)");
        }
      });
      return records;
    });
  }

  function analyzeBatchRow(record) {
    if (record.errors.length) return record;
    var result = buildComputedResult(record.selectionMap);
    var reportData = buildReportDataFor(result, record.reportInfo, record.selectionMap);
    record.result = result;
    record.reportData = reportData;
    record.payload = buildSheetPayloadFor(reportData, record.selectionMap, false);
    return record;
  }

  function renderBatchResults(records) {
    var errorCount = records.filter(function (record) { return record.errors.length > 0; }).length;
    var validCount = records.length - errorCount;
    elements.batchResults.hidden = false;
    elements.batchResultCounts.innerHTML = [
      "<span>전체 ", records.length, "명</span>",
      "<span>분석 가능 ", validCount, "명</span>",
      errorCount ? "<span class=\"error\">수정 필요 " + errorCount + "명</span>" : ""
    ].join("");

    elements.batchResultsBody.innerHTML = records.map(function (record) {
      var hasError = record.errors.length > 0;
      var result = record.result;
      var sampleId = escapeHtml(record.sampleId);
      var status = hasError ? "입력 오류" : (result.score === null ? "판정 보류" : "분석 완료");
      var score = (hasError ? "--" : (result.score === null ? "산출 없음" : result.score.toFixed(1) + "점")) +
        (!hasError && result.coverageLabel ? '<small class="score-coverage-note">' + escapeHtml(result.coverageLabel) + '</small>' : "") +
        (!hasError && result.sensitivity ? '<small class="score-position">대입 시 ' + escapeHtml(formatScenarioSummary(result.sensitivity)) + '</small>' : "");
      var type = hasError ? "--" : escapeHtml(result.category.label);
      var direction = hasError ? "--" : "<strong>" + escapeHtml(result.metabolismSubtype.displayName) + "</strong>";
      var coverage = hasError ? "--" : result.confidence + "%";
      var note = hasError ? escapeHtml(record.errors.join(" · ")) : escapeHtml(result.score === null ? "핵심 유전자형 확인 필요" : (result.unknownCount ? "모름 " + result.unknownCount + "개" : "확인됨"));
      var mobileDetails = hasError ? [["행", record.rowNumber], ["확인 사항", note]] : [
        ["행", record.rowNumber], ["민감도 점수", score], ["결과 유형", type],
        ["대사 판정", direction], ["입력 완성도", coverage], ["확인 사항", note]
      ];

      return [
        '<tr role="row" class="', hasError ? "has-error" : "", '">',
        '<td class="batch-wide-cell">', record.rowNumber, '</td>',
        '<td class="batch-id-cell" role="cell"><strong>', sampleId, '</strong></td>',
        '<td class="batch-status-cell" role="cell"><span class="status-pill ', hasError ? "error" : "", '">', status, '</span></td>',
        '<td class="batch-pdf-cell" role="cell"><button class="tool-button ghost batch-pdf-button" type="button" data-batch-pdf-row="', record.rowNumber,
        '" aria-label="', sampleId, ' PDF 저장 화면 열기"',
        hasError ? ' disabled title="입력 오류를 수정한 뒤 PDF를 저장할 수 있습니다."' : ' title="개별 PDF 저장 화면 열기"',
        '>PDF 저장</button></td>',
        '<td class="batch-wide-cell">', score, '</td>',
        '<td class="batch-wide-cell batch-type-cell">', type, '</td>',
        '<td class="batch-wide-cell batch-direction-cell">', direction, '</td>',
        '<td class="batch-wide-cell">', coverage, '</td>',
        '<td class="batch-wide-cell">', note, '</td>',
        '<td class="batch-mobile-cell" colspan="9" role="cell"><details class="batch-row-details"><summary>', hasError ? "오류 확인" : "세부 결과", '</summary><dl>',
        mobileDetails.map(function (entry) { return "<div><dt>" + entry[0] + "</dt><dd>" + entry[1] + "</dd></div>"; }).join(""),
        '</dl></details></td></tr>'
      ].join("");
    }).join("");
  }

  function setBatchBusy(busy) {
    batchBusy = busy;
    elements.batchFile.disabled = busy;
    elements.batchClearBtn.disabled = busy || !batchFile;
    elements.batchAnalyzeBtn.disabled = busy || !batchFile;
    elements.batchAnalyzeSaveBtn.disabled = busy || !batchFile;
    elements.batchDownloadBtn.disabled = busy || !batchResults.length;
    elements.batchPdfZipBtn.disabled = busy || !batchResults.some(function (record) { return record.reportData; });
  }

  function processLocalBatchUpload() {
    if (batchBusy || !batchFile) return Promise.resolve();
    resetBatchOutput();
    setBatchBusy(true);
    elements.batchAnalyzeBtn.textContent = "분석 중…";
    setBatchStatus("엑셀 입력값을 확인하고 있습니다. 파일은 서버로 전송되지 않습니다.");
    return parseBatchWorkbook(batchFile).then(function (records) {
      batchRows = records;
      batchResults = records.map(analyzeBatchRow);
      renderBatchResults(batchResults);
      var errors = batchResults.filter(function (record) { return record.errors.length; }).length;
      setBatchStatus("전체 " + records.length + "명 중 " + (records.length - errors) + "명의 리포트를 생성했습니다. " +
        (errors ? "입력 오류 " + errors + "명은 결과를 산출하지 않았습니다. 결과 엑셀의 ‘입력 오류’ 시트를 확인해 주세요." : "결과 화면에서 PDF 또는 엑셀을 내려받으세요."), errors ? "error" : "success");
      setBatchSheetStatus("로컬 분석 완료 · 서버 전송 없음 · 원본 파일은 수정하지 않았습니다.");
    }).catch(function (error) {
      setBatchStatus(error.message || "엑셀 파일을 읽지 못했습니다. 양식을 확인해 주세요.", "error");
    }).finally(function () {
      setBatchBusy(false);
      elements.batchAnalyzeBtn.textContent = "일괄 분석";
    });
  }

  function buildBatchResultWorkbook(records) {
    var xlsx = window.XLSX;
    if (!xlsx) throw new Error("엑셀 처리 모듈을 불러오지 못했습니다.");
    var headers = ["원본 행", "Sample ID", "처리 상태", "리포트 날짜", "채취일", "검체 종류", "성별",
      "rs762551", "rs2069514", "rs2472297", "rs6968865", "민감도 지수 (0-100)", "결과 유형",
      "대사 유형", "대사 레이어 (%)", "조절 레이어 (%)", "입력 완성도 (%)", "확인된 SNP 수",
      "모름 SNP 수", "해석", "생활 참고 안내", "오류·확인 사항", "생성 시각 (KST)", "모델 버전",
      "대입 시 최저점", "대입 시 최고점", "대입 시 가능 유형", "대입 조합 수"];
    var generatedAt = getKoreaDateTimeString();
    var output = [headers];
    var errors = [["원본 행"].concat(BATCH_HEADERS, ["오류 내용"])];
    records.forEach(function (record) {
      var result = record.result;
      var data = record.reportData;
      var info = record.reportInfo;
      var hasError = record.errors.length > 0;
      var sensitivity = hasError ? null : result.sensitivity;
      var raw = record.inputValues || [];
      var genotypes = genes.map(function (gene, index) {
        return hasError ? String(raw[index + 5] === undefined ? "" : raw[index + 5]) : getGenotypeValueFor(record.selectionMap, gene.id);
      });
      output.push([record.rowNumber, record.sampleId, hasError ? "입력 오류" : (result.score === null ? "판정 보류" : "분석 완료"),
        info.reportDate, formatCollectionDate(info.collectionDate), info.sampleType, info.sex].concat(genotypes, [
        hasError ? null : data.result.score, hasError ? "산출 없음" : result.category.label,
        hasError ? "산출 없음" : result.metabolismSubtype.displayName,
        hasError ? null : data.result.metabolismScore, hasError ? null : data.result.regulationScore,
        hasError ? null : result.confidence, hasError ? null : result.valid.length,
        hasError ? null : result.unknownCount, hasError ? "" : result.interpretation,
        hasError ? "" : result.category.recommendations.join("\n"),
        hasError ? record.errors.join(" · ") : (result.score === null ? "핵심 유전자형 확인 필요" : result.coverageLabel),
        generatedAt, "0.4 / scoring 0.3",
        sensitivity ? Number(sensitivity.minimum.toFixed(1)) : null,
        sensitivity ? Number(sensitivity.maximum.toFixed(1)) : null,
        sensitivity ? sensitivity.categories.join(" / ") : "",
        sensitivity ? sensitivity.cases.length : null]));
      if (hasError) errors.push([record.rowNumber].concat(raw, [record.errors.join(" · ")]));
    });
    var guide = [
      ["항목", "안내"],
      ["결과 파일", "분석 결과: 모든 입력 행 / 입력 오류: 수정할 행과 원본 입력 / 해석 안내: 기준 및 한계"],
      ["처리 상태", "분석 완료: 핵심 SNP 확인 / 판정 보류: rs762551 모름 / 입력 오류: 점수 미산출"],
      ["유형", "잠꾸러기형: 33.34 미만 / 잠잠형: 33.34 이상 66.67 미만 / 각성형: 66.67 이상. 반올림 전 점수로 구분합니다."],
      ["모름", "누락과 다릅니다. 명시적으로 ‘모름’을 입력한 SNP는 제외하고 확인된 항목의 가중치를 다시 계산합니다. 서로 다른 입력 완성도의 점수를 직접 비교하지 마세요."],
      ["대입 시나리오", "미확인 SNP의 가능한 유전자형을 대입해 계산한 범위입니다. 현재 결과는 민감도 지수와 결과 유형 열에서 확인할 수 있습니다."],
      ["참조 위치", REFERENCE_SOURCE_NOTE],
      ["입력 완성도", "확인된 SNP 수 ÷ 4 × 100 (%). 예측 정확도나 통계적 신뢰도가 아닙니다."],
      ["점수", "대사 70% + 조절 30%의 연구·교육용 모형 지수. 기존 점수식은 유지했으며 임상 검증된 PRS가 아닙니다."],
      ["양식의 구 명칭", "CYP1A2*1F/*1C 열 이름은 기존 양식과의 호환을 위해 유지했습니다. 분석은 rs762551/rs2069514 유전자형 기준이며 완전한 star allele 판정이 아닙니다."],
      ["대사와 수면", "카페인 분해 속도와 각성·수면 반응은 구분해서 살펴보아야 합니다. 이 점수로 실제 분해 속도, 수면 능력, 내성, 안전 섭취량을 판정할 수 없습니다."],
      ["개인정보", "코드형 Sample ID를 사용하세요. 파일은 브라우저에서 처리하며 이 다운로드 동작은 서버 저장을 수행하지 않습니다."],
      ["보관", "유전자형이 포함된 결과 파일은 접근 권한을 제한해 보관하고 공용 기기에 남기지 마세요. 페이지를 새로 열면 재업로드가 필요합니다."],
      ["사용 범위", "연구·교육용. 질병 진단, 의학적 처방, 치료 판단에 사용할 수 없습니다."],
      ["생성 시각 (KST)", generatedAt], ["모델 버전", "0.4 / scoring 0.3"]
    ];
    var workbook = xlsx.utils.book_new();
    [["분석 결과", output], ["입력 오류", errors], ["해석 안내", guide]].forEach(function (entry) {
      var rows = entry[1].map(function (row) {
        return row.map(function (value) { return typeof value === "string" ? value.slice(0, 32767) : value; });
      });
      var sheet = xlsx.utils.aoa_to_sheet(rows);
      // User text always remains string data, including values beginning with '='.
      Object.keys(sheet).forEach(function (key) {
        if (key.charAt(0) !== "!" && typeof sheet[key].v === "string") {
          sheet[key].t = "s";
          delete sheet[key].f;
        }
      });
      sheet["!cols"] = rows[0].map(function (_, index) {
        return { wch: entry[0] === "해석 안내" && index === 1 ? 110 : (index >= 19 ? 65 : 23) };
      });
      if (entry[0] !== "해석 안내") sheet["!autofilter"] = { ref: sheet["!ref"] };
      xlsx.utils.book_append_sheet(workbook, sheet, entry[0]);
    });
    return workbook;
  }

  function downloadBatchResults() {
    if (!batchResults.length || batchBusy) return;
    try {
      var workbook = buildBatchResultWorkbook(batchResults);
      window.XLSX.writeFile(workbook, "Caffeine-Atlas-Batch-Results-" + getKoreaDateTimeString().replace(/[^0-9]/g, "").slice(0, 14) + ".xlsx", { compression: true });
      setBatchStatus("결과 엑셀 다운로드를 요청했습니다. 브라우저의 다운로드 목록을 확인해 주세요.", "success");
    } catch (error) {
      setBatchStatus("결과 파일을 만들지 못했습니다. " + error.message, "error");
    }
  }

  function buildBatchId() {
    return "batch-" + getKoreaDateTimeString().replace(/[^0-9]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function requestEndpointStatus(parameters) {
    if (!RESEARCH_STORAGE_MODE || !GOOGLE_SHEETS_ENDPOINT) {
      return Promise.reject(new Error("공개 체험에서는 연구 데이터 저장 기능이 제공되지 않습니다."));
    }
    return new Promise(function (resolve, reject) {
      var callbackName = "caffeineBatchCapability_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      var script = document.createElement("script");
      var finished = false;
      var timeoutId;

      function cleanup() {
        window.clearTimeout(timeoutId);
        if (script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[callbackName];
        } catch (error) {
          window[callbackName] = undefined;
        }
      }

      function fail(message) {
        if (finished) return;
        finished = true;
        cleanup();
        reject(new Error(message));
      }

      window[callbackName] = function (response) {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(response);

      };

      script.async = true;
      script.src = GOOGLE_SHEETS_ENDPOINT
        + (GOOGLE_SHEETS_ENDPOINT.indexOf("?") === -1 ? "?" : "&")
        + parameters + "&callback=" + encodeURIComponent(callbackName)
        + "&_=" + Date.now();
      script.onerror = function () {
        fail("저장 서버 응답을 확인하지 못했습니다. 전송 후라면 실제 저장 여부를 시트에서 확인해 주세요.");
      };
      timeoutId = window.setTimeout(function () {
        fail("서버 확인 시간이 초과되었습니다. 전송 후라면 재시도 전에 시트에서 실제 저장 여부를 확인해 주세요.");
      }, 8000);
      document.head.appendChild(script);
    });
  }

  function verifyBatchEndpointSupport() {
    return requestEndpointStatus("action=capabilities").then(function (response) {
      var caps = response && response.capabilities;
      if (!response || !response.ok || !caps || !caps.batchSave || !caps.confirmedSave || !caps.globalSampleIdCheck || caps.ahrAlleles !== "A/T") {
        throw new Error("저장 서버 업데이트가 필요합니다. 관리자에게 문의해 주세요. 분석 결과는 내려받을 수 있으며, 저장 요청은 보내지 않았습니다.");
      }
      return caps;
    });
  }

  function saveConfirmedPayload(payload, expectedCount) {
    if (!RESEARCH_STORAGE_MODE || !GOOGLE_SHEETS_ENDPOINT) {
      return Promise.reject(new Error("공개 체험에서는 연구 데이터 저장 기능이 제공되지 않습니다."));
    }
    return verifyBatchEndpointSupport().then(function (caps) {
      if (expectedCount > Number(caps.maxBatchRows)) throw new Error("서버의 일괄 저장 가능 인원을 초과했습니다.");
      var bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      var requestId = Array.from(bytes, function (value) { return value.toString(16).padStart(2, "0"); }).join("");
      payload.requestId = requestId;
      var controller = new AbortController();
      var timeout = window.setTimeout(function () { controller.abort(); }, 20000);
      return fetch(GOOGLE_SHEETS_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal
      }).catch(function () {
        // A failed transport can still have committed the write. Check its receipt.
      }).then(function () {
        window.clearTimeout(timeout);
        function poll(attempt) {
          return requestEndpointStatus("action=saveStatus&requestId=" + requestId).then(function (status) {
            if (status && status.ok && status.state === "saved" && status.savedCount === expectedCount) return status;
            if (status && status.state === "error") {
              if (status.code === "DUPLICATE_SAMPLE_ID") throw new Error("이미 저장된 Sample ID가 있어 이번 요청은 저장하지 않았습니다. 기존 기록을 확인해 주세요.");
              throw new Error("서버에서 저장을 확인하지 못했습니다. 재시도 전에 시트에서 실제 저장 여부를 확인해 주세요.");
            }
            if (attempt >= 5) throw new Error("저장 여부 미확인. 재시도 전에 Google Sheets에서 기록을 확인해 주세요.");
            return new Promise(function (resolve) { window.setTimeout(resolve, 1500); }).then(function () { return poll(attempt + 1); });
          });
        }
        return poll(0);
      });
    });
  }

  function processBatchUpload() {
    if (!RESEARCH_STORAGE_MODE || !GOOGLE_SHEETS_ENDPOINT) {
      setBatchStatus("공개 체험에서는 일괄 서버 저장이 제공되지 않습니다.", "error");
      return;
    }
    if (batchBusy) return;
    if (!batchFile) {
      setBatchStatus("먼저 작성한 엑셀 파일을 선택해 주세요.", "error");
      return;
    }
    if (!elements.batchConsent.checked) {
      setBatchStatus("모든 대상자의 분석 및 저장 동의를 확인한 뒤 체크해 주세요.", "error");
      return;
    }
    if (!GOOGLE_SHEETS_ENDPOINT) {
      setBatchStatus("Google Apps Script 배포 URL이 설정되지 않았습니다.", "error");
      return;
    }

    setBatchBusy(true);
    elements.batchAnalyzeSaveBtn.textContent = "엑셀 확인 중...";
    setBatchStatus("엑셀 양식과 입력값을 확인하고 있습니다.");
    resetBatchOutput();

    parseBatchWorkbook(batchFile).then(function (records) {
      batchRows = records;
      batchResults = records.map(analyzeBatchRow);
      renderBatchResults(batchResults);

      var invalidRows = batchResults.filter(function (record) { return record.errors.length > 0; });
      if (invalidRows.length) {
        setBatchStatus("수정이 필요한 행이 " + invalidRows.length + "개 있습니다. 일부만 저장하지 않았으며, 오류를 고친 뒤 다시 업로드해 주세요.", "error");
        setBatchSheetStatus("입력 오류가 있어 Google Sheets에는 어떤 행도 저장하지 않았습니다.", "error");
        return null;
      }

      elements.batchAnalyzeSaveBtn.textContent = "저장 기능 확인 중...";
      setBatchStatus(batchResults.length + "명의 분석이 완료되었습니다. Google Apps Script의 일괄 저장 지원 버전을 확인하고 있습니다.");

      return saveConfirmedPayload({
        action: "batchSave",
        batchId: buildBatchId(),
        rows: batchResults.map(function (record) { return Object.assign({}, record.payload, { consent: true }); })
      }, batchResults.length).then(function () {
        setBatchStatus(batchResults.length + "명의 분석과 저장이 완료되었습니다.", "success");
        setBatchSheetStatus("Google Sheets에 " + batchResults.length + "명 저장 완료. 서버에서 기록된 행을 확인했습니다.", "success");
      });
    }).catch(function (error) {
      setBatchStatus(error && error.message ? error.message : "엑셀 처리 중 오류가 발생했습니다.", "error");
      if (!elements.batchResults.hidden) {
        setBatchSheetStatus(error.message || "저장 여부를 확인하지 못했습니다. 시트의 실제 기록을 확인해 주세요.", "error");
      }
    }).finally(function () {
      setBatchBusy(false);
      elements.batchAnalyzeSaveBtn.textContent = "일괄 분석 및 시트 저장";
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function safeFilePart(value) {
    return String(value || "report").replace(/[^a-zA-Z0-9가-힣_-]+/g, "-").replace(/^-|-$/g, "") || "report";
  }

  function downloadTextFile(filename, content, type) {
    downloadBlob(filename, new Blob([content], { type: type }));
  }

  function downloadBlob(filename, blob) {
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }

  function collectCurrentStyles() {
    var css = "";
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      try {
        Array.prototype.forEach.call(sheet.cssRules || [], function (rule) {
          css += rule.cssText + "\n";
        });
      } catch (error) {
        if (sheet.href) {
          css += "@import url(\"" + sheet.href + "\");\n";
        }
      }
    });
    return css;
  }

  function buildDetailedReportHtml(data) {
    var reportClone = elements.resultReport.cloneNode(true);
    var clonedCanvas = reportClone.querySelector("#referenceChart");
    var placeholder = reportClone.querySelector("#resultPlaceholder");
    var editButton = reportClone.querySelector("#editBtn");
    var saveScope = reportClone.querySelector(".save-scope-card");
    var actions = reportClone.querySelector(".detailed-actions");
    reportClone.querySelector(".atlas-snp-order").remove();
    var chartImage = document.createElement("img");

    reportClone.removeAttribute("hidden");
    if (placeholder) placeholder.remove();
    if (editButton) editButton.remove();
    if (saveScope) saveScope.remove();
    if (actions) actions.remove();
    var archiveAction = reportClone.querySelector(".atlas-archive-save");
    var exampleAction = reportClone.querySelector("#atlas-start-personal");
    if (archiveAction) archiveAction.remove();
    if (exampleAction) exampleAction.remove();

    if (clonedCanvas) {
      chartImage.src = elements.chart.toDataURL("image/png");
      chartImage.alt = "모형 내부 참조분포의 7개 점수 구간 그래프";
      chartImage.className = "saved-chart-image";
      clonedCanvas.replaceWith(chartImage);
    }

    return [
      "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
      "<title>", escapeHtml(data.reportTitle), "</title>",
      "<style>", collectCurrentStyles(), "\n",
      ".saved-report-shell{width:min(1440px,calc(100% - 32px));margin:0 auto;padding:24px 0 36px}",
      ".saved-report-shell .report-screen{display:block}",
      ".saved-chart-image{display:block;width:100%;height:auto;margin-top:8px}",
      "</style></head><body class=\"", RESEARCH_STORAGE_MODE ? "research-mode" : "public-demo", "\"><main class=\"saved-report-shell analyzer-shell\">",
      reportClone.outerHTML,
      "</main></body></html>"
    ].join("");
  }

  function saveDetailedReport() {
    var data = buildReportData();
    if (!data) {
      window.alert("먼저 리포트 생성 버튼을 눌러 결과를 생성해 주세요.");
      return;
    }

    var filename = "caffeine-sensitivity-" + safeFilePart(data.reportInfo.sampleId) + "-" + safeFilePart(data.reportInfo.reportDate) + ".html";
    downloadTextFile(filename, buildDetailedReportHtml(data), "text/html;charset=utf-8");
  }

  function formatPdfScore(value) {
    return value === null || typeof value !== "number" ? "--" : value.toFixed(1);
  }

  function buildPdfReportHtml(data, forArchive) {
    var info = data.reportInfo;
    var result = data.result;
    var logoUrl = new URL("./assets/caffeine-atlas-wordmark.svg", window.location.href).href;
    var maxReferenceLevel = referenceBins.reduce(function (max, bin) {
      return Math.max(max, bin.level);
    }, 1);
    var pdfChartPoints = referenceBins.map(function (bin) {
      var x = normalizeReference(bin.raw);
      var y = 54 - (bin.level / maxReferenceLevel) * 44;
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    var genotypeRows = data.genotypes.map(function (item) {
      return [
        "<tr><td><strong>", escapeHtml(item.name), "</strong><small>", escapeHtml(item.rsid), "</small></td>",
        "<td>", escapeHtml(item.genotype), "</td>",
        "<td>", escapeHtml(item.layer), "</td>",
        "<td>", escapeHtml(item.evidenceScore), "</td></tr>"
      ].join("");
    }).join("");
    var recommendations = data.recommendations.slice(0, 4).map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
    var filename = "Caffeine-Atlas-Report-" + safeFilePart(info.sampleId) + "-" + safeFilePart(info.reportDate);
    var hasScore = typeof result.score === "number";
    var pdfScoreText = hasScore ? result.score.toFixed(1) : "--";
    var pdfScoreUnit = hasScore ? "<small> 점</small>" : "";
    var referencePosition = formatReferencePosition(result.percentile);
    var coverageMarkup = result.coverageLabel
      ? '<p class="score-coverage-note">' + escapeHtml(result.coverageLabel) + '</p>'
      : "";
    if (result.typePosition) coverageMarkup += '<p class="score-coverage-note">' + escapeHtml(result.typePosition) + '</p>';
    if (result.sensitivitySummary) coverageMarkup += '<p class="score-coverage-note">미확인 SNP 대입 시 ' +
      escapeHtml(result.sensitivitySummary) + '</p>';
    var pdfMarker = "";
    if (hasScore) {
      var pdfMarkerX = clamp(result.score, 0, 100);
      var pdfMarkerY = 54 - (getReferenceLevelAtScore(pdfMarkerX) / maxReferenceLevel) * 44;
      pdfMarker = [
        '<line class="distribution-guide" x1="', pdfMarkerX, '" y1="', pdfMarkerY.toFixed(1), '" x2="', pdfMarkerX, '" y2="54" stroke="#d45b38" stroke-width="1" stroke-dasharray="2 1.5"></line>',
        '<circle class="distribution-marker" cx="', pdfMarkerX, '" cy="', pdfMarkerY.toFixed(1), '" r="3.2" fill="#fff" stroke="#d45b38" stroke-width="1.6"></circle>'
      ].join("");
    }
    var pdfDistributionChart = [
      '<svg class="distribution-chart" viewBox="0 0 100 60" role="img" aria-label="연구 참조분포 7개 점수 구간에서의 위치">',
      '<line class="distribution-grid" x1="0" y1="21" x2="100" y2="21" stroke="#e3eaec" stroke-width=".45"></line>',
      '<line class="distribution-grid" x1="0" y1="38" x2="100" y2="38" stroke="#e3eaec" stroke-width=".45"></line>',
      '<polygon class="distribution-area" points="0,54 ', pdfChartPoints, ' 100,54" fill="#dceff0"></polygon>',
      '<polyline class="distribution-line" points="', pdfChartPoints, '" fill="none" stroke="#148589" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"></polyline>',
      pdfMarker,
      '</svg>'
    ].join("");

    return [
      "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
      "<title>", escapeHtml(filename), "</title><style>",
      "@page{size:A4 portrait;margin:0}",
      "*{box-sizing:border-box}html,body{margin:0;background:#e9eef2;color:#17222c;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;letter-spacing:0}",
      "body{padding:18px}.pdf-sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:10mm 12mm 9mm;box-shadow:0 12px 40px rgba(13,31,40,.14);display:flex;flex-direction:column;gap:4.2mm;overflow:visible}",
      ".pdf-controls{width:210mm;margin:0 auto 12px;display:flex;justify-content:flex-end;gap:8px}.pdf-controls button{border:1px solid #bac7ce;background:#fff;color:#17313a;padding:9px 14px;font-weight:800;cursor:pointer}.pdf-controls .primary{border-color:#126f72;background:#126f72;color:#fff}",
      ".pdf-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:3.5mm;border-bottom:1.5px solid #163e46}.pdf-brand img{display:block;width:52mm;height:auto}.pdf-brand p{margin:1.5mm 0 0;color:#587079;font-size:7.5pt;font-weight:700}.pdf-title{text-align:right}.pdf-title h1{margin:0;color:#173e47;font-size:18pt}.pdf-title p{margin:1.5mm 0 0;color:#60737b;font-size:7.5pt}",
      ".pdf-meta{display:grid;grid-template-columns:1.05fr .85fr .85fr .8fr 1.45fr;border:1px solid #d6e0e3}.pdf-meta div{min-width:0;padding:2.4mm 2.7mm;border-right:1px solid #d6e0e3}.pdf-meta div:last-child{border-right:0}.pdf-meta span,.metric span{display:block;color:#647981;font-size:6.8pt;font-weight:800;text-transform:uppercase}.pdf-meta strong{display:block;margin-top:1mm;font-size:8.2pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".pdf-summary{display:grid;grid-template-columns:1.1fr .9fr;gap:4mm}.type-panel,.score-panel,.pdf-card{border:1px solid #d6e0e3;background:#fff;padding:3.5mm}.type-panel{border-left:3mm solid #148589}.type-panel .badge{color:#0d696c;font-size:7.5pt;font-weight:900}.type-panel h2{margin:1.2mm 0 1mm;font-size:16pt}.type-panel h2 small{display:block;margin-bottom:.7mm;color:#52676f;font-size:7.5pt}.type-panel p{margin:0;color:#52676f;font-size:8pt;line-height:1.5}.score-row{display:flex;justify-content:space-between;align-items:flex-end}.score-label{color:#60767d;font-size:7.5pt;font-weight:800}.score-value{color:#d45b38;font-size:24pt;font-weight:950;line-height:1}.score-value small{font-size:9pt}.score-coverage-note{margin:1.3mm 0 0;color:#795300;font-size:7.5pt;font-weight:800}.gauge{position:relative;height:4mm;margin-top:2.5mm;background:linear-gradient(90deg,#188b91 0 33.34%,#e5ad3c 33.34% 66.67%,#d85d39 66.67%);border-radius:2mm}.gauge:after{content:'';position:absolute;left:var(--score);top:-1.4mm;width:1.4mm;height:6.8mm;background:#172f38;transform:translateX(-50%)}.gauge.is-unscored:after{display:none}.gauge-scale{display:flex;justify-content:space-between;margin-top:1mm;color:#657980;font-size:6.4pt;font-weight:800}",
      ".metrics{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #d6e0e3}.metric{padding:2.4mm 3mm;border-right:1px solid #d6e0e3}.metric:last-child{border-right:0}.metric strong{display:block;margin-top:1mm;color:#173f47;font-size:10pt}",
      ".pdf-main{display:grid;grid-template-columns:.9fr 1.1fr;gap:4mm}.pdf-card h3{margin:0 0 2.2mm;color:#183e47;font-size:9.5pt}.chart-summary{margin-bottom:2mm}.chart-summary strong{color:#97422c;font-size:8.3pt}.distribution-chart{display:block;width:100%;height:27mm;border-bottom:1px solid #9fb0b6}.chart-axis{display:flex;justify-content:space-between;margin-top:1mm;color:#6a7d84;font-size:6pt}.layer-list{display:grid;gap:2mm}.layer{display:grid;grid-template-columns:24mm 12mm 1fr;gap:2mm;align-items:center;font-size:7pt}.layer strong{text-align:right}.layer-track{height:2mm;background:#e8edef}.layer-track i{display:block;height:100%;background:#148589}.layer:nth-child(2) .layer-track i{background:#dfa936}.layer:nth-child(3) .layer-track i{background:#3a78a0}",
      "table{width:100%;border-collapse:collapse;font-size:7pt}th{padding:1.6mm;text-align:left;color:#587078;background:#eef4f5;border-bottom:1px solid #cbd8dc}td{padding:1.5mm;border-bottom:1px solid #e2e9eb}td small{display:block;margin-top:.5mm;color:#71848b;font-size:5.8pt}tbody tr:last-child td{border-bottom:0}",
      ".pdf-content{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.interpretation{border-left:2mm solid #d45b38}.interpretation h3,.guide h3{margin:0 0 1.5mm;color:#183e47;font-size:9.5pt}.interpretation strong{display:block;margin-bottom:1mm;font-size:8.2pt}.interpretation p{margin:0;color:#4f646c;font-size:7pt;line-height:1.45;white-space:pre-line}.guide ul{margin:0;padding-left:4mm}.guide li{margin:0 0 1mm;color:#4f646c;font-size:6.8pt;line-height:1.35}.guide li:last-child{margin-bottom:0}",
      ".pdf-footer{margin-top:auto;padding-top:3mm;border-top:1px solid #cfdadd;display:grid;grid-template-columns:1fr auto;gap:5mm;align-items:end}.notice strong{display:block;margin-bottom:1mm;color:#173f47;font-size:7pt}.notice p{margin:0;color:#687b82;font-size:6.2pt;line-height:1.45}.footer-mark{text-align:right;color:#6c7f86;font-size:6pt;white-space:nowrap}.footer-mark strong{display:block;color:#173f47;font-size:7pt}",
      "@media print{html,body{width:210mm;height:auto;background:#fff}body{padding:0}.pdf-controls{display:none}.pdf-sheet{margin:0;box-shadow:none;page-break-after:avoid}.pdf-summary,.pdf-main,.pdf-content,.pdf-footer{break-inside:avoid}}",
      forArchive ? "body{padding:0}.pdf-sheet{margin:0;box-shadow:none}.pdf-meta strong{white-space:normal;word-break:keep-all;overflow-wrap:anywhere}" : `
@media screen {
          body { padding: 0 14px 24px; background: #eef3ef; }
          .pdf-sheet, .pdf-controls { width: min(100%, 210mm); }
          .pdf-sheet { overflow-wrap: anywhere; }
          .pdf-controls {
            position: sticky;
            z-index: 2;
            top: 0;
            padding: 10px 0;
            margin-bottom: 0;
            background: #eef3ef;
          }
          .pdf-controls button { min-height: 44px; border-radius: 8px; font: inherit; font-size: 14px; font-weight: 750; }
          .pdf-controls .primary { background: #225a48; border-color: #225a48; }
          .pdf-controls button:focus-visible { outline: 3px solid #225a48; outline-offset: 2px; }
        }
        @media screen and (max-width: 820px) {
          .pdf-controls .primary { flex: 1; }
          .pdf-sheet { min-height: 0; gap: 14px; padding: 16px; border-radius: 14px; box-shadow: none; }
          .pdf-header { flex-direction: column; gap: 16px; padding-bottom: 12px; }
          .pdf-brand img { max-width: 100%; width: 152px; }
          .pdf-title, .footer-mark { text-align: left; }
          .pdf-title h1 { font-size: 21px; }
          .pdf-brand p, .pdf-title p { font-size: 12px; }
          .pdf-meta, .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: #d6e0e3; }
          .pdf-meta div, .metric { padding: 9px; border: 0; background: #fff; }
          .pdf-meta div:last-child { grid-column: 1 / -1; }
          .metric:last-child:nth-child(odd) { grid-column: 1 / -1; }
          .pdf-meta span, .metric span { font-size: 11px; }
          .pdf-meta strong, .metric strong { font-size: 13px; white-space: normal; }
          .pdf-summary, .pdf-main, .pdf-content, .pdf-footer { grid-template-columns: minmax(0, 1fr); gap: 12px; }
          .pdf-card, .type-panel, .score-panel { padding: 12px; }
          .type-panel h2 { font-size: 21px; }
          .type-art { width: 66px; height: 66px; flex-basis: 66px; }
          .pdf-card h3 { font-size: 16px; }
          .type-panel p, .interpretation p, .guide li, .notice p { font-size: 13px; line-height: 1.6; }
          .type-panel .badge, .type-panel h2 small, .interpretation strong, .notice strong, .score-label, .layer { font-size: 12px; }
          .guide li { margin-bottom: 7px; }
          .chart-axis, .gauge-scale { font-size: 10px; }
          .layer { grid-template-columns: minmax(0, 1.1fr) auto minmax(0, 1fr); }
          table { table-layout: fixed; font-size: 11px; }
          th, td { padding: 6px 4px; }
          td small { font-size: 10px; }
        }
`,
      "</style></head><body>",
      forArchive ? "" : "<div class=\"pdf-controls\"><button onclick=\"window.close()\">닫기</button><button class=\"primary\" onclick=\"window.print()\">PDF로 저장</button></div>",
      "<main class=\"pdf-sheet\" style=\"--score:", hasScore ? result.score : 0, "%\">",
      "<header class=\"pdf-header\"><div class=\"pdf-brand\"><img src=\"", escapeHtml(logoUrl), "\" alt=\"Caffeine Atlas\"><p>Evidence-based caffeine response interpretation</p></div><div class=\"pdf-title\"><h1>Caffeine Atlas Report</h1><p>", escapeHtml(data.generatedAt), "</p></div></header>",
      "<section class=\"pdf-meta\"><div><span>Sample ID</span><strong>", escapeHtml(info.sampleId), "</strong></div><div><span>Report date</span><strong>", escapeHtml(info.reportDate), "</strong></div><div><span>Collection</span><strong>", escapeHtml(formatCollectionDate(info.collectionDate)), "</strong></div><div><span>Specimen / Sex</span><strong>", escapeHtml(info.sampleType), " / ", escapeHtml(info.sex), "</strong></div><div><span>Institution</span><strong>", escapeHtml(info.institution), "</strong></div></section>",
      "<section class=\"pdf-summary\"><div class=\"type-panel\"><span class=\"badge\">", escapeHtml(result.badge), "</span><h2>", hasScore ? "<small>제 카페인 유형은</small> " : "", escapeHtml(result.category + (hasScore ? "이에요!" : "")), "</h2><p>", escapeHtml(result.typeDescription), "</p></div><div class=\"score-panel\"><div class=\"score-row\"><span class=\"score-label\">카페인 민감도 점수</span><strong class=\"score-value\">", pdfScoreText, pdfScoreUnit, "</strong></div>", coverageMarkup, "<div class=\"gauge", hasScore ? "" : " is-unscored", "\"></div><div class=\"gauge-scale\"><span>잠꾸러기형 · 낮음</span><span>잠잠형 · 중간</span><span>각성형 · 높음</span></div></div></section>",
      "<section class=\"metrics\"><div class=\"metric\"><span>Result type</span><strong>", escapeHtml(result.category), "</strong></div><div class=\"metric\"><span>Metabolism</span><strong>", escapeHtml(result.metabolismSubtype.displayName || result.metabolismSubtype.name), "</strong></div><div class=\"metric\"><span>SNP coverage</span><strong>", result.confidence, "%</strong></div></section>",
      "<section class=\"pdf-main\"><div class=\"pdf-card\"><div class=\"chart-summary\"><h3>연구 참조분포</h3><strong>", escapeHtml(referencePosition), "</strong></div>", pdfDistributionChart, "<div class=\"chart-axis\"><span>낮음</span><span>민감도 점수</span><span>높음</span></div><h3 style=\"margin-top:3mm\">분석 레이어</h3><div class=\"layer-list\"><div class=\"layer\"><span>대사</span><strong>", formatPdfScore(result.metabolismScore), "</strong><div class=\"layer-track\"><i style=\"width:", result.metabolismScore || 0, "%\"></i></div></div><div class=\"layer\"><span>섭취/조절</span><strong>", formatPdfScore(result.regulationScore), "</strong><div class=\"layer-track\"><i style=\"width:", result.regulationScore || 0, "%\"></i></div></div><div class=\"layer\"><span>입력 완성도</span><strong>", result.confidence, "%</strong><div class=\"layer-track\"><i style=\"width:", result.confidence, "%\"></i></div></div></div></div>",
      "<div class=\"pdf-card\"><h3>유전자형 결과 요약</h3><table><thead><tr><th>Gene / SNP</th><th>Genotype</th><th>Layer</th><th>Score</th></tr></thead><tbody>", genotypeRows, "</tbody></table></div></section>",
      "<section class=\"pdf-content\"><div class=\"pdf-card interpretation\"><h3>결과 해석</h3><strong>", escapeHtml(result.title), "</strong><p>", escapeHtml(result.interpretation), "</p></div><div class=\"pdf-card guide\"><h3>카페인 섭취 계획 예시</h3><ul>", recommendations, "</ul></div></section>",
      "<footer class=\"pdf-footer\"><div class=\"notice\"><strong>주의 및 한계</strong><p>", escapeHtml(data.limitations.concat(REFERENCE_SOURCE_NOTE).join(" ")), "</p></div><div class=\"footer-mark\"><strong>Caffeine Atlas</strong>Research &amp; education use only</div></footer>",
      "</main>",
      forArchive ? "" : "<script>window.addEventListener('load',function(){if(navigator.webdriver||matchMedia('(max-width: 820px), (pointer: coarse)').matches)return;var ready=document.fonts?document.fonts.ready:Promise.resolve();ready.then(function(){setTimeout(function(){window.print()},350)})});<\/script>",
      "</body></html>"
    ].join("");
  }

  function openPdfReport(data) {
    var printWindow = window.open("", "_blank", "width=920,height=1120");
    if (!printWindow) {
      window.alert("PDF 리포트 창을 열 수 없습니다. 브라우저의 팝업 차단을 해제한 뒤 다시 시도해 주세요.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPdfReportHtml(data));
    printWindow.document.close();
  }

  function savePdfReport() {
    var data = buildReportData();
    if (!data) {
      window.alert("먼저 리포트 생성 버튼을 눌러 결과를 생성해 주세요.");
      return;
    }
    openPdfReport(data);
  }

  function saveBatchPdfReport(rowNumber) {
    if (batchBusy) return;
    var record = batchResults.find(function (item) { return item.rowNumber === rowNumber; });
    if (!record || record.errors.length || !record.reportData) {
      setBatchStatus("현재 분석 결과에서 입력 오류가 없는 대상자의 PDF를 선택해 주세요.", "error");
      return;
    }
    // Use this row's immutable report data, never the single-person form state.
    openPdfReport(record.reportData);
  }

  async function downloadBatchPdfZip() {
    if (batchBusy) return;
    var records = batchResults.filter(function (record) { return record.reportData; });
    if (!records.length) return;

    var button = elements.batchPdfZipBtn;
    var label = button.textContent;
    setBatchBusy(true);
    button.textContent = "PDF 준비 중…";
    setBatchStatus("대상자 " + records.length + "명의 PDF를 준비하고 있습니다.");

    try {
      var files = records.map(function (record) {
        var info = record.reportData.reportInfo;
        var row = String(record.rowNumber).padStart(3, "0");
        var sample = safeFilePart(info.sampleId).slice(0, 60);
        return {
          filename: row + "-Caffeine-Atlas-Report-" + sample + "-" + safeFilePart(info.reportDate) + ".pdf",
          title: "Caffeine Atlas Report - " + info.sampleId,
          report: record.reportData
        };
      });
      var zip = await window.buildBatchPdfZip(files, function (report) {
        return buildPdfReportHtml(report, true);
      }, function (completed) {
        var progress = completed === files.length ? "ZIP 파일 만드는 중…" : "PDF 생성 중 " + completed + "/" + files.length;
        button.textContent = progress;
        setBatchStatus(progress);
      });
      var timestamp = getKoreaDateTimeString().replace(/[^0-9]/g, "").slice(0, 14);
      downloadBlob("Caffeine-Atlas-Batch-PDF-" + timestamp + ".zip", zip);
      var excluded = batchResults.length - files.length;
      setBatchStatus("PDF " + files.length + "개가 담긴 ZIP 다운로드를 요청했습니다." +
        (excluded ? " 입력 오류 " + excluded + "행은 제외했습니다." : ""), "success");
    } catch {
      setBatchStatus("PDF ZIP을 만들지 못했습니다. 잠시 후 ‘PDF 일괄 다운로드 (ZIP)’을 다시 선택해 주세요.", "error");
    } finally {
      button.textContent = label;
      setBatchBusy(false);
    }
  }

  function bindEvents() {
    elements.geneGrid.addEventListener("click", function (event) {
      var button = event.target.closest(".gt-button");
      if (!button) return;
      setSelection(button.getAttribute("data-gene"), button.getAttribute("data-genotype"));
    });

    [
      elements.sampleId,
      elements.reportDate,
      elements.collectionDate,
      elements.sampleType,
      elements.sex,
      elements.institution
    ].forEach(function (element) {
      element.addEventListener("input", markInputChanged);
      element.addEventListener("change", markInputChanged);
    });

    elements.analyzeBtn.addEventListener("click", analyze);
    if (elements.exampleDemoBtn) elements.exampleDemoBtn.addEventListener("click", showExampleReport);
    window.addEventListener("atlas:example", function (event) { showExampleReport(event.detail); });
    elements.editBtn.addEventListener("click", showInputScreen);
    elements.resetBtn.addEventListener("click", resetAll);
    elements.copyBtn.addEventListener("click", copyResult);
    elements.saveBtn.addEventListener("click", saveDetailedReport);
    elements.snpSort.addEventListener("change", sortSummary);
    elements.pdfBtn.addEventListener("click", savePdfReport);
    elements.sheetSaveBtn.addEventListener("click", saveToGoogleSheets);
    elements.singleModeBtn.addEventListener("click", function () { setInputMode("single"); });
    elements.batchModeBtn.addEventListener("click", function () { setInputMode("batch"); });
    elements.batchFile.addEventListener("change", handleBatchFileChange);
    elements.batchClearBtn.addEventListener("click", clearBatchInput);
    elements.batchAnalyzeSaveBtn.addEventListener("click", processBatchUpload);
    elements.batchAnalyzeBtn.addEventListener("click", processLocalBatchUpload);
    elements.batchDownloadBtn.addEventListener("click", downloadBatchResults);
    elements.batchPdfZipBtn.addEventListener("click", downloadBatchPdfZip);
    elements.batchResultsBody.addEventListener("click", function (event) {
      var button = event.target.closest("[data-batch-pdf-row]");
      if (!button || button.disabled) return;
      saveBatchPdfReport(Number(button.getAttribute("data-batch-pdf-row")));
    });
    [elements.singleModeBtn, elements.batchModeBtn].forEach(function (tab) {
      tab.addEventListener("keydown", function (event) {
        if (["ArrowLeft", "ArrowRight", "Home", "End"].indexOf(event.key) === -1) return;
        event.preventDefault();
        var mode = event.key === "Home" ? "single" : (event.key === "End" ? "batch" : (elements.batchModePanel.hidden ? "batch" : "single"));
        setInputMode(mode);
        (mode === "batch" ? elements.batchModeBtn : elements.singleModeBtn).focus();
      });
    });
    window.addEventListener("resize", function () {
      window.clearTimeout(chartResizeTimer);
      chartResizeTimer = window.setTimeout(function () {
        drawReferenceChart(lastResult && typeof lastResult.score === "number" ? lastResult.score : null);
      }, 120);
    });
  }

  function init() {
    createGeneCards();
    bindEvents();
    elements.institution.value = FIXED_INSTITUTION;
    elements.referenceSourceNote.textContent = REFERENCE_SOURCE_NOTE;
    elements.reportDate.value = getKoreaDateString();
    elements.collectionDate.value = "";
    setInputMode(window.location.hash === "#batch" ? "batch" : "single");
    updateReportMeta();
    renderEmpty();
    drawReferenceChart(null);
    setResultVisible(false);
    updateValidationMessage();
    if (typeof window.createAtlasWorkspace === "function") {
      atlasWorkspace = window.createAtlasWorkspace({
        restore: reopenSavedReport,
        startNew: startPersonalReport,
        showInput: showInputScreen
      });
    }
    var example = new URLSearchParams(window.location.search).get("example");
    if (["1", "calm", "awake", "sleepy"].indexOf(example) >= 0) showExampleReport(example);
  }

  init();
}());
