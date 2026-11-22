const SEED={USD:[1,2],EUR:[.86,2],GBP:[.76,2],INR:[83.2,2],CAD:[1.4,2],AUD:[1.54,2],SGD:[1.3,2],AED:[3.6725,2],JPY:[155,0],KWD:[.307,3],CHF:[.8,2],CNY:[7.1,2],HKD:[7.78,2],NZD:[1.75,2],SEK:[9.4,2],NOK:[10.1,2],DKK:[6.45,2],MXN:[18.4,2],BRL:[5.4,2],ZAR:[17.5,2],SAR:[3.75,2],QAR:[3.64,2],PKR:[281,2],BDT:[122,2],LKR:[300,2],NPR:[141,2],PHP:[58,2],IDR:[16600,0],MYR:[4.2,2],THB:[32.5,2],KRW:[1450,0],TRY:[42,2],EGP:[47.5,2],NGN:[1450,2],KES:[129,2]};
const PL={USD:100,EUR:88,GBP:90,INR:28,JPY:68,CAD:90,AUD:95,SGD:85,AED:75,PHP:35,PKR:25,BDT:27,NGN:30,KES:38,MXN:48,BRL:48,CNY:50,CHF:120};
const PROV=[{n:"Wise",sp:0,fee:3.5,m:["bank","wallet"],t:"Instant"},{n:"Remitly",sp:.9,fee:3,m:["bank","wallet","cash"],t:"4 Hours"},{n:"Western Union",sp:2.1,fee:4.99,m:["bank","wallet","cash"],t:"4 Hours"},{n:"PayPal",sp:3.5,fee:4.99,m:["bank","wallet"],t:"Instant"},{n:"Bank Wire",sp:2.5,fee:25,m:["bank"],t:"2-3 Business Days"}];
const R={},D={};for(const k in SEED){R[k]=SEED[k][0];D[k]=SEED[k][1]}
const $=s=>document.querySelector(s),ls=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const S={from:"USD",to:"INR",amt:1000,mode:"send",days:30,sel:null,favs:ls("ff-favs",["USD/INR","EUR/INR","GBP/USD"]),alerts:ls("ff-alerts",[])};
const rate=(a,b)=>R[b]/R[a]; // USD triangulation: Rate(A->B)=Rate(USD->B)/Rate(USD->A)
const money=(v,c)=>new Intl.NumberFormat("en-US",{minimumFractionDigits:D[c],maximumFractionDigits:D[c]}).format(v)+" "+c;
const fr=x=>x>=100?x.toFixed(2):x>=1?x.toFixed(4):x.toFixed(6);
async function loadRates(){const c=ls("ff-rates",null);let st="Bundled seed rates (offline fallback)";
 if(c&&Date.now()-c.t<36e5){Object.assign(R,c.r);st="Cached rates (under 1 hour old)"}
 else{try{const j=await (await fetch("https://open.er-api.com/v6/latest/USD")).json();if(j.rates){for(const k in R)if(j.rates[k])R[k]=j.rates[k];sv("ff-rates",{t:Date.now(),r:R});st="Live rates from open.er-api.com"}}catch(e){}}
 $("#src").textContent="Rate source: "+st;render();draw()}
function calc(p){const f=S.from,t=S.to,mid=rate(f,t),fee=p.fee/R[f],eff=mid*(1-p.sp/100);
 const send=S.mode==="send"?S.amt:S.amt/eff+fee,recv=S.mode==="send"?Math.max(S.amt-fee,0)*eff:S.amt;
 return{p,fee,eff,send,recv,lost:send*mid-recv}}
