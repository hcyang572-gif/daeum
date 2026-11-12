/* 닿음 S12-z3 첫 실행 안내(⚙️ 파로, 69회차, 2026-11-12) — 🩵 미르 시안 2판 https://claude.ai/artifact/UEMXBDbBud777U62dgDYn9 그대로 옮김.
   - 다섯 장 = 업무 순서: ①명단 불러오기 ②최적 동선·네이버 지도 길안내 ③현장·동료 안부 ④기록 ⑤보고서 자동 생성. 장마다 «한국사회보장정보원» 출처 표지(줄임 금지).
   - 폰 = 한 장씩 넘김(밀기·흐름 띠·다음) · PC(1024px 이상) = 다섯 장 한 판. 같은 마크업, 폭 클래스(.o-m-phone/.o-m-pc)만 다르다.
   - 움직임 = CSS·SVG만, 장이 보일 때 .o-play 한 번 · 쉼 상태가 마지막 장면(움직임 줄이기면 그대로 정지).
   - 그림 함수(ill0~4·syncArt)와 CSS(app/onboard.css)는 시안에서 변환(클래스 o- 접두 — 앱 .btn·.card 와 안 겹치게).
   - 🟥 승인 전 추천안 2건은 OPT 한 곳에서 끈다: autoFirst(처음 열 때 자동으로 띄움 · 다시 보기는 «더 보기» 메뉴) · browseBtn(로그인 창 «시연 데이터로 둘러보기»).
   - 앱과는 DaeumOnboard.hook({ login, start }) 로만 잇는다(app.js 가 붙임). */
