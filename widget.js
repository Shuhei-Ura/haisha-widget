// ===== シフトのAPI名（確定）=====
var MODULE = "Shifts";
var F = {
  name:   "Name",
  start:  "Start_Time",
  end:    "End_Time",
  driver: "Driver"
};
// 時間軸の範囲（時）
var HOUR_START = 0;
var HOUR_END   = 24;
// ================================

function render(html) { document.getElementById("output").innerHTML = html; }

// 日時文字列 → その日の「0時からの経過時間（時, 小数）」
function hoursOfDay(dt) {
  var d = new Date(dt);
  return d.getHours() + d.getMinutes() / 60;
}
function fmtHM(dt) {
  var d = new Date(dt);
  var p = function (n) { return ("0" + n).slice(-2); };
  return p(d.getHours()) + ":" + p(d.getMinutes());
}

ZOHO.embeddedApp.on("PageLoad", function (data) {
  render("読み込み中…");

  ZOHO.CRM.API.getAllRecords({ Entity: MODULE, sort_order: "asc", per_page: 100, page: 1 })
    .then(function (resp) {
      var recs = (resp && resp.data) ? resp.data : [];
      if (recs.length === 0) { render("シフトが0件です。"); return; }

      // ドライバーごとに行をまとめる
      var rows = {};       // driverName -> [shift, ...]
      var order = [];      // 表示順
      recs.forEach(function (r) {
        var name = (r[F.driver] && r[F.driver].name) ? r[F.driver].name : "(未割当)";
        if (!rows[name]) { rows[name] = []; order.push(name); }
        rows[name].push(r);
      });

      var span = HOUR_END - HOUR_START; // 24
      var html = "";
      html += '<div style="font-family:-apple-system,sans-serif">';

      // --- 時間目盛り（ヘッダー）---
      html += '<div style="display:flex;align-items:flex-end;margin-bottom:4px">';
      html += '<div style="width:120px;flex:none"></div>';
      html += '<div style="position:relative;flex:1;height:20px;border-bottom:1px solid #ccc">';
      for (var h = HOUR_START; h <= HOUR_END; h += 2) {
        var left = ((h - HOUR_START) / span) * 100;
        html += '<span style="position:absolute;left:' + left + '%;transform:translateX(-50%);font-size:11px;color:#666">' + h + '</span>';
      }
      html += '</div></div>';

      // --- 各ドライバー行 ---
      order.forEach(function (name) {
        html += '<div style="display:flex;align-items:center;margin-bottom:6px">';
        // ラベル
        html += '<div style="width:120px;flex:none;font-size:13px;font-weight:bold">' + name + '</div>';
        // レーン
        html += '<div style="position:relative;flex:1;height:30px;background:#f5f5f5;border-radius:4px">';
        // 2時間ごとの薄い縦線
        for (var g = HOUR_START; g <= HOUR_END; g += 2) {
          var gl = ((g - HOUR_START) / span) * 100;
          html += '<div style="position:absolute;left:' + gl + '%;top:0;bottom:0;width:1px;background:#e0e0e0"></div>';
        }
        // バー
        rows[name].forEach(function (s) {
          var st = hoursOfDay(s[F.start]);
          var en = hoursOfDay(s[F.end]);
          if (en <= st) en = HOUR_END; // 日跨ぎ等の保険
          var left = ((st - HOUR_START) / span) * 100;
          var width = ((en - st) / span) * 100;
          var label = fmtHM(s[F.start]) + "–" + fmtHM(s[F.end]);
          html += '<div title="' + (s[F.name] || "") + ' (' + label + ')" ' +
            'style="position:absolute;left:' + left + '%;width:' + width + '%;top:4px;bottom:4px;' +
            'background:#1f4e79;color:#fff;border-radius:4px;font-size:11px;' +
            'display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;padding:0 4px">' +
            label + '</div>';
        });
        html += '</div></div>';
      });

      html += '</div>';
      render(html);
    })
    .catch(function (err) {
      render('<pre style="color:#b00">エラー:\n' + JSON.stringify(err, null, 2) + '</pre>');
    });
});

ZOHO.embeddedApp.init();