function render(){const f=S.from,t=S.to,mid=rate(f,t);
 const rows=PROV.filter(p=>$("#meth").value==="all"||p.m.includes($("#meth").value)).map(calc);
 const best=rows.length?rows.reduce((a,b)=>S.mode==="send"?(b.recv>a.recv?b:a):(b.send<a.send?b:a)):null;
 const m0=S.mode==="send"?S.amt*mid:S.amt;$("#mid").textContent=money(m0,t);$("#mid").classList.remove("pulse");void $("#mid").offsetWidth;$("#mid").classList.add("pulse");
 $("#rate").textContent=`1 ${f} = ${fr(mid)} ${t}  ·  1 ${t} = ${fr(1/mid)} ${f}`;
 $("#pin").textContent=S.favs.includes(f+"/"+t)?"★ Pinned (click to unpin)":"☆ Pin this pair";
 $("#dock").innerHTML="<span class='mute'>Favorites</span>"+(S.favs.map(k=>`<button class="chip ${k===f+"/"+t?"on":""}" data-k="${k}">${k}<i data-x="${k}" title="Unpin">×</i></button>`).join("")||"<span class='mute'>Pin a pair for one-click access.</span>");
 if(!best){$("#tb").innerHTML="<tr><td colspan=7>No provider supports that delivery method. Try another.</td></tr>";$("#led").innerHTML="";return}
 if(!rows.find(r=>r.p.n===S.sel))S.sel=best.p.n;
 const worst=rows.reduce((a,b)=>b.lost>a.lost?b:a);
 $("#save").textContent=`Choosing ${best.p.n} over ${worst.p.n} saves you about ${money(worst.lost-best.lost,t)}.`;
 $("#tb").innerHTML=rows.sort((a,b)=>S.mode==="send"?b.recv-a.recv:a.send-b.send).map(r=>`<tr data-n="${r.p.n}" class="${r.p.n===S.sel?"sel":""}"><td>${r.p.n}${r===best?"<span class='badge'>Best Recipient Value</span>":""}</td><td>${r.p.sp}%</td><td>${money(r.p.fee,"USD")}</td><td>${money(r.send,f)}</td><td><b>${money(r.recv,t)}</b></td><td class="loss">${money(r.lost,t)}</td><td>${r.p.t}</td></tr>`).join("");
 const r=rows.find(x=>x.p.n===S.sel),cost=100*(1-r.recv/(r.send*mid));
 $("#lt").textContent="Fee breakdown: "+r.p.n;
 $("#led").innerHTML=[["Base (mid-market) rate",`1 ${f} = ${fr(mid)} ${t}`],["Provider rate (after spread)",`1 ${f} = ${fr(r.eff)} ${t}`],["Exchange spread",r.p.sp+"%"],["Provider fee",money(r.fee,f)],["You send",money(r.send,f)],["Recipient amount",money(r.recv,t)]].map(a=>`<div><span>${a[0]}</span><span>${a[1]}</span></div>`).join("")+`<div class="tot loss"><span>Total cost of sending</span><span>${cost.toFixed(2)}%</span></div>`;
 const pf=PL[f]||55,pt=PL[t]||55,y=r.recv/mid*pf/pt;
 $("#pp").textContent=`Purchasing power (approx. price index): ${money(r.recv,t)} buys what about ${money(y,f)} would buy in the sender’s country. Cost of living in ${t} is ~${Math.round(pt/pf*100)}% of ${f}.`;
 $("#bcount").textContent=S.alerts.filter(a=>!a.done).length||"";
 $("#alist").innerHTML=S.alerts.map((a,i)=>`<div>${a.pair} ${a.dir==="ge"?"≥":"≤"} ${a.tgt} ${a.done?"✓ reached":""} <a href="#" data-del="${i}">remove</a></div>`).join("")||"No alerts yet."}
let chart;function draw(){if(!$("#ch").offsetParent)return;const f=S.from,t=S.to,n=S.days,cur=rate(f,t);
 let s=[...(f+t)].reduce((a,c)=>a*31+c.charCodeAt(0)>>>0,7);const rnd=()=>(s=(s*1664525+1013904223)>>>0)/4294967296;
 const vol=.004*(1+Math.log10(n)/2),h=[cur];for(let i=1;i<=n;i++)h.unshift(h[0]*Math.exp(-(rnd()-.5)*2*vol));
 const lab=h.map((_,i)=>{const d=new Date(Date.now()-(n-i)*864e5);return d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})});
 const cs=getComputedStyle(document.documentElement),acc=cs.getPropertyValue("--acc").trim(),mu=cs.getPropertyValue("--mute").trim(),ln=cs.getPropertyValue("--line").trim();
 if(chart)chart.destroy();
 chart=new Chart($("#ch"),{type:"line",data:{labels:lab,datasets:[{label:`${f}/${t}`,data:h,borderColor:acc,backgroundColor:acc+"22",fill:true,pointRadius:0,borderWidth:2,tension:.25}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},plugins:{legend:{display:false}},scales:{x:{ticks:{color:mu,maxTicksLimit:6},grid:{display:false}},y:{ticks:{color:mu,callback:v=>fr(v)},grid:{color:ln}}}}})}
