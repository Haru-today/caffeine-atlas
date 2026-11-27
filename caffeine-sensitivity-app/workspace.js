(function () {
  "use strict";

  var storagePrefix = "caffeine-atlas:report:v1:";
  var categoryNames = ["저민감형", "중민감형", "고민감형", "판정 보류", "정보 부족형"];

  function readRecord(id) {
    var record;
    try {
      record = JSON.parse(window.localStorage.getItem(storagePrefix + id));
    } catch (error) {
      if (error instanceof SyntaxError) return null;
      throw error;
    }
    if (!record || record.id !== id || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
        !Array.isArray(record.genotypes) || record.genotypes.length !== 4 ||
        !record.genotypes.every(function (code) { return /^(?:[ACGT]{2}|unknown)$/.test(code); }) ||
        !Number.isFinite(record.savedAt)) return null;
    if (record.categoryVersion === 2) {
      record.category = ({ "잠꾸러기형": "저민감형", "잠잠형": "중민감형", "각성형": "고민감형" })[record.category] || record.category;
    } else if (record.categoryVersion == null) {
      record.category = ({ "각성형": "저민감형", "잠잠형": "중민감형", "잠꾸러기형": "고민감형" })[record.category] || record.category;
    }
    return record;
  }

  function readReports() {
    var reports = [];
    for (var index = 0; index < window.localStorage.length; index++) {
      var key = window.localStorage.key(index);
      if (!key || key.indexOf(storagePrefix) !== 0) continue;
      var report = readRecord(key.slice(storagePrefix.length));
      if (report) reports.push(report);
    }
    return reports.sort(function (a, b) { return b.savedAt - a.savedAt; });
  }

  function makeButton(label, action) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "tool-button";
    button.textContent = label;
    button.addEventListener("click", action);
    return button;
  }

  window.createAtlasWorkspace = function (actions) {
    var archive = document.getElementById("saved-reports");
    var archiveTitle = document.getElementById("atlas-archive-title");
    var list = document.getElementById("atlas-archive-list");
    var archiveStatus = document.getElementById("atlas-archive-status");
    var main = document.getElementById("report-form");
    var intro = document.querySelector(".analyzer-intro");
    var reportNav = document.querySelector(".atlas-report-nav");
    var reportLinks = Array.from(reportNav.querySelectorAll("a"));
    var reportSections = reportLinks.map(function (link) {
      return document.getElementById(link.hash.slice(1));
    });
    var reportNavFrame = 0;
    var activeReportTab = -1;
    var example = document.getElementById("atlas-example-banner");
    var savePanel = document.getElementById("atlas-archive-save");
    var saveButton = document.getElementById("atlas-save-local");
    var saveFeedback = document.getElementById("atlas-save-feedback");
    var links = document.querySelectorAll("[data-workspace-nav]");
    var activeReport = null;

    function setSaveStatus(saved, message) {
      saveButton.disabled = saved;
      saveButton.textContent = saved ? "보관 완료" : "이 브라우저에 보관";
      saveFeedback.textContent = message || "";
    }

    function reportLabel(report) {
      if (report.modelVersion !== 2) return "계산 방식 변경 · 다시 열어 확인";
      if (!Number.isFinite(report.score)) return "종합점수 보류";
      return (categoryNames.indexOf(report.category) >= 0 ? report.category + " · " : "") +
        report.score.toFixed(1) + "점";
    }

    function renderArchive(message) {
      list.replaceChildren();
      var reports;
      try {
        reports = readReports();
      } catch (error) {
        archiveStatus.textContent = "이 브라우저에서 보관 목록을 읽을 수 없습니다.";
        return;
      }
      archiveStatus.textContent = message || (reports.length ? "보관한 리포트 " + reports.length + "건" : "");
      if (!reports.length) {
        var empty = document.createElement("p");
        empty.className = "atlas-archive-empty";
        empty.textContent = "아직 보관한 리포트가 없어요. 분석 결과에서 ‘이 브라우저에 보관’을 선택하면 여기에 표시됩니다.";
        list.appendChild(empty);
      }
      reports.forEach(function (report) {
        var card = document.createElement("article");
        var text = document.createElement("div");
        var title = document.createElement("h2");
        var date = document.createElement("p");
        var buttons = document.createElement("div");
        card.className = "atlas-archive-card";
        buttons.className = "atlas-archive-actions";
        title.textContent = reportLabel(report);
        date.textContent = "보고일 " + report.date;
        text.append(title, date);

        var open = makeButton("결과 다시 열기", function () {
          if (!actions.restore(report)) {
            archiveStatus.textContent = "저장된 유전자형을 다시 분석할 수 없습니다.";
          }
        });
        open.classList.add("primary");
        var remove = makeButton("삭제", function () {
          if (!window.confirm("이 브라우저에서 이 리포트를 삭제할까요?")) return;
          try {
            window.localStorage.removeItem(storagePrefix + report.id);
            if (activeReport && activeReport.id === report.id) setSaveStatus(false, "");
            renderArchive("리포트를 삭제했습니다.");
            archiveTitle.focus({ preventScroll: true });
          } catch (error) {
            archiveStatus.textContent = "리포트를 삭제할 수 없습니다.";
          }
        });
        buttons.append(open, remove);
        card.append(text, buttons);
        list.appendChild(card);
      });
    }

    function selectReportTab(index) {
      if (activeReportTab === index) return;
      activeReportTab = index;
      reportLinks.forEach(function (link, position) {
        if (position === index) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }

    function synchronizeReportTab() {
      reportNavFrame = 0;
      if (!reportNav.getClientRects().length) return;
      var lastIndex = reportSections.length - 1;
      var atBottom = window.scrollY > 0 && Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1;
      if (atBottom && reportSections[lastIndex].getBoundingClientRect().top < window.innerHeight) {
        selectReportTab(lastIndex);
        return;
      }
      var readingLine = Math.max(0, reportNav.getBoundingClientRect().bottom) + 36;
      var current = 0;
      reportSections.forEach(function (section, index) {
        if (section.getBoundingClientRect().top <= readingLine) current = index;
      });
      selectReportTab(current);
    }

    function scheduleReportTab() {
      if (!reportNavFrame) reportNavFrame = window.requestAnimationFrame(synchronizeReportTab);
    }

    function updateNavigation() {
      var hash = window.location.hash;
      var isArchive = hash === "#saved-reports";
      var openingArchive = isArchive && archive.hidden;
      archive.hidden = !isArchive;
      main.hidden = isArchive;
      intro.hidden = isArchive;
      links.forEach(function (link) {
        if ((link.dataset.workspaceNav === "saved") === isArchive) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
      var reportSection = hash.endsWith("-snps") ? "#report-genotypes" : hash;
      var sectionIndex = reportLinks.findIndex(function (link) { return link.hash === reportSection; });
      if (sectionIndex !== -1) selectReportTab(sectionIndex);
      scheduleReportTab();
      if (openingArchive) {
        renderArchive();
        archive.scrollIntoView({ block: "start" });
        archiveTitle.focus({ preventScroll: true });
      }
    }

    saveButton.addEventListener("click", function () {
      if (!activeReport || activeReport.kind === "example") return;
      var id = activeReport.id || (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() :
        String(Date.now()) + "-" + Math.random().toString(36).slice(2));
      var record = {
        id: id,
        date: activeReport.date,
        genotypes: activeReport.genotypes,
        score: activeReport.score,
        category: activeReport.category,
        categoryVersion: 3,
        modelVersion: 2,
        savedAt: Date.now()
      };
      try {
        window.localStorage.setItem(storagePrefix + id, JSON.stringify(record));
        activeReport.id = id;
        setSaveStatus(true, "내 리포트에서 다시 열 수 있어요.");
      } catch (error) {
        setSaveStatus(false, "이 브라우저에서 보관할 수 없습니다. PDF 또는 HTML로 내려받을 수 있어요.");
      }
    });

    document.getElementById("atlas-start-personal").addEventListener("click", actions.startNew);
    links.forEach(function (link) {
      if (link.dataset.workspaceNav !== "analysis") return;
      link.addEventListener("click", function (event) {
        event.preventDefault();
        if (link.hasAttribute("data-new-report")) actions.startNew();
        else actions.showInput();
      });
    });
    window.addEventListener("hashchange", updateNavigation);
    window.addEventListener("scroll", scheduleReportTab, { passive: true });
    window.addEventListener("resize", scheduleReportTab);
    window.addEventListener("storage", function (event) {
      if (archive.hidden || (event.key && event.key.indexOf(storagePrefix) !== 0)) return;
      renderArchive();
    });
    updateNavigation();

    return {
      showResult: function (report) {
        activeReport = report;
        var isExample = report.kind === "example";
        example.hidden = !isExample;
        savePanel.hidden = isExample;
        scheduleReportTab();
        setSaveStatus(Boolean(report.id), report.id ? "내 리포트에서 다시 열 수 있어요." : "");
      }
    };
  };
})();
