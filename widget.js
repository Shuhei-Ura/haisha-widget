// ===== API名（確定）=====
var SHIFT = { module:"Shifts",      name:"Name", start:"Start_Time", end:"End_Time", driver:"Driver" };
var ASSIGN= { module:"Assignments", name:"Name", start:"Start_Time", end:"End_Time", driver:"Driver" };
var HOUR_START = 0, HOUR_END = 24;
var COLOR = { shift:"#1f4e79", assign:"#e8730c" };
// =========================

var allShifts = [], allAssigns = [];
var current = new Date(); current.setHours(0,0,0,0);
var SPAN = HOUR_END - HOUR_START;

function pad(n){ return ("0"+n).slice(-2); }
function ymd(d){ return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate()); }
function fmtHM(dt){ var d=new Date(dt); return pad(d.getHours())+":"+pad(d.getMinutes()); }
function hoursOfDay(dt){ var d=new Date(dt); return d.getHours()+d.getMinutes()/60; }
function sameDay(dt){
  var d=new Date(dt);
  return d.getFullYear()===current.getFullYear()&&d.getMonth()===current.getMonth()&&d.getDate()===current.getDate();
}
function driverName(rec, key){ return (rec[key]&&rec[key].name)?rec[key].name:"(未割当)"; }

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

// bars: {start,end,name}。showName=true で「名前 時刻」表示
function laneHTML(label, bars, color, showName, marginBottom){
  var mb = marginBottom===undefined ? 6 : marginBottom;
  var html = '<div style="display:flex;align-items:center;margin-bottom:'+mb+'px">';
  html += '<div style="width:150px;flex:none;font-size:13px">'+label+'</div>';
  html += '<div style="position:relative;flex:1;height:30px;background:#f5f5f5;border-radius:4px">';
  for(var g=HOUR_START;g<=HOUR_END;g+=2){
    var gl=((g-HOUR_START)/SPAN)*100;
    html += '<div style="position:absolute;left:'+gl+'%;top:0;bottom:0;width:1px;background:#e0e0e0"></div>';
  }
  bars.forEach(function(b){
    var st=hoursOfDay(b.start), en=hoursOfDay(b.end);
    if(en<=st) en=HOUR_END;
    var left=((st-HOUR_START)/SPAN)*100, width=((en-st)/SPAN)*100;
    var t=fmtHM(b.start)+"–"+fmtHM(b.end);
    var inner = showName ? ((b.name?b.name+" ":"")+t) : t;
    html += '<div title="'+(b.name||"")+' ('+t+')" style="position:absolute;left:'+left+'%;width:'+width+'%;top:4px;bottom:4px;background:'+color+';color:#fff;border-radius:4px;font-size:11px;display:flex;align-items:center;justify-content:center;overflow:hidden;white-space:nowrap;padding:0 4px">'+inner+'</div>';
  });
  return html+'</div></div>';
}

function draw(){
  var shifts  = allShifts.filter(function(s){ return sameDay(s[SHIFT.start]); });
  var assigns = allAssigns.filter(function(a){ return sameDay(a[ASSIGN.start]); });

  var html = '<div style="font-family:-apple-system,sans-serif">';
  html += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">';
  html += '<button id="prevDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">◀</button>';
  html += '<span style="font-size:18px;font-weight:bold;min-width:130px;text-align:center">'+ymd(current)+'</span>';
  html += '<button id="nextDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">▶</button>';
  html += '<span style="font-size:13px;color:#888">（シフト'+shifts.length+' / 案件'+assigns.length+'）</span>';
  html += '</div>';

  if(shifts.length===0 && assigns.length===0){
    html += '<p style="color:#888">この日のデータはありません。</p></div>';
    document.getElementById("output").innerHTML=html; bindNav(); return;
  }

  html += axisHTML();

  // ドライバー単位でグルーピング（シフト・案件を同じキーに集約）
  var byDriver = {}, order = [];
  function ensure(name){ if(!byDriver[name]){ byDriver[name]={shift:[],assign:[]}; order.push(name); } }
  shifts.forEach(function(s){ var nm=driverName(s,SHIFT.driver); ensure(nm); byDriver[nm].shift.push({start:s[SHIFT.start],end:s[SHIFT.end],name:s[SHIFT.name]}); });
  assigns.forEach(function(a){ var nm=driverName(a,ASSIGN.driver); ensure(nm); byDriver[nm].assign.push({start:a[ASSIGN.start],end:a[ASSIGN.end],name:a[ASSIGN.name]}); });

  // 各ドライバー：シフト行 → アサイン行
  order.forEach(function(nm){
    html += laneHTML(nm+'（シフト）',     byDriver[nm].shift,  COLOR.shift,  false, 2);
    html += laneHTML(nm+'（アサイン状況）', byDriver[nm].assign, COLOR.assign, true, 14);
  });

  html += '</div>';
  document.getElementById("output").innerHTML=html; bindNav();
}

function bindNav(){
  document.getElementById("prevDay").onclick=function(){ current.setDate(current.getDate()-1); draw(); };
  document.getElementById("nextDay").onclick=function(){ current.setDate(current.getDate()+1); draw(); };
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
