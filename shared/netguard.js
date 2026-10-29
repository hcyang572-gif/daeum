/* 닿음 연결 안내 — 상주시 정책플랫폼 netguard.js 의 «끊김(offline) / 막힘(blocked) / 자료 사본(json)» 구분을 줄여 옮김.
   닿음은 서비스 목록이 정적 파일이라 인터넷이 막혀도 찾기는 된다. 막히는 것은 AI 서버(Edge Function)와 음성 인식뿐이다.
   쓰는 법: <div id="netguard"></div> 를 두고 이 파일을 넣는다.
     DaeumNet.noteJsonFallback()  — .json 대신 짝 .js 로 읽었을 때
     DaeumNet.noteAiDown(msg)     — AI 서버에 닿지 못해 규칙 모드로 돌았을 때 */
(function () {
  "use strict";
  var box, state = { offline: false, json: false, ai: "" };

  function el() { return box || (box = document.getElementById("netguard")); }
  function render() {
    var b = el(); if (!b) return;
    var msgs = [];
    if (state.offline) msgs.push(["warn", "인터넷에 연결되어 있지 않습니다. 이미 받은 서비스 목록으로 찾기는 됩니다. 음성 입력과 AI 안내는 연결된 뒤에 됩니다."]);
    if (state.ai) msgs.push(["info", state.ai]);
    if (state.json) msgs.push(["info", "일부 자료 파일이 막혀 앱에 들어 있는 사본으로 보여 드리고 있습니다. 이용에는 지장이 없습니다."]);
    b.innerHTML = "";
    b.hidden = !msgs.length;
    msgs.forEach(function (m) {
      var p = document.createElement("p");
      p.className = "ng-line ng-" + m[0];
      p.setAttribute("role", m[0] === "warn" ? "alert" : "status");
      p.textContent = m[1];
      b.appendChild(p);
    });
  }
  function sync() { state.offline = navigator.onLine === false; render(); }
  window.addEventListener("online", sync);
  window.addEventListener("offline", sync);
  document.addEventListener("DOMContentLoaded", sync);

  window.DaeumNet = {
    noteJsonFallback: function () { state.json = true; render(); },
    noteAiDown: function (msg) { state.ai = msg || ""; render(); },
    isOffline: function () { return navigator.onLine === false; }
  };
})();