(function (root) {
  "use strict";
  var OPT = { autoFirst: true, browseBtn: true };
  var SEEN = "daeum.ob.seen";
  var IC = {
    arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    key:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/></svg>',
    mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/></svg>',
    lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    chev:'<svg class="o-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
    x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    device:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="M8 12h8"/></svg>',
    moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
    trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    pc:'<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="21" height="13" rx="2.5"/><path d="M9 22h8M13 17v5"/></svg>',
    phone:'<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2.5" width="12" height="21" rx="3"/><path d="M11.5 20h3"/></svg>'
  };
  // 표장(닿음: 두 점이 맞닿는 고리) — 시안 v3 색
  var MARK = '<svg viewBox="0 0 24 24"><defs><linearGradient id="mk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2E8293"/><stop offset="1" stop-color="#123C46"/></linearGradient></defs><circle cx="9" cy="12" r="6" fill="none" stroke="url(#mk)" stroke-width="2.6"/><circle cx="15" cy="12" r="6" fill="none" stroke="#B99B63" stroke-width="2.6" opacity=".95"/><circle cx="12" cy="12" r="1.6" fill="#123C46"/></svg>';
  var FF = 'font-family="Noto Sans KR,sans-serif"', FN = 'font-family="Space Grotesk,Noto Sans KR,sans-serif"';
  function tx(x,y,t,sz,w,c,extra){ return '<text x="'+x+'" y="'+y+'" '+FF+' font-size="'+sz+'" font-weight="'+w+'" fill="'+c+'" '+(extra||'')+'>'+t+'</text>'; }

  // ① 방문 계획 — 발굴 명단 파일이 가구 목록으로 펼쳐짐
  function ill0(id){
    var rows = [["H-003","고독사 우선방문","#B8473A"],["H-011","단전·단수","#B99B63"],["H-017","보험료 체납","#B99B63"],["H-021","의료 위기","#1F6676"],["H-034","주거 위기","#1F6676"]];
    var s = '<svg viewBox="0 0 316 250" aria-hidden="true"><defs>'+
      '<linearGradient id="xf'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#EEEAE2"/></linearGradient>'+
      '<linearGradient id="lc'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F6F3EE"/></linearGradient>'+
      '<filter id="fs'+id+'" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>'+
      // 파일
      '<g class="o-ani o-xfile"><rect x="26" y="70" width="84" height="108" rx="10" fill="#3F3320" opacity=".18" filter="url(#fs'+id+')" transform="translate(2,8)"/>'+
      '<path d="M26 80 a10 10 0 0 1 10 -10 h52 l22 22 v76 a10 10 0 0 1 -10 10 h-64 a10 10 0 0 1 -10 -10 z" fill="url(#xf'+id+')" stroke="rgba(17,24,28,.1)"/>'+
      '<path d="M88 70 v14 a8 8 0 0 0 8 8 h14" fill="#E2DCD1"/>'+
      '<g stroke="#D3CCBF" stroke-width="1">'+[0,1,2,3,4].map(function(i){ return '<path d="M36 '+(104+i*12)+' h64"/>'; }).join("")+'<path d="M56 98 v58M78 98 v58"/></g>'+
      '<rect x="36" y="98" width="64" height="8" fill="rgba(31,102,118,.12)"/>'+
      '<g transform="translate(42,164)"><rect width="38" height="16" rx="8" fill="#1F6676"/>'+'<text x="19" y="11.5" text-anchor="middle" '+FN+' font-size="8.5" font-weight="700" fill="#fff">xlsx</text></g>'+
      tx(36,88,'발굴 명단',8.5,800,'#11181C')+'</g>'+
      // 흐름
      '<path d="M118 124 C128 116 136 116 146 120" stroke="#B99B63" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M141 114.5l6 5.5-7 4" stroke="#B99B63" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
      // 가구 목록 판
      '<rect x="156" y="36" width="140" height="190" rx="16" fill="#3F3320" opacity=".2" filter="url(#fs'+id+')" transform="translate(2,9)"/>'+
      '<rect x="156" y="30" width="140" height="190" rx="16" fill="url(#lc'+id+')" stroke="rgba(17,24,28,.08)"/>'+
      tx(170,52,'오늘 볼 가구',10,800,'#11181C')+
      '<g class="o-ani o-cnt"><rect x="240" y="40" width="44" height="17" rx="8.5" fill="rgba(31,102,118,.12)"/><text x="262" y="52" text-anchor="middle" '+FN+' font-size="9.5" font-weight="700" fill="#174F5B">48가구</text></g>';
    rows.forEach(function(r,i){ var y = 66 + i*29;
      s += '<g transform="translate(166,'+y+')"><g class="o-ani o-row o-r'+(i+1)+'"><rect width="120" height="24" rx="8" fill="#fff" stroke="rgba(17,24,28,.07)"/>'+
        '<circle cx="11" cy="12" r="3.5" fill="'+r[2]+'"/>'+'<text x="20" y="15.5" '+FN+' font-size="8.5" font-weight="700" fill="#11181C">'+r[0]+'</text>'+tx(52,15.5,r[1],7.6,600,'#47535B')+'</g></g>'; });
    return s + '</svg>';
  }

  // ② 동선 — 가장 짧은 순서 → «네이버 지도로 길안내» → 지도 앱 길안내(경유지 순서 그대로)
  function ill1(id){
    var P = 'M66 150 C84 158 100 162 118 160 C136 158 146 180 160 182 C178 184 196 176 212 170 C226 164 234 152 238 140 C240 128 206 118 186 116';
    var stops = [["출발","현재 위치"],["경유","방문 1"],["경유","방문 2"],["경유","방문 3"],["경유","방문 4"],["도착","방문 5"]];
    return '<svg viewBox="0 0 316 250" aria-hidden="true"><defs>'+
    '<linearGradient id="g1'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#E8E2D6"/></linearGradient>'+
    '<linearGradient id="gs'+id+'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#D3CBBB"/><stop offset=".5" stop-color="#BFB5A2"/><stop offset="1" stop-color="#CFC7B7"/></linearGradient>'+
    '<radialGradient id="pn'+id+'" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#7CC0CC"/><stop offset=".45" stop-color="#2E8293"/><stop offset="1" stop-color="#123C46"/></radialGradient>'+
    '<radialGradient id="pg'+id+'" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#FFF2D2"/><stop offset=".5" stop-color="#D8B475"/><stop offset="1" stop-color="#8E6C33"/></radialGradient>'+
    '<radialGradient id="lt'+id+'" cx="40%" cy="20%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="pb'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A4E59"/><stop offset="1" stop-color="#0B2A31"/></linearGradient>'+
    '<filter id="sh'+id+'" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter></defs>'+
    '<g class="o-mapg">'+
      '<ellipse cx="160" cy="226" rx="132" ry="14" fill="#5B4A2E" opacity=".2" filter="url(#sh'+id+')"/>'+
      '<path d="M20 150 L158 80 L298 150 L160 220 Z" fill="url(#gs'+id+')" transform="translate(0,9)"/>'+
      '<path d="M20 150 L158 80 L298 150 L160 220 Z" fill="url(#g1'+id+')"/>'+
      '<path d="M20 150 L158 80 L298 150 L160 220 Z" fill="url(#lt'+id+')"/>'+
      '<path d="M60 160 L200 90 M100 180 L250 106 M90 132 L230 198 M130 112 L270 176" stroke="#D6CFC1" stroke-width="1.2" opacity=".8"/>'+
      '<path d="M42 154 C88 130 118 102 168 96 C212 92 246 106 278 138" fill="none" stroke="#8FC4CF" stroke-width="10" stroke-linecap="round" opacity=".5"/>'+
      '<path d="M42 154 C88 130 118 102 168 96 C212 92 246 106 278 138" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".75"/>'+
      '<path d="'+P+'" fill="none" stroke="#123C46" stroke-width="6" stroke-linecap="round" opacity=".12" transform="translate(0,3)"/>'+
      '<path class="o-route" d="'+P+'" fill="none" stroke="#1F6676" stroke-width="3.4" stroke-linecap="round"/>'+
      house(118,160)+house(160,182)+house(212,170)+house(238,140)+house(186,116)+
      '<g transform="translate(66,150)"><ellipse cx="0" cy="3" rx="11" ry="5" fill="#123C46" opacity=".18"/><rect x="-8" y="-15" width="16" height="17" rx="3" fill="#FCFBF9" stroke="#47535B" stroke-width="1.2"/><path d="M-4 -10h8M-4 -6h8M-4 -2h8" stroke="#47535B" stroke-width="1.1"/></g>'+
      pin(118,138,'1','pn',id,'p1')+pin(160,160,'2','pn',id,'p2')+pin(212,148,'3','pn',id,'p3')+pin(238,118,'4','pn',id,'p4')+pin(186,94,'5','pg',id,'p5')+
    '</g>'+
    '<g transform="translate(16,16)"><rect width="124" height="46" rx="15" fill="#fff" opacity=".92"/><rect width="124" height="46" rx="15" fill="none" stroke="rgba(17,24,28,.06)"/>'+
      tx(13,19,'가장 짧은 순서',10,700,'#8A6A35')+'<text x="13" y="36" '+FN+' font-size="14" font-weight="700" fill="#11181C">5가구 · 7.2km</text></g>'+
    // 길안내 단추(눌림)
    '<g class="o-navbtn"><g class="o-ani o-navpress"><rect x="18" y="208" width="166" height="30" rx="15" fill="#1F6676"/><rect x="18" y="208" width="166" height="15" rx="15" fill="#fff" opacity=".08"/>'+
      '<path d="M32 216 l6 -2 6 2 6 -2 v13 l-6 2 -6 -2 -6 2 z M38 214 v13 M44 216 v13" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>'+
      tx(58,227.5,'네이버 지도로 길안내',10.5,700,'#fff')+'</g><circle class="o-ani o-tap" cx="150" cy="223" r="14" fill="#fff"/></g>'+
    // 지도 앱 길안내 화면(일반 그림, 상표 없음)
    '<g class="o-navphone"><g transform="translate(206,48)">'+
      '<rect width="96" height="190" rx="15" fill="#000" opacity=".2" filter="url(#sh'+id+')" transform="translate(2,8)"/>'+
      '<rect width="96" height="190" rx="15" fill="url(#pb'+id+')"/>'+
      '<rect x="5" y="6" width="86" height="178" rx="10" fill="#F5F7F6"/>'+
      '<rect x="5" y="6" width="86" height="24" rx="10" fill="#123C46"/><rect x="5" y="20" width="86" height="10" fill="#123C46"/>'+
      '<path d="M15 13.5 a4 4 0 0 1 8 0 c0 3 -4 6.5 -4 6.5 s-4 -3.5 -4 -6.5z" fill="#8FD9E4"/>'+tx(27,21.5,'길안내 · 자동차',7.4,700,'#F2F7F7')+
      '<rect x="11" y="36" width="74" height="46" rx="6" fill="#E6ECEA"/>'+
      '<path class="o-proute" d="M18 72 C30 70 34 52 46 56 C58 60 62 44 78 46" fill="none" stroke="#1F6676" stroke-width="2.4" stroke-linecap="round"/>'+
      '<circle cx="18" cy="72" r="2.6" fill="#123C46"/><circle cx="78" cy="46" r="3" fill="#B99B63"/>'+
      stops.map(function(s,i){ var y = 96 + i*14; return '<g class="o-ani o-stop o-s'+i+'"><circle cx="15" cy="'+(y-2.5)+'" r="2.4" fill="'+(i===5?'#B99B63':i===0?'#123C46':'#1F6676')+'"/>'+tx(21,y,s[0],6.4,600,'#6B767D')+tx(39,y,s[1],6.8,700,'#11181C')+'</g>'; }).join("")+
      '<path d="M15 93 v70" stroke="#C9D3D2" stroke-width="1" stroke-dasharray="2 2" opacity=".0"/>'+
    '</g></g>'+
    '</svg>'; }
  function house(x,y){ return '<g transform="translate('+x+','+(y-2)+')"><ellipse cx="0" cy="4" rx="16" ry="6" fill="#3F3320" opacity=".16"/>'+
    '<path d="M-12 0 L0 6 L0 -8 L-12 -14 Z" fill="#E4DCCD"/><path d="M0 6 L12 0 L12 -14 L0 -8 Z" fill="#CFC5B2"/>'+
    '<path d="M-13 -13 L0 -24 L0 -7 Z" fill="#B99B63"/><path d="M0 -24 L13 -13 L0 -7 Z" fill="#8A6A35"/></g>'; }
  function pin(x,y,n,g,id,cls){ return '<g transform="translate('+x+','+y+')"><g class="o-ani o-pin o-'+cls+'"><path d="M0 18 C-3 10 -13 6 -13 -4 A13 13 0 0 1 13 -4 C13 6 3 10 0 18 Z" fill="url(#'+g+id+')"/>'+
    '<circle cx="0" cy="-4" r="8.5" fill="#fff" opacity=".95"/><text x="0" y="0.5" text-anchor="middle" '+FN+' font-size="12" font-weight="700" fill="#123C46">'+n+'</text></g></g>'; }

  // ③ 현장 방문 · 동료 안부 — 시간 고리가 차오르다 동료 알림
  function ill3(id){ return '<svg viewBox="0 0 316 250" aria-hidden="true"><defs>'+
    '<radialGradient id="sd'+id+'" cx="35%" cy="25%" r="85%"><stop offset="0" stop-color="#7CC0CC"/><stop offset=".45" stop-color="#2E8293"/><stop offset="1" stop-color="#0F3840"/></radialGradient>'+
    '<linearGradient id="rg'+id+'" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E8CE96"/><stop offset="1" stop-color="#8A6A35"/></linearGradient>'+
    '<linearGradient id="cd'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F1EDE6"/></linearGradient>'+
    '<filter id="bl'+id+'" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="8"/></filter></defs>'+
    '<ellipse cx="104" cy="206" rx="62" ry="10" fill="#3F3320" opacity=".14" filter="url(#bl'+id+')"/>'+
    '<circle cx="104" cy="118" r="70" fill="#fff" opacity=".55"/>'+
    '<circle cx="104" cy="118" r="54" fill="none" stroke="#E4E0D8" stroke-width="9"/>'+
    '<circle class="o-ringbig" cx="104" cy="118" r="54" fill="none" stroke="url(#rg'+id+')" stroke-width="9" stroke-linecap="round" stroke-dasharray="339" transform="rotate(-90 104 118)"/>'+
    '<circle class="o-ringbig o-ringwarn" cx="104" cy="118" r="54" fill="none" stroke="#B8473A" stroke-width="9" stroke-linecap="round" stroke-dasharray="339" transform="rotate(-90 104 118)"/>'+
    '<path d="M104 82 L132 92 V116 C132 136 120 148 104 154 C88 148 76 136 76 116 V92 Z" fill="url(#sd'+id+')"/>'+
    '<path d="M104 86 L128 95 V116 C128 133 118 143 104 149 Z" fill="#fff" opacity=".12"/>'+
    '<path d="M92 118 l8 8 15-16" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<g transform="translate(104,190)"><rect x="-34" y="-12" width="68" height="24" rx="12" fill="#11181C"/><text x="0" y="4.5" text-anchor="middle" '+FN+' font-size="12.5" font-weight="700" fill="#F2F5F6">40분 지남</text></g>'+
    '<g transform="translate(186,62)"><g class="o-ani o-card"><circle class="o-ani o-pulse" cx="22" cy="22" r="14" fill="#B8473A"/>'+
      '<rect x="0" y="0" width="116" height="120" rx="18" fill="url(#cd'+id+')" stroke="rgba(17,24,28,.08)"/>'+
      '<circle cx="24" cy="26" r="13" fill="#1F6676"/>'+tx(24,30.5,'박',11,800,'#fff','text-anchor="middle"')+
      tx(44,23,'동료 안부',10,800,'#11181C')+'<text x="44" y="36" '+FN+' font-size="9" font-weight="600" fill="#6B767D">14:40</text>'+
      '<text '+FF+' font-size="9.5" font-weight="600" fill="#47535B"><tspan x="14" y="60">김 주무관 방문이</tspan><tspan x="14" y="74">정한 시간을 넘었어요</tspan></text>'+
      '<rect x="14" y="88" width="88" height="22" rx="11" fill="#1F6676"/>'+tx(58,102.5,'전화하기',9.5,700,'#fff','text-anchor="middle"')+'</g></g>'+
    '</svg>'; }

  // ④ 기록 — 상황 칩을 누르면 문장이 써짐
  function ill2(id){
    function chip(y,t,on,c){ return '<g transform="translate(18,'+y+')"><g class="o-ani o-chip o-'+c+'">'+
      '<rect width="128" height="34" rx="17" fill="#fff" stroke="rgba(17,24,28,.14)"/><circle cx="18" cy="17" r="6.5" fill="none" stroke="#B5BDC1" stroke-width="1.6"/>'+tx(32,21.5,t,12,700,'#47535B')+
      (on ? '<g class="o-onl"><rect width="128" height="34" rx="17" fill="#1F6676"/><rect width="128" height="17" rx="17" fill="#fff" opacity=".07"/><circle cx="18" cy="17" r="7" fill="#fff" opacity=".22"/><path d="M14.5 17l2.6 2.6 4.8-5" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+tx(32,21.5,t,12,700,'#fff')+'</g>' : '')+
      '</g></g>'; }
    var L = ["보일러 고장으로","난방이 되지 않고,","하루 한 끼만","드시는 상태임."];
    return '<svg viewBox="0 0 316 250" aria-hidden="true"><defs>'+
    '<linearGradient id="pp'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F6F3EE"/></linearGradient>'+
    '<filter id="ps'+id+'" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>'+
    chip(42,'난방 안 됨',true,'c1')+chip(86,'끼니 거름',true,'c2')+chip(130,'병원 끊김',false,'c3')+chip(174,'집이 비어 있음',false,'c4')+
    '<path d="M152 112 C162 112 162 120 172 120" stroke="#B99B63" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M168 114l6 6-6 6" stroke="#B99B63" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+
    '<rect x="186" y="54" width="112" height="156" rx="14" fill="#5B4A2E" opacity=".22" filter="url(#ps'+id+')" transform="rotate(4 242 132)"/>'+
    '<rect x="184" y="40" width="112" height="156" rx="14" fill="#EDE7DC" transform="rotate(5 240 118)"/>'+
    '<g transform="rotate(-2 240 118)"><rect x="180" y="36" width="114" height="160" rx="14" fill="url(#pp'+id+')" stroke="rgba(17,24,28,.08)"/>'+
    '<rect x="194" y="52" width="40" height="14" rx="7" fill="rgba(31,102,118,.12)"/>'+tx(214,62.5,'상담 기록',8.5,700,'#174F5B','text-anchor="middle"')+
    L.map(function(t,i){ var y = 88 + i*16; return tx(194,y,t,10,600,'#11181C')+'<rect class="o-ani o-cover o-L'+(i+1)+'" x="192" y="'+(y-11)+'" width="96" height="15" fill="#FCFBF8"/>'; }).join("")+
    
    '<g class="o-ani o-rtag"><rect x="246" y="172" width="38" height="14" rx="7" fill="#B99B63" opacity=".22"/>'+tx(265,182,'보고서로',8,700,'#8A6A35','text-anchor="middle"')+'</g></g>'+
    '</svg>'; }

  // ⑤ 연계 — 기록 칩이 종이로 날아가 보고서 한 장(hwpx)이 채워짐
  function ill4(id){
    var rows = [["방문 일시","11. 12. 14:00"],["대상 가구","H-017 (가명)"],["확인 내용","난방·끼니 위기"],["조치","연계 의뢰"]];
    var fly = [[30,112,"난방 안 됨",183,8],[30,136,"끼니 거름",183,6],[34,160,"연계 의뢰",181,-30]];
    return '<svg viewBox="0 0 316 250" aria-hidden="true"><defs>'+
    '<linearGradient id="a4'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F4F1EB"/></linearGradient>'+
    '<filter id="ds'+id+'" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7"/></filter></defs>'+
    '<g transform="rotate(-7 70 132)"><rect x="24" y="80" width="92" height="112" rx="12" fill="#3F3320" opacity=".18" filter="url(#ds'+id+')" transform="translate(2,8)"/>'+
    '<rect x="24" y="80" width="92" height="112" rx="12" fill="#FCFBF8" stroke="rgba(17,24,28,.08)"/>'+
    '<rect x="34" y="92" width="40" height="13" rx="6.5" fill="rgba(31,102,118,.12)"/>'+tx(54,101.5,'상담 기록',8,700,'#174F5B','text-anchor="middle"')+
    '<text '+FF+' font-size="8.5" font-weight="600" fill="#47535B"><tspan x="34" y="122">보일러 고장으로</tspan><tspan x="34" y="135">난방이 되지 않고,</tspan><tspan x="34" y="148">하루 한 끼만</tspan><tspan x="34" y="161">드시는 상태임.</tspan></text>'+
    '<rect x="34" y="172" width="54" height="4" rx="2" fill="#E2DCD1"/></g>'+
    '<g class="o-ani o-sheet o-b"><rect x="178" y="22" width="122" height="172" rx="8" fill="#EDE8DF" stroke="rgba(17,24,28,.06)" transform="rotate(4 239 108)"/>'+
    '<text x="250" y="40" text-anchor="middle" '+FF+' font-size="7.5" font-weight="700" fill="#8A7E6B" transform="rotate(4 239 108)">서비스 연계 의뢰서</text></g>'+
    '<g class="o-ani o-sheet"><rect x="160" y="40" width="134" height="190" rx="8" fill="#3F3320" opacity=".22" filter="url(#ds'+id+')" transform="translate(2,8)"/>'+
    '<rect x="160" y="34" width="134" height="190" rx="8" fill="url(#a4'+id+')" stroke="rgba(17,24,28,.09)"/>'+
    tx(227,58,'출장 결과 보고',10.5,800,'#11181C','text-anchor="middle"')+'<path d="M196 64h62" stroke="#11181C" stroke-width="1"/>'+
    rows.map(function(r,i){ var y = 76 + i*22; return '<rect x="172" y="'+y+'" width="40" height="20" fill="#EEF1F0" stroke="#C9CFCF" stroke-width=".6"/><rect x="212" y="'+y+'" width="70" height="20" fill="#fff" stroke="#C9CFCF" stroke-width=".6"/>'+
      tx(192,y+13,r[0],6.8,700,'#47535B','text-anchor="middle"')+'<g class="o-ani o-val o-v'+(i+1)+'">'+tx(217,y+13,r[1],6.8,600,'#11181C')+'</g>'; }).join("")+
    '<g class="o-ani o-val o-v4"><rect x="172" y="170" width="110" height="4" rx="2" fill="#E2DCD1"/><rect x="172" y="180" width="86" height="4" rx="2" fill="#E2DCD1"/></g>'+
    '<g transform="translate(250,203)"><g class="o-ani o-badge"><rect x="-19" y="-9" width="38" height="18" rx="9" fill="#1F6676"/><text x="0" y="3.5" text-anchor="middle" '+FN+' font-size="8.5" font-weight="700" fill="#fff">hwpx</text></g></g>'+
    tx(172,207,'1쪽 · A4',7.5,600,'#6B767D')+'</g>'+
    fly.map(function(f,i){ return '<g transform="translate('+f[0]+','+f[1]+')"><g class="o-fly o-f'+(i+1)+'" style="--dx:'+f[3]+'px;--dy:'+f[4]+'px"><rect width="62" height="17" rx="8.5" fill="#1F6676"/>'+tx(31,11.8,f[2],7.6,700,'#fff','text-anchor="middle"')+'</g></g>'; }).join("")+
    '</svg>'; }

  // ── 로그인 창 그림: 같은 계정 = PC와 폰 같은 화면 ──
  function syncArt(id){ return '<svg class="o-syncart" viewBox="0 0 300 150" aria-hidden="true"><defs>'+
    '<linearGradient id="sc'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7FBFB"/><stop offset="1" stop-color="#CFE0E2"/></linearGradient>'+
    '<linearGradient id="sb'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A4E59"/><stop offset="1" stop-color="#0B2A31"/></linearGradient></defs>'+
    '<ellipse cx="150" cy="138" rx="120" ry="8" fill="#000" opacity=".22"/>'+
    // PC
    '<rect x="14" y="20" width="150" height="98" rx="10" fill="url(#sb'+id+')" stroke="rgba(255,255,255,.25)"/>'+
    '<rect x="22" y="28" width="134" height="80" rx="5" fill="url(#sc'+id+')"/>'+
    '<rect x="30" y="36" width="34" height="64" rx="4" fill="#1F6676" opacity=".16"/>'+
    '<rect x="70" y="36" width="78" height="20" rx="4" fill="#fff"/><rect x="70" y="60" width="78" height="18" rx="4" fill="#fff"/><rect x="70" y="82" width="52" height="18" rx="4" fill="#B99B63" opacity=".55"/>'+
    '<path d="M76 46h40" stroke="#1F6676" stroke-width="3" stroke-linecap="round"/>'+
    '<path d="M74 118 h30 l4 14 h-38 z" fill="#0B2A31" opacity=".9"/>'+
    // 폰
    '<rect x="214" y="14" width="64" height="118" rx="13" fill="url(#sb'+id+')" stroke="rgba(255,255,255,.25)"/>'+
    '<rect x="220" y="22" width="52" height="102" rx="8" fill="url(#sc'+id+')"/>'+
    '<rect x="226" y="32" width="40" height="20" rx="4" fill="#fff"/><rect x="226" y="56" width="40" height="18" rx="4" fill="#fff"/><rect x="226" y="78" width="28" height="18" rx="4" fill="#B99B63" opacity=".55"/>'+
    '<path d="M231 42h22" stroke="#1F6676" stroke-width="3" stroke-linecap="round"/>'+
    // 연결
    '<path d="M168 62 C186 52 196 52 210 60" stroke="#8FD9E4" stroke-width="2" fill="none" stroke-dasharray="3 5" stroke-linecap="round"/>'+
    '<path d="M210 84 C196 92 186 92 168 84" stroke="#E8CE96" stroke-width="2" fill="none" stroke-dasharray="3 5" stroke-linecap="round"/>'+
    '<circle r="3.6" fill="#8FD9E4"><animateMotion dur="2.4s" repeatCount="indefinite" path="M168 62 C186 52 196 52 210 60"/></circle>'+
    '<circle r="3.6" fill="#E8CE96"><animateMotion dur="2.4s" begin="1.2s" repeatCount="indefinite" path="M210 84 C196 92 186 92 168 84"/></circle>'+
    '</svg>'; }
  var DB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/><path d="M4.5 5.5v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V5.5M4.5 12v6.5c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V12"/></svg>';
  var RE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>';

  // 단계 이름 = 앱 아래 탭 쪽 낱말(명단·동선·현장·기록·보고) · 출처 숫자 = shared/data.html 그대로
  var SLIDES = [
    { st: "명단", ey: "발굴 명단 불러오기", ill: ill0, h: '받은 발굴 명단이<br><em>오늘 볼 가구</em>로', p: "명단 파일을 넣으면 이 기기 안에서 가구 목록으로 정리됩니다.",
      src: '<b>한국사회보장정보원 발굴 명단</b> 받은 파일 그대로', key: 1 },
    { st: "동선", ey: "최적 동선 · 네이버 지도 길안내", ill: ill1, h: '가장 짧은 순서로,<br><em>네이버 지도</em> 길안내까지', p: "정한 방문 순서가 경유지 그대로 네이버 지도 앱 길안내로 이어집니다.",
      src: '<b>한국사회보장정보원 발굴 명단</b> 우선방문 정보로 순서 · 좌표는 행정안전부 주소정보누리집' },
    { st: "현장", ey: "현장 · 동료 안부", ill: ill3, h: '혼자 방문해도<br><em>동료가 함께</em>', p: "정한 시간이 지나도 소식이 없으면 동료에게 알림이 갑니다.",
      src: '<b>한국사회보장정보원 발굴 명단</b> 위기정보로 집 앞 요약 · 기상청 날씨·특보' },
    { st: "기록", ey: "상황 고르기", ill: ill2, h: '상황을 고르면<br><em>기록 문장</em>이 됩니다', p: "집 앞에서 고른 상황이 상담 기록 문장으로 바로 써집니다.",
      src: '<b>한국사회보장정보원 복지서비스 목록</b>에서 맞는 서비스를 함께 보여 줍니다' },
    { st: "보고", ey: "보고서 자동 생성", ill: ill4, h: '기록이 그대로<br><em>보고서 한 장</em>으로', p: "출장 결과 보고와 서비스 연계 의뢰서가 hwpx 한 쪽으로 만들어집니다.",
      src: '<b>한국사회보장정보원 복지서비스 목록 · 자원정보 23건</b> · 연계처 712건으로 의뢰' }
  ];
  var LOGO = '<img src="shared/icons/daeum.svg?v=s12z77" alt="">';
  var REDUCE = !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var H = { login: function () {}, start: function () {} }, OB = { d: null, i: 0, pc: false };

  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) root.localStorage.removeItem(k); else root.localStorage.setItem(k, v); } catch (e) { /* 저장소 못 씀 */ } }
  function isPc() { return (root.innerWidth || 1024) >= 1024; }
  function seen() { return !!lsGet(SEEN); }

  function html(pc, i) {
    var n = SLIDES.length, last = i === n - 1;
    var flow = '<ol class="o-flow" aria-label="업무 흐름">' + SLIDES.map(function (s, k) { var c = pc ? "o-done" : (k === i ? "o-on" : k < i ? "o-done" : "");
      return '<li class="' + c + '"><button type="button" data-dot="' + k + '" aria-current="' + (!pc && k === i) + '"><span class="o-fn">' + (k + 1) + '</span><span class="o-fl">' + s.st + "</span></button></li>"; }).join("") + "</ol>";
    var slides = SLIDES.map(function (s, k) { return '<article class="o-ob-slide' + (k === i || pc ? " o-on" : "") + '" aria-roledescription="안내 장" aria-label="' + (k + 1) + " / " + n + " " + s.ey + '">' +
      '<div class="o-ill">' + s.ill("ob" + k) + '<button class="o-replay" type="button" data-act="replay" data-k="' + k + '">' + RE + "다시 보기</button></div>" +
      '<div class="o-ob-txt"><div class="o-ob-ey"><span class="o-num">0' + (k + 1) + "</span><i></i>" + s.ey + "</div><h3>" + s.h + "</h3><p>" + s.p + "</p>" +
      '<p class="o-src' + (s.key ? " o-key" : "") + '">' + DB + "<span>" + s.src + "</span></p></div></article>"; }).join("");
    return '<div class="o-scrim"></div><div class="o-ob">' +
      '<div class="o-ob-card"><div class="o-ob-top"><div class="o-ob-brand"><span class="o-mark">' + LOGO + "</span><span><b>닿음</b><small>복지 사각지대 현장 업무 도우미</small></span></div>" +
      '<button class="o-skip" type="button" data-act="skip">건너뛰기</button></div>' +
      '<p class="o-ob-lead">발굴 명단 다음, <span>현장 업무</span>를 순서대로.</p>' + flow +
      '<div class="o-ob-view"><div class="o-ob-track" style="transform:translateX(' + (pc ? 0 : -i * 100) + '%)">' + slides + "</div></div>" +
      '<div class="o-ob-foot"><span class="o-demo-note"><span class="o-samp">가상 데이터</span>가상 48가구가 들어 있습니다</span>' +
      '<button class="o-btn o-sec" type="button" data-act="login">' + IC.key + "로그인 · 시연 계정</button>" +
      '<button class="o-btn o-pri" type="button" data-act="' + (last || pc ? "start" : "next") + '"><span class="o-lab">' + (last || pc ? "시연 데이터로 시작" : "다음") + "</span>" + IC.arrow + "</button></div></div></div>";
  }
  function play(sl) { if (!sl || REDUCE) return; sl.classList.remove("o-play"); void sl.getBoundingClientRect(); sl.classList.add("o-play"); }
  function paint() {
    var d = OB.d; if (!d) return; OB.pc = isPc();
    d.className = "dob dob-ob " + (OB.pc ? "o-m-pc" : "o-m-phone"); d.innerHTML = html(OB.pc, OB.i);
    var sl = d.querySelectorAll(".o-ob-slide"); if (OB.pc) [].forEach.call(sl, play); else play(sl[OB.i]);
  }
  function go(i) {
    var d = OB.d, n = SLIDES.length; if (!d) return; i = Math.max(0, Math.min(n - 1, i)); OB.i = i;
    var sl = d.querySelectorAll(".o-ob-slide"); if (OB.pc) { play(sl[i]); return; }
    d.querySelector(".o-ob-track").style.transform = "translateX(" + (-i * 100) + "%)";
    [].forEach.call(sl, function (s, k) { s.classList.toggle("o-on", k === i); if (k !== i) s.classList.remove("o-play"); });
    [].forEach.call(d.querySelectorAll(".o-flow li"), function (li, k) { li.className = k === i ? "o-on" : k < i ? "o-done" : ""; li.firstChild.setAttribute("aria-current", String(k === i)); });
    var b = d.querySelector(".o-ob-foot .o-pri"), last = i === n - 1;
    b.setAttribute("data-act", last ? "start" : "next"); b.querySelector(".o-lab").textContent = last ? "시연 데이터로 시작" : "다음";
    play(sl[i]);
  }
  var rzT = null;
  function onRz() { clearTimeout(rzT); rzT = setTimeout(function () { if (OB.d && OB.pc !== isPc()) paint(); }, 150); }
  /** 안내 열기 — 처음 한 번은 자동(OPT.autoFirst), 다시 보기는 «더 보기» 메뉴 */
  function open() {
    if (OB.d || typeof document === "undefined") return;
    var d = document.createElement("dialog"); d.setAttribute("aria-label", "처음 안내 — 닿음이 하는 일 다섯 가지"); OB.d = d; OB.i = 0;
    paint(); document.body.appendChild(d);
    d.addEventListener("click", function (ev) {
      var t = ev.target; if (!t || !t.closest) return;
      var dot = t.closest("[data-dot]"); if (dot) { go(+dot.getAttribute("data-dot")); return; }
      var b = t.closest("[data-act]"); if (!b) return; var a = b.getAttribute("data-act");
      if (a === "next") go(OB.i + 1);
      else if (a === "replay") play(d.querySelectorAll(".o-ob-slide")[+b.getAttribute("data-k")]);
      else if (a === "skip") close();
      else if (a === "start") { close(); H.start(); }
      else if (a === "login") { close(); H.login(); }
    });
    var x0 = null; // 폰 넘김(손가락 밀기)
    d.addEventListener("pointerdown", function (e) { if (!OB.pc && e.target.closest && e.target.closest(".o-ob-view")) x0 = e.clientX; });
    d.addEventListener("pointerup", function (e) { if (x0 === null) return; var dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 30) go(OB.i + (dx < 0 ? 1 : -1)); });
    d.addEventListener("close", function () { lsSet(SEEN, "1"); if (d.parentNode) d.parentNode.removeChild(d); if (OB.d === d) OB.d = null; root.removeEventListener("resize", onRz); });
    root.addEventListener("resize", onRz, { passive: true });
    if (d.showModal) d.showModal(); else d.setAttribute("open", "");
    var f = d.querySelector(".o-ob-foot .o-pri"); if (f) try { f.focus({ preventScroll: true }); } catch (e) { /* 무시 */ }
  }
  function close() { var d = OB.d; if (!d) return; lsSet(SEEN, "1"); if (d.close && d.open) d.close(); else { d.removeAttribute("open"); d.dispatchEvent(new Event("close")); } }
  /** 처음 여는 기기면 자동으로 — 자동 점검(webdriver)·?ob=0 이면 띄우지 않는다(캡처·시험이 막히지 않게) */
  function shouldAuto(env) {
    env = env || {};
    if (!OPT.autoFirst) return false;
    if (env.seen != null ? env.seen : seen()) return false;
    var nav = env.nav || root.navigator || {}, q = env.search != null ? env.search : (root.location && root.location.search) || "";
    if (nav.webdriver) return false;
    if (/[?&]ob=0(&|$)/.test(q)) return false;
    return true;
  }
  function maybeAuto() { if (shouldAuto()) { open(); return true; } return false; }

  var api = { OPT: OPT, SLIDES: SLIDES, SEEN: SEEN, IC: IC, open: open, close: close, maybeAuto: maybeAuto, shouldAuto: shouldAuto, seen: seen, syncArt: syncArt,
    hook: function (h) { if (h && h.login) H.login = h.login; if (h && h.start) H.start = h.start; } };
  root.DaeumOnboard = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
