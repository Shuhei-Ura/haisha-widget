// ===== シフトのAPI名（確定）=====
var MODULE = "Shifts";
var F = { name:"Name", start:"Start_Time", end:"End_Time", driver:"Driver" };
var HOUR_START = 0, HOUR_END = 24;
// ================================

var allShifts = [];          // 取得した全シフト
var current = new Date();    // 表示中の日付
current.setHours(0,0,0,0);

function pad(n){ return ("0"+n).slice(-2); }
function ymd(d){ return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate()); }
function fmtHM(dt){ var d=new Date(dt); return pad(d.getHours())+":"+pad(d.getMinutes()); }
function hoursOfDay(dt){ var d=new Date(dt); return d.getHours()+d.getMinutes()/60; }
// その日時が current と同じ日か
function sameDay(dt){
  var d=new Date(dt);
  return d.getFullYear()===current.getFullYear()
      && d.getMonth()===current.getMonth()
      && d.getDate()===current.getDate();
}

function draw(){
  var span = HOUR_END - HOUR_START;
  // 表示中の日付のシフトだけ
  var recs = allShifts.filter(function(s){ return sameDay(s[F.start]); });

  var html = '<div style="font-family:-apple-system,sans-serif">';

  // --- 日付ナビ ---
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">';
  html += '<button id="prevDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">◀</button>';
  html += '<span style="font-size:18px;font-weight:bold;min-width:130px;text-align:center">'+ymd(current)+'</span>';
  html += '<button id="nextDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">▶</button>';
  html += '<span style="font-size:13px;color:#888">（'+recs.length+'件）</span>';
  html += '</div>';

  if (recs.length === 0) {
    html += '<p style="color:#888">この日のシフトはありません。</p></div>';
    document.getElementById("output").innerHTML = html;
    bindNav();
    return;
  }

  // ドライバーごと
  var rows={}, order=[];
  recs.forEach(function(r){
    var name=(r[F.driver]&&r[F.driver].name)?r[F.driver].name:"(未割当)";
    if(!rows[name]){rows[name]=[];order.push(name);}
    rows[name].push(r);
  });

  // 目盛り
  html += '<div style="display:flex;align-items:flex-end;margin-bottom:4px">';
  html += '<div style="width:120px;flex:none"></div>';
  html += '<div style="position:relative;flex:1;height:20px;border-bottom:1px solid #ccc">';
  for(var h=HOUR_START;h<=HOUR_END;h+=2){
    var left=((h-HOUR_START)/span)*100;
    html += '<span style="position:absolute;left:'+left+'%;transform:translateX(-50%);font-size:11px;color:#666">'+h+'</span>';
  }
  html += '</div></div>';

  // 各行
  order.forEach(function(name){
    html += '<div style="display:flex;align-items:center;margin-bottom:6px">';
    html += '<div style="width:120px;flex:none;font-size:13px;font-weight:bold">'+name+'</div>';
    html += '<div style="position:relative;flex:1;height:30px;background:#f5f5f5;border-radius:4px">';
    for(var g=HOUR_START;g<=HOUR_END;g+=2){
      var gl=((g-HOUR_START)/span)*100;
      html += '<div style="position:absolute;left:'+gl+'%;top:0;bottom:0;width:1px;background:#e0e0e0"></div>';
    }
    rows[name].forEach(function(s){
      var st=hoursOfDay(s[F.start]), en=hoursOfDay(s[F.end]);
      if(en<=st) en=HOUR_END;
      var left=((st-HOUR_START)/span)*100, width=((en-st)/span)*100;
      var label=fmtHM(s[F.start])+"–"+fmtHM(s[F.end]);
      html += '<div title="'+(s[F.name]||"")+' ('+label+')" style="position:absolute;left:'+left+'%;width:'+width+'%;top:4px;bottom:4px;background:#1f4e79;color:#fff;border-radius:4px;font-size:11px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;padding:0 4px">'+label+'</div>';
    });
    html += '</div></div>';
  });

  html += '</div>';
  document.getElementById("output").innerHTML = html;
  bindNav();
}

function bindNav(){
  document.getElementById("prevDay").onclick=function(){ current.setDate(current.getDate()-1); draw(); };
  document.getElementById("nextDay").onclick=function(){ current.setDate(current.getDate()+1); draw(); };
}

ZOHO.embeddedApp.on("PageLoad", function(){
  document.getElementById("output").innerText="読み込み中…";
  ZOHO.CRM.API.getAllRecords({Entity:MODULE,sort_order:"asc",per_page:200,page:1})
    .then(function(resp){
      allShifts = (resp&&resp.data)?resp.data:[];
      draw();
    })
    .catch(function(err){
      document.getElementById("output").innerHTML='<pre style="color:#b00">エラー:\n'+JSON.stringify(err,null,2)+'</pre>';
    });
});

ZOHO.embeddedApp.init();
