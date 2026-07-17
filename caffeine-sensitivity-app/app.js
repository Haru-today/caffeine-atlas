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
      description: "CYP1A2 유도성과 관련된 핵심 변이입니다. C allele은 CYP1A2*1F carrier로 느린 대사형, AA는 빠른 대사형 방향으로 해석합니다.",
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
        { code: "GG", alleleCount: 0, evidenceScore: 0, label: "T 0개" },
        { code: "TG", alleleCount: 1, evidenceScore: 0.5, label: "T 1개" },
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

  var referenceBins = [
    { raw: -0.5, level: 1 },
    { raw: -0.25, level: 3 },
    { raw: 0, level: 5 },
    { raw: 0.25, level: 5 },
    { raw: 0.5, level: 4 },
    { raw: 0.75, level: 2 },
    { raw: 1, level: 1 }
  ];

  var GOOGLE_SHEETS_ENDPOINT = "https://script.google.com/macros/s/AKfycbxkjHn8rhkkRL-hcnTHyrUcHD0ldsEL8PKAwFXUmkrum06PiGbKD50zOKF1tG-qdI-G/exec";
  var FIXED_INSTITUTION = "동의대학교 임상병리학과 분자진단연구실";
  var KOREA_TIME_ZONE = "Asia/Seoul";
  var selections = {};
  var lastResult = null;
  var hasSubmitted = false;
  var chartResizeTimer = null;

  var elements = {
    geneGrid: document.getElementById("geneGrid"),
    sampleId: document.getElementById("sampleId"),
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
    validationText: document.getElementById("validationText"),
    resultPlaceholder: document.getElementById("resultPlaceholder"),
    resultContent: document.getElementById("resultContent"),
    scoreValue: document.getElementById("scoreValue"),
    scoreLabel: document.getElementById("scoreLabel"),
    coverageText: document.getElementById("coverageText"),
    gaugeFill: document.getElementById("gaugeFill"),
    gaugeMarker: document.getElementById("gaugeMarker"),
    metabolismScore: document.getElementById("metabolismScore"),
    behaviorScore: document.getElementById("behaviorScore"),
    confidenceScore: document.getElementById("confidenceScore"),
    metabolismBar: document.getElementById("metabolismBar"),
    behaviorBar: document.getElementById("behaviorBar"),
    confidenceBar: document.getElementById("confidenceBar"),
    referenceRankText: document.getElementById("referenceRankText"),
    percentileText: document.getElementById("percentileText"),
    interpretationTitle: document.getElementById("interpretationTitle"),
    interpretationText: document.getElementById("interpretationText"),
    typeEmoji: document.getElementById("typeEmoji"),
    typeBadge: document.getElementById("typeBadge"),
    typeName: document.getElementById("typeName"),
    typeDesc: document.getElementById("typeDesc"),
    detailCategory: document.getElementById("detailCategory"),
    detailPercentile: document.getElementById("detailPercentile"),
    detailInputQuality: document.getElementById("detailInputQuality"),
    metabolismTypeName: document.getElementById("metabolismTypeName"),
    metabolismTypeDesc: document.getElementById("metabolismTypeDesc"),
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
          '" data-genotype="', gt.code, '">',
          '<strong>', code, '</strong>',
          '<small>', gt.label, '</small>',
          '</button>'
        ].join("");
      }).join("");

      return [
        '<article class="gene-card ', gene.layer, '" id="card-', gene.id, '">',
        '<div class="gene-top">',
        '<div><div class="gene-name">', gene.name, '</div><div class="rsid">', gene.rsid, '</div></div>',
        '<span class="layer-badge">', gene.layerLabel, '</span>',
        '</div>',
        '<p class="gene-desc">', gene.description, '</p>',
        '<div class="genotype-options">', buttons, '</div>',
        '<div class="gene-meta">',
        '<div class="meta-item"><span>Effect allele</span><strong>', gene.allele, '</strong></div>',
        '<div class="meta-item"><span>Evidence</span><strong>', gene.source, '</strong></div>',
        '<div class="meta-item"><span>Weight</span><strong>', gene.weightText, '</strong></div>',
        '</div>',
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
      buttons[i].classList.toggle("active", buttons[i].getAttribute("data-genotype") === genotypeCode);
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

  function getValidSelections() {
    var valid = [];
    genes.forEach(function (gene) {
      var genotype = selections[gene.id];
      if (genotype && genotype.code !== "unknown" && genotype.evidenceScore !== null) {
        valid.push({ gene: gene, genotype: genotype });
      }
    });
    return valid;
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

  function classify(score) {
    if (score < 33.34) {
      return {
        label: "각성형",
        badge: "빠른 대사형",
        emoji: "⚡",
        desc: "카페인이 몸에서 비교적 빨리 빠져나갈 가능성이 있습니다.",
        title: "커피를 마셔도 비교적 부담이 적을 수 있어요",
        text: "입력한 유전자형을 보면 카페인이 몸에 오래 남기보다는 비교적 빨리 처리되는 쪽에 가깝습니다. 그래서 보통 양의 커피는 크게 부담 없이 느낄 수 있지만, 사람마다 수면 상태나 스트레스, 컨디션에 따라 반응이 달라질 수 있습니다.",
        recommendations: [
          "커피를 잘 견디는 편이어도 하루 3-4잔 이상은 습관처럼 늘리지 않는 것이 좋습니다.",
          "오후 커피를 마신 날 잠드는 시간이 늦어지면, 다음부터는 시간을 조금 앞당겨 보세요.",
          "운동 전 커피를 마실 때 가슴 두근거림, 속 불편함, 손 떨림이 있으면 양을 줄여보세요.",
          "잠을 설친 날, 스트레스가 많은 날에는 평소보다 카페인이 더 강하게 느껴질 수 있습니다."
        ]
      };
    }
    if (score < 66.67) {
      return {
        label: "잠잠형",
        badge: "평균 대사형",
        emoji: "🌿",
        desc: "대부분의 사람들과 비슷한 정도로 카페인에 반응할 가능성이 있습니다.",
        title: "카페인 반응이 평균 범위에 가까워요",
        text: "입력한 유전자형만 보면 카페인을 아주 빨리 처리하는 쪽도, 오래 붙잡아두는 쪽도 아닙니다.\n커피를 마셔도 괜찮은지는 유전자 결과와 함께 실제 몸 반응을 같이 보는 것이 가장 좋습니다.",
        recommendations: [
          "하루 1-2잔 정도부터 시작해 내 몸이 편한 양을 찾아보세요.",
          "오후 커피 후 잠이 얕아지거나 늦게 잠들면, 오후 2-3시 이후에는 줄이는 것이 좋습니다.",
          "커피를 마신 뒤 속쓰림, 불안감, 두근거림이 있으면 양보다 농도부터 낮춰보세요.",
          "잠이 부족한 날에는 같은 커피 한 잔도 더 예민하게 느껴질 수 있습니다."
        ]
      };
    }
    return {
      label: "잠꾸러기형",
      badge: "느린 대사형",
      emoji: "🌙",
      desc: "카페인이 몸에 오래 남아 한 잔도 강하게 느껴질 수 있습니다.",
      title: "커피가 몸에 오래 남을 수 있어요",
      text: "입력한 유전자형을 보면 카페인이 비교적 천천히 처리되는 쪽에 가깝습니다. 커피 한 잔만 마셔도 밤에 잠이 늦어지거나, 가슴이 두근거리거나, 불안하게 느껴질 수 있으니 양과 시간을 조금 더 조심해서 보는 것이 좋습니다.",
      recommendations: [
        "처음에는 반 잔이나 연한 커피처럼 적은 양부터 확인해 보세요.",
        "가능하면 오전에만 마시고, 오후에는 디카페인이나 카페인이 없는 음료를 선택해 보세요.",
        "에너지드링크, 진한 녹차, 초콜릿에도 카페인이 들어 있을 수 있습니다.",
        "커피를 마신 날 잠을 설치거나 두근거림이 반복되면 며칠 쉬어보는 것이 좋습니다.",
        "불면, 심한 두근거림, 불안감이 자주 반복되면 의료진과 상담해 주세요."
      ]
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
        : "4개 유전자형이 모두 '모름'으로 입력되어 민감도 점수와 비교 위치를 산출하지 않았습니다. 임의의 평균값으로 대체하지 않고, 입력 내용과 일반적인 카페인 섭취 주의사항을 담은 정보 부족 리포트를 제공합니다.",
      recommendations: [
        "유전자형을 확인하기 전에는 카페인을 적은 양부터 섭취하고 실제 몸 반응을 살펴보세요.",
        "오후나 저녁에는 카페인을 줄이고, 수면에 영향이 있으면 섭취 시간을 앞당겨 보세요.",
        "두근거림, 불안감, 속 불편함이 나타나면 섭취를 중단하거나 양을 줄여보세요.",
        "유형 결과가 필요하면 먼저 핵심 표지자인 CYP1A2*1F rs762551 유전자형을 확인해 다시 입력해 주세요."
      ]
    };
  }

  function getMetabolismSubtype(metabolismNorm) {
    if (metabolismNorm === null || typeof metabolismNorm !== "number") {
      return {
        name: "판정 보류",
        desc: "확인된 대사 관련 유전자형이 없어 카페인이 몸에서 빠져나가는 속도를 판정하지 않았습니다."
      };
    }

    var score = clamp(metabolismNorm * 100, 0, 100);
    if (score <= 33.33) {
      return {
        name: "고속 대사형",
        desc: "카페인이 몸에 오래 남기보다는 비교적 빨리 처리될 가능성이 있습니다."
      };
    }
    if (score <= 66.67) {
      return {
        name: "중간 대사형",
        desc: "카페인이 특별히 빨리 빠지거나 오래 남는 편으로 보이지는 않습니다."
      };
    }
    return {
      name: "저속 대사형",
      desc: "카페인이 몸에 비교적 오래 남을 수 있어, 적은 양에도 늦은 시간까지 영향을 느낄 수 있습니다."
    };
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
      "<span>Sample ID: " + info.sampleId + "</span>",
      "<span>Report date: " + info.reportDate + "</span>",
      "<span>Collection date: " + info.collectionDate + "</span>",
      "<span>Specimen: " + info.sampleType + "</span>",
      "<span>Sex: " + info.sex + "</span>",
      "<span>운영기관: " + info.institution + "</span>"
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
    }
    if (!elements.reportDate.value) {
      errors.push("Report date를 입력해 주세요.");
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

  function analyze() {
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
    window.requestAnimationFrame(function () {
      drawReferenceChart(lastResult && typeof lastResult.score === "number" ? lastResult.score : null);
    });
    window.location.hash = "resultReport";
    elements.resultReport.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    var valid = getValidSelections();
    var unknownCount = getUnknownGenes().length;
    updateReportMeta();

    if (!hasSubmitted) {
      lastResult = null;
      renderEmpty();
      drawReferenceChart(null);
      return;
    }

    var result = computeEvidenceModel(valid);
    var hasCoreGenotype = valid.some(function (item) {
      return item.gene.id === "rs762551";
    });
    var hasScore = hasCoreGenotype && result.finalNorm !== null && typeof result.finalNorm === "number";
    var score = hasScore ? clamp(result.finalNorm * 100, 0, 100) : null;
    var percentile = hasScore ? calculatePercentile(score) : { percentile: null, total: 0 };
    var coverage = valid.length / genes.length;
    var confidence = Math.round(coverage * 100);
    var category = hasScore ? classify(score) : getInsufficientCategory(valid.length);
    var metabolismSubtype = hasCoreGenotype
      ? getMetabolismSubtype(result.metabolismNorm)
      : {
        name: "판정 보류",
        desc: "핵심 대사 표지자인 CYP1A2*1F rs762551가 '모름'이어서 카페인이 몸에 남는 시간을 판정하지 않았습니다."
      };
    var sensitivityRank = hasScore ? calculateRankFromPercentile(percentile.percentile) : null;
    var coverageNote = unknownCount > 0 && hasScore
      ? "'모름' " + unknownCount + "개는 제외하고 확인된 " + valid.length + "개 유전자형만 반영한 제한적 결과입니다."
      : "";
    var typeDescription = coverageNote ? category.desc + " " + coverageNote : category.desc;
    var interpretation = coverageNote ? category.text + "\n\n" + coverageNote : category.text;

    lastResult = {
      score: score,
      percentile: percentile.percentile,
      sensitivityRank: sensitivityRank,
      confidence: confidence,
      category: category,
      typeDescription: typeDescription,
      interpretation: interpretation,
      metabolismSubtype: metabolismSubtype,
      valid: valid,
      metabolismNorm: result.metabolismNorm,
      behaviorNorm: result.behaviorNorm
    };

    elements.scoreValue.textContent = hasScore ? score.toFixed(1) : "--";
    elements.scoreLabel.textContent = hasScore ? category.label : "산출 없음";
    elements.typeEmoji.textContent = category.emoji;
    elements.typeBadge.textContent = category.badge;
    elements.typeName.textContent = category.label;
    elements.typeDesc.textContent = typeDescription;
    elements.coverageText.textContent = "분석 완성도 " + confidence + "% (확인 " + valid.length + "/4 · 모름 " + unknownCount + "/4)";
    elements.gaugeFill.style.width = hasScore ? score.toFixed(2) + "%" : "0%";
    elements.gaugeMarker.style.left = hasScore ? score.toFixed(2) + "%" : "0%";
    elements.gaugeMarker.hidden = !hasScore;

    setLayer("metabolism", result.metabolismNorm);
    setLayer("behavior", result.behaviorNorm);
    elements.confidenceScore.textContent = confidence + "%";
    elements.confidenceBar.style.width = confidence + "%";

    elements.referenceRankText.textContent = hasScore ? "대한민국 평균 100명 중 " + sensitivityRank + "등" : "비교 불가";
    elements.percentileText.textContent = hasScore ? "카페인 민감도가 높은 순서 기준" : "확인된 유전자형 없음";
    elements.detailCategory.textContent = category.label;
    elements.detailPercentile.textContent = hasScore ? percentile.percentile.toFixed(1) + "% 위치" : "산출 없음";
    elements.detailInputQuality.textContent = "확인 " + valid.length + "개 · 모름 " + unknownCount + "개";
    elements.metabolismTypeName.textContent = metabolismSubtype.name;
    elements.metabolismTypeDesc.textContent = metabolismSubtype.desc;
    elements.interpretationTitle.textContent = category.title;
    elements.interpretationText.textContent = interpretation;
    elements.recommendList.innerHTML = category.recommendations.map(function (item) {
      return "<li>" + item + "</li>";
    }).join("");

    renderSummary();
    drawReferenceChart(hasScore ? score : null);
  }

  function setLayer(layer, norm) {
    var scoreElement = layer === "metabolism" ? elements.metabolismScore : elements.behaviorScore;
    var barElement = layer === "metabolism" ? elements.metabolismBar : elements.behaviorBar;
    if (norm === null) {
      scoreElement.textContent = "없음";
      barElement.style.width = "0%";
      return;
    }
    var value = clamp(norm * 100, 0, 100);
    scoreElement.textContent = value.toFixed(1);
    barElement.style.width = value.toFixed(2) + "%";
  }

  function renderEmpty() {
    elements.scoreValue.textContent = "--";
    elements.scoreLabel.textContent = "대기 중";
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
    elements.referenceRankText.textContent = "--";
    elements.percentileText.textContent = "--";
    elements.typeEmoji.textContent = "--";
    elements.typeBadge.textContent = "대기 중";
    elements.typeName.textContent = "리포트 결과 대기";
    elements.typeDesc.textContent = "리포트 정보와 유전자형을 입력하면 개인 유형이 표시됩니다.";
    elements.detailCategory.textContent = "--";
    elements.detailPercentile.textContent = "--";
    elements.detailInputQuality.textContent = "--";
    elements.metabolismTypeName.textContent = "--";
    elements.metabolismTypeDesc.textContent = "유전자형을 바탕으로 카페인이 비교적 빨리 빠지는지, 오래 남는지 보여드립니다.";
    elements.interpretationTitle.textContent = "유전자형을 선택해 주세요";
    elements.interpretationText.textContent = "리포트 정보와 4개 유전자형 항목을 선택한 뒤 리포트 생성 버튼을 누르면 결과가 생성됩니다.";
    elements.recommendList.innerHTML = "<li>리포트 생성 후 카페인 섭취 가이드가 표시됩니다.</li>";
    elements.summaryGrid.innerHTML = "";
  }

  function renderSummary() {
    var html = genes.map(function (gene) {
      var genotype = selections[gene.id];
      var selected = genotype && genotype.code !== "unknown";
      var value = genotype ? (genotype.code === "unknown" ? "모름" : genotype.code) : "미선택";
      var scoreText = "반영 없음";

      if (selected) {
        scoreText = "민감도 반영 " + Math.round(genotype.evidenceScore * 100) + "%";
      }

      return [
        '<div class="summary-chip">',
        '<strong>', gene.name, ' · ', value, '</strong>',
        '<span>', gene.rsid, ' / ', gene.layerLabel, '</span>',
        '<span>', scoreText, '</span>',
        '<span class="evidence-pill">', gene.source, ' · ', gene.evidenceGrade, '</span>',
        '</div>'
      ].join("");
    }).join("");
    elements.summaryGrid.innerHTML = html;
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
    ctx.fillText("참조분포", 0, 0);
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

  function resetAll() {
    selections = {};
    var buttons = document.querySelectorAll(".gt-button");
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.remove("active");
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
      "Collection date: " + reportInfo.collectionDate,
      "Specimen: " + reportInfo.sampleType,
      "Sex: " + reportInfo.sex,
      "운영기관: " + reportInfo.institution,
      "",
      "점수: " + (typeof lastResult.score === "number" ? lastResult.score.toFixed(1) + "점" : "산출 없음"),
      "유형: " + lastResult.category.label,
      "대사 레이어 판정: " + lastResult.metabolismSubtype.name,
      "대한민국 평균 100명 중 민감도 높은 순: " + (typeof lastResult.sensitivityRank === "number" ? lastResult.sensitivityRank + "등" : "산출 없음"),
      "다른 사람들과 비교한 위치: " + (typeof lastResult.percentile === "number" ? lastResult.percentile.toFixed(1) + "%" : "산출 없음"),
      layerText.join("\n"),
      "",
      "[유전자형]",
      genotypeText.join("\n"),
      "",
      "[해석]",
      lastResult.category.title,
      lastResult.interpretation
    ];
    lines.push("", "[카페인 섭취 가이드]", lastResult.category.recommendations.map(function (item) {
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

  function getGenotypeRecords() {
    return genes.map(function (gene) {
      var genotype = selections[gene.id];
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

  function buildReportData() {
    if (!lastResult) {
      return null;
    }

    var reportInfo = getReportInfo();
    return {
      reportTitle: "카페인 반응 근거 기반 해석 리포트",
      generatedAt: getKoreaDateTimeString(),
      timeZone: KOREA_TIME_ZONE,
      reportInfo: reportInfo,
      result: {
        score: typeof lastResult.score === "number" ? Number(lastResult.score.toFixed(1)) : null,
        category: lastResult.category.label,
        title: lastResult.category.title,
        badge: lastResult.category.badge,
        emoji: lastResult.category.emoji,
        typeDescription: lastResult.typeDescription,
        interpretation: lastResult.interpretation,
        percentile: typeof lastResult.percentile === "number" ? Number(lastResult.percentile.toFixed(1)) : null,
        sensitivityRank: lastResult.sensitivityRank,
        confidence: lastResult.confidence,
        metabolismScore: lastResult.metabolismNorm === null ? null : Number((lastResult.metabolismNorm * 100).toFixed(1)),
        regulationScore: lastResult.behaviorNorm === null ? null : Number((lastResult.behaviorNorm * 100).toFixed(1)),
        metabolismSubtype: lastResult.metabolismSubtype
      },
      genotypes: getGenotypeRecords(),
      recommendations: lastResult.category.recommendations,
      limitations: [
        "본 결과는 연구·교육용 해석 리포트이며 질병 진단, 의학적 처방, 치료 판단을 대체하지 않습니다.",
        "실제 카페인 반응은 수면, 약물, 간 기능, 임신, 흡연, 스트레스, 섭취량과 섭취 시간의 영향을 받을 수 있습니다.",
        lastResult.confidence < 100 ? "'모름'으로 선택한 유전자형은 점수에서 제외했으며, 분석 완성도가 낮을수록 결과의 불확실성이 큽니다." : ""
      ].filter(Boolean)
    };
  }

  function getGenotypeValue(rsid) {
    var genotype = selections[rsid];
    if (!genotype) return "미선택";
    return genotype.code === "unknown" ? "모름" : genotype.code;
  }

  function buildSheetPayload() {
    var data = buildReportData();
    if (!data) return null;

    return {
      submittedAt: getKoreaDateTimeString(),
      sampleId: data.reportInfo.sampleId,
      reportDate: data.reportInfo.reportDate,
      collectionDate: data.reportInfo.collectionDate,
      specimen: data.reportInfo.sampleType,
      sex: data.reportInfo.sex,
      institution: data.reportInfo.institution,
      rs762551: getGenotypeValue("rs762551"),
      rs2069514: getGenotypeValue("rs2069514"),
      rs2472297: getGenotypeValue("rs2472297"),
      rs6968865: getGenotypeValue("rs6968865"),
      score: data.result.score,
      category: data.result.category,
      metabolismSubtype: data.result.metabolismSubtype.name,
      percentile: data.result.percentile,
      confidence: data.result.confidence,
      metabolismScore: data.result.metabolismScore,
      regulationScore: data.result.regulationScore,
      consent: Boolean(elements.sheetConsent && elements.sheetConsent.checked),
      rankOutOf100: data.result.sensitivityRank,
      reportJson: data
    };
  }

  function setSheetStatus(message, type) {
    if (!elements.sheetSyncStatus) return;
    elements.sheetSyncStatus.textContent = message;
    elements.sheetSyncStatus.classList.toggle("error", type === "error");
    elements.sheetSyncStatus.classList.toggle("success", type === "success");
  }

  function saveToGoogleSheets() {
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

    fetch(GOOGLE_SHEETS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    }).then(function () {
      setSheetStatus("저장 요청을 보냈습니다. Google Sheets에서 새 행을 확인해 주세요. 행이 없으면 Apps Script 웹앱 URL과 공개 권한을 다시 확인해야 합니다.", "success");
    }).catch(function () {
      setSheetStatus("저장 요청에 실패했습니다. Apps Script URL과 배포 권한을 확인해 주세요.", "error");
    }).finally(function () {
      elements.sheetSaveBtn.disabled = false;
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
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    var chartImage = document.createElement("img");

    reportClone.removeAttribute("hidden");
    if (placeholder) placeholder.remove();
    if (editButton) editButton.remove();
    if (saveScope) saveScope.remove();
    if (actions) actions.remove();

    if (clonedCanvas) {
      chartImage.src = elements.chart.toDataURL("image/png");
      chartImage.alt = "참조분포 그래프";
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
      "</style></head><body><main class=\"saved-report-shell\">",
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

  function buildPdfReportHtml(data) {
    var info = data.reportInfo;
    var result = data.result;
    var logoUrl = new URL("./assets/caffeine-atlas-logo-wordmark.png", window.location.href).href;
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
    var pdfRankText = typeof result.sensitivityRank === "number" ? "100명 중 " + result.sensitivityRank + "등" : "산출 없음";
    var pdfPercentileText = typeof result.percentile === "number" ? result.percentile.toFixed(1) + "%" : "산출 없음";
    var pdfMarker = "";
    if (hasScore) {
      var pdfMarkerX = clamp(result.score, 0, 100);
      var pdfMarkerY = 54 - (getReferenceLevelAtScore(pdfMarkerX) / maxReferenceLevel) * 44;
      pdfMarker = [
        '<line class="distribution-guide" x1="', pdfMarkerX, '" y1="', pdfMarkerY.toFixed(1), '" x2="', pdfMarkerX, '" y2="54"></line>',
        '<circle class="distribution-marker" cx="', pdfMarkerX, '" cy="', pdfMarkerY.toFixed(1), '" r="3.2"></circle>'
      ].join("");
    }
    var pdfDistributionChart = [
      '<svg class="distribution-chart" viewBox="0 0 100 60" role="img" aria-label="참조분포 선형 그래프와 내 위치">',
      '<line class="distribution-grid" x1="0" y1="21" x2="100" y2="21"></line>',
      '<line class="distribution-grid" x1="0" y1="38" x2="100" y2="38"></line>',
      '<polygon class="distribution-area" points="0,54 ', pdfChartPoints, ' 100,54"></polygon>',
      '<polyline class="distribution-line" points="', pdfChartPoints, '"></polyline>',
      pdfMarker,
      '</svg>'
    ].join("");

    return [
      "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\">",
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
      "<title>", escapeHtml(filename), "</title><style>",
      "@page{size:A4 portrait;margin:0}",
      "*{box-sizing:border-box}html,body{margin:0;background:#e9eef2;color:#17222c;font-family:-apple-system,BlinkMacSystemFont,'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif;letter-spacing:0}",
      "body{padding:18px}.pdf-sheet{width:210mm;height:297mm;margin:0 auto;background:#fff;padding:10mm 12mm 9mm;box-shadow:0 12px 40px rgba(13,31,40,.14);display:flex;flex-direction:column;gap:4.2mm;overflow:hidden}",
      ".pdf-controls{width:210mm;margin:0 auto 12px;display:flex;justify-content:flex-end;gap:8px}.pdf-controls button{border:1px solid #bac7ce;background:#fff;color:#17313a;padding:9px 14px;font-weight:800;cursor:pointer}.pdf-controls .primary{border-color:#126f72;background:#126f72;color:#fff}",
      ".pdf-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:3.5mm;border-bottom:1.5px solid #163e46}.pdf-brand img{display:block;width:52mm;height:auto}.pdf-brand p{margin:1.5mm 0 0;color:#587079;font-size:7.5pt;font-weight:700}.pdf-title{text-align:right}.pdf-title h1{margin:0;color:#173e47;font-size:18pt}.pdf-title p{margin:1.5mm 0 0;color:#60737b;font-size:7.5pt}",
      ".pdf-meta{display:grid;grid-template-columns:1.05fr .85fr .85fr .8fr 1.45fr;border:1px solid #d6e0e3}.pdf-meta div{min-width:0;padding:2.4mm 2.7mm;border-right:1px solid #d6e0e3}.pdf-meta div:last-child{border-right:0}.pdf-meta span,.metric span{display:block;color:#647981;font-size:6.8pt;font-weight:800;text-transform:uppercase}.pdf-meta strong{display:block;margin-top:1mm;font-size:8.2pt;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
      ".pdf-summary{display:grid;grid-template-columns:1.1fr .9fr;gap:4mm}.type-panel,.score-panel,.pdf-card{border:1px solid #d6e0e3;background:#fff;padding:3.5mm}.type-panel{border-left:3mm solid #148589}.type-panel .badge{color:#0d696c;font-size:7.5pt;font-weight:900}.type-panel h2{margin:1.2mm 0 1mm;font-size:16pt}.type-panel p{margin:0;color:#52676f;font-size:8pt;line-height:1.5}.score-row{display:flex;justify-content:space-between;align-items:flex-end}.score-label{color:#60767d;font-size:7.5pt;font-weight:800}.score-value{color:#d45b38;font-size:24pt;font-weight:950;line-height:1}.score-value small{font-size:9pt}.gauge{position:relative;height:4mm;margin-top:2.5mm;background:linear-gradient(90deg,#188b91 0 33.33%,#e5ad3c 33.33% 66.67%,#d85d39 66.67%);border-radius:2mm}.gauge:after{content:'';position:absolute;left:var(--score);top:-1.4mm;width:1.4mm;height:6.8mm;background:#172f38;transform:translateX(-50%)}.gauge.is-unscored:after{display:none}.gauge-scale{display:flex;justify-content:space-between;margin-top:1mm;color:#657980;font-size:6.4pt;font-weight:800}",
      ".metrics{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #d6e0e3}.metric{padding:2.4mm 3mm;border-right:1px solid #d6e0e3}.metric:last-child{border-right:0}.metric strong{display:block;margin-top:1mm;color:#173f47;font-size:10pt}",
      ".pdf-main{display:grid;grid-template-columns:.9fr 1.1fr;gap:4mm}.pdf-card h3{margin:0 0 2.2mm;color:#183e47;font-size:9.5pt}.chart-summary{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:2mm}.chart-summary strong{color:#d45b38;font-size:12pt}.chart-summary span{color:#60747c;font-size:6.8pt}.distribution-chart{display:block;width:100%;height:27mm;border-bottom:1px solid #9fb0b6}.distribution-grid{stroke:#e3eaec;stroke-width:.45}.distribution-area{fill:#dceff0}.distribution-line{fill:none;stroke:#148589;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}.distribution-guide{stroke:#d45b38;stroke-width:1;stroke-dasharray:2 1.5}.distribution-marker{fill:#fff;stroke:#d45b38;stroke-width:1.6}.chart-axis{display:flex;justify-content:space-between;margin-top:1mm;color:#6a7d84;font-size:6pt}.layer-list{display:grid;gap:2mm}.layer{display:grid;grid-template-columns:24mm 12mm 1fr;gap:2mm;align-items:center;font-size:7pt}.layer strong{text-align:right}.layer-track{height:2mm;background:#e8edef}.layer-track i{display:block;height:100%;background:#148589}.layer:nth-child(2) .layer-track i{background:#dfa936}.layer:nth-child(3) .layer-track i{background:#3a78a0}",
      "table{width:100%;border-collapse:collapse;font-size:7pt}th{padding:1.6mm;text-align:left;color:#587078;background:#eef4f5;border-bottom:1px solid #cbd8dc}td{padding:1.5mm;border-bottom:1px solid #e2e9eb}td small{display:block;margin-top:.5mm;color:#71848b;font-size:5.8pt}tbody tr:last-child td{border-bottom:0}",
      ".pdf-content{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.interpretation{border-left:2mm solid #d45b38}.interpretation h3,.guide h3{margin:0 0 1.5mm;color:#183e47;font-size:9.5pt}.interpretation strong{display:block;margin-bottom:1mm;font-size:8.2pt}.interpretation p{margin:0;color:#4f646c;font-size:7pt;line-height:1.45;white-space:pre-line}.guide ul{margin:0;padding-left:4mm}.guide li{margin:0 0 1mm;color:#4f646c;font-size:6.8pt;line-height:1.35}.guide li:last-child{margin-bottom:0}",
      ".pdf-footer{margin-top:auto;padding-top:3mm;border-top:1px solid #cfdadd;display:grid;grid-template-columns:1fr auto;gap:5mm;align-items:end}.notice strong{display:block;margin-bottom:1mm;color:#173f47;font-size:7pt}.notice p{margin:0;color:#687b82;font-size:6.2pt;line-height:1.45}.footer-mark{text-align:right;color:#6c7f86;font-size:6pt;white-space:nowrap}.footer-mark strong{display:block;color:#173f47;font-size:7pt}",
      "@media print{html,body{width:210mm;height:297mm;background:#fff}body{padding:0}.pdf-controls{display:none}.pdf-sheet{margin:0;box-shadow:none;page-break-after:avoid}}",
      "</style></head><body>",
      "<div class=\"pdf-controls\"><button onclick=\"window.close()\">닫기</button><button class=\"primary\" onclick=\"window.print()\">PDF로 저장</button></div>",
      "<main class=\"pdf-sheet\" style=\"--score:", hasScore ? result.score : 0, "%\">",
      "<header class=\"pdf-header\"><div class=\"pdf-brand\"><img src=\"", escapeHtml(logoUrl), "\" alt=\"Caffeine Atlas\"><p>Evidence-based caffeine response interpretation</p></div><div class=\"pdf-title\"><h1>Caffeine Atlas Report</h1><p>", escapeHtml(data.generatedAt), "</p></div></header>",
      "<section class=\"pdf-meta\"><div><span>Sample ID</span><strong>", escapeHtml(info.sampleId), "</strong></div><div><span>Report date</span><strong>", escapeHtml(info.reportDate), "</strong></div><div><span>Collection</span><strong>", escapeHtml(info.collectionDate), "</strong></div><div><span>Specimen / Sex</span><strong>", escapeHtml(info.sampleType), " / ", escapeHtml(info.sex), "</strong></div><div><span>Institution</span><strong>", escapeHtml(info.institution), "</strong></div></section>",
      "<section class=\"pdf-summary\"><div class=\"type-panel\"><span class=\"badge\">", escapeHtml(result.badge), "</span><h2>", escapeHtml(result.category), "</h2><p>", escapeHtml(result.typeDescription), "</p></div><div class=\"score-panel\"><div class=\"score-row\"><span class=\"score-label\">카페인 민감도 점수</span><strong class=\"score-value\">", pdfScoreText, pdfScoreUnit, "</strong></div><div class=\"gauge", hasScore ? "" : " is-unscored", "\"></div><div class=\"gauge-scale\"><span>각성형</span><span>잠잠형</span><span>잠꾸러기형</span></div></div></section>",
      "<section class=\"metrics\"><div class=\"metric\"><span>Result type</span><strong>", escapeHtml(result.category), "</strong></div><div class=\"metric\"><span>Metabolism</span><strong>", escapeHtml(result.metabolismSubtype.name), "</strong></div><div class=\"metric\"><span>Reference rank</span><strong>", pdfRankText, "</strong></div><div class=\"metric\"><span>Confidence</span><strong>", result.confidence, "%</strong></div></section>",
      "<section class=\"pdf-main\"><div class=\"pdf-card\"><div class=\"chart-summary\"><div><h3>Reference distribution</h3><span>선 위의 점이 내 위치입니다</span></div><strong>", pdfPercentileText, "</strong></div>", pdfDistributionChart, "<div class=\"chart-axis\"><span>낮음</span><span>민감도 점수</span><span>높음</span></div><h3 style=\"margin-top:3mm\">분석 레이어</h3><div class=\"layer-list\"><div class=\"layer\"><span>대사</span><strong>", formatPdfScore(result.metabolismScore), "</strong><div class=\"layer-track\"><i style=\"width:", result.metabolismScore || 0, "%\"></i></div></div><div class=\"layer\"><span>섭취/조절</span><strong>", formatPdfScore(result.regulationScore), "</strong><div class=\"layer-track\"><i style=\"width:", result.regulationScore || 0, "%\"></i></div></div><div class=\"layer\"><span>신뢰도</span><strong>", result.confidence, "%</strong><div class=\"layer-track\"><i style=\"width:", result.confidence, "%\"></i></div></div></div></div>",
      "<div class=\"pdf-card\"><h3>유전자형 결과 요약</h3><table><thead><tr><th>Gene / SNP</th><th>Genotype</th><th>Layer</th><th>Score</th></tr></thead><tbody>", genotypeRows, "</tbody></table></div></section>",
      "<section class=\"pdf-content\"><div class=\"pdf-card interpretation\"><h3>결과 해석</h3><strong>", escapeHtml(result.title), "</strong><p>", escapeHtml(result.interpretation), "</p></div><div class=\"pdf-card guide\"><h3>카페인 섭취 가이드</h3><ul>", recommendations, "</ul></div></section>",
      "<footer class=\"pdf-footer\"><div class=\"notice\"><strong>주의 및 한계</strong><p>", escapeHtml(data.limitations.join(" ")), "</p></div><div class=\"footer-mark\"><strong>Caffeine Atlas</strong>Research &amp; education use only</div></footer>",
      "</main><script>window.addEventListener('load',function(){if(navigator.webdriver)return;var ready=document.fonts?document.fonts.ready:Promise.resolve();ready.then(function(){setTimeout(function(){window.print()},350)})});<\/script></body></html>"
    ].join("");
  }

  function savePdfReport() {
    var data = buildReportData();
    if (!data) {
      window.alert("먼저 리포트 생성 버튼을 눌러 결과를 생성해 주세요.");
      return;
    }

    var printWindow = window.open("", "_blank", "width=920,height=1120");
    if (!printWindow) {
      window.alert("PDF 리포트 창을 열 수 없습니다. 브라우저의 팝업 차단을 해제한 뒤 다시 시도해 주세요.");
      return;
    }
    printWindow.document.open();
    printWindow.document.write(buildPdfReportHtml(data));
    printWindow.document.close();
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
    elements.editBtn.addEventListener("click", showInputScreen);
    elements.resetBtn.addEventListener("click", resetAll);
    elements.copyBtn.addEventListener("click", copyResult);
    elements.saveBtn.addEventListener("click", saveDetailedReport);
    elements.pdfBtn.addEventListener("click", savePdfReport);
    elements.sheetSaveBtn.addEventListener("click", saveToGoogleSheets);
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
    elements.reportDate.value = getKoreaDateString();
    elements.collectionDate.value = getKoreaDateString();
    updateReportMeta();
    renderEmpty();
    drawReferenceChart(null);
    setResultVisible(false);
    updateValidationMessage();
  }

  init();
}());
