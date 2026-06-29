// ===== API名（確定）=====
var SHIFT = { module:"Shifts",      name:"Name", start:"Start_Time", end:"End_Time", driver:"Driver" };
var ASSIGN= { module:"Assignments", name:"Name", start:"Start_Time", end:"End_Time", driver:"Driver", account:"Account", vehicle:"Vehicle" };
var ACCT  = { module:"Accounts" };
var VEH   = { module:"Vehicles" };
var HOUR_START = 0, HOUR_END = 24;
var COLOR = { shift:"#1f4e79", assign:"#e8730c" };
var SNAP_MIN = 15, MIN_DURATION_MIN = 15;
// =========================

var allShifts = [], allAssigns = [], accounts = [], vehicles = [];
var current = new Date(); current.setHours(0,0,0,0);
var SPAN = HOUR_END - HOUR_START;
var driverIdByName = {};

function pad(n){ return ("0"+n).slice(-2); }
function ymd(d){ return d.getFullYear()+"/"+pad(d.getMonth()+1)+"/"+pad(d.getDate()); }
function ymdDash(d){ return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate()); }
function fmtHM(dt){ var d=new Date(dt); return pad(d.getHours())+":"+pad(d.getMinutes()); }
function fmtHMh(hf){ var h=Math.floor(hf),m=Math.round((hf-h)*60); if(m===60){h++;m=0;} return pad(h)+":"+pad(m); }
function hoursOfDay(dt){ var d=new Date(dt); return d.getHours()+d.getMinutes()/60; }
function sameDay(dt){ var d=new Date(dt);
  return d.getFullYear()===current.getFullYear()&&d.getMonth()===current.getMonth()&&d.getDate()===current.getDate(); }
function driverName(rec, key){ return (rec[key]&&rec[key].name)?rec[key].name:"(未割当)"; }
function snap(hf){ return Math.round(hf*60/SNAP_MIN)*SNAP_MIN/60; }
function labelOf(r){ return r.Account_Name || r.Name || r.id; }
function toISO(hf){
  var h=Math.floor(hf), m=Math.round((hf-h)*60); if(m===60){h++;m=0;}
  var d=new Date(current); d.setHours(h,m,0,0);
  var tz=-d.getTimezoneOffset(), sign=tz>=0?"+":"-"; tz=Math.abs(tz);
  return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())+"T"+pad(h)+":"+pad(m)+":00"+sign+pad(Math.floor(tz/60))+":"+pad(tz%60);
}

function axisHTML(){
  var h,left,html='<div style="display:flex;align-items:flex-end;margin-bottom:4px">';
  html += '<div style="width:150px;flex:none"></div>';
  html += '<div style="position:relative;flex:1;height:20px;border-bottom:1px solid #ccc">';
  for(h=HOUR_START;h<=HOUR_END;h+=2){ left=((h-HOUR_START)/SPAN)*100;
    html += '<span style="position:absolute;left:'+left+'%;transform:translateX(-50%);font-size:11px;color:#666">'+h+'</span>'; }
  return html+'</div></div>';
}

