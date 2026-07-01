(function () {
  "use strict";

  var genes = [
    {
      id: "rs762551",
      name: "CYP1A2*1F",
      rsid: "rs762551",
      layer: "metabolism",
      layerLabel: "대사",
      allele: "A",
      description: "CYP1A2 유도성과 관련된 핵심 변이입니다. A allele은 빠른 대사형, C allele은 느린 대사형 방향으로 해석합니다.",
      evidence: "A allele 빠른 대사",
      source: "기능 연구",
      evidenceGrade: "High",
      weightText: "대사 82%",
      genotypes: [
        { code: "CC", alleleCount: 0, evidenceScore: 1, label: "저속" },
        { code: "AC", alleleCount: 1, evidenceScore: 0.5, label: "중간" },
        { code: "AA", alleleCount: 2, evidenceScore: 0, label: "고속" },
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
      description: "CYP1A2 기능 보조 변수입니다. A allele이 많을수록 빠른 카페인 분해 방향으로 반영합니다.",
      evidence: "A allele 빠른 대사",
      source: "기능 연구",
      evidenceGrade: "Supportive",
      weightText: "대사 18%",
      genotypes: [
        { code: "GG", alleleCount: 0, evidenceScore: 1, label: "A 0개" },
        { code: "AG", alleleCount: 1, evidenceScore: 0.5, label: "A 1개" },
        { code: "AA", alleleCount: 2, evidenceScore: 0, label: "A 2개" },
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

  var selections = {};
  var lastResult = null;
  var hasSubmitted = false;

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
    dataSaveBtn: document.getElementById("dataSaveBtn"),
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

  function classify(score) {
    if (score < 33.34) {
      return {
        label: "각성형",
        badge: "빠른 대사형",
        emoji: "⚡",
        desc: "카페인을 빠르게 분해해요. 커피를 마셔도 비교적 빨리 처리되는 타입입니다.",
        title: "빠른 대사 가능성이 높은 유전형 조합",
        text: "입력된 유전자형 조합은 카페인 잔류 가능성이 낮은 범위에 위치합니다. CYP1A2 대사 레이어가 빠른 분해 방향으로 해석되며, 일반적인 섭취량에서 카페인이 비교적 빠르게 처리될 가능성이 있습니다.",
        recommendations: [
          "총 카페인 섭취량은 성인 기준 400mg/day 이하 범위에서 관리",
          "오후 섭취 허용 여부는 실제 수면 반응을 기준으로 조정",
          "운동 전 카페인 사용 시 심박, 불안감, 위장 반응 모니터링",
          "두근거림이나 불면이 반복되면 즉시 감량"
        ]
      };
    }
    if (score < 66.67) {
      return {
        label: "잠잠형",
        badge: "평균 대사형",
        emoji: "🌿",
        desc: "카페인 대사가 평균 범위예요. 적당히 즐기면 균형이 좋은 타입입니다.",
        title: "평균 범위의 카페인 반응 가능성",
        text: "입력된 유전자형 조합은 중간 수준의 카페인 민감도 범위에 위치합니다. 유전적 신호만으로는 극단적인 빠른 대사 또는 느린 대사로 분류하기 어렵고, 생활습관 요인을 함께 반영하는 것이 적절합니다.",
        recommendations: [
          "하루 200-300mg 범위에서 개인 반응 확인",
          "오후 3시 이후 섭취는 수면 질에 따라 제한",
          "취침 6시간 전 이후 카페인 섭취 회피",
          "수면 부족, 스트레스, 약물 복용 시 디카페인 전환 고려"
        ]
      };
    }
    return {
      label: "잠꾸러기형",
      badge: "느린 대사형",
      emoji: "🌙",
      desc: "카페인이 오래 남아요. 커피 한 잔에도 각성 상태가 길게 유지될 수 있습니다.",
      title: "느린 대사 가능성이 높은 유전형 조합",
      text: "입력된 유전자형 조합은 카페인 잔류 가능성이 높은 범위에 위치합니다. CYP1A2 기능 또는 조절 레이어에서 민감도 증가 방향의 신호가 관찰되며, 소량 섭취에서도 각성 지속, 불안감, 수면 방해가 나타날 수 있습니다.",
      recommendations: [
        "하루 100mg 이하부터 보수적으로 반응 확인",
        "가능하면 오전 중 섭취로 제한",
        "디카페인 커피, 허브티, 물로 대체",
        "초콜릿, 에너지드링크, 녹차 등 숨은 카페인 확인",
        "불면, 빈맥, 불안 증상이 반복되면 전문가 상담 권장"
      ]
    };
  }

  function getMetabolismSubtype(metabolismNorm) {
    if (metabolismNorm === null || typeof metabolismNorm !== "number") {
      return {
        name: "입력 없음",
        desc: "대사 레이어 SNP가 입력되지 않아 고속/중간/저속 대사자 판정을 표시할 수 없습니다."
      };
    }

    var score = clamp(metabolismNorm * 100, 0, 100);
    if (score <= 33.33) {
      return {
        name: "고속 대사자",
        desc: "CYP1A2 대사 레이어가 빠른 카페인 분해 방향으로 해석됩니다. 예전 리포트의 각성형 축에 가까운 대사 패턴입니다."
      };
    }
    if (score <= 66.67) {
      return {
        name: "중간 대사자",
        desc: "CYP1A2 대사 레이어가 중간 범위에 있습니다. 유전적 대사 속도만으로는 빠름 또는 느림으로 강하게 치우치지 않습니다."
      };
    }
    return {
      name: "저속 대사자",
      desc: "CYP1A2 대사 레이어가 느린 카페인 분해 방향으로 해석됩니다. 카페인이 오래 남을 가능성을 보수적으로 고려해야 합니다."
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
      institution: elements.institution.value.trim() || "미기재"
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
      "<span>Institution: " + info.institution + "</span>"
    ].join("");
  }

  function setResultVisible(visible) {
    elements.resultReport.hidden = !visible;
    elements.inputScreen.hidden = visible;
    elements.resultContent.hidden = !visible;
    elements.resultPlaceholder.hidden = visible;
    if (!visible) {
      elements.coverageText.textContent = "검사하기 버튼을 누르면 결과가 생성됩니다.";
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
      elements.validationText.textContent = "입력 진행률 " + selectedCount + "/4 SNP. Sample ID와 모든 유전자형을 입력한 뒤 검사하기를 눌러주세요.";
    }
    elements.validationText.classList.toggle("error", Boolean(isError));
  }

  function validateSubmission() {
    var errors = [];
    var missingGenes = getMissingGenes();
    var unknownGenes = getUnknownGenes();

    if (!elements.sampleId.value.trim()) {
      errors.push("Sample ID를 입력해 주세요.");
    }
    if (!elements.reportDate.value) {
      errors.push("Report date를 입력해 주세요.");
    }
    if (missingGenes.length > 0) {
      errors.push("미입력 SNP: " + missingGenes.map(function (gene) {
        return gene.name + " " + gene.rsid;
      }).join(", "));
    }
    if (unknownGenes.length > 0) {
      errors.push("'모름'으로 선택된 SNP는 계산에 사용할 수 없습니다: " + unknownGenes.map(function (gene) {
        return gene.name;
      }).join(", "));
    }

    return errors;
  }

  function markInputChanged() {
    hasSubmitted = false;
    lastResult = null;
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
    updateValidationMessage("검사가 완료되었습니다. 결과 리포트 화면으로 이동합니다.", false);
    render();
    setResultVisible(true);
    window.location.hash = "resultReport";
    elements.resultReport.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    var valid = getValidSelections();
    updateReportMeta();

    if (!hasSubmitted || valid.length === 0) {
      lastResult = null;
      renderEmpty();
      drawReferenceChart(null);
      return;
    }

    var result = computeEvidenceModel(valid);
    var score = clamp(result.finalNorm * 100, 0, 100);
    var percentile = calculatePercentile(score);
    var coverage = valid.length / genes.length;
    var confidence = Math.round(coverage * 100);
    var category = classify(score);
    var metabolismSubtype = getMetabolismSubtype(result.metabolismNorm);

    lastResult = {
      score: score,
      percentile: percentile.percentile,
      confidence: confidence,
      category: category,
      metabolismSubtype: metabolismSubtype,
      valid: valid,
      metabolismNorm: result.metabolismNorm,
      behaviorNorm: result.behaviorNorm
    };

    elements.scoreValue.textContent = score.toFixed(1);
    elements.scoreLabel.textContent = category.label;
    elements.typeEmoji.textContent = category.emoji;
    elements.typeBadge.textContent = category.badge;
    elements.typeName.textContent = category.label;
    elements.typeDesc.textContent = category.desc;
    elements.coverageText.textContent = "분석 완성도 " + confidence + "% (" + valid.length + "/4 유전자 입력)";
    elements.gaugeFill.style.width = score.toFixed(2) + "%";
    elements.gaugeMarker.style.left = score.toFixed(2) + "%";

    setLayer("metabolism", result.metabolismNorm);
    setLayer("behavior", result.behaviorNorm);
    elements.confidenceScore.textContent = confidence + "%";
    elements.confidenceBar.style.width = confidence + "%";

    elements.percentileText.textContent = "참조분포 백분위 " + percentile.percentile.toFixed(1) + "%";
    elements.detailCategory.textContent = category.label;
    elements.detailPercentile.textContent = percentile.percentile.toFixed(1) + " percentile";
    elements.detailInputQuality.textContent = confidence + "% / 4 SNP 입력 완료";
    elements.metabolismTypeName.textContent = metabolismSubtype.name;
    elements.metabolismTypeDesc.textContent = metabolismSubtype.desc;
    elements.interpretationTitle.textContent = category.title;
    elements.interpretationText.textContent = category.text;
    elements.recommendList.innerHTML = category.recommendations.map(function (item) {
      return "<li>" + item + "</li>";
    }).join("");

    renderSummary();
    drawReferenceChart(score);
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
    elements.metabolismScore.textContent = "--";
    elements.behaviorScore.textContent = "--";
    elements.confidenceScore.textContent = "--";
    elements.metabolismBar.style.width = "0%";
    elements.behaviorBar.style.width = "0%";
    elements.confidenceBar.style.width = "0%";
    elements.percentileText.textContent = "--";
    elements.typeEmoji.textContent = "--";
    elements.typeBadge.textContent = "대기 중";
    elements.typeName.textContent = "검사 결과 대기";
    elements.typeDesc.textContent = "검사 정보와 유전자형을 입력하면 개인 유형이 표시됩니다.";
    elements.detailCategory.textContent = "--";
    elements.detailPercentile.textContent = "--";
    elements.detailInputQuality.textContent = "--";
    elements.metabolismTypeName.textContent = "--";
    elements.metabolismTypeDesc.textContent = "대사 레이어 계산 후 고속/중간/저속 대사자 판정이 표시됩니다.";
    elements.interpretationTitle.textContent = "유전자형을 선택해 주세요";
    elements.interpretationText.textContent = "검사 정보와 4개 SNP 유전자형을 입력한 뒤 검사하기 버튼을 누르면 결과가 생성됩니다.";
    elements.recommendList.innerHTML = "<li>검사 완료 후 개인화 문구가 표시됩니다.</li>";
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
    var width = canvas.width;
    var height = canvas.height;
    var padLeft = 58;
    var padRight = 28;
    var padTop = 26;
    var padBottom = 52;
    var chartW = width - padLeft - padRight;
    var chartH = height - padTop - padBottom;
    var maxLevel = referenceBins.reduce(function (max, bin) {
      return Math.max(max, bin.level);
    }, 1);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "#e2e9f0";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#657487";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "right";
    for (var i = 0; i <= 4; i += 1) {
      var y = padTop + chartH - (i / 4) * chartH;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(width - padRight, y);
      ctx.stroke();
    }

    var barGap = 10;
    var barW = (chartW - barGap * (referenceBins.length - 1)) / referenceBins.length;
    referenceBins.forEach(function (bin, index) {
      var x = padLeft + index * (barW + barGap);
      var h = Math.max(2, (bin.level / maxLevel) * chartH);
      var y = padTop + chartH - h;
      ctx.fillStyle = "#087f8c";
      ctx.fillRect(x, y, barW, h);
      ctx.fillStyle = "#045c66";
      ctx.fillRect(x, y, barW, 4);
      ctx.fillStyle = "#657487";
      ctx.textAlign = "center";
      ctx.font = "12px sans-serif";
      ctx.fillText(Math.round(normalizeReference(bin.raw)), x + barW / 2, height - 24);
    });

    ctx.fillStyle = "#334155";
    ctx.textAlign = "center";
    ctx.font = "bold 13px sans-serif";
    ctx.fillText("민감도 점수 환산값", padLeft + chartW / 2, height - 7);

    ctx.save();
    ctx.translate(16, padTop + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("참조분포", 0, 0);
    ctx.restore();

    if (typeof userScore === "number") {
      var markerX = padLeft + clamp(userScore, 0, 100) / 100 * chartW;
      ctx.strokeStyle = "#d95d39";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(markerX, padTop - 2);
      ctx.lineTo(markerX, padTop + chartH + 4);
      ctx.stroke();

      var label = "나 " + userScore.toFixed(1);
      ctx.font = "bold 13px sans-serif";
      var labelW = ctx.measureText(label).width + 18;
      var labelX = clamp(markerX - labelW / 2, padLeft, width - padRight - labelW);
      ctx.fillStyle = "#d95d39";
      ctx.fillRect(labelX, 4, labelW, 22);
      ctx.fillStyle = "#fff";
      ctx.textAlign = "center";
      ctx.fillText(label, labelX + labelW / 2, 19);
    }
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
      "카페인 민감도 유전자 분석 리포트",
      "Sample ID: " + reportInfo.sampleId,
      "Report date: " + reportInfo.reportDate,
      "Collection date: " + reportInfo.collectionDate,
      "Specimen: " + reportInfo.sampleType,
      "Sex: " + reportInfo.sex,
      "Institution: " + reportInfo.institution,
      "",
      "점수: " + lastResult.score.toFixed(1) + "점",
      "유형: " + lastResult.category.label,
      "대사 레이어 판정: " + lastResult.metabolismSubtype.name,
      "참조분포 위치: " + lastResult.percentile.toFixed(1) + "%",
      layerText.join("\n"),
      "",
      "[유전자형]",
      genotypeText.join("\n"),
      "",
      "[해석]",
      lastResult.category.title,
      lastResult.category.text
    ];
    lines.push("", "[권고]", lastResult.category.recommendations.map(function (item) {
      return "- " + item;
    }).join("\n"));
    lines.push("", "[주의]", "연구·교육용 보조 지표이며 질병 진단, 의학적 처방, 치료 판단을 대체하지 않습니다.");
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
      reportTitle: "카페인 민감도 유전자 분석 리포트",
      generatedAt: new Date().toISOString(),
      reportInfo: reportInfo,
      result: {
        score: Number(lastResult.score.toFixed(1)),
        category: lastResult.category.label,
        title: lastResult.category.title,
        badge: lastResult.category.badge,
        emoji: lastResult.category.emoji,
        typeDescription: lastResult.category.desc,
        interpretation: lastResult.category.text,
        percentile: Number(lastResult.percentile.toFixed(1)),
        confidence: lastResult.confidence,
        metabolismScore: lastResult.metabolismNorm === null ? null : Number((lastResult.metabolismNorm * 100).toFixed(1)),
        regulationScore: lastResult.behaviorNorm === null ? null : Number((lastResult.behaviorNorm * 100).toFixed(1)),
        metabolismSubtype: lastResult.metabolismSubtype
      },
      genotypes: getGenotypeRecords(),
      recommendations: lastResult.category.recommendations,
      limitations: [
        "본 결과는 연구·교육용 보조 지표이며 질병 진단, 의학적 처방, 치료 판단을 대체하지 않습니다.",
        "실제 카페인 반응은 수면, 약물, 간 기능, 임신, 흡연, 스트레스, 섭취량과 섭취 시간의 영향을 받을 수 있습니다."
      ]
    };
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

  function buildDetailedReportHtml(data) {
    var chartImage = elements.chart.toDataURL("image/png");
    var genotypeRows = data.genotypes.map(function (item) {
      return [
        "<tr>",
        "<td>", escapeHtml(item.name), "<br><small>", escapeHtml(item.rsid), "</small></td>",
        "<td>", escapeHtml(item.genotype), "</td>",
        "<td>", escapeHtml(item.layer), "</td>",
        "<td>", escapeHtml(item.effectAllele), " / ", escapeHtml(item.effectAlleleCount === null ? "-" : item.effectAlleleCount), "</td>",
        "<td>", escapeHtml(item.evidenceScore), "</td>",
        "<td>", escapeHtml(item.source), "<br><small>", escapeHtml(item.evidenceGrade), " · ", escapeHtml(item.weight), "</small></td>",
        "</tr>"
      ].join("");
    }).join("");
    var recommendations = data.recommendations.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
    var limitations = data.limitations.map(function (item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");

    return [
      "<!doctype html><html lang=\"ko\"><head><meta charset=\"utf-8\"><title>",
      escapeHtml(data.reportTitle),
      "</title><style>",
      "body{margin:0;background:#eef3f6;color:#172033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans KR',Arial,sans-serif;line-height:1.55}",
      ".page{max-width:1040px;margin:0 auto;padding:34px 24px}.paper{background:#fff;border:1px solid #dbe3ec;border-radius:10px;padding:30px;box-shadow:0 18px 46px rgba(21,32,43,.12)}",
      "h1{margin:0 0 8px;font-size:32px}h2{margin:26px 0 10px;font-size:20px}.meta,.score-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.type-head{display:grid;grid-template-columns:1fr 220px;gap:18px;align-items:center;margin:24px 0;padding:18px;border:1px solid #d7e5e8;border-radius:10px;background:#f7fcfd}.type-head b{font-size:34px}.box{border:1px solid #dbe3ec;border-radius:8px;padding:12px;background:#f8fafb}.box span{display:block;color:#66758a;font-size:12px;font-weight:800}.box strong{display:block;margin-top:5px;font-size:15px}.score{font-size:64px;color:#006d77;font-weight:950;line-height:1}.label{color:#c44d38;font-weight:900}.chart{width:100%;border:1px solid #e2e9f0;border-radius:8px;margin-top:8px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #dbe3ec;padding:10px;text-align:left;vertical-align:top}th{background:#f1f6f7;color:#263347}small{color:#66758a}.note{background:#fff7ed;border:1px solid #f2d6ac;border-radius:8px;padding:14px}.footer{margin-top:28px;color:#66758a;font-size:12px}",
      "</style></head><body><main class=\"page\"><article class=\"paper\">",
      "<h1>", escapeHtml(data.reportTitle), "</h1>",
      "<p>Generated at ", escapeHtml(data.generatedAt), "</p>",
      "<section class=\"meta\">",
      metaBox("Sample ID", data.reportInfo.sampleId),
      metaBox("Report date", data.reportInfo.reportDate),
      metaBox("Collection date", data.reportInfo.collectionDate),
      metaBox("Specimen", data.reportInfo.sampleType),
      metaBox("Sex", data.reportInfo.sex),
      metaBox("Institution", data.reportInfo.institution),
      "</section>",
      "<section class=\"type-head\"><div><b>", escapeHtml(data.result.emoji), " ", escapeHtml(data.result.category), "</b><p class=\"label\">", escapeHtml(data.result.badge), "</p><p>", escapeHtml(data.result.typeDescription), "</p></div>",
      "<div class=\"box\"><span>민감도 지수</span><strong class=\"score\">", escapeHtml(data.result.score), "</strong></div></section>",
      "<h2>결과 요약</h2><section class=\"score-grid\">",
      metaBox("결과 유형", data.result.category),
      metaBox("대사 레이어 판정", data.result.metabolismSubtype.name),
      metaBox("참조분포 위치", data.result.percentile + " percentile"),
      metaBox("입력 완성도", data.result.confidence + "%"),
      metaBox("대사 레이어", data.result.metabolismScore === null ? "입력 없음" : data.result.metabolismScore + "점"),
      metaBox("조절 레이어", data.result.regulationScore === null ? "입력 없음" : data.result.regulationScore + "점"),
      "</section>",
      "<h2>결과 해석</h2><p class=\"label\">", escapeHtml(data.result.title), "</p><p>", escapeHtml(data.result.interpretation), "</p>",
      "<h2>참조분포</h2><img class=\"chart\" src=\"", chartImage, "\" alt=\"참조분포 그래프\">",
      "<h2>유전자형 상세</h2><table><thead><tr><th>유전자</th><th>유전자형</th><th>레이어</th><th>효과대립유전자</th><th>반영점수</th><th>근거</th></tr></thead><tbody>",
      genotypeRows,
      "</tbody></table>",
      "<h2>개인화 권고</h2><ul>", recommendations, "</ul>",
      "<h2>한계 및 주의</h2><ul>", limitations, "</ul>",
      "<p class=\"footer\">Caffeine Atlas research-use report prototype. Not for diagnosis or medical prescription.</p>",
      "</article></main></body></html>"
    ].join("");
  }

  function metaBox(label, value) {
    return "<div class=\"box\"><span>" + escapeHtml(label) + "</span><strong>" + escapeHtml(value) + "</strong></div>";
  }

  function saveDetailedReport() {
    var data = buildReportData();
    if (!data) {
      window.alert("먼저 검사하기 버튼을 눌러 결과를 생성해 주세요.");
      return;
    }

    var filename = "caffeine-sensitivity-" + safeFilePart(data.reportInfo.sampleId) + "-" + safeFilePart(data.reportInfo.reportDate) + ".html";
    downloadTextFile(filename, buildDetailedReportHtml(data), "text/html;charset=utf-8");
  }

  function saveResultData() {
    var data = buildReportData();
    if (!data) {
      window.alert("먼저 검사하기 버튼을 눌러 결과를 생성해 주세요.");
      return;
    }

    var filename = "caffeine-sensitivity-data-" + safeFilePart(data.reportInfo.sampleId) + ".json";
    downloadTextFile(filename, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
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
    elements.dataSaveBtn.addEventListener("click", saveResultData);
  }

  function init() {
    createGeneCards();
    bindEvents();
    elements.reportDate.valueAsDate = new Date();
    elements.collectionDate.valueAsDate = new Date();
    updateReportMeta();
    renderEmpty();
    drawReferenceChart(null);
    setResultVisible(false);
    updateValidationMessage();
  }

  init();
}());
