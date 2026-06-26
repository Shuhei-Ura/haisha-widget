// ===== シフトのAPI名（確定）=====
var MODULE = "Shifts";
var F = {
  name:   "Name",        // シフト名
  start:  "Start_Time",  // 開始日時
  end:    "End_Time",    // 終了日時
  driver: "Driver"       // ドライバー（lookup: .name / .id）
};
// ================================

function render(html) {
  document.getElementById("output").innerHTML = html;
}

function fmt(dt) {
  // "2026-06-07T09:00:00+09:00" → "06/07 09:00"
  if (!dt) return "";
  var d = new Date(dt);
  var p = function (n) { return ("0" + n).slice(-2); };
  return p(d.getMonth() + 1) + "/" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes());
}

ZOHO.embeddedApp.on("PageLoad", function (data) {
  render("データ取得中…");

  ZOHO.CRM.API.getAllRecords({ Entity: MODULE, sort_order: "asc", per_page: 100, page: 1 })
    .then(function (resp) {
      var recs = (resp && resp.data) ? resp.data : [];
      if (recs.length === 0) {
        render("「" + MODULE + "」取得OK、ただしレコード0件。");
        return;
      }
      var html = "<p><b>取得件数:</b> " + recs.length + "</p>";
      html += "<table border='1' cellpadding='6' style='border-collapse:collapse;font-size:13px'>";
      html += "<tr><th>シフト名</th><th>ドライバー</th><th>開始</th><th>終了</th></tr>";
      recs.forEach(function (r) {
        var driver = (r[F.driver] && r[F.driver].name) ? r[F.driver].name : "";
        html += "<tr>" +
          "<td>" + (r[F.name] || "") + "</td>" +
          "<td>" + driver + "</td>" +
          "<td>" + fmt(r[F.start]) + "</td>" +
          "<td>" + fmt(r[F.end]) + "</td>" +
          "</tr>";
      });
      html += "</table>";
      render(html);
    })
    .catch(function (err) {
      render("<pre style='color:#b00'>エラー:\n" + JSON.stringify(err, null, 2) + "</pre>");
    });
});

ZOHO.embeddedApp.init();
