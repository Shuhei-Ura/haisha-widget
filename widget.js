// ===== API名（確定）=====
var SHIFT = { module:"Shifts",      name:"Name", start:"Start_Time", end:"End_Time", driver:"Driver" };
var ASSIGN= { module:"Assignments", name:"Name", start:"Start_Time", end:"End_Time", driver:"Driver" };
var HOUR_START = 0, HOUR_END = 24;
var COLOR = { shift:"#1f4e79", assign:"#e8730c" };
var SNAP_MIN = 15;          // クリック時刻の丸め（分）
var NEW_DURATION_MIN = 60;  // クリックで作る案件の長さ（分）
// =========================

var allShifts = [], allAssigns = [];
var current = new Date(); current.setHours(0,0,0,0);
var SPAN = HOUR_END - HOUR_START;
// ドライバー名 -> id（その日のシフト/案件から拾う）
var driverIdByName = {};

function pad(n){ return ("0"+n).slice(-2); }
function ymd(d){ return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate()); }
function fmtHM(dt){ var d=new Date(dt); return pad(d.getHours())+":"+pad(d.getMinutes()); }
function hoursOfDay(dt){ var d=new Date(dt); return d.getHours()+d.getMinutes()/60; }
function sameDay(dt){
  var d=new Date(dt);
  return d.getFullYear()===current.getFullYear()&&d.getMonth()===current.getMonth()&&d.getDate()===current.getDate();
}
function driverName(rec, key){ return (rec[key]&&rec[key].name)?rec[key].name:"(未割当)"; }
// current日付 + 時(小数) → CRM用ISO文字列 "2026-06-07T09:00:00+09:00"
function toISO(hoursFloat){
  var h = Math.floor(hoursFloat);
  var m = Math.round((hoursFloat - h)*60);
  var d = new Date(current); d.setHours(h, m, 0, 0);
  var tz = -d.getTimezoneOffset(); // 分。日本は+540
  var sign = tz>=0?"+":"-"; tz=Math.abs(tz);
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(h)+":"+pad(m)+":00"
    + sign + pad(Math.floor(tz/60)) + ":" + pad(tz%60);
}

function axisHTML(){
  var h,left,html='<div style="display:flex;align-items:flex-end;margin-bottom:4px">';
  html += '<div style="width:150px;flex:none"></div>';
  html += '<div style="position:relative;flex:1;height:20px;border-bottom:1px solid #ccc">';
  for(h=HOUR_START;h<=HOUR_END;h+=2){
    left=((h-HOUR_START)/SPAN)*100;
    html += '<span style="position:absolute;left:'+left+'%;transform:translateX(-50%);font-size:11px;color:#666">'+h+'</span>';
  }
  return html+'</div></div>';
}

// clickable=true でレーンにクリック作成を仕込む（data-driver属性付与）
function laneHTML(label, bars, color, showName, marginBottom, clickable, driverNm){
  var mb = marginBottom===undefined ? 6 : marginBottom;
  var html = '<div style="display:flex;align-items:center;margin-bottom:'+mb+'px">';
  html += '<div style="width:150px;flex:none;font-size:13px">'+label+'</div>';
  var laneAttr = clickable ? ' class="assignLane" data-driver="'+driverNm+'" style="cursor:crosshair;' : ' style="';
  html += '<div'+laneAttr+'position:relative;flex:1;height:30px;background:#f5f5f5;border-radius:4px">';
  for(var g=HOUR_START;g<=HOUR_END;g+=2){
    var gl=((g-HOUR_START)/SPAN)*100;
    html += '<div style="position:absolute;left:'+gl+'%;top:0;bottom:0;width:1px;background:#e0e0e0;pointer-events:none"></div>';
  }
  bars.forEach(function(b){
    var st=hoursOfDay(b.start), en=hoursOfDay(b.end);
    if(en<=st) en=HOUR_END;
    var left=((st-HOUR_START)/SPAN)*100, width=((en-st)/SPAN)*100;
    var t=fmtHM(b.start)+"–"+fmtHM(b.end);
    var inner = showName ? ((b.name?b.name+" ":"")+t) : t;
    html += '<div title="'+(b.name||"")+' ('+t+')" style="position:absolute;left:'+left+'%;width:'+width+'%;top:4px;bottom:4px;background:'+color+';color:#fff;border-radius:4px;font-size:11px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;padding:0 4px;pointer-events:none">'+inner+'</div>';
  });
  return html+'</div></div>';
}

