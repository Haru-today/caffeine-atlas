(function () {
  "use strict";

  var scriptUrl = document.currentScript.src;

  function loadLibrary(name, filename, version) {
    if (window[name]) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = new URL("./vendor/" + filename + "?v=" + version, scriptUrl).href;
      script.onload = function () {
        if (window[name]) resolve();
        else reject(new Error("PDF export library did not initialize: " + name));
      };
      script.onerror = function () { reject(new Error("Could not load PDF export library: " + name)); };
      document.head.appendChild(script);
    });
  }

  function loadReport(frame, html) {
    return new Promise(function (resolve) {
      frame.onload = function () { resolve(frame.contentDocument); };
      frame.srcdoc = html;
      if (!frame.isConnected) document.body.appendChild(frame);
    });
  }

  async function renderPdf(frame, html, title) {
    var report = await loadReport(frame, html);
    if (report.fonts) await report.fonts.ready;
    if (Array.prototype.some.call(report.images, function (image) { return !image.naturalWidth; })) {
      throw new Error("A PDF report image could not be loaded");
    }
    var canvas = await window.html2canvas(report.querySelector(".pdf-sheet"), {
      scale: 2,
      backgroundColor: "#fff",
      logging: false
    });
    try {
      var jpeg = await new Promise(function (resolve, reject) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error("Could not encode the PDF report image"));
        }, "image/jpeg", 0.94);
      });
      var pdf = await window.PDFLib.PDFDocument.create();
      pdf.setTitle(title);
      var image = await pdf.embedJpg(await jpeg.arrayBuffer());
      var page = pdf.addPage(window.PDFLib.PageSizes.A4);
      var size = image.scaleToFit(page.getWidth(), page.getHeight());
      page.drawImage(image, {
        x: (page.getWidth() - size.width) / 2,
        y: (page.getHeight() - size.height) / 2,
        width: size.width,
        height: size.height
      });
      return await pdf.save();
    } finally {
      canvas.width = canvas.height = 0;
    }
  }

  window.buildBatchPdfZip = async function (files, reportHtml, onProgress) {
    await Promise.all([
      loadLibrary("html2canvas", "html2canvas.min.js", "1.4.1"),
      loadLibrary("PDFLib", "pdf-lib.min.js", "1.17.1"),
      loadLibrary("JSZip", "jszip.min.js", "3.10.1")
    ]);

    var frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.cssText = "position:fixed;left:-220mm;top:0;width:210mm;height:297mm;border:0;pointer-events:none";
    var zip = new window.JSZip();

    try {
      for (var index = 0; index < files.length; index++) {
        var file = files[index];
        var pdf = await renderPdf(frame, reportHtml(file.report), file.title);
        zip.file(file.filename, pdf);
        onProgress(index + 1);
      }
    } finally {
      frame.remove();
    }
    // The PDF images are already JPEG-compressed.
    return zip.generateAsync({ type: "blob", compression: "STORE" });
  };
})();
