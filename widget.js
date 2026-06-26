document.getElementById("output").innerText = "ページは読み込めています（SDK初期化待ち…）";

ZOHO.embeddedApp.on("PageLoad", function(data) {
    document.getElementById("output").innerText = "Widget が正常に動作しています！";
});

ZOHO.embeddedApp.init();
