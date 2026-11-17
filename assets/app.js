(function(){
  const MASCOT_SRC=document.querySelector('.mascot').src;
  const $=s=>document.querySelector(s);
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const SK='brandplan-v1', TK='brandplan-theme';
  const nf=new Intl.NumberFormat('th-TH',{maximumFractionDigits:0});
  const fmt=x=>{if(!isFinite(x))return '—';const r=Math.round(x)||0;return (r<0?'−':'')+nf.format(Math.abs(r))};
  const mny=x=>Math.abs(x)>=1e6?(x<0?'−':'')+(Math.abs(x)/1e6).toLocaleString('th-TH',{maximumFractionDigits:2})+' ล้านบาท':fmt(x)+' บาท';
  const pc=x=>isFinite(x)?(x<0?'−':'')+Math.abs(x).toLocaleString('th-TH',{maximumFractionDigits:0})+'%':'—';

  // ---------- state ----------
  function load(){try{return JSON.parse(localStorage.getItem(SK))||{}}catch(e){return{}}}
  const st=load();
  const blank=()=>({team:{owner:'',pname:'',ptype:'rx',year:'',raw:''},fin:Object.assign({},FIN_DEF),f:{},score:{},keep:{},ai:{},lesson:{good:'',fix:'',learn:''}});
  function norm(st){const S=Object.assign(blank(),st); S.fin=Object.assign({},FIN_DEF,st.fin||{}); S.team=Object.assign(blank().team,st.team||{}); if(!TYPES[S.team.ptype])S.team.ptype='rx'; S.lesson=Object.assign(blank().lesson,st.lesson||{}); ['f','score','keep','ai'].forEach(k=>{if(!S[k]||typeof S[k]!=='object')S[k]={}}); return S}
  let S=norm(st);
  let tab=Number.isInteger(st.tab)?st.tab:0;
  function save(){try{localStorage.setItem(SK,JSON.stringify(Object.assign({},S,{tab})))}catch(e){}}
  const TY=()=>TYPES[S.team.ptype]||TYPES.rx;
  const COMP={type_name:()=>TY().name,type_reg:()=>TY().reg,type_ad:()=>TY().ad,type_ch:()=>TY().ch,type_cust:()=>TY().cust,type_access:()=>TY().access,
    fin:()=>finText(),budget:()=>{const a=actSum();return a.total?fmt(a.total)+' บาท ('+a.rows.length+' กิจกรรม)':''}};
  const v=k=>String(k in COMP?COMP[k]():(k in S.team?S.team[k]:S.f[k]||'')).trim();
  const LBL={pname:'ชื่อผลิตภัณฑ์',raw:'ข้อมูลดิบในหน้าเริ่มต้น',year:'ปีของแผน',fin:'ตัวเลขการเงินจากขั้นที่ 6',budget:'งบกิจกรรมจากขั้นที่ 5'}; ROUNDS.forEach(r=>r.fields.forEach(f=>LBL[f[0]]=f[1]));
  const lines=t=>String(t||'').split(/\r?\n/).map(x=>x.replace(/^\s*(?:[-•*]|\d+[.)])\s+/,'').trim()).filter(Boolean);
  const num=k=>{const x=parseFloat(String(S.f[k]||'').replace(/[,\s]/g,''));return isFinite(x)&&x>0?x:0};

  // ---------- activity plan ----------
  function parseMoney(t){t=String(t||'');const m=t.replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);if(!m)return 0;let x=parseFloat(m[0]);if(/ล้าน/.test(t))x*=1e6;else if(/แสน/.test(t))x*=1e5;else if(/พัน|k\b/i.test(t))x*=1e3;return x}
  function parseQ(t){t=String(t||'').toUpperCase();if(/ทั้งปี|ตลอดปี|ALL/.test(t))return [1,2,3,4];const r=t.match(/Q?([1-4])\s*[-–—ถึง]+\s*Q?([1-4])/);if(r){const a=+r[1],b=+r[2],o=[];for(let i=Math.min(a,b);i<=Math.max(a,b);i++)o.push(i);return o}const m=t.match(/Q\s*[1-4]/g);return m?[...new Set(m.map(x=>+x.replace(/\D/g,'')))]:[]}
  function actSum(){
    const rows=lines(S.f.acts).filter(l=>l.includes('|')).map(l=>{const p=l.split('|').map(x=>x.trim());return {name:p[0]||'',strat:(p[1]||'').toUpperCase().match(/S\s*\d/)?.[0].replace(/\s/g,'')||(p[1]||''),target:p[2]||'',qs:parseQ(p[3]),qt:p[3]||'',budget:parseMoney(p[4]),kpi:p[5]||'',owner:p[6]||''}}).filter(r=>r.name&&!/^กิจกรรม$/.test(r.name)&&!/^[-: ]+$/.test(r.name));
    const byQ=[0,0,0,0],byS={};let total=0;
    rows.forEach(r=>{total+=r.budget;const q=r.qs.length?r.qs:[1,2,3,4];q.forEach(i=>byQ[i-1]+=r.budget/q.length);const s=r.strat||'ไม่ระบุ';byS[s]=(byS[s]||0)+r.budget});
    return {rows,total,byQ,byS};
  }
  const stratName=s=>{const L=lines(S.f.strat).find(x=>x.toUpperCase().replace(/\s/g,'').startsWith(s));return L?L.replace(/^S\s*\d\s*[:：.)-]?\s*/i,'').replace(/\s*\(.*?\)\s*$/,''):''};

  // ---------- finance model ----------
  function fin(){
    const f=S.fin,n=k=>+f[k]||0,gp=n('price')-n('cogs'),a=actSum(),ap1=n('ap')>0?n('ap'):a.total;
    const Y=[];let u=n('y1_units'),b=n('base_units');
    for(let y=1;y<=3;y++){
      if(y===2)u*=1+n('g2_pct')/100; if(y===3)u*=1+n('g3_pct')/100; b*=1+n('base_growth')/100;
      const ap=y===1?ap1:ap1*n(y===2?'ap2_pct':'ap3_pct')/100, spend=ap+n('other'), inc=u-b;
      Y.push({y,u,b,rev:u*n('price'),brev:b*n('price'),gpv:u*gp,inc,incRev:inc*n('price'),incGP:inc*gp,ap,spend,contrib:u*gp-spend,roi:spend>0?(inc*gp-spend)/spend*100:NaN,ratio:u*n('price')>0?ap/(u*n('price'))*100:NaN});
    }
    const tS=Y.reduce((s,x)=>s+x.spend,0),tG=Y.reduce((s,x)=>s+x.incGP,0);
    return {Y,gp,ap1,apFrom:n('ap')>0?'manual':'acts',roi3:tS>0?(tG-tS)/tS*100:NaN,be:gp>0?Y[0].spend/gp:Infinity,has:n('price')>0&&n('y1_units')>0};
  }
  function finText(){const r=fin();if(!r.has)return '';const y=r.Y;return 'ราคาสุทธิ '+fmt(S.fin.price)+' บาท/หน่วย · กำไรขั้นต้น '+fmt(r.gp)+' บาท/หน่วย · ยอดขายตามแผนปีที่ 1–3: '+y.map(x=>fmt(x.u)).join(' / ')+' หน่วย · รายได้: '+y.map(x=>mny(x.rev)).join(' / ')+' · ยอดขายถ้าไม่ทำแผน: '+y.map(x=>fmt(x.b)).join(' / ')+' หน่วย · งบที่ใช้ต่อปี: '+y.map(x=>mny(x.spend)).join(' / ')+' · ROI ปีที่ 1–3: '+y.map(x=>pc(x.roi)).join(' / ')+' · ROI สะสม 3 ปี '+pc(r.roi3)}
  function kpiList(r){const y=r.Y[0];return [
    ['รายได้ปีที่ 1',mny(y.rev),'ถ้าไม่ทำแผน: '+mny(y.brev),''],
    ['ยอดขายส่วนเพิ่มจากแผน',fmt(y.inc)+' หน่วย','รายได้ส่วนเพิ่ม '+mny(y.incRev),y.inc>0?'good':'bad'],
    ['งบที่ใช้ปีที่ 1',mny(y.spend),'งบการตลาด '+pc(y.ratio)+' ของยอดขาย'+(r.apFrom==='acts'?' · จากแผนกิจกรรม':''),''],
    ['ROI ปีที่ 1',pc(y.roi),'(กำไรขั้นต้นส่วนเพิ่ม − งบ) ÷ งบ',y.roi>=0?'good':'bad'],
    ['ROI สะสม 3 ปี',pc(r.roi3),'ปีที่ 2: '+pc(r.Y[1].roi)+' · ปีที่ 3: '+pc(r.Y[2].roi),r.roi3>=0?'good':'bad'],
    ['จุดคุ้มทุนของงบ',isFinite(r.be)?fmt(r.be)+' หน่วย':'—','หน่วยที่ต้องขายเพิ่มจาก baseline ในปีที่ 1',isFinite(r.be)&&y.inc>=r.be?'good':'']]}
  const CH={base:'#9AA7C7',plan:'#1D2D52',spend:'#D9A13B'};
  function chartSVG(r,W,H){
    const P={l:64,r:14,t:14,b:34},iw=W-P.l-P.r,ih=H-P.t-P.b,max=Math.max(1,...r.Y.map(y=>Math.max(y.rev,y.brev,y.spend)))*1.08;
    const yy=x=>P.t+ih-(x/max)*ih,gw=iw/3,bw=gw*0.22;let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="รายได้ถ้าไม่ทำแผน รายได้ตามแผน และงบที่ใช้ ปีที่ 1 ถึง 3" style="width:100%;height:auto;font-family:inherit">';
    for(let i=0;i<=4;i++){const val=max*i/4,y=yy(val);s+='<line x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+y+'" y2="'+y+'" stroke="#DCE1EA"/><text x="'+(P.l-8)+'" y="'+(y+4)+'" text-anchor="end" font-size="12" fill="#566178">'+(val/1e6).toLocaleString('th-TH',{maximumFractionDigits:1})+'</text>'}
    r.Y.forEach((y,i)=>{const x0=P.l+i*gw+gw*0.14;[['brev',CH.base],['rev',CH.plan],['spend',CH.spend]].forEach(([k,c],j)=>{const h=(y[k]/max)*ih;s+='<rect x="'+(x0+j*(bw+4))+'" y="'+(P.t+ih-h)+'" width="'+bw+'" height="'+Math.max(0,h)+'" fill="'+c+'" rx="3"/>'});s+='<text x="'+(P.l+i*gw+gw/2)+'" y="'+(H-10)+'" text-anchor="middle" font-size="13" fill="#566178">ปีที่ '+y.y+'</text>'});
    return s+'<text x="6" y="12" font-size="11" fill="#566178">ล้านบาท</text></svg>';
  }
  const LEG='<span><i style="background:'+CH.base+'"></i>รายได้ถ้าไม่ทำแผน</span><span><i style="background:'+CH.plan+'"></i>รายได้ตามแผน</span><span><i style="background:'+CH.spend+'"></i>งบที่ใช้</span>';
  const askVal=()=>num('ask')||(fin().has?fin().Y[0].spend:actSum().total);

  // ---------- theme ----------
  const SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
  const AUTO='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>';
  const TM=[['auto','ตามเครื่อง',AUTO],['light','สว่าง',SUN],['dark','มืด',MOON]];
  let theme='auto'; try{theme=localStorage.getItem(TK)||'auto'}catch(e){}
  function applyTheme(){const r=document.documentElement; theme==='auto'?r.removeAttribute('data-theme'):r.setAttribute('data-theme',theme); const t=TM.find(x=>x[0]===theme)||TM[0]; $('#themeBtn').innerHTML=t[2]+'<span class="tl">'+t[1]+'</span>'}
  $('#themeBtn').addEventListener('click',()=>{theme=TM[(TM.findIndex(x=>x[0]===theme)+1)%3][0];try{localStorage.setItem(TK,theme)}catch(e){}applyTheme()});
  applyTheme();

  function copy(txt,flag,box,msg){
    const ok=()=>{flag.textContent=msg;flag.hidden=false;clearTimeout(flag._t);flag._t=setTimeout(()=>flag.hidden=true,2500)};
    const fb=()=>{let ta=box.querySelector('textarea.fallback');if(!ta){ta=document.createElement('textarea');ta.className='fallback';ta.setAttribute('aria-label','ข้อความสำหรับคัดลอก');box.appendChild(ta)}ta.value=txt;ta.focus();ta.select();try{if(document.execCommand('copy')){ok();return}}catch(e){} flag.textContent='เลือกข้อความไว้ให้แล้ว กด Ctrl/Cmd+C เพื่อคัดลอก';flag.hidden=false};
    try{navigator.clipboard.writeText(txt).then(ok,fb)}catch(e){fb()}
  }
  const tip=t=>'<div class="tip"><img alt="" src="'+MASCOT_SRC+'"><div><b>อ.หมี แนะนำ</b><p>'+t+'</p></div></div>';
  const importSpec=r=>'\n\nปิดท้ายคำตอบด้วยหัวข้อ "สำหรับนำเข้า" โดยเขียนสรุปของแต่ละช่องให้พร้อมใช้ ขึ้นบรรทัดใหม่ด้วยรหัสในวงเล็บเหลี่ยมคู่ แล้วตามด้วยข้อความของช่องนั้น ใช้รหัสต่อไปนี้ให้ครบ:\n'+r.fields.map(f=>'[['+f[0]+']] '+f[1]).join('\n');
  function promptText(r,html){
    const fill=t=>t.replace(/\{(\w+)\}/g,(m,k)=>{const x=v(k)||('[ยังไม่มี: '+(LBL[k]||k)+']');return html?'<span class="fill">'+esc(x)+'</span>':x});
    const body=r.T.map(l=>html?fill(esc(l)):fill(l)).join('\n\n'), F=r.F+(r.fin?'':importSpec(r));
    return html?'<span class="lbl">บทบาทของ AI (R):</span> '+esc(r.R)+'\n\n<span class="lbl">งานที่ให้ทำ (T):</span>\n'+body+'\n\n<span class="lbl">รูปแบบและเงื่อนไข (F, C):</span> '+esc(F)
               :'บทบาทของ AI (R): '+r.R+'\n\nงานที่ให้ทำ (T):\n'+body+'\n\nรูปแบบและเงื่อนไข (F, C): '+F;
  }
  function importFields(r,txt){let n=0;const keys=new Set(r.fields.map(f=>f[0]));const re=/\[\[\s*(\w+)\s*\]\]/g;let m,marks=[];while((m=re.exec(txt)))marks.push({k:m[1],s:m.index,e:re.lastIndex});
    marks.forEach((mk,i)=>{if(!keys.has(mk.k))return;let val=txt.slice(mk.e,i+1<marks.length?marks[i+1].s:txt.length);
      val=val.replace(/```/g,'').replace(/\*\*/g,'').split(/\r?\n/).map(x=>x.replace(/^\s*(?:[-•*]|\d+[.)])\s+/,'').trim()).filter(Boolean);
      const lab=(LBL[mk.k]||'').replace(/\s*\(.*$/,'');if(val[0]&&lab&&val[0].replace(/[:：]\s*$/,'')===lab)val.shift();else if(val[0]&&lab&&val[0].startsWith(lab)&&/^\s*[:：]/.test(val[0].slice(lab.length)))val[0]=val[0].slice(lab.length);
      val=val.join('\n').replace(/^[:：\s]+/,'').trim();if(val){S.f[mk.k]=val;n++}});
    return n}
  const roundDone=n=>{const r=ROUNDS[n-1];const filled=r.fin?(fin().has?2:0):r.fields.filter(f=>v(f[0])).length;const need=r.fin?1:Math.ceil(r.fields.length*0.6);return filled>=need&&(S.score[n]||[]).filter(Boolean).length===3};

  // ---------- tabs ----------
  const TABS=['เริ่มต้น'].concat(ROUNDS.map(r=>r.short),['Brand plan']);
  const LAST=TABS.length-1;
  function renderTabs(){
    $('#tabbar').innerHTML=TABS.map((t,i)=>{const done=i>=1&&i<LAST&&roundDone(i);return '<button type="button" data-tab="'+i+'"'+(i===tab?' aria-current="page"':'')+'><span class="n">'+(done?'✓':i===0?'0':i===LAST?'★':i)+'</span>'+t+'</button>'}).join('');
    const c=$('#tabbar [aria-current]'); if(c&&c.scrollIntoView){try{c.scrollIntoView({block:'nearest',inline:'nearest'})}catch(e){}}
  }
  $('#tabbar').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)go(+b.dataset.tab)});
  function go(i){tab=i;save();renderTabs();render();window.scrollTo({top:0})}
  function nav(app){if(tab>=LAST)return;app.querySelector('.panel').insertAdjacentHTML('beforeend','<div class="row navnext"><span style="flex:1"></span><button type="button" class="primary" data-next>ไปขั้นถัดไป: '+TABS[tab+1]+' →</button></div>');app.querySelector('[data-next]').addEventListener('click',()=>go(tab+1))}

  // ---------- render ----------
  function render(){const app=$('#app'); if(tab===0)renderStart(app); else if(tab<LAST)renderRound(app,ROUNDS[tab-1]); else renderSlides(app)}
  const typeCard=()=>{const t=TY();return '<div class="typeinfo"><div><b>ใครตัดสินใจ</b><p>'+esc(t.cust)+'</p></div><div><b>ช่องทาง</b><p>'+esc(t.ch)+'</p></div><div><b>การขึ้นทะเบียน</b><p>'+esc(t.reg)+'</p></div><div><b>การโฆษณาและส่งเสริมการขาย</b><p>'+esc(t.ad)+'</p></div></div><p class="note">สรุปเพื่อใช้วางแผนเท่านั้น ไม่ใช่คำแนะนำทางกฎหมาย ให้ยืนยันกับฝ่าย Regulatory Affairs และประกาศ อย. ฉบับล่าสุดทุกครั้ง</p>'};
  function renderStart(app){
    app.innerHTML='<section class="panel">'+
      '<div class="card"><h2>จากข้อมูลเท่าที่มีในมือ สู่ brand plan ที่พร้อมนำเสนอของบ</h2><p class="lead">เริ่มจากวางข้อมูลผลิตภัณฑ์เท่าที่มี แล้วเดินไปทีละขั้น 7 ขั้น: product concept → วิเคราะห์สถานการณ์ → กลยุทธ์ → ข้อความและ compliance → ส่วนประสมและแผนกิจกรรม → ยอดขาย งบ และ ROI → ตัวชี้วัดและสิ่งที่ขออนุมัติ หน้าเว็บจะรวมทุกอย่างเป็นสไลด์ brand plan 16 หน้า พร้อมตารางแผนกิจกรรมที่นำไปลงมือทำต่อได้</p>'+
      '<h3 style="margin-top:16px">ในแต่ละขั้น ทำ 4 อย่างนี้</h3><div class="loop"><div><b>อ่านหลักการของขั้นนั้น</b><span>สิ่งที่แผนของบริษัทยาต้องมี</span></div><div><b>ให้ AI ช่วยร่าง</b><span>คัดลอก prompt ที่ใส่ข้อมูลของเราไว้ให้แล้ว</span></div><div><b>พิจารณาคำตอบของ AI</b><span>เก็บ แก้ หรือทิ้ง แล้วให้คะแนน</span></div><div><b>บันทึกข้อสรุป</b><span>กดนำคำตอบของ AI ไปใส่ช่อง แล้วแก้ให้เป็นของเรา</span></div></div></div>'+
      tip('ใช้เครื่องมือ AI ที่บริษัทอนุมัติ และปิดการนำข้อมูลไปฝึกโมเดล · ห้ามใส่ชื่อแพทย์ ชื่อผู้ป่วย ราคาตามสัญญา หรือข้อมูลที่ยังไม่เปิดเผย · AI ช่วยร่างและท้าทายแผนได้ แต่ข้อบ่งใช้ ตัวเลข และการตัดสินใจ ต้องยืนยันกับเอกสารและคนที่รับผิดชอบ')+
      '<div class="card"><h3>ผลิตภัณฑ์ของเรา</h3><div class="fields">'+tf('pname','ชื่อผลิตภัณฑ์หรือแบรนด์','เช่น Glucoxa')+tf('owner','ผู้จัดทำแผน หรือชื่อทีม','เช่น ทีม Cardiometabolic')+
      '<div class="field"><label for="t_ptype">ประเภทผลิตภัณฑ์</label><select id="t_ptype" data-team="ptype">'+Object.keys(TYPES).map(k=>'<option value="'+k+'"'+(S.team.ptype===k?' selected':'')+'>'+esc(TYPES[k].name)+'</option>').join('')+'</select></div>'+tf('year','ปีของแผน','เช่น 2570')+
      '<div class="field wide"><label for="t_raw">ข้อมูลเท่าที่มีในมือ (วางได้เลย ไม่ต้องจัดรูปแบบ)</label><textarea id="t_raw" data-team="raw" class="aians" placeholder="เช่น ข้อความจากเอกสารกำกับยาหรือฉลาก ข้อบ่งใช้ ราคา ยอดขายปีที่แล้ว คู่แข่ง จุดเด่น ปัญหาที่ทีมขายเจอ ความเห็นของลูกค้า">'+esc(S.team.raw)+'</textarea><div class="help">ข้อมูลนี้จะถูกใส่ใน prompt ของขั้นที่ 1, 2 และ 6 ยิ่งมีข้อมูลจริงมาก AI ยิ่งเดาน้อย · ตัดชื่อบุคคลและข้อมูลลับออกก่อนวาง</div></div></div>'+
      '<h3 style="margin-top:18px">สิ่งที่ต้องรู้ของผลิตภัณฑ์ประเภทนี้</h3><div id="typeBox">'+typeCard()+'</div>'+
      '<div class="row" style="margin-top:12px"><button type="button" id="loadEx">ดูตัวอย่างที่กรอกครบทุกขั้น (ยาสมมติ Glucoxa)</button><span class="note" id="exMsg" role="status"></span></div></div>'+
      '<div class="card datacard"><h3>เก็บงาน เปิดงานเดิม และล้างข้อมูล</h3><p class="lead">ข้อมูลเก็บไว้ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ถูกส่งไปที่ใด ถ้าจะทำต่อที่เครื่องอื่นหรือส่งให้เพื่อนร่วมทีม ให้บันทึกเป็นไฟล์แผน แล้วเปิดไฟล์นั้นในเครื่องใหม่</p><div class="row" style="margin-top:10px"><button type="button" id="saveJson">บันทึกไฟล์แผน (.json)</button><button type="button" id="openJson">เปิดไฟล์แผน</button><input type="file" id="jsonFile" accept=".json,application/json" hidden><button type="button" class="danger" id="clearAll">ล้างข้อมูลทั้งหมด</button><span class="note" id="clearMsg" role="status"></span></div></div></section>';
    app.querySelectorAll('[data-team]').forEach(el=>el.addEventListener('input',()=>{S.team[el.dataset.team]=el.value;save();if(el.dataset.team==='ptype')$('#typeBox').innerHTML=typeCard()}));
    twoClick($('#loadEx'),'กดอีกครั้งเพื่อแทนที่ข้อมูลเดิมด้วยตัวอย่าง',()=>hasData(),()=>{S=norm(JSON.parse(JSON.stringify(EXAMPLE)));save();render();renderTabs();$('#exMsg').textContent='เติมตัวอย่างยาสมมติ Glucoxa แล้ว ลองเปิดดูทุกขั้น แล้วล้างข้อมูลก่อนเริ่มงานจริง'});
    twoClick($('#clearAll'),'กดอีกครั้งเพื่อยืนยันการล้างข้อมูล',()=>true,()=>{S=blank();try{localStorage.removeItem(SK)}catch(e){}render();renderTabs();$('#clearMsg').textContent='ล้างข้อมูลเรียบร้อยแล้ว'});
    const say=t=>$('#clearMsg').textContent=t;
    $('#saveJson').addEventListener('click',()=>saveBlob(fname('.json'),new Blob([JSON.stringify(S,null,1)],{type:'application/json'}),say,'บันทึกไฟล์แผนแล้ว'));
    $('#openJson').addEventListener('click',()=>$('#jsonFile').click());
    $('#jsonFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=()=>{try{const d=JSON.parse(rd.result);if(!d||typeof d!=='object'||!d.team)throw 0;S=norm(d);save();render();renderTabs();$('#clearMsg').textContent='เปิดไฟล์แผนแล้ว'}catch(err){say('ไฟล์นี้ไม่ใช่ไฟล์แผนจากหน้านี้')}};rd.readAsText(f)});
    nav(app);
  }
  const hasData=()=>!!(S.team.pname||S.team.raw||Object.values(S.f).some(Boolean)||+S.fin.price);
  async function saveBlob(name,blob,show,okMsg){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000);show(okMsg)}
  const fname=ext=>{const slug=v('pname').replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,30);const d=new Date(),z=n=>String(n).padStart(2,'0');return 'brandplan-'+(slug?slug+'-':'')+d.getFullYear()+z(d.getMonth()+1)+z(d.getDate())+ext};
  function twoClick(b,armTxt,need,act){const orig=b.textContent;let t=null;b.addEventListener('click',()=>{if(need()&&!t){b.textContent=armTxt;b.classList.add('armed');t=setTimeout(()=>{t=null;b.textContent=orig;b.classList.remove('armed')},4000);return}clearTimeout(t);t=null;act()})}
  const tf=(k,l,ph)=>'<div class="field"><label for="t_'+k+'">'+l+'</label><input id="t_'+k+'" data-team="'+k+'" value="'+esc(S.team[k])+'" placeholder="'+esc(ph)+'"></div>';
  const fieldHTML=(r,[k,l,t,ph])=>'<div class="field'+(t==='area'?' wide':'')+'"><label for="f_'+k+'">'+l+'</label>'+(t==='input'?'<input id="f_'+k+'" data-f="'+k+'" value="'+esc(S.f[k]||'')+'" placeholder="'+esc(ph)+'">':'<textarea id="f_'+k+'" data-f="'+k+'"'+(k==='acts'?' class="aians"':'')+' placeholder="'+esc(ph)+'">'+esc(S.f[k]||'')+'</textarea>')+'</div>';

  function renderRound(app,r){
    const sc=S.score[r.n]||[0,0,0];
    let h='<section class="panel">'+
      '<div class="card roundhead"><div class="rn">ขั้นที่ '+r.n+'</div><div><h2>'+r.t+'</h2><p class="lead">'+r.q+'</p></div></div>'+
      '<div class="card"><h3>หลักการของขั้นนี้ <span class="tag">'+r.tag+'</span></h3><ol class="learn">'+r.learn.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>'+
      '<div class="step"><span>1</span>ให้ AI ช่วยร่าง</div>'+
      '<article class="prompt m"><div class="body"><p class="note" style="margin:0">prompt นี้ใส่ข้อมูลที่บันทึกไว้ให้แล้ว (ข้อความสีน้ำเงิน) กดคัดลอกแล้วนำไปวางในเครื่องมือ AI ที่บริษัทอนุมัติ ถ้ามีเอกสารประกอบ เช่น เอกสารกำกับยาหรือไฟล์ยอดขาย ให้แนบไปด้วย</p><div class="promptbox" id="pbox">'+promptText(r,true)+'</div><div class="row"><button type="button" class="primary" id="cp">คัดลอก prompt</button><button type="button" id="ex">แสดงทั้งหมด</button><span class="copied" id="cpf" hidden></span></div></div></article>';
    if(r.fin) h+=finBlock();
    h+='<div class="step"><span>2</span>วางคำตอบของ AI แล้วพิจารณา</div>'+
      '<div class="card score"><div class="field"><label for="aiAns">วางคำตอบเต็มของ AI ไว้ที่นี่</label><textarea id="aiAns" class="aians" placeholder="คัดลอกคำตอบทั้งหมดจาก AI มาวาง">'+esc(S.ai[r.n]||'')+'</textarea>'+(r.fin?'':'<div class="row" style="margin-top:8px"><button type="button" class="primary" id="doFill">นำคำตอบของ AI ไปใส่ช่องด้านล่าง</button><span class="copied" id="fillMsg" hidden></span></div>')+'</div>'+
      CRIT.map((c,i)=>'<div class="crit"><div><b>'+c[1]+'</b><span>'+c[2]+'</span></div><div class="seg" role="radiogroup" aria-label="'+c[1]+'">'+[1,2,3].map(x=>'<button type="button" role="radio" data-c="'+i+'" data-x="'+x+'" aria-checked="'+(sc[i]===x)+'">'+LV[x]+'</button>').join('')+'</div></div>').join('')+
      '<div class="field"><label for="keep">เก็บอะไร แก้อะไร ทิ้งอะไร และเพราะอะไร</label><textarea id="keep" placeholder="เช่น ทิ้งข้อความเรื่องลดน้ำหนัก เพราะไม่ใช่ข้อบ่งใช้">'+esc(S.keep[r.n]||'')+'</textarea></div></div>'+
      '<div class="step"><span>3</span>บันทึกข้อสรุป (ข้อความนี้จะไปอยู่ใน brand plan)</div>'+
      '<div class="card"><div class="fields">'+r.fields.map(f=>fieldHTML(r,f)).join('')+'</div></div>'+(r.acts?'<div class="card"><h3>สรุปแผนกิจกรรมและงบประมาณ</h3><div id="actBox"></div></div>':'')+'</section>';
    app.innerHTML=h;
    $('#cp').addEventListener('click',()=>copy(promptText(r,false),$('#cpf'),$('#cp').closest('.body'),'คัดลอกแล้ว นำไปวางใน AI ได้เลย'));
    $('#ex').addEventListener('click',e=>{const b=$('#pbox');b.classList.toggle('open');e.currentTarget.textContent=b.classList.contains('open')?'ย่อ':'แสดงทั้งหมด'});
    app.querySelectorAll('[data-c]').forEach(b=>b.addEventListener('click',()=>{const s=S.score[r.n]||[0,0,0];s[+b.dataset.c]=+b.dataset.x;S.score[r.n]=s;save();b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-checked',x===b));renderTabs()}));
    $('#keep').addEventListener('input',e=>{S.keep[r.n]=e.target.value;save()});
    $('#aiAns').addEventListener('input',e=>{S.ai[r.n]=e.target.value;save()});
    const df=$('#doFill'); if(df) twoClick(df,'กดอีกครั้งเพื่อแทนที่ข้อความในช่องที่มีอยู่',()=>r.fields.some(f=>v(f[0])),()=>{const n=importFields(r,$('#aiAns').value);save();const m=$('#fillMsg');m.hidden=false;m.textContent=n?'ใส่ให้แล้ว '+n+' ช่อง อ่านและแก้ให้เป็นของเราก่อนไปต่อ':'ไม่พบส่วน “สำหรับนำเข้า” ที่มีรหัส [[...]] ให้คัดลอกข้อความมาใส่ช่องเอง หรือขอให้ AI เขียนส่วนนั้นใหม่';
      if(n){r.fields.forEach(f=>{const el=$('#f_'+f[0]);if(el)el.value=S.f[f[0]]||''});if(r.acts)updActs();renderTabs()}});
    app.querySelectorAll('[data-f]').forEach(el=>el.addEventListener('input',()=>{S.f[el.dataset.f]=el.value;save();if(el.dataset.f==='acts')updActs();clearTimeout(el._t);el._t=setTimeout(renderTabs,400)}));
    if(r.acts) updActs();
    if(r.fin) bindFin(app);
    nav(app);
  }
  function actTableHTML(a){return '<table class="fs acts"><thead><tr><th>กิจกรรม</th><th>กลยุทธ์</th><th>กลุ่มเป้าหมาย</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th>งบ (บาท)</th><th>KPI</th><th>ผู้รับผิดชอบ</th></tr></thead><tbody>'+a.rows.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.strat)+'</td><td>'+esc(r.target)+'</td>'+[1,2,3,4].map(q=>'<td class="q'+(r.qs.includes(q)?' on':'')+'">'+(r.qs.includes(q)?'●':'')+'</td>').join('')+'<td class="num">'+fmt(r.budget)+'</td><td>'+esc(r.kpi)+'</td><td>'+esc(r.owner)+'</td></tr>').join('')+'</tbody><tfoot><tr><td colspan="3">รวมงบรายไตรมาส</td>'+a.byQ.map(x=>'<td class="num">'+(x?(x/1e6).toFixed(2):'')+'</td>').join('')+'<td class="num">'+fmt(a.total)+'</td><td colspan="2">ไตรมาส: หน่วยล้านบาท</td></tr></tfoot></table>'}
  function updActs(){const el=$('#actBox');if(!el)return;const a=actSum();
    if(!a.rows.length){el.innerHTML='<p class="note">เมื่อกรอกแผนกิจกรรมในรูปแบบ “กิจกรรม | กลยุทธ์ | กลุ่มเป้าหมาย | ไตรมาส | งบ | KPI | ผู้รับผิดชอบ” ตารางสรุปและงบรวมจะแสดงที่นี่</p>';return}
    const noQ=a.rows.filter(r=>!r.qs.length).length,noB=a.rows.filter(r=>!r.budget).length;
    el.innerHTML='<div class="kpis">'+[['งบกิจกรรมรวม',mny(a.total),a.rows.length+' กิจกรรม']].concat(Object.keys(a.byS).sort().map(s=>['งบของ '+s,mny(a.byS[s]),stratName(s)||''])).map(([k,x,s])=>'<div class="kpi"><div class="k">'+esc(k)+'</div><div class="v">'+x+'</div><div class="s">'+esc(s)+'</div></div>').join('')+'</div>'+
      '<div class="tablewrap" style="margin-top:12px">'+actTableHTML(a)+'</div>'+((noQ||noB)?'<p class="note" style="color:var(--neg)">'+(noQ?noQ+' กิจกรรมยังไม่ระบุไตรมาส (ระบบจะเฉลี่ยงบทั้งปี) ':'')+(noB?noB+' กิจกรรมยังไม่มีงบ':'')+'</p>':'')+
      '<p class="note">งบรวมนี้จะถูกใช้เป็นงบการตลาดปีที่ 1 ในขั้นที่ 6 โดยอัตโนมัติ เว้นแต่จะกรอกงบเองในขั้นนั้น</p>'}

  // finance block
  function finBlock(){
    return '<div class="card paste"><label for="importBox">วางคำตอบของ AI (ทั้งหมด หรือเฉพาะบล็อก key = ตัวเลข) แล้วกด “นำตัวเลขไปใส่ในตาราง”</label><textarea id="importBox" placeholder="price = 1050&#10;cogs = 260&#10;..."></textarea><div class="row" style="margin-top:8px"><button type="button" class="primary" id="doImport">นำตัวเลขไปใส่ในตาราง</button><span class="copied" id="importMsg" hidden></span></div></div>'+
      '<div class="step"><span>ตรวจและแก้ตัวเลข</span>ทุกตัวเลขแก้เองได้ ผลลัพธ์คำนวณใหม่ทันที</div>'+
      '<div class="sim"><form class="inputs" id="finForm" autocomplete="off">'+FIN_META.map(([g,rows])=>'<fieldset><legend>'+g+'</legend>'+rows.map(([k,l,u,h])=>'<div class="inp"><label for="n_'+k+'">'+l+' <span class="unit">('+u+')</span></label><input type="number" step="any" id="n_'+k+'" data-k="'+k+'" value="'+(+S.fin[k]||0)+'">'+(h?'<div class="help">'+h+'</div>':'')+'</div>').join('')+'</fieldset>').join('')+'</form>'+
      '<div class="out"><div class="kpis" id="kpis"></div><div class="card"><h3>รายได้และงบที่ใช้ ปีที่ 1–3</h3><div class="legend">'+LEG+'</div><div id="chart"></div></div>'+
      '<div class="card"><h3>ปีที่ 1–3</h3><div class="tablewrap" id="yt"></div></div>'+
      '<details class="card ref"><summary><b>สูตรที่ใช้คำนวณ</b></summary><ul>'+
      '<li>กำไรขั้นต้นต่อหน่วย = ราคาขายสุทธิ − ต้นทุนสินค้า</li><li>ยอดขายถ้าไม่ทำแผน (baseline) ปีที่ n = ยอดปัจจุบัน × (1 + การเติบโตถ้าไม่ทำแผน)<sup>n</sup></li><li>ยอดขายส่วนเพิ่ม = ยอดขายตามแผน − baseline</li>'+
      '<li>งบที่ใช้ = งบการตลาด + ค่าใช้จ่ายอื่นที่เพิ่มขึ้นเพราะแผน · งบการตลาดปีที่ 1 ใช้ผลรวมจากแผนกิจกรรม เมื่อช่องงบการตลาดเป็น 0</li><li>ROI = (กำไรขั้นต้นส่วนเพิ่ม − งบที่ใช้) ÷ งบที่ใช้</li><li>จุดคุ้มทุนของงบ = งบที่ใช้ปีที่ 1 ÷ กำไรขั้นต้นต่อหน่วย</li>'+
      '<li>เป็นแบบจำลองอย่างง่ายเพื่อประกอบการขออนุมัติ ไม่ได้คิดภาษี ค่าใช้จ่ายทีมขายเดิม สินค้าคงคลัง และมูลค่าเงินตามเวลา ควรให้ฝ่ายการเงินตรวจก่อนนำเสนอ</li></ul></details></div></div>';
  }
  function bindFin(app){
    $('#finForm').addEventListener('input',e=>{const k=e.target.dataset.k;if(!k)return;const x=parseFloat(e.target.value);S.fin[k]=isFinite(x)?x:0;save();updFin();renderTabs()});
    $('#finForm').addEventListener('submit',e=>e.preventDefault());
    $('#doImport').addEventListener('click',()=>{const txt=$('#importBox').value||$('#aiAns').value;let n=0;
      txt.split(/\r?\n/).forEach(line=>{const m=line.replace(/[`*|]/g,' ').match(/^\s*([a-z_0-9]+)\s*[=:]\s*(-?[\d.,]+)/i);if(!m)return;const k=m[1].toLowerCase();if(!(k in FIN_DEF))return;const x=parseFloat(m[2].replace(/,/g,''));if(isFinite(x)){S.fin[k]=x;n++}});
      save();const msg=$('#importMsg');msg.hidden=false;msg.textContent=n?'นำตัวเลขไปใส่แล้ว '+n+' ค่า ตรวจและแก้ได้ในตารางด้านล่าง':'ไม่พบบรรทัดแบบ key = ตัวเลข ลองวางเฉพาะบล็อกโค้ดที่ AI ให้มา';
      if(n){Object.keys(FIN_DEF).forEach(k=>{const el=$('#n_'+k);if(el)el.value=+S.fin[k]||0});updFin();renderTabs()}});
    updFin();
  }
  const yrTable=r=>'<table class="fs"><thead><tr><th>รายการ</th><th>ปีที่ 1</th><th>ปีที่ 2</th><th>ปีที่ 3</th></tr></thead><tbody>'+[['ยอดขายตามแผน (หน่วย)','u',fmt],['ยอดขายถ้าไม่ทำแผน (หน่วย)','b',fmt],['รายได้ตามแผน (บาท)','rev',fmt],['กำไรขั้นต้น (บาท)','gpv',fmt],['งบที่ใช้ (บาท)','spend',fmt],['งบการตลาดต่อยอดขาย','ratio',pc],['กำไรขั้นต้นส่วนเพิ่ม (บาท)','incGP',fmt],['กำไรหลังหักงบ (บาท)','contrib',fmt],['ROI ของแผน','roi',pc]].map(([l,k,f])=>'<tr><td>'+l+'</td>'+r.Y.map(y=>'<td class="'+(y[k]<0?'neg':'')+'">'+f(y[k])+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  function updFin(){const r=fin();
    $('#kpis').innerHTML=r.has?kpiList(r).map(([k,x,s,c])=>'<div class="kpi '+c+'"><div class="k">'+k+'</div><div class="v">'+x+'</div><div class="s">'+s+'</div></div>').join(''):'<div class="kpi" style="grid-column:1/-1"><div class="k">ยังไม่มีตัวเลข</div><div class="s">ใส่ราคาขายสุทธิและเป้ายอดขายปีที่ 1 หรือนำตัวเลขจาก AI มาใส่ แล้วผลลัพธ์จะแสดงที่นี่</div></div>';
    $('#chart').innerHTML=r.has?chartSVG(r,760,300):'';
    $('#yt').innerHTML=r.has?yrTable(r):'';
  }

  // ---------- brand plan deck: one spec drives HTML, PDF and PowerPoint ----------
  const C={navy:'1D2D52',navy2:'2C4377',honey:'D9A13B',teal:'1F6F68',soft:'E2EFEC',hsoft:'FBF1DC',paper:'F3F5F9',white:'FFFFFF',ink:'16223A',muted:'566178',warn:'9A3412',warnbg:'FDF0E7',line:'DCE1EA',stone:'9AA3B5',pale:'C9D3EA'};
  const X0=0.55,XW=12.23,Y0=1.25,YH=5.6;
  const cols=(n,gap=0.25)=>{const w=(XW-gap*(n-1))/n;return Array.from({length:n},(_,i)=>({x:X0+i*(w+gap),w}))};
  function deck(){
    const r=fin(),a=actSum(),ask=askVal(),y=r.Y[0];
    const t=(k,ph)=>({kind:'txt',text:v(k),ph:ph||'—'}), b=(k,ph)=>({kind:'bul',items:lines(v(k)),ph:ph||'บรรทัดละข้อ'});
    const tbl=(k,head,colW,max)=>{let rows=lines(v(k)).map(l=>l.split('|').map(x=>x.trim()));const more=rows.length-max;if(more>0)rows=rows.slice(0,max).concat([['และอีก '+more+' รายการ (ดูในไฟล์แผนกิจกรรม)']]);return {kind:'table',head,colW,rows:rows.map(x=>head.map((_,i)=>x[i]||''))}};
    const c2=cols(2),c3=cols(3),c4=cols(4);
    const S_=[];
    S_.push({cover:true});
    S_.push({title:'สรุปสำหรับผู้บริหาร',blocks:[
      {x:X0,y:Y0,w:7.4,h:3.35,lb:'สถานการณ์ สิ่งที่จะทำ และผลที่คาดหวัง',fill:C.paper,fs:17,c:t('summary','Executive summary ไม่เกิน 5 บรรทัด')},
      {x:X0,y:4.8,w:7.4,h:2.05,lb:'สิ่งที่ขอให้ผู้บริหารตัดสินใจ',fill:C.hsoft,lbc:C.warn,fs:15,c:b('decisions')},
      {x:8.2,y:Y0,w:4.58,h:2.2,fill:C.navy,c:{kind:'stat',label:'งบประมาณที่ขออนุมัติ ปี '+(v('year')||''),value:ask?mny(ask):'—',sub:num('ask')?'':(r.has?'จากประมาณการในขั้นที่ 6':'จากแผนกิจกรรมในขั้นที่ 5')}},
      {x:8.2,y:3.65,w:4.58,h:3.2,lb:'ผลที่คาดหวัง',fill:C.soft,lbc:C.teal,c:{kind:'kpi',cols:1,items:r.has?[['รายได้ปีที่ 1',mny(y.rev)],['ยอดขายส่วนเพิ่มจากแผน',fmt(y.inc)+' หน่วย'],['ROI ปีที่ 1 / สะสม 3 ปี',pc(y.roi)+' / '+pc(r.roi3)]]:[]}}]});
    S_.push({title:'Product concept',blocks:[
      {x:X0,y:Y0,w:7.0,h:2.7,lb:'ผลิตภัณฑ์ของเรา',fs:20,bold:true,color:C.navy,c:t('concept')},
      {x:X0,y:4.15,w:7.0,h:2.7,lb:'ประโยชน์หลักและหลักฐาน',fill:C.soft,lbc:C.teal,fs:15,c:b('benefit')},
      {x:7.8,y:Y0,w:4.98,h:2.0,lb:'ข้อบ่งใช้หรือวัตถุประสงค์การใช้ที่ได้รับอนุญาต',fill:C.paper,fs:14,c:t('indication')},
      {x:7.8,y:3.45,w:4.98,h:1.0,lb:'ช่วงวงจรชีวิต',fill:C.paper,fs:14,c:t('stage')},
      {x:7.8,y:4.65,w:4.98,h:2.2,lb:'ราคา ช่องทาง และการเข้าถึง',fill:C.hsoft,lbc:C.warn,fs:14,c:t('pricepos')}]});
    S_.push({title:'ตลาดและคู่แข่ง',blocks:[
      {x:X0,y:Y0,w:5.2,h:2.7,lb:'ตลาด: ขนาด แนวโน้ม แรงขับ',fill:C.paper,fs:15,c:t('market')},
      {x:X0,y:4.15,w:5.2,h:2.7,lb:'นโยบาย กฎระเบียบ และการเบิกจ่าย',fill:C.hsoft,lbc:C.warn,fs:15,c:t('env')},
      {x:6.0,y:Y0,w:6.78,h:YH,lb:'คู่แข่งและทางเลือกของลูกค้า',fs:15,c:b('comp')}]});
    S_.push({title:'ใครตัดสินใจ และเขาคิดอย่างไร',blocks:[
      {x:c2[0].x,y:Y0,w:c2[0].w,h:YH,lb:'ผู้ใช้ ผู้สั่งหรือแนะนำ ผู้จ่ายเงิน ผู้อนุมัติ',fill:C.paper,fs:16,c:b('users')},
      {x:c2[1].x,y:Y0,w:c2[1].w,h:YH,lb:'Insight ของแต่ละกลุ่ม',fill:C.soft,lbc:C.teal,fs:16,c:b('insight')}]});
    S_.push({title:'SWOT และประเด็นสำคัญที่แผนต้องตอบ',blocks:[
      {x:c4[0].x,y:Y0,w:c4[0].w,h:3.3,lb:'จุดแข็ง (S)',fill:C.soft,lbc:C.teal,fs:14,c:b('sw_s')},{x:c4[1].x,y:Y0,w:c4[1].w,h:3.3,lb:'จุดอ่อน (W)',fill:C.warnbg,lbc:C.warn,fs:14,c:b('sw_w')},
      {x:c4[2].x,y:Y0,w:c4[2].w,h:3.3,lb:'โอกาส (O)',fill:C.soft,lbc:C.teal,fs:14,c:b('sw_o')},{x:c4[3].x,y:Y0,w:c4[3].w,h:3.3,lb:'อุปสรรค (T)',fill:C.warnbg,lbc:C.warn,fs:14,c:b('sw_t')},
      {x:X0,y:4.75,w:XW,h:2.1,lb:'ประเด็นสำคัญ (key issues)',fill:C.navy,lbc:C.honey,color:C.white,fs:16,c:b('issues')}]});
    S_.push({title:'กลุ่มเป้าหมายและจุดยืนของแบรนด์',blocks:[
      {x:X0,y:Y0,w:XW,h:1.9,accent:C.honey,fs:20,bold:true,color:C.navy,c:t('positioning','สำหรับ … ที่ … [แบรนด์] คือ … ที่ … เพราะ …')},
      {x:c2[0].x,y:3.4,w:c2[0].w,h:3.45,lb:'กลุ่มเป้าหมายหลัก และเหตุผล',fill:C.soft,lbc:C.teal,fs:16,c:t('target')},
      {x:c2[1].x,y:3.4,w:c2[1].w,h:3.45,lb:'กลุ่มลูกค้าที่พิจารณา',fill:C.paper,fs:14,c:b('segments')}]});
    S_.push({title:'เป้าหมายและกลยุทธ์หลัก ปี '+(v('year')||''),blocks:[
      {x:X0,y:Y0,w:5.0,h:3.6,lb:'เป้าหมาย (SMART)',fill:C.hsoft,lbc:C.warn,fs:16,c:b('obj')},
      {x:X0,y:5.05,w:5.0,h:1.8,lb:'สิ่งที่จะไม่ทำ',fill:C.paper,fs:13.5,c:b('notdo')},
      {x:5.8,y:Y0,w:6.98,h:YH,lb:'กลยุทธ์หลัก',fill:C.navy,lbc:C.honey,color:C.white,fs:18,c:b('strat')}]});
    S_.push({title:'ข้อความหลัก หลักฐาน และกรอบกฎหมาย',blocks:[
      {x:c3[0].x,y:Y0,w:c3[0].w,h:2.7,lb:'ข้อความหลัก',fill:C.navy,lbc:C.honey,color:C.white,fs:14,c:b('msg')},
      {x:c3[0].x,y:4.15,w:c3[0].w,h:2.7,lb:'ข้อความตามกลุ่มผู้ฟัง',fill:C.paper,fs:13,c:b('msg_by')},
      {x:c3[1].x,y:Y0,w:c3[1].w,h:2.7,lb:'พูดได้',fill:C.soft,lbc:C.teal,fs:13.5,c:b('claimOk')},
      {x:c3[1].x,y:4.15,w:c3[1].w,h:2.7,lb:'ไม่พูด',fill:C.warnbg,lbc:C.warn,fs:13.5,c:b('claimNo')},
      {x:c3[2].x,y:Y0,w:c3[2].w,h:2.7,lb:'หลักฐานที่มี และที่ต้องหาเพิ่ม',fill:C.paper,fs:13,c:t('evidence')},
      {x:c3[2].x,y:4.15,w:c3[2].w,h:2.7,lb:'การอนุมัติสื่อและการขออนุญาตโฆษณา',fill:C.hsoft,lbc:C.warn,fs:13,c:t('regpath')}]});
    S_.push({title:'ส่วนประสมการตลาด',blocks:[['mix_prod','Product'],['mix_price','Price และการเข้าถึง'],['mix_place','Place'],['mix_promo','Promotion']].map(([k,l],i)=>({x:c2[i%2].x,y:Y0+Math.floor(i/2)*2.9,w:c2[0].w,h:2.7,lb:l,fill:i===1?C.hsoft:i===3?C.soft:C.paper,lbc:i===1?C.warn:i===3?C.teal:C.navy,fs:15,c:t(k)}))});
    { const max=9,rows=a.rows.slice(0,max).map(x=>[x.name,x.strat,x.target,x.qt,x.budget?fmt(x.budget):'',x.kpi]);if(a.rows.length>max)rows.push(['และอีก '+(a.rows.length-max)+' กิจกรรม (ดูในไฟล์แผนกิจกรรม)','','','','','']);
      S_.push({title:'แผนกิจกรรม',blocks:[{x:X0,y:Y0,w:XW,h:YH,c:{kind:'table',head:['กิจกรรม','กลยุทธ์','กลุ่มเป้าหมาย','ไตรมาส','งบ (บาท)','KPI'],colW:[3.7,0.9,2.3,0.95,1.2,3.18],rows,alignR:[4],empty:'ยังไม่มีแผนกิจกรรมจากขั้นที่ 5'}}]});}
    { const ss=Object.keys(a.byS).sort();
      S_.push({title:'งบประมาณ',blocks:[
        {x:X0,y:Y0,w:3.6,h:1.9,fill:C.navy,c:{kind:'stat',label:'งบกิจกรรมรวม',value:a.total?mny(a.total):'—',sub:a.rows.length?a.rows.length+' กิจกรรม':''}},
        {x:X0,y:3.35,w:3.6,h:3.5,lb:'กิจกรรมที่ต้องผ่านการอนุมัติก่อนเริ่ม',fill:C.hsoft,lbc:C.warn,fs:13,c:t('gate')},
        {x:4.4,y:Y0,w:8.38,h:2.9,lb:'งบตามกลยุทธ์',c:{kind:'table',head:['กลยุทธ์','รายละเอียด','งบ (บาท)','สัดส่วน'],colW:[1.0,4.48,1.6,1.3],rows:ss.map(s=>[s,stratName(s),fmt(a.byS[s]),a.total?pc(a.byS[s]/a.total*100):'']),alignR:[2,3],empty:'—'}},
        {x:4.4,y:4.4,w:8.38,h:2.45,lb:'งบตามไตรมาส',c:{kind:'table',head:['','Q1','Q2','Q3','Q4','รวม'],colW:[1.6,1.3,1.3,1.3,1.3,1.58],rows:a.total?[['งบ (บาท)'].concat(a.byQ.map(x=>fmt(x)),[fmt(a.total)]),['สัดส่วน'].concat(a.byQ.map(x=>pc(x/a.total*100)),['100%'])]:[],alignR:[1,2,3,4,5],empty:'—'}}]});}
    S_.push({title:'ประมาณการยอดขายและผลตอบแทน',blocks:[
      {x:X0,y:Y0,w:4.9,h:4.0,c:{kind:'kpi',cols:2,items:r.has?kpiList(r).map(([k,x])=>[k,x]):[]}},
      {x:5.7,y:Y0,w:7.08,h:4.0,c:{kind:'chart'}},
      {x:X0,y:5.45,w:XW,h:1.4,lb:r.has?'สมมติฐาน: ราคาสุทธิ '+fmt(S.fin.price)+' บาท · ต้นทุน '+fmt(S.fin.cogs)+' บาท/หน่วย · baseline '+fmt(S.fin.base_units)+' หน่วย ('+pc(S.fin.base_growth)+' ต่อปี) · เป้าปีที่ 1 '+fmt(S.fin.y1_units)+' หน่วย':'สมมติฐาน',fill:C.hsoft,lbc:C.warn,fs:13,c:t('finNote','สมมติฐานที่ยังไม่มั่นใจ และจะไปยืนยันกับใคร')}]});
    S_.push({title:'ตัวชี้วัดและความเสี่ยง',blocks:[
      {x:X0,y:Y0,w:6.3,h:YH,lb:'ตัวชี้วัด',c:tbl('kpis',['ตัวชี้วัด','เป้า','ความถี่','แหล่งข้อมูล'],[2.5,1.3,1.1,1.4],8)},
      {x:7.1,y:Y0,w:5.68,h:YH,lb:'ความเสี่ยงและแผนรับมือ',lbc:C.warn,c:tbl('risks',['ความเสี่ยง','สัญญาณเตือน','แผนรับมือ'],[1.8,1.78,2.1],6)}]});
    S_.push({title:'จุดทบทวนแผน และสิ่งที่ต้องพิสูจน์',blocks:[
      {x:c2[0].x,y:Y0,w:c2[0].w,h:YH,lb:'จุดทบทวนแผนและเกณฑ์ตัดสิน',fill:C.paper,fs:16,c:b('checkpoints')},
      {x:c2[1].x,y:Y0,w:c2[1].w,h:3.0,lb:'สมมติฐานที่ต้องพิสูจน์',fill:C.hsoft,lbc:C.warn,fs:15,c:b('totest')},
      {x:c2[1].x,y:4.45,w:c2[1].w,h:2.4,lb:'ข้อมูลที่ยังขาด',fill:C.warnbg,lbc:C.warn,fs:14,c:b('gaps')}]});
    S_.push({title:'ภาคผนวก: การใช้ AI ในการทำแผนนี้',foot:'ภาคผนวก ไม่ต้องนำเสนอ',blocks:[
      {x:X0,y:Y0,w:6.6,h:YH,c:{kind:'table',head:['ขั้น'].concat(CRIT.map(c=>c[1])),colW:[2.4,1.4,1.4,1.4],rows:ROUNDS.map(rd=>[rd.n+' '+rd.short].concat([0,1,2].map(i=>{const x=((S.score[rd.n]||[])[i])||0;return '●'.repeat(x)+'○'.repeat(3-x)}))),center:[1,2,3]}},
      ...[['AI ช่วยได้ดีเรื่อง','good'],['เรื่องที่ต้องแก้หรือทิ้ง','fix'],['สิ่งที่ได้เรียนรู้','learn']].map(([l,k],i)=>({x:7.45,y:Y0+i*1.9,w:5.33,h:1.7,lb:l,fill:C.paper,fs:13.5,c:{kind:'txt',text:S.lesson[k],ph:'—'}}))]});
    return S_;
  }
  const IN=96,px=x=>Math.round(x*IN)+'px',pt=x=>(x*1.333).toFixed(1)+'px';
  function contentHTML(c,b){
    const fs=b.fs||15,col=b.color?'#'+b.color:'';
    if(c.kind==='txt')return '<div class="bc" data-fit style="font-size:'+pt(fs)+';'+(b.bold?'font-weight:700;':'')+(col?'color:'+col+';':'')+'">'+(c.text?esc(c.text):'<span class="ph">'+esc(c.ph)+'</span>')+'</div>';
    if(c.kind==='bul')return '<ul class="bc" data-fit style="font-size:'+pt(fs)+';'+(col?'color:'+col+';':'')+'">'+(c.items.length?c.items.map(x=>'<li>'+esc(x)+'</li>').join(''):'<li><span class="ph">'+esc(c.ph)+'</span></li>')+'</ul>';
    if(c.kind==='stat')return '<div class="stat"><span>'+esc(c.label)+'</span><b data-fit>'+esc(c.value)+'</b><i>'+esc(c.sub||'')+'</i></div>';
    if(c.kind==='kpi')return c.items.length?'<div class="kg c'+c.cols+'">'+c.items.map(([k,x])=>'<div><span>'+esc(k)+'</span><b>'+esc(x)+'</b></div>').join('')+'</div>':'<div class="bc"><span class="ph">ยังไม่มีตัวเลขจากขั้นที่ 6</span></div>';
    if(c.kind==='chart'){const r=fin();return r.has?'<div class="chartb">'+chartSVG(r,680,330)+'<div class="flg">'+LEG+'</div></div>':'<div class="bc"><span class="ph">ยังไม่มีตัวเลขจากขั้นที่ 6</span></div>'}
    if(c.kind==='table'){if(!c.rows.length)return '<div class="bc"><span class="ph">'+esc(c.empty||'บรรทัดละรายการ คั่นด้วย |')+'</span></div>';const tw=c.colW.reduce((s,x)=>s+x,0);
      return '<div class="bc tb" data-fit><table><colgroup>'+c.colW.map(w=>'<col style="width:'+(w/tw*100).toFixed(2)+'%">').join('')+'</colgroup><thead><tr>'+c.head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+c.rows.map(r=>'<tr>'+r.map((x,i)=>'<td'+((c.alignR||[]).includes(i)?' class="r"':(c.center||[]).includes(i)?' class="ctr"':'')+'>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}
    return '';
  }
  function slideList(){
    const D=deck(),N=D.length,brand=v('pname')||'ชื่อผลิตภัณฑ์',owner=v('owner')||'',yr=v('year');
    return D.map((s,i)=>{
      if(s.cover)return '<div class="sl cover"><div class="cvk">BRAND PLAN'+(yr?' '+esc(yr):'')+' · '+esc(TY().short)+'</div><h1 data-fit>'+esc(brand)+'</h1><div class="cvl"></div><p class="tg" data-fit>'+(v('positioning')?esc(v('positioning')):'<span class="ph">Positioning statement จากขั้นที่ 3</span>')+'</p><div class="cvf"><span>'+(owner?esc(owner):'<span class="ph">ผู้จัดทำแผน</span>')+'</span><span>เอกสารภายใน เพื่อการพิจารณาอนุมัติ</span></div><img class="cvm" alt="" src="'+MASCOT_SRC+'"></div>';
      return '<div class="sl"><div class="slh"><h2>'+esc(s.title)+'</h2><span class="slb">'+esc(brand)+'</span></div>'+s.blocks.map(b=>'<div class="blk'+(b.fill?' f':'')+(b.accent?' ac':'')+'" style="left:'+px(b.x)+';top:'+px(b.y)+';width:'+px(b.w)+';height:'+px(b.h)+';'+(b.fill?'background:#'+b.fill+';':'')+(b.accent?'border-left-color:#'+b.accent+';':'')+'">'+(b.lb?'<div class="lb" style="color:#'+(b.lbc||C.navy)+'">'+esc(b.lb)+'</div>':'')+contentHTML(b.c,b)+'</div>').join('')+'<div class="slf"><span>'+esc([owner,s.foot||('Brand plan'+(yr?' '+yr:''))].filter(Boolean).join(' · '))+'</span><span>'+(i+1)+'/'+N+'</span></div></div>';
    });
  }
  function fitAll(root){root.querySelectorAll('[data-fit]').forEach(el=>{if(el.dataset.fs===undefined)el.dataset.fs=el.style.fontSize||'';el.style.fontSize=el.dataset.fs;let fs=parseFloat(getComputedStyle(el).fontSize),n=0;while((el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)&&fs>10&&n<40){fs-=1;el.style.fontSize=fs+'px';n++}})}
  function scaleWraps(root){root.querySelectorAll('.slwrap').forEach(w=>{const s=w.clientWidth/1280;w.firstElementChild.style.transform='scale('+s+')'})}
  let ro=null;
  function renderSlides(app){
    const L=S.lesson;
    app.innerHTML='<section class="panel"><div class="card"><h2>Brand plan พร้อมนำเสนอ</h2><p class="lead">สไลด์ 16 หน้านี้สร้างจากข้อสรุปที่บันทึกไว้ในแต่ละขั้น เรียงตามลำดับที่ใช้นำเสนอขออนุมัติ หน้า 2 คือสรุปสำหรับผู้บริหาร หน้า 16 เป็นภาคผนวกเรื่องการใช้ AI ไม่ต้องนำเสนอ ถ้าอยากแก้ข้อความ ให้กลับไปแก้ในขั้นนั้น ช่องที่ยังว่างแสดงเป็นตัวเอียงสีเทา ไฟล์ PowerPoint แก้ต่อได้ทุกตัวอักษร ส่วนไฟล์แผนกิจกรรมเปิดใน Excel เพื่อใช้ติดตามงานได้</p>'+
      '<div class="row" style="margin-top:12px"><button type="button" class="primary" id="present">นำเสนอแบบเต็มจอ</button><button type="button" class="primary" id="pptx">ส่งออกเป็น PowerPoint</button><button type="button" id="pdf">ส่งออกเป็น PDF</button><button type="button" id="csv">ดาวน์โหลดแผนกิจกรรม (.csv)</button><button type="button" id="cpall">คัดลอกเนื้อหาทั้งหมด</button><span class="copied" id="sMsg" hidden></span></div></div>'+
      '<div class="card"><h3>บทเรียนจากการใช้ AI ทำแผนนี้ (แสดงในภาคผนวก)</h3><div class="fields">'+[['good','AI ช่วยได้ดีเรื่อง'],['fix','เรื่องที่ต้องแก้หรือทิ้ง'],['learn','สิ่งที่ได้เรียนรู้']].map(([k,l])=>'<div class="field"><label for="l_'+k+'">'+l+'</label><textarea id="l_'+k+'" data-l="'+k+'">'+esc(L[k])+'</textarea></div>').join('')+'</div></div>'+
      '<div class="slgrid" id="slgrid"></div></section>';
    const draw=()=>{const g=$('#slgrid');g.innerHTML=slideList().map((h,i)=>'<figure><div class="slwrap">'+h+'</div><figcaption>หน้า '+(i+1)+'</figcaption></figure>').join('');scaleWraps(g);fitAll(g)};
    draw();
    app.querySelectorAll('[data-l]').forEach(el=>el.addEventListener('input',()=>{S.lesson[el.dataset.l]=el.value;save();clearTimeout(el._t);el._t=setTimeout(draw,300)}));
    if(ro)ro.disconnect(); try{ro=new ResizeObserver(()=>{const g=$('#slgrid');if(g)scaleWraps(g)});ro.observe($('#slgrid'))}catch(e){}
    const msg=$('#sMsg'),show=t=>{msg.hidden=false;msg.textContent=t};
    $('#present').addEventListener('click',()=>openShow(0));
    $('#pdf').addEventListener('click',()=>exportPDF(show));
    $('#cpall').addEventListener('click',()=>copy(allText(),msg,$('#cpall').closest('.card'),'คัดลอกแล้ว'));
    $('#pptx').addEventListener('click',()=>exportPPTX(show));
    $('#csv').addEventListener('click',()=>{const a=actSum();if(!a.rows.length){show('ยังไม่มีแผนกิจกรรมจากขั้นที่ 5');return}const q=x=>'"'+String(x).replace(/"/g,'""')+'"';
      const csv=[['กิจกรรม','กลยุทธ์','กลุ่มเป้าหมาย','ไตรมาส','Q1','Q2','Q3','Q4','งบ (บาท)','KPI','ผู้รับผิดชอบ','สถานะ','งบที่ใช้จริง','ผลตาม KPI'].map(q).join(',')].concat(a.rows.map(r=>[r.name,r.strat,r.target,r.qt].concat([1,2,3,4].map(i=>r.qs.includes(i)?Math.round(r.budget/r.qs.length):''),[r.budget,r.kpi,r.owner,'ยังไม่เริ่ม','','']).map(q).join(','))).join('\r\n');
      saveBlob(fname('-activities.csv'),new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}),show,'ดาวน์โหลดแผนกิจกรรมแล้ว เปิดใน Excel หรือ Google Sheets เพื่อติดตามงานได้')});
  }
  function allText(){
    const out=['Brand plan '+(v('year')||'')+' · '+(v('pname')||''),'ผู้จัดทำ: '+v('owner'),'ประเภทผลิตภัณฑ์: '+TY().name,''];
    ROUNDS.forEach(r=>{out.push('ขั้นที่ '+r.n+' '+r.t);r.fields.forEach(([k,l])=>out.push(l+': '+(v(k)||'-')));if(r.fin)out.push('ผลการคำนวณ: '+(finText()||'-'));if(r.acts){const a=actSum();out.push('งบกิจกรรมรวม: '+(a.total?fmt(a.total)+' บาท':'-'))}const s=S.score[r.n]||[];out.push('คะแนนที่ให้ AI: '+CRIT.map((c,i)=>c[1]+' '+(LV[s[i]]||'-')).join(' · '));out.push('เก็บ แก้ ทิ้ง: '+(S.keep[r.n]||'-'));out.push('')});
    out.push('บทเรียนจากการใช้ AI','ช่วยได้ดี: '+(S.lesson.good||'-'),'ต้องแก้หรือทิ้ง: '+(S.lesson.fix||'-'),'สิ่งที่เรียนรู้: '+(S.lesson.learn||'-'));
    return out.join('\n');
  }
  // presenter
  let cur=0;
  function openShow(i){cur=i;$('#show').hidden=false;drawShow();const el=$('#show');try{el.requestFullscreen&&el.requestFullscreen().catch(()=>{})}catch(e){}}
  function closeShow(){$('#show').hidden=true;try{document.fullscreenElement&&document.exitFullscreen()}catch(e){}}
  function drawShow(){const L=slideList();cur=Math.max(0,Math.min(L.length-1,cur));const st=$('#stage');st.innerHTML='<div class="slwrap big">'+L[cur]+'</div>';
    const W=Math.min(window.innerWidth-24,(window.innerHeight-70)*16/9), w=st.firstElementChild; w.style.width=W+'px'; w.firstElementChild.style.transform='scale('+(W/1280)+')'; fitAll(st); $('#showN').textContent=(cur+1)+' / '+L.length}
  $('#prevS').addEventListener('click',()=>{cur--;drawShow()}); $('#nextS').addEventListener('click',()=>{cur++;drawShow()}); $('#closeS').addEventListener('click',closeShow);
  $('#stage').addEventListener('click',()=>{cur++;drawShow()});
  document.addEventListener('keydown',e=>{if($('#show').hidden)return;if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){cur++;drawShow();e.preventDefault()}else if(e.key==='ArrowLeft'||e.key==='PageUp'){cur--;drawShow()}else if(e.key==='Escape')closeShow()});
  window.addEventListener('resize',()=>{if(!$('#show').hidden)drawShow()});
  document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement&&!$('#show').hidden)drawShow()});

  // ---------- PowerPoint export (editable) ----------
  async function exportPPTX(show){
    if(!window.PptxGenJS){show('โหลดเครื่องมือสร้าง PowerPoint ไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง');return}
    show('กำลังสร้างไฟล์ PowerPoint…');
    try{
      const P=new window.PptxGenJS(); P.layout='LAYOUT_WIDE'; P.title='Brand plan '+(v('pname')||''); P.author=v('owner')||'';
      const FONT='Sarabun',D=deck(),N=D.length,brand=v('pname')||'ชื่อผลิตภัณฑ์',owner=v('owner')||'',yr=v('year'),r=fin();
      const T=(s,text,o)=>s.addText(text,Object.assign({fontFace:FONT,fontSize:15,color:C.ink,margin:0.04,valign:'top',fit:'shrink',isTextBox:true},o));
      const box=(s,x,y,w,h,fill,rad)=>s.addShape(P.shapes.ROUNDED_RECTANGLE,{x,y,w,h,fill:{color:fill},line:{color:fill,width:0.75},rectRadius:rad??0.12});
      const rect=(s,x,y,w,h,c)=>s.addShape(P.shapes.RECTANGLE,{x,y,w,h,fill:{color:c},line:{color:c}});
      const PH={italic:true,color:C.stone};
      D.forEach((sd,i)=>{
        const s=P.addSlide();
        if(sd.cover){ s.background={color:C.navy}; rect(s,0,6.95,13.333,0.55,'14203C');
          T(s,'BRAND PLAN'+(yr?' '+yr:'')+' · '+TY().short,{x:0.8,y:0.75,w:11.5,h:0.45,fontSize:18,bold:true,color:C.honey,fit:'none'});
          T(s,brand,{x:0.8,y:1.5,w:11.5,h:1.7,fontSize:66,bold:true,color:C.white,valign:'middle'});
          rect(s,0.8,3.4,4,0.05,C.honey);
          T(s,v('positioning')?v('positioning'):[{text:'Positioning statement จากขั้นที่ 3',options:{italic:true,color:C.pale}}],{x:0.8,y:3.65,w:10.5,h:2.2,fontSize:20,color:C.pale});
          T(s,owner||'ผู้จัดทำแผน',{x:0.8,y:6.95,w:7,h:0.55,fontSize:13,color:C.white,valign:'middle',fit:'none'});
          T(s,'เอกสารภายใน เพื่อการพิจารณาอนุมัติ',{x:7.5,y:6.95,w:5.2,h:0.55,fontSize:13,color:C.white,align:'right',valign:'middle',fit:'none'}); return; }
        s.background={color:C.white};
        rect(s,0,0,13.333,0.95,C.navy); rect(s,0,0.95,13.333,0.06,C.honey);
        T(s,sd.title,{x:X0,y:0.12,w:9.6,h:0.72,fontSize:26,bold:true,color:C.white,valign:'middle'});
        T(s,brand,{x:10.2,y:0.12,w:2.6,h:0.72,fontSize:16,bold:true,color:C.honey,align:'right',valign:'middle'});
        rect(s,0,7.05,13.333,0.45,'14203C');
        T(s,[owner,sd.foot||('Brand plan'+(yr?' '+yr:''))].filter(Boolean).join(' · '),{x:X0,y:7.05,w:9,h:0.45,fontSize:11,color:C.white,valign:'middle',fit:'none'});
        T(s,(i+1)+'/'+N,{x:11.8,y:7.05,w:1,h:0.45,fontSize:11,color:C.white,align:'right',valign:'middle',fit:'none'});
        sd.blocks.forEach(b=>{
          const c=b.c,pad=b.fill?0.18:(b.accent?0.3:0); let x=b.x+pad,y=b.y+(b.fill?0.1:0),w=b.w-pad*(b.accent?1:2),h=b.h-(b.fill?0.2:0);
          if(b.fill)box(s,b.x,b.y,b.w,b.h,b.fill); if(b.accent)rect(s,b.x,b.y,0.1,b.h,b.accent);
          if(b.lb){T(s,b.lb,{x,y,w,h:0.36,fontSize:12.5,bold:true,color:b.lbc||C.navy,fit:'shrink',valign:'middle'});y+=0.42;h-=0.42}
          const fs=b.fs||15,col=b.color||C.ink;
          if(c.kind==='txt')T(s,c.text?c.text:[{text:c.ph,options:PH}],{x,y,w,h,fontSize:fs,bold:!!b.bold,color:col,valign:b.accent?'middle':'top'});
          else if(c.kind==='bul')T(s,c.items.length?c.items.map((t,j)=>({text:t,options:{bullet:{indent:13},breakLine:j<c.items.length-1,paraSpaceAfter:4}})):[{text:c.ph,options:PH}],{x,y,w,h,fontSize:fs,color:col});
          else if(c.kind==='stat'){T(s,c.label,{x,y:y+0.05,w,h:0.4,fontSize:14,bold:true,color:C.honey,fit:'shrink'});T(s,c.value,{x,y:y+0.5,w,h:h-1.05,fontSize:34,bold:true,color:C.white,valign:'middle'});T(s,c.sub||'',{x,y:y+h-0.5,w,h:0.4,fontSize:11,color:C.pale})}
          else if(c.kind==='kpi'){if(!c.items.length){T(s,[{text:'ยังไม่มีตัวเลขจากขั้นที่ 6',options:PH}],{x,y,w,h});return}const n=c.items.length,cl=c.cols,rw=Math.ceil(n/cl),g=0.12,cw=(w-g*(cl-1))/cl,ch=(h-g*(rw-1))/rw;
            c.items.forEach(([k,val],j)=>{const cx=x+(j%cl)*(cw+g),cy=y+Math.floor(j/cl)*(ch+g);box(s,cx,cy,cw,ch,b.fill?C.white:C.paper,0.08);T(s,k,{x:cx+0.12,y:cy+0.06,w:cw-0.24,h:0.34,fontSize:11,bold:true,color:C.muted});T(s,val,{x:cx+0.12,y:cy+0.38,w:cw-0.24,h:ch-0.44,fontSize:17,bold:true,color:C.navy,valign:'middle'})})}
          else if(c.kind==='chart'){if(!r.has){T(s,[{text:'ยังไม่มีตัวเลขจากขั้นที่ 6',options:PH}],{x,y,w,h});return}const lab=r.Y.map(q=>'ปีที่ '+q.y);
            s.addChart(P.charts.BAR,[{name:'รายได้ถ้าไม่ทำแผน',labels:lab,values:r.Y.map(q=>Math.round(q.brev))},{name:'รายได้ตามแผน',labels:lab,values:r.Y.map(q=>Math.round(q.rev))},{name:'งบที่ใช้',labels:lab,values:r.Y.map(q=>Math.round(q.spend))}],{x,y,w,h,barDir:'col',barGrouping:'clustered',chartColors:['9AA7C7',C.navy,C.honey],showLegend:true,legendPos:'b',legendFontFace:FONT,legendFontSize:11,catAxisLabelFontFace:FONT,catAxisLabelFontSize:11,valAxisLabelFontFace:FONT,valAxisLabelFontSize:10,valAxisLabelFormatCode:'#,##0',valGridLine:{color:C.line,size:0.5},catGridLine:{style:'none'}})}
          else if(c.kind==='table'){if(!c.rows.length){T(s,[{text:c.empty||'—',options:PH}],{x,y,w,h});return}const tw=c.colW.reduce((a,q)=>a+q,0),colW=c.colW.map(q=>q/tw*w),nr=c.rows.length+1,fz=Math.max(10,Math.min(12,(h/nr)*17));
            const cell=(t,ri,ci)=>({text:String(t),options:{fontFace:FONT,fontSize:fz,bold:ri===0,color:ri===0?C.white:C.ink,fill:{color:ri===0?C.navy:(ri%2?C.white:C.paper)},valign:'middle',align:ri>0&&(c.alignR||[]).includes(ci)?'right':ri>0&&(c.center||[]).includes(ci)?'center':'left',margin:[2,5,2,5]}});
            s.addTable([c.head.map((t,ci)=>cell(t,0,ci))].concat(c.rows.map((rw,ri)=>rw.map((t,ci)=>cell(t,ri+1,ci)))),{x,y,w,colW,border:{type:'solid',pt:0.5,color:C.line},autoPage:false})}
        });
      });
      const blob=await P.write({outputType:'blob'});
      await saveBlob(fname('.pptx'),blob,show,'บันทึกไฟล์ PowerPoint แล้ว เปิดแก้ต่อใน PowerPoint หรือ Google Slides ได้');
    }catch(e){console.error(e);show('สร้างไฟล์ PowerPoint ไม่สำเร็จ: '+(e&&e.message||e))}
  }
  async function exportPDF(show){
    if(!window.jspdf||!window.html2canvas){show('โหลดเครื่องมือสร้าง PDF ไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง');return}
    show('กำลังสร้าง PDF…');
    try{
      const host=$('#pdfhost'); host.innerHTML=slideList().map(h=>'<div class="pg">'+h+'</div>').join(''); fitAll(host);
      try{await document.fonts.ready}catch(e){}
      const {jsPDF}=window.jspdf; const pdf=new jsPDF({orientation:'landscape',unit:'px',format:[1280,720],hotfixes:['px_scaling']});
      const pgs=host.querySelectorAll('.pg');
      for(let i=0;i<pgs.length;i++){const cv=await html2canvas(pgs[i].firstElementChild,{scale:1.5,backgroundColor:'#ffffff',logging:false,width:1280,height:720}); if(i)pdf.addPage([1280,720],'landscape'); pdf.addImage(cv.toDataURL('image/jpeg',0.9),'JPEG',0,0,1280,720)}
      host.innerHTML='';
      await saveBlob(fname('.pdf'),pdf.output('blob'),show,'บันทึกไฟล์ PDF แล้ว');
    }catch(e){console.error(e);show('สร้าง PDF ไม่สำเร็จ: '+(e&&e.message||e))}
  }
  window.__bp={deck,fin,actSum,importFields,ROUNDS,get S(){return S}};
  renderTabs(); render();
})();