function set(f,t){S.from=f;S.to=t;$("#from").value=f;$("#to").value=t;render();draw()}
const opts=Object.keys(R).map(k=>`<option>${k}</option>`).join("");$("#from").innerHTML=$("#to").innerHTML=opts;$("#from").value="USD";$("#to").value="INR";
$("#from").onchange=e=>set(e.target.value,S.to);$("#to").onchange=e=>set(S.from,e.target.value);
$("#amt").oninput=e=>{S.amt=Math.max(+e.target.value||0,0);render()};
$("#swap").onclick=e=>{e.currentTarget.classList.toggle("spin");set(S.to,S.from)};
$("#meth").onchange=render;
function mode(m){S.mode=m;$("#m-send").classList.toggle("on",m==="send");$("#m-recv").classList.toggle("on",m==="recv");$("#alab").textContent=m==="send"?"Amount you send":"Amount recipient should get (reverse conversion)";render()}
$("#m-send").onclick=()=>mode("send");$("#m-recv").onclick=()=>mode("recv");
$("#rng").onclick=e=>{const d=e.target.dataset.d;if(!d)return;S.days=+d;[...$("#rng").children].forEach(b=>b.classList.toggle("on",b===e.target));draw()};
$("#pin").onclick=()=>{const k=S.from+"/"+S.to,i=S.favs.indexOf(k);i<0?S.favs.push(k):S.favs.splice(i,1);sv("ff-favs",S.favs);render()};
$("#dock").onclick=e=>{const x=e.target.dataset.x;if(x){S.favs=S.favs.filter(k=>k!==x);sv("ff-favs",S.favs);return render()}const b=e.target.closest(".chip");if(b){const[a,c]=b.dataset.k.split("/");set(a,c)}};
$("#tb").onclick=e=>{const r=e.target.closest("tr");if(r&&r.dataset.n){S.sel=r.dataset.n;render()}};
$("#demo").onclick=()=>{$("#amt").value=1000;S.amt=1000;mode("send");set("USD","INR")};
const MOON='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',SUN='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
function applyTheme(d){document.documentElement.dataset.theme=d?"dark":"light";$("#theme").innerHTML=d?SUN:MOON;sv("ff-dark",d);if(chart)draw()}
$("#theme").onclick=()=>applyTheme(document.documentElement.dataset.theme!=="dark");
applyTheme(ls("ff-dark",true));
function toast(m){const d=document.createElement("div");d.className="toast";d.textContent=m;$("#toasts").append(d);setTimeout(()=>d.remove(),6000);try{if("Notification"in window&&Notification.permission==="granted")new Notification("ForexFlip",{body:m})}catch(e){}}
$("#aset").onclick=()=>{const v=+$("#atgt").value;if(!v)return toast("Enter a target rate first.");try{Notification.requestPermission()}catch(e){}
 S.alerts.push({pair:S.from+"/"+S.to,dir:$("#adir").value,tgt:v,done:false});sv("ff-alerts",S.alerts);$("#atgt").value="";render()};
$("#alist").onclick=e=>{const i=e.target.dataset.del;if(i!==undefined){e.preventDefault();S.alerts.splice(+i,1);sv("ff-alerts",S.alerts);render()}};
function check(){S.alerts.forEach(a=>{if(a.done)return;const[f,t]=a.pair.split("/"),r=rate(f,t);if(a.dir==="ge"?r>=a.tgt:r<=a.tgt){a.done=true;toast(`${a.pair} hit ${fr(r)} (target ${a.tgt})`)}});sv("ff-alerts",S.alerts)}
function nudge(k){R[S.to]*=k;render();check()}
$("#spike").onclick=()=>nudge(1.005);
function go(t){document.querySelectorAll("[data-tab]").forEach(e=>e.classList.toggle("on",e.dataset.tab===t));document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("on",b.dataset.go===t));if(t==="history")draw();if(t==="compare")render();scrollTo({top:0});try{history.replaceState(null,"","#"+t)}catch(e){}}
$("#nav").onclick=e=>{const g=e.target.dataset.go;if(g)go(g)};
$("#bell").onclick=()=>$("#alertbox").classList.toggle("open");
addEventListener("keydown",e=>{if(e.key==="Escape")$("#alertbox").classList.remove("open")});
go(["convert","history","compare"].includes(location.hash.slice(1))?location.hash.slice(1):"convert");
setInterval(()=>nudge(1+(Math.random()-.5)*.0008),4000);
const SY=["$","₹","€","£","¥","₩","฿","₣","₺","₽","¢","₦"],CO=["#5eead4","#a78bfa","#f472b6","#60a5fa","#34d399"];
for(let i=0;i<24;i++){const e=document.createElement("span");e.className="sym";e.textContent=SY[i%SY.length];Object.assign(e.style,{left:Math.random()*94+"vw",top:Math.random()*88+"vh",color:CO[i%5],fontSize:(18+Math.random()*26)+"px"});e.style.setProperty("--dx",(Math.random()*80-40)+"px");e.style.setProperty("--dy",(Math.random()*80-40)+"px");e.style.setProperty("--d",(5+Math.random()*7)+"s");$("#fx").append(e)}
let dr=null,ox=0,oy=0;
$("#fx").addEventListener("pointerdown",e=>{if(!e.target.classList.contains("sym"))return;dr=e.target;dr.setPointerCapture(e.pointerId);dr.classList.add("drag");ox=e.clientX-dr.offsetLeft;oy=e.clientY-dr.offsetTop});
addEventListener("pointermove",e=>{if(dr){dr.style.left=e.clientX-ox+"px";dr.style.top=e.clientY-oy+"px"}});
addEventListener("pointerup",()=>{if(dr)dr.classList.remove("drag");dr=null});
loadRates();