function laneHTML(label, bars, color, showName, marginBottom, clickable, driverNm){
  var mb = marginBottom===undefined ? 6 : marginBottom;
  var html = '<div style="display:flex;align-items:center;margin-bottom:'+mb+'px">';
  html += '<div style="width:150px;flex:none;font-size:13px">'+label+'</div>';
  var laneAttr = clickable ? ' class="assignLane" data-driver="'+driverNm+'" style="cursor:crosshair;' : ' style="';
  html += '<div'+laneAttr+'position:relative;flex:1;height:30px;background:#f5f5f5;border-radius:4px;user-select:none">';
  for(var g=HOUR_START;g<=HOUR_END;g+=2){ var gl=((g-HOUR_START)/SPAN)*100;
    html += '<div style="position:absolute;left:'+gl+'%;top:0;bottom:0;width:1px;background:#e0e0e0;pointer-events:none"></div>'; }
  bars.forEach(function(b){
    var st=hoursOfDay(b.start), en=hoursOfDay(b.end); if(en<=st) en=HOUR_END;
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
  shifts.forEach(function(s){ if(s[SHIFT.driver]) driverIdByName[s[SHIFT.driver].name]=s[SHIFT.driver].id; });
  assigns.forEach(function(a){ if(a[ASSIGN.driver]) driverIdByName[a[ASSIGN.driver].name]=a[ASSIGN.driver].id; });

  var html = '<div style="font-family:-apple-system,sans-serif">';
  html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">';
  html += '<button id="prevDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">◀</button>';
  html += '<span id="dateLabel" style="font-size:18px;font-weight:bold;min-width:130px;text-align:center;cursor:pointer;color:#1f4e79;text-decoration:underline dotted" title="クリックで日付指定">'+ymd(current)+'</span>';
  html += '<button id="nextDay" style="cursor:pointer;font-size:16px;padding:4px 12px;border:1px solid #ccc;border-radius:6px;background:#fff">▶</button>';
  html += '<button id="todayBtn" style="cursor:pointer;font-size:12px;padding:4px 10px;border:1px solid #ccc;border-radius:6px;background:#fff">今日</button>';
  html += '<span style="font-size:13px;color:#888">（シフト'+shifts.length+' / 案件'+assigns.length+'）</span>';
  html += '</div>';

  if(shifts.length===0 && assigns.length===0){
    html += '<p style="color:#888">この日のデータはありません。</p>';
  } else {
    html += axisHTML();
    var byDriver = {}, order = [];
    function ensure(name){ if(!byDriver[name]){ byDriver[name]={shift:[],assign:[]}; order.push(name); } }
    shifts.forEach(function(s){ var nm=driverName(s,SHIFT.driver); ensure(nm); byDriver[nm].shift.push({start:s[SHIFT.start],end:s[SHIFT.end],name:s[SHIFT.name]}); });
    assigns.forEach(function(a){ var nm=driverName(a,ASSIGN.driver); ensure(nm); byDriver[nm].assign.push({start:a[ASSIGN.start],end:a[ASSIGN.end],name:a[ASSIGN.name]}); });
    order.forEach(function(nm){
      html += laneHTML(nm+'（シフト）',     byDriver[nm].shift,  COLOR.shift,  false, 2, false, nm);
      html += laneHTML(nm+'（アサイン状況）', byDriver[nm].assign, COLOR.assign, true, 14, true, nm);
    });
  }

  html += '</div>';
  html += formModalHTML();
  html += dateModalHTML();
  document.getElementById("output").innerHTML=html;
  bindNav(); bindLaneDrag(); bindModal(); bindDateModal();
}

function bindNav(){
  document.getElementById("prevDay").onclick=function(){ current.setDate(current.getDate()-1); draw(); };
  document.getElementById("nextDay").onclick=function(){ current.setDate(current.getDate()+1); draw(); };
  document.getElementById("todayBtn").onclick=function(){ current=new Date(); current.setHours(0,0,0,0); draw(); };
  document.getElementById("dateLabel").onclick=function(){
    document.getElementById("dInput").value = ymdDash(current);
    document.getElementById("dOvl").style.display="flex";
    document.getElementById("dInput").focus();
  };
}

// ---- 日付ジャンプ用モーダル（type=dateに依存しない） ----
function dateModalHTML(){
  return ''
  + '<div id="dOvl" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;align-items:center;justify-content:center">'
  + '  <div style="background:#fff;padding:20px;border-radius:10px;width:280px;font-family:-apple-system,sans-serif">'
  + '    <h3 style="margin:0 0 10px;font-size:15px">日付を指定して移動</h3>'
  + '    <input id="dInput" type="text" placeholder="2026-06-07" style="width:100%;box-sizing:border-box;padding:8px;font-size:15px;border:1px solid #ccc;border-radius:6px;text-align:center">'
  + '    <p style="font-size:11px;color:#999;margin:6px 0 14px">形式: YYYY-MM-DD（例 2026-06-07）</p>'
  + '    <div style="display:flex;gap:8px;justify-content:flex-end">'
  + '      <button id="dCancel" style="padding:6px 14px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer">キャンセル</button>'
  + '      <button id="dGo" style="padding:6px 14px;border:none;border-radius:6px;background:#1f4e79;color:#fff;cursor:pointer">移動</button>'
  + '    </div>'
  + '  </div>'
  + '</div>';
}
function bindDateModal(){
  document.getElementById("dCancel").onclick=function(){ document.getElementById("dOvl").style.display="none"; };
  function go(){
    var v=document.getElementById("dInput").value.trim().replace(/\//g,"-");
    var m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if(!m){ alert("YYYY-MM-DD 形式で入力してください"); return; }
    current=new Date(+m[1], +m[2]-1, +m[3]); current.setHours(0,0,0,0);
    document.getElementById("dOvl").style.display="none";
    draw();
  }
  document.getElementById("dGo").onclick=go;
  document.getElementById("dInput").onkeydown=function(e){ if(e.key==="Enter") go(); };
}

function bindLaneDrag(){
  var lanes = document.getElementsByClassName("assignLane");
  for(var i=0;i<lanes.length;i++){
    (function(lane){
      var dragging=false, startRatio=0, ghost=null;
      function ratioAt(x){ var r=lane.getBoundingClientRect(); return Math.max(0,Math.min(1,(x-r.left)/r.width)); }
      lane.addEventListener("mousedown", function(e){
        dragging=true; startRatio=ratioAt(e.clientX);
        ghost=document.createElement("div");
        ghost.style.cssText="position:absolute;top:4px;bottom:4px;background:rgba(232,115,12,0.45);border:1px dashed #e8730c;border-radius:4px;pointer-events:none;font-size:11px;color:#7a3d00;display:flex;align-items:center;justify-content:center";
        lane.appendChild(ghost); updateGhost(startRatio); e.preventDefault();
      });
      lane.addEventListener("mousemove", function(e){ if(dragging) updateGhost(ratioAt(e.clientX)); });
      function updateGhost(cur){
        var a=Math.min(startRatio,cur), b=Math.max(startRatio,cur);
        var sh=snap(HOUR_START+a*SPAN), eh=snap(HOUR_START+b*SPAN);
        if(eh-sh < MIN_DURATION_MIN/60) eh=sh+MIN_DURATION_MIN/60;
        ghost.style.left=((sh-HOUR_START)/SPAN)*100+"%"; ghost.style.width=((eh-sh)/SPAN)*100+"%";
        ghost.textContent=fmtHMh(sh)+"–"+fmtHMh(eh); ghost._sh=sh; ghost._eh=eh;
      }
      function finish(){ if(!dragging) return; dragging=false;
        var sh=ghost._sh, eh=ghost._eh; if(ghost.parentNode) ghost.parentNode.removeChild(ghost); ghost=null;
        openModal(lane.getAttribute("data-driver"), sh, eh);
      }
      lane.addEventListener("mouseup", finish);
      lane.addEventListener("mouseleave", function(){ if(dragging) finish(); });
    })(lanes[i]);
  }
}

function optionTags(list){
  var s='<option value="">（未選択）</option>';
  list.forEach(function(r){ s+='<option value="'+r.id+'">'+labelOf(r)+'</option>'; });
  return s;
}
function formModalHTML(){
  return ''
  + '<div id="ovl" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9999;align-items:center;justify-content:center">'
  + '  <div style="background:#fff;padding:20px;border-radius:10px;width:340px;font-family:-apple-system,sans-serif">'
  + '    <h3 style="margin:0 0 12px;font-size:16px">案件を作成</h3>'
  + '    <div id="mInfo" style="font-size:12px;color:#666;margin-bottom:10px"></div>'
  + '    <label style="font-size:12px">案件名</label>'
  + '    <input id="mName" type="text" value="新規配送" style="width:100%;box-sizing:border-box;padding:6px;margin:2px 0 10px;border:1px solid #ccc;border-radius:6px">'
  + '    <label style="font-size:12px">取引先</label>'
  + '    <select id="mAccount" style="width:100%;box-sizing:border-box;padding:6px;margin:2px 0 10px;border:1px solid #ccc;border-radius:6px">'+optionTags(accounts)+'</select>'
  + '    <label style="font-size:12px">車両</label>'
  + '    <select id="mVehicle" style="width:100%;box-sizing:border-box;padding:6px;margin:2px 0 16px;border:1px solid #ccc;border-radius:6px">'+optionTags(vehicles)+'</select>'
  + '    <div style="display:flex;gap:8px;justify-content:flex-end">'
  + '      <button id="mCancel" style="padding:6px 14px;border:1px solid #ccc;border-radius:6px;background:#fff;cursor:pointer">キャンセル</button>'
  + '      <button id="mOk" style="padding:6px 14px;border:none;border-radius:6px;background:#1f4e79;color:#fff;cursor:pointer">作成</button>'
  + '    </div>'
  + '  </div>'
  + '</div>';
}
var pending = null;
function openModal(driverNm, startH, endH){
  pending = { driverNm:driverNm, startH:startH, endH:endH };
  document.getElementById("mInfo").textContent = driverNm + " ／ " + fmtHMh(startH) + "〜" + fmtHMh(endH);
  document.getElementById("mName").value = "新規配送";
  document.getElementById("mAccount").value = "";
  document.getElementById("mVehicle").value = "";
  document.getElementById("ovl").style.display = "flex";
}
function bindModal(){
  document.getElementById("mCancel").onclick = function(){ document.getElementById("ovl").style.display="none"; pending=null; };
  document.getElementById("mOk").onclick = function(){
    var name = document.getElementById("mName").value || "新規配送";
    var accId = document.getElementById("mAccount").value;
    var vehId = document.getElementById("mVehicle").value;
    document.getElementById("ovl").style.display="none";
    createAssignment(pending.driverNm, pending.startH, pending.endH, name, accId, vehId);
    pending=null;
  };
}

function createAssignment(driverNm, startH, endH, name, accId, vehId){
  var driverId = driverIdByName[driverNm];
  var rec = {};
  rec[ASSIGN.name]  = name;
  rec[ASSIGN.start] = toISO(startH);
  rec[ASSIGN.end]   = toISO(endH);
  if(driverId) rec[ASSIGN.driver]  = { id: driverId };
  if(accId)    rec[ASSIGN.account] = { id: accId };
  if(vehId)    rec[ASSIGN.vehicle] = { id: vehId };

  ZOHO.CRM.API.insertRecord({ Entity: ASSIGN.module, APIData: rec, Trigger: ["workflow"] })
    .then(function(resp){
      var d = resp && resp.data && resp.data[0];
      if(d && (d.code==="SUCCESS" || (d.details&&d.details.id))){
        var nr = {};
        nr[ASSIGN.name]=name; nr[ASSIGN.start]=rec[ASSIGN.start]; nr[ASSIGN.end]=rec[ASSIGN.end];
        nr[ASSIGN.driver]={ id:driverId, name:driverNm };
        nr.id = d.details ? d.details.id : null;
        allAssigns.push(nr); draw();
      } else { alert("作成失敗:\n"+JSON.stringify(resp)); }
    })
    .catch(function(err){ alert("エラー:\n"+JSON.stringify(err)); });
}

ZOHO.embeddedApp.on("PageLoad", function(){
  document.getElementById("output").innerText="読み込み中…";
  Promise.all([
    ZOHO.CRM.API.getAllRecords({Entity:SHIFT.module,  sort_order:"asc", per_page:200, page:1}),
    ZOHO.CRM.API.getAllRecords({Entity:ASSIGN.module, sort_order:"asc", per_page:200, page:1}),
    ZOHO.CRM.API.getAllRecords({Entity:ACCT.module,   sort_order:"asc", per_page:200, page:1}),
    ZOHO.CRM.API.getAllRecords({Entity:VEH.module,    sort_order:"asc", per_page:200, page:1})
  ].map(function(p){ return p.catch(function(){ return {data:[]}; }); }))
  .then(function(res){
    allShifts  = (res[0]&&res[0].data)?res[0].data:[];
    allAssigns = (res[1]&&res[1].data)?res[1].data:[];
    accounts   = (res[2]&&res[2].data)?res[2].data:[];
    vehicles   = (res[3]&&res[3].data)?res[3].data:[];
    draw();
  }).catch(function(err){
    document.getElementById("output").innerHTML='<pre style="color:#b00">エラー:\n'+JSON.stringify(err,null,2)+'</pre>';
  });
});

ZOHO.embeddedApp.init();
