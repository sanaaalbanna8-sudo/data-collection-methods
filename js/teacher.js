(function () {
  var KEY = "dm-teacher-key";
  var PASS = "sanaa21";
  var form = document.getElementById("lock-form");
  var keyInput = document.getElementById("teacher-key");
  var lockHint = document.getElementById("lock-hint");
  var setup = document.getElementById("setup");
  var board = document.getElementById("board");
  var rowsEl = document.getElementById("rows");
  var mistakesEl = document.getElementById("mistakes");
  var mistakeTitle = document.getElementById("mistake-title");
  var search = document.getElementById("search");
  var statusEl = document.getElementById("status");
  var sheetLink = document.getElementById("sheet-link");
  var cards = {
    students: document.getElementById("c-students"),
    score: document.getElementById("c-score"),
    clicks: document.getElementById("c-clicks"),
    done: document.getElementById("c-done")
  };
  var summary = [];
  var mistakes = [];
  var picked = "";
  var refreshTimer = 0;

  var cloud = window.DATA_METHODS_CLOUD || {};
  if (cloud.sheetId) {
    sheetLink.href = "https://docs.google.com/spreadsheets/d/" + cloud.sheetId + "/edit";
  }
  setup.hidden = !!String(cloud.sheetsUrl || "").trim();

  var saved = sessionStorage.getItem(KEY) || "";
  if (saved) load(saved);

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    load(keyInput.value.trim());
  });
  search.addEventListener("input", paint);
  rowsEl.addEventListener("click", function (e) {
    var tr = e.target.closest("tr");
    if (!tr) return;
    picked = tr.getAttribute("data-id") || "";
    paint();
  });

  function num(value) {
    var n = Number(value);
    return isFinite(n) ? n : 0;
  }

  function localPacks() {
    try {
      var all = JSON.parse(localStorage.getItem("dm-local-results") || "[]");
      return Array.isArray(all) ? all : [];
    } catch (err) {
      return [];
    }
  }

  function fromLocal() {
    var rows = [];
    var wrongs = [];
    localPacks().forEach(function (pack) {
      rows.push({
        "معرّف المحاولة": pack.sessionId || "",
        "الاسم": pack.name || "",
        "الشعبة": pack.klass || "",
        "الحالة": pack.status || "",
        "الدرجة": pack.score === "" || pack.score == null ? "" : pack.score,
        "النسبة": pack.percent === "" || pack.percent == null ? "" : pack.percent,
        "الخاطئة": pack.wrong === "" || pack.wrong == null ? "" : pack.wrong,
        "مدة الاختبار": pack.examText || "",
        "عدد النقرات": pack.clicks || 0,
        "تغييرات الإجابة": pack.answerChanges || 0,
        "وقت قراءة الشرح": pack.studyText || "",
        "آخر ظهور": pack.lastSeen || ""
      });
      (pack.answers || []).forEach(function (row) {
        if (row.ok === "صحيحة") return;
        wrongs.push({
          "معرّف المحاولة": pack.sessionId || "",
          "الاسم": pack.name || "",
          "رقم السؤال": row.n,
          "نص السؤال": row.text || "",
          "إجابة الطالب": row.chosen || "بدون إجابة",
          "الإجابة الصحيحة": row.correct || "",
          "سبب التصنيف": row.why || ""
        });
      });
    });
    return { summary: rows, mistakes: wrongs };
  }

  function load(key) {
    if (key !== PASS) {
      lockHint.textContent = "المفتاح غير صحيح.";
      return;
    }
    sessionStorage.setItem(KEY, key);
    form.hidden = true;
    board.hidden = false;
    var base = String(cloud.sheetsUrl || "").trim();
    if (!base) {
      var local = fromLocal();
      summary = local.summary;
      mistakes = local.mistakes;
      paint();
      statusEl.textContent = "عرض محلي من هذا المتصفح";
      return;
    }
    var cb = "dmBoard_" + Date.now();
    window[cb] = function (data) {
      delete window[cb];
      if (!data || !data.ok) {
        form.hidden = false;
        board.hidden = true;
        lockHint.textContent = data && data.error ? data.error : "تعذّر قراءة الجدول";
        return;
      }
      summary = data.summary || [];
      mistakes = data.mistakes || [];
      paint();
    };
    var script = document.createElement("script");
    var join = base.indexOf("?") === -1 ? "?" : "&";
    script.src = base + join + "view=board&key=" + encodeURIComponent(key) + "&callback=" + cb;
    script.onerror = function () {
      delete window[cb];
      form.hidden = false;
      board.hidden = true;
      lockHint.textContent = "تعذّر الاتصال. تأكد من رابط /exec.";
    };
    document.body.appendChild(script);
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(function () {
      if (sessionStorage.getItem(KEY)) load(sessionStorage.getItem(KEY));
    }, 20000);
  }

  function paint() {
    var q = search.value.trim();
    var list = summary.filter(function (row) {
      if (!q) return true;
      return String(row["الاسم"] || "").indexOf(q) !== -1 || String(row["الشعبة"] || "").indexOf(q) !== -1;
    });
    var done = 0;
    var score = 0;
    var scored = 0;
    var clicks = 0;
    summary.forEach(function (row) {
      clicks += num(row["عدد النقرات"]);
      if (String(row["الحالة"] || "") === "أنهى") {
        done += 1;
        score += num(row["الدرجة"]);
        scored += 1;
      }
    });
    cards.students.textContent = String(summary.length);
    cards.score.textContent = scored ? String(Math.round(score / scored)) : "0";
    cards.clicks.textContent = summary.length ? String(Math.round(clicks / summary.length)) : "0";
    cards.done.textContent = String(done);
    var cols = ["الاسم", "الشعبة", "الحالة", "الدرجة", "النسبة", "الخاطئة", "مدة الاختبار", "عدد النقرات", "تغييرات الإجابة", "وقت قراءة الشرح", "آخر ظهور"];
    rowsEl.innerHTML = "";
    list.forEach(function (row) {
      var tr = document.createElement("tr");
      var id = String(row["معرّف المحاولة"] || "");
      tr.setAttribute("data-id", id);
      if (id && id === picked) tr.className = "is-pick";
      cols.forEach(function (key) {
        var td = document.createElement("td");
        td.textContent = row[key] == null ? "" : String(row[key]);
        tr.appendChild(td);
      });
      rowsEl.appendChild(tr);
    });
    var selected = mistakes.filter(function (row) {
      if (!picked) return true;
      return String(row["معرّف المحاولة"] || "") === picked;
    });
    if (q) {
      selected = selected.filter(function (row) {
        return String(row["الاسم"] || "").indexOf(q) !== -1;
      });
    }
    mistakeTitle.textContent = picked ? "أخطاء المحاولة المحددة" : "كل الأخطاء";
    var mcols = ["الاسم", "رقم السؤال", "نص السؤال", "إجابة الطالب", "الإجابة الصحيحة", "سبب التصنيف"];
    mistakesEl.innerHTML = "";
    selected.forEach(function (row) {
      var tr = document.createElement("tr");
      mcols.forEach(function (key) {
        var td = document.createElement("td");
        td.textContent = row[key] == null ? "" : String(row[key]);
        if (key === "إجابة الطالب") td.className = "bad";
        tr.appendChild(td);
      });
      mistakesEl.appendChild(tr);
    });
    statusEl.textContent = "آخر تحديث: " + new Date().toLocaleTimeString("ar") + " · " + summary.length + " محاولة";
  }
})();