function draw(){
  var shifts  = allShifts.filter(function(s){ return sameDay(s[SHIFT.start]); });
  var assigns = allAssigns.filter(function(a){ return sameDay(a[ASSIGN.start]); });

  // ドライバー名→id を更新
  shifts.forEach(function(s){ if(s[SHIFT.driver]) driverIdByName[s[SHIFT.driver].name]=s[SHIFT.driver].id; });
  assigns.forEach(function(a){ if(a[ASSIGN.driver]) driverIdByName[a[ASSIGN.driver].name]=a[ASSIGN.driver].id; });

  var html = '<div style="font-family:-apple-system,sans-serif">';
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">';
  html += '<button id="prevDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">◀</button>';
  html += '<span style="font-size:18px;font-weight:bold;min-width:130px;text-align:center">'+ymd(current)+'</span>';
  html += '<button id="nextDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">▶</button>';
  html += '<span style="font-size:13px;color:#888">（シフト'+shifts.length+' / 案件'+assigns.length+'） 空きをクリックで案件作成</span>';
  html += '</div>';

  if(shifts.length===0 && assigns.length===0){
    html += '<p style="color:#888">この日のデータはありません。</p></div>';
    document.getElementById("output").innerHTML=html; bindNav(); return;
  }

  html += axisHTML();

  var byDriver = {}, order = [];
  function ensure(name){ if(!byDriver[name]){ byDriver[name]={shift:[],assign:[]}; order.push(name); } }
  shifts.forEach(function(s){ var nm=driverName(s,SHIFT.driver); ensure(nm); byDriver[nm].shift.push({start:s[SHIFT.start],end:s[SHIFT.end],name:s[SHIFT.name]}); });
  assigns.forEach(function(a){ var nm=driverName(a,ASSIGN.driver); ensure(nm); byDriver[nm].assign.push({start:a[ASSIGN.start],end:a[ASSIGN.end],name:a[ASSIGN.name]}); });

  order.forEach(function(nm){
    html += laneHTML(nm+'（シフト）',     byDriver[nm].shift,  COLOR.shift,  false, 2, false, nm);
    html += laneHTML(nm+'（アサイン状況）', byDriver[nm].assign, COLOR.assign, true, 14, true, nm);
  });

  html += '</div>';
  document.getElementById("output").innerHTML=html;
  bindNav();
  bindLaneClick();
}

function bindNav(){
  document.getElementById("prevDay").onclick=function(){ current.setDate(current.getDate()-1); draw(); };
  document.getElementById("nextDay").onclick=function(){ current.setDate(current.getDate()+1); draw(); };
}

function bindLaneClick(){
  var lanes = document.getElementsByClassName("assignLane");
  for(var i=0;i<lanes.length;i++){
    lanes[i].onclick = function(e){
      var rect = this.getBoundingClientRect();
      var ratio = (e.clientX - rect.left) / rect.width;     // 0〜1
      var hourFloat = HOUR_START + ratio * SPAN;             // クリック時刻
      // 15分スナップ
      var snapped = Math.round(hourFloat * 60 / SNAP_MIN) * SNAP_MIN / 60;
      var startH = snapped;
      var endH = Math.min(HOUR_END, snapped + NEW_DURATION_MIN/60);
      var nm = this.getAttribute("data-driver");
      createAssignment(nm, startH, endH);
    };
  }
}

function createAssignment(driverNm, startH, endH){
  var driverId = driverIdByName[driverNm];
  var title = window.prompt(driverNm + " の案件名を入力（" + fmtHM(toISO(startH)) + "〜" + fmtHM(toISO(endH)) + "）", "新規配送");
  if(title === null) return; // キャンセル

  var rec = {};
  rec[ASSIGN.name]  = title || "新規配送";
  rec[ASSIGN.start] = toISO(startH);
  rec[ASSIGN.end]   = toISO(endH);
  if(driverId) rec[ASSIGN.driver] = { id: driverId };

  ZOHO.CRM.API.insertRecord({ Entity: ASSIGN.module, APIData: rec, Trigger: ["workflow"] })
    .then(function(resp){
      var d = resp && resp.data && resp.data[0];
      if(d && (d.code==="SUCCESS" || (d.details&&d.details.id))){
        // 返ったIDを使ってメモリに追加 → 再描画
        var newId = d.details ? d.details.id : null;
        var newRec = {};
        newRec[ASSIGN.name]=rec[ASSIGN.name];
        newRec[ASSIGN.start]=rec[ASSIGN.start];
        newRec[ASSIGN.end]=rec[ASSIGN.end];
        newRec[ASSIGN.driver]={ id:driverId, name:driverNm };
        newRec.id = newId;
        allAssigns.push(newRec);
        draw();
      } else {
        alert("作成失敗:\n"+JSON.stringify(resp));
      }
    })
    .catch(function(err){ alert("エラー:\n"+JSON.stringify(err)); });
}

ZOHO.embeddedApp.on("PageLoad", function(){
  document.getElementById("output").innerText="読み込み中…";
  Promise.all([
    ZOHO.CRM.API.getAllRecords({Entity:SHIFT.module,  sort_order:"asc", per_page:200, page:1}),
    ZOHO.CRM.API.getAllRecords({Entity:ASSIGN.module, sort_order:"asc", per_page:200, page:1})
  ]).then(function(res){
    allShifts  = (res[0]&&res[0].data)?res[0].data:[];
    allAssigns = (res[1]&&res[1].data)?res[1].data:[];
    draw();
  }).catch(function(err){
    document.getElementById("output").innerHTML='<pre style="color:#b00">エラー:\n'+JSON.stringify(err,null,2)+'</pre>';
  });
});

ZOHO.embeddedApp.init();
