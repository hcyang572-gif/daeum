#!/usr/bin/env node
// 발표·시연 전 AI 서버 1회 점검(S11-d, 11-02). 발표 30분 전에 «발표장 와이파이에 붙은 노트북»에서 한 번 돌린다.
// 쓰는 법: node shared/edge/daeum-ai/preflight.js   (03_시제품 에서)
// 하는 일: 가상 문장 1건(개인정보 없음)을 실제 함수로 보내 ① 응답 코드 ② 걸린 시간 ③ 오늘 남은 횟수(IP·전체)를 찍는다. AI 1회 사용(≈44.5원, 추정).
// 판정: 200 이고 남은 횟수가 IP 30회·전체 50회 이상이면 «시연 가능». 429면 화면은 자동으로 규칙 모드(«시연 모드» 표시)로 돈다.
"use strict";
const fs = require("fs"), path = require("path");
global.window = globalThis;
eval(fs.readFileSync(path.join(__dirname, "..", "..", "config.js"), "utf8"));
const C = window.DAEUM_CONFIG;
const body = {
  situation: "[점검] 혼자 사는 80대 어르신이 겨울 난방비가 걱정된다고 하셨습니다.",
  proxy: { isProxy: false },
  profile: { kind: "preflight" },
  services: [{ id: "chk-1", name: "에너지바우처", target: "저소득 취약계층", support: "난방비 지원" }],
};
const t0 = Date.now();
fetch(C.aiEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://hcyang572-gif.github.io" }, body: JSON.stringify(body) })
  .then(async (r) => {
    const j = await r.json().catch(() => ({}));
    const q = j.quota || {};
    const leftIp = q.ipLimit != null && q.ip != null ? q.ipLimit - q.ip : "?", leftAll = q.totalLimit != null && q.total != null ? q.totalLimit - q.total : "?";
    console.log("응답", r.status, "·", ((Date.now() - t0) / 1000).toFixed(1) + "초", "· 고른 서비스", (j.picks || []).length, "건");
    console.log("오늘 남은 횟수 — 이 IP", leftIp, "/", q.ipLimit, "· 전체", leftAll, "/", q.totalLimit);
    const ok = r.status === 200 && +leftIp >= 30 && +leftAll >= 50;
    console.log(ok ? "판정: 시연 가능(AI 연결)" : "판정: 주의 — " + (j.error || "남은 횟수 부족") + " → 화면은 규칙 모드(«시연 모드»)로 돈다");
    process.exitCode = ok ? 0 : 1;
  })
  .catch((e) => { console.log("판정: 서버에 닿지 못함 —", e.message, "→ 화면은 규칙 모드로 돈다"); process.exitCode = 2; });
