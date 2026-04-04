/* ─── GLOBALS ─── */
let token = localStorage.getItem('zorvyn_token') || null;
let currentUser = JSON.parse(localStorage.getItem('zorvyn_user') || 'null');
let currentPeriod = 'month';

/* ─── API HELPER ─── */
const API_URL = '/api';
async function apiFetch(path, method = 'GET', body = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${path}`, opts);
  if (res.status === 401 && token) {
    doLogout();
    return null;
  }
  const data = await res.json();
  return data;
}

/* ─── CURSOR ─── */
const C=document.getElementById('C'),CR=document.getElementById('CR');
let mx=0,my=0,rrx=0,rry=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;C.style.left=mx+'px';C.style.top=my+'px'});
(function raf(){rrx+=(mx-rrx)*.11;rry+=(my-rry)*.11;if(CR) {CR.style.left=rrx+'px';CR.style.top=rry+'px';}requestAnimationFrame(raf)})();
document.addEventListener('mousedown',()=>{C.style.transform='translate(-50%,-50%) scale(1.8)';if(CR)CR.style.transform='translate(-50%,-50%) scale(.8)'});
document.addEventListener('mouseup',()=>{C.style.transform='translate(-50%,-50%) scale(1)';if(CR)CR.style.transform='translate(-50%,-50%) scale(1)'});

/* ─── CANVAS PARTICLES ─── */
(function(){
  const cv=document.getElementById('bg');
  if(!cv)return;
  const cx=cv.getContext('2d');
  let W,H,nodes=[];
  const resize=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;spawnNodes()};
  const spawnNodes=()=>{
    nodes=[];
    const n=Math.floor((W*H)/12000);
    for(let i=0;i<n;i++)nodes.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.2+.3,a:Math.random()*.4+.1});
  };
  let t=0;
  const draw=()=>{
    cx.clearRect(0,0,W,H);t+=.003;
    nodes.forEach(n=>{n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>W)n.vx*=-1;if(n.y<0||n.y>H)n.vy*=-1});
    for(let i=0;i<nodes.length;i++){
      for(let j=i+1;j<nodes.length;j++){
        const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y;
        const d=Math.sqrt(dx*dx+dy*dy);
        if(d<110){cx.beginPath();cx.moveTo(nodes[i].x,nodes[i].y);cx.lineTo(nodes[j].x,nodes[j].y);cx.strokeStyle=`rgba(0,255,135,${.035*(1-d/110)})`;cx.lineWidth=.6;cx.stroke()}
      }
      cx.beginPath();cx.arc(nodes[i].x,nodes[i].y,nodes[i].r,0,Math.PI*2);
      cx.fillStyle=`rgba(0,255,135,${nodes[i].a*(0.5+0.5*Math.sin(t+nodes[i].x*.01))})`;cx.fill();
    }
    requestAnimationFrame(draw);
  };
  resize();draw();window.addEventListener('resize',resize);
})();

/* ─── SPARKLINE DRAW ─── */
function drawSpk(svgId,data,col,viewW,viewH){
  const s=document.getElementById(svgId);if(!s)return;
  const mn=Math.min(...data),mx2=Math.max(...data),rng=mx2-mn||1;
  const pad=3;
  const pts=data.map((v,i)=>({
    x:pad+(i/(data.length-1))*(viewW-pad*2),
    y:viewH-pad-((v-mn)/rng)*(viewH-pad*2)
  }));
  const line=pts.map((p,i)=>(i===0?`M${p.x.toFixed(1)},${p.y.toFixed(1)}`:`L${p.x.toFixed(1)},${p.y.toFixed(1)}`)).join(' ');
  const area=line+` L${viewW-pad},${viewH} L${pad},${viewH} Z`;
  const gid='g'+svgId;
  s.innerHTML=`<defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${col}" stop-opacity="0.35"/><stop offset="100%" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
  <path d="${area}" fill="url(#${gid})"/>
  <path d="${line}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="${pts[pts.length-1].x.toFixed(1)}" cy="${pts[pts.length-1].y.toFixed(1)}" r="3" fill="${col}"/>
  <circle cx="${pts[pts.length-1].x.toFixed(1)}" cy="${pts[pts.length-1].y.toFixed(1)}" r="5.5" fill="${col}" opacity="0.25"/>`;
}

/* ─── ON LOAD ─── */
document.addEventListener('DOMContentLoaded', () => {
  drawSpk('lSpk',[12,18,22,19,28,25,35,32,42,38,50,48,60,58,70,68,80,78,85,82,90,88,95],'#00FF87',500,70);

  // Tabs
  document.getElementById('tab-login')?.addEventListener('click', function() {
    this.classList.add('active'); this.style.background = 'var(--g)'; this.style.color = '#04050A';
    const tre = document.getElementById('tab-register');
    tre.classList.remove('active'); tre.style.background = 'transparent'; tre.style.color = 'var(--muted2)';
    document.getElementById('login-panel').style.display = 'block';
    document.getElementById('register-panel').style.display = 'none';
  });
  document.getElementById('tab-register')?.addEventListener('click', function() {
    this.classList.add('active'); this.style.background = 'var(--g)'; this.style.color = '#04050A';
    const tlo = document.getElementById('tab-login');
    tlo.classList.remove('active'); tlo.style.background = 'transparent'; tlo.style.color = 'var(--muted2)';
    document.getElementById('register-panel').style.display = 'block';
    document.getElementById('login-panel').style.display = 'none';
  });

  if (token && currentUser) {
    document.getElementById('LP').style.display = 'none';
    document.getElementById('DP').style.display = 'block';
    setupUser();
    initDash();
  }
});

/* ─── AUTH ─── */
const fill=(e,p)=>{document.getElementById('eIn').value=e;document.getElementById('pIn').value=p};

async function doLogin(){
  try {
    const e=document.getElementById('eIn').value.trim(),p=document.getElementById('pIn').value;
    const btn=document.getElementById('signinBtn');
    btn.textContent = 'CONNECTING...';

    const res = await apiFetch('/auth/login', 'POST', { email: e, password: p });
    if(!res || !res.success){
      btn.classList.add('err');btn.textContent=res?.message||'INVALID — TRY AGAIN';
      setTimeout(()=>{btn.classList.remove('err');btn.textContent='SIGN IN →'},1500);return;
    }

    token = res.data.accessToken;
    currentUser = res.data.user;
    localStorage.setItem('zorvyn_token', token);
    localStorage.setItem('zorvyn_user', JSON.stringify(currentUser));

    setupUser();

    const lp=document.getElementById('LP');
    lp.style.transition='opacity .55s ease,transform .55s ease';
    lp.style.opacity='0';lp.style.transform='scale(.97)';
    setTimeout(()=>{
      lp.style.display='none';
      document.getElementById('DP').style.display='block';
      initDash();
      showToast('✅','Welcome back, '+currentUser.name.split(' ')[0]+'!','Your neural command center is live');
    },560);
  } catch (err) {
    alert("CRITICAL ERROR: " + err.message + "\nPlease take a screenshot of this error.");
    console.error(err);
  }
}

async function doRegister() {
  const btn = document.getElementById('registerBtn');
  const errEl = document.getElementById('register-error');
  errEl.textContent = '';
  
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;

  if (password !== confirm) { errEl.textContent = 'Passwords do not match.'; return; }
  
  btn.textContent = 'CREATING...';
  const res = await apiFetch('/auth/register', 'POST', { name, email, password });
  
  if (!res || !res.success) {
    btn.classList.add('err');
    let msg = 'Registration failed.';
    if (res?.errors?.length) msg = res.errors.map(e => e.message).join(' · ');
    else if (res?.message) msg = res.message;
    errEl.textContent = msg;
    btn.textContent = 'CREATE ACCOUNT →';
    return;
  }

  // Auto login
  const loginData = await apiFetch('/auth/login', 'POST', { email, password });
  if (loginData?.success) {
    token = loginData.data.accessToken;
    currentUser = loginData.data.user;
    localStorage.setItem('zorvyn_token', token);
    localStorage.setItem('zorvyn_user', JSON.stringify(currentUser));
    setupUser();
    const lp=document.getElementById('LP');
    lp.style.transition='opacity .55s ease,transform .55s ease';
    lp.style.opacity='0';lp.style.transform='scale(.97)';
    setTimeout(()=>{
      lp.style.display='none';
      document.getElementById('DP').style.display='block';
      initDash();
      showToast('✅','Account created!','Welcome to Zorvyn.');
    },560);
  } else {
    document.getElementById('tab-login').click();
    showToast('✅','Account created!','Please sign in.');
    btn.textContent = 'CREATE ACCOUNT →';
  }
}

function doLogout(){
  apiFetch('/auth/logout', 'POST', { refreshToken: 'mock' }); // Revoke token on server ideally
  localStorage.removeItem('zorvyn_token');
  localStorage.removeItem('zorvyn_user');
  token = null;
  currentUser = null;
  document.getElementById('DP').style.display='none';
  const lp=document.getElementById('LP');lp.style.display='flex';lp.style.opacity='0';lp.style.transform='scale(.97)';
  requestAnimationFrame(()=>{lp.style.transition='opacity .4s ease,transform .4s ease';lp.style.opacity='1';lp.style.transform='scale(1)'});
}

function setupUser() {
  document.getElementById('sbAva').textContent=currentUser.name.charAt(0).toUpperCase();
  document.getElementById('sbName').textContent=currentUser.name;
  document.getElementById('sbRole').textContent=currentUser.role;
}

['eIn','pIn'].forEach(id=>{
  document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin()})
});

/* ─── DATA LOADING ─── */
const BMAP={Salary:'bsal',Rent:'bren',Freelance:'bfre',Utilities:'buti',Groceries:'bgro',Transport:'btra',Investment:'binv'};

async function loadDashboard() {
  const sumRes = await apiFetch(`/dashboard/summary?period=${currentPeriod}`);
  if(sumRes && sumRes.success) {
    const d = sumRes.data;
    document.getElementById('kTotalIncome').dataset.t = d.totalIncome;
    document.getElementById('kTotalExpenses').dataset.t = d.totalExpenses;
    document.getElementById('kNetBalance').dataset.t = d.netBalance;
    document.getElementById('kRecordCount').dataset.t = d.recordCount;
    animCounters();
  }

  const catRes = await apiFetch(`/dashboard/categories?period=${currentPeriod}`);
  if(catRes && catRes.success) {
    const exps = catRes.data.filter(c=>c.expense>0).map(c=>({ category: c.category, total: c.expense })).sort((a,b)=>b.total-a.total);
    let totExp = exps.reduce((a,b)=>a+b.total, 0);
    document.getElementById('catTotalExp').textContent = `₹${totExp.toLocaleString('en-IN')}`;
    
    // Ring drawing
    const cv=document.getElementById('ringC');
    if (cv) {
      const ctx=cv.getContext('2d');
      const colors = ['#FF3D71','#40C4FF','#FFD166','#B388FF','#FF8C42'];
      ctx.clearRect(0,0,150,150);
      let start=-Math.PI/2;
      const total = totExp || 1;
      exps.forEach((s,i)=>{
        const ang=(s.total/total)*Math.PI*2;
        ctx.beginPath();ctx.arc(75,75,60,start,start+ang-.04);
        ctx.strokeStyle=colors[i%colors.length];ctx.lineWidth=16;ctx.lineCap='round';
        ctx.shadowBlur=12;ctx.shadowColor=colors[i%colors.length];ctx.stroke();
        ctx.shadowBlur=0;start+=ang;
      });

      // Categories List
      const catList = document.getElementById('catList');
      catList.innerHTML = '';
      exps.forEach((s, i) => {
        let pct = ((s.total/total)*100).toFixed(0);
        let c = colors[i%colors.length];
        catList.innerHTML += `<div class="crow">
          <div class="cdot" style="background:${c}"></div>
          <div class="cname">${s.category}</div>
          <div class="cbg"><div class="cfill" style="background:${c}" data-w="${pct}%"></div></div>
          <div class="camt" style="color:${c}">−₹${s.total.toLocaleString()}</div>
        </div>`;
      });
      setTimeout(() => document.querySelectorAll('[data-w]').forEach(el=>el.style.width=el.dataset.w), 100);
    }
  }

  const recRes = await apiFetch(`/dashboard/recent?limit=8`);
  if(recRes && recRes.success) {
    const b = document.getElementById('tb1');
    b.innerHTML = '';
    recRes.data.forEach((t,i) => {
      const pos = t.type==='INCOME';
      const catClass = BMAP[t.category]||'bgro';
      const d = new Date(t.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      b.innerHTML += `<tr class="txrow" style="animation-delay:${i*.04}s" data-type="${t.type}">
        <td class="tddate">${d}</td>
        <td class="tddesc">${t.description||t.category}</td>
        <td><span class="bdg ${catClass}">${t.category}</span></td>
        <td class="tdamt ${pos?'pos':'neg'}">${pos?'+':'-'}₹${Math.abs(t.amount).toLocaleString('en-IN')}</td>
      </tr>`;
    });
  }
}

async function loadTransactions() {
  const recRes = await apiFetch(`/records?limit=50`);
  if(recRes && recRes.success) {
    const b = document.getElementById('tb2');
    b.innerHTML = '';
    recRes.data.forEach((t,i) => {
      const pos = t.type==='INCOME';
      const catClass = BMAP[t.category]||'bgro';
      const d = new Date(t.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
      b.innerHTML += `<tr class="txrow" style="animation-delay:${i*.02}s" data-type="${t.type}">
        <td class="tddate">${d}</td>
        <td class="tddesc">${t.description||t.category}</td>
        <td><span class="bdg ${catClass}">${t.category}</span></td>
        <td class="tdby">${t.author ? t.author.name : 'Unknown'}</td>
        <td class="tdamt ${pos?'pos':'neg'}">${pos?'+':'-'}₹${Math.abs(t.amount).toLocaleString('en-IN')}</td>
      </tr>`;
    });
  }
}

/* ─── COUNTER ─── */
function animCounters(){
  document.querySelectorAll('[data-t]').forEach(el=>{
    const target=+el.dataset.t,pfx=el.dataset.p||'';
    let v=0;const step=target/65;
    const iv=setInterval(()=>{
      v=target < 100 && target > 0 ? v + (target/15) : Math.min(v+step,target);
      if (v >= target) v = target;
      el.textContent=pfx+(pfx==='₹'?Math.round(v).toLocaleString('en-IN'):Math.round(v));
      if(v>=target)clearInterval(iv);
    },14);
  });
}

function doFilterRecent(f,el){
  document.querySelectorAll('#vOverview .txf').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('#tb1 .txrow').forEach(tr => {
    if(f === 'all' || tr.dataset.type === f) tr.style.display = '';
    else tr.style.display = 'none';
  });
}
function doFilterTx(f,el){
  document.querySelectorAll('#vTransactions .txf').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  document.querySelectorAll('#tb2 .txrow').forEach(tr => {
    if(f === 'all' || tr.dataset.type === f) tr.style.display = '';
    else tr.style.display = 'none';
  });
}

/* ─── BIG BAR CHART ─── */
async function drawBigBar(){
  const trRes = await apiFetch(`/dashboard/trends/monthly?months=7`);
  if (!trRes || !trRes.success) return;
  const trends = trRes.data.reverse();

  const mContainer = document.getElementById('bigCMonths');
  mContainer.innerHTML = '';
  trends.forEach(t => {
    const mName = new Date(t.month + '-01').toLocaleString('en', {month: 'short'});
    mContainer.innerHTML += `<div class="cm">${mName.toUpperCase()}</div>`;
  });

  const income = trends.map(t=>t.income);
  const expense = trends.map(t=>t.expense);

  const cv=document.getElementById('bigC');if(!cv)return;
  const ctx=cv.getContext('2d');
  const W=cv.offsetWidth,H=cv.offsetHeight;cv.width=W;cv.height=H;
  const max=Math.max(...income, ...expense, 100);const mths=income.length;
  const gW=(W-16)/mths,bW=gW*.28;
  let prog=0;
  const fr=()=>{
    ctx.clearRect(0,0,W,H);prog=Math.min(prog+.04,1);
    const e2=1-Math.pow(1-prog,3);
    [.25,.5,.75,1].forEach(f=>{const y=(1-f)*(H-4)+2;ctx.beginPath();ctx.moveTo(8,y);ctx.lineTo(W-8,y);ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;ctx.stroke()});
    income.forEach((v,i)=>{
      const x=8+i*gW+gW*.06;
      const iH=(v/max)*(H-8)*e2;const eH=(expense[i]/max)*(H-8)*e2;
      const gi=ctx.createLinearGradient(0,H-iH,0,H);gi.addColorStop(0,'rgba(0,255,135,0.9)');gi.addColorStop(1,'rgba(0,255,135,0.15)');
      ctx.fillStyle=gi;ctx.beginPath();ctx.roundRect(x,H-iH,bW,iH,3);ctx.fill();
      const ge=ctx.createLinearGradient(0,H-eH,0,H);ge.addColorStop(0,'rgba(255,61,113,0.85)');ge.addColorStop(1,'rgba(255,61,113,0.1)');
      ctx.fillStyle=ge;ctx.beginPath();ctx.roundRect(x+bW+4,H-eH,bW,eH,3);ctx.fill();
    });
    if(prog<1)requestAnimationFrame(fr);
  };fr();
}

/* ─── ANALYTICS CHARTS ─── */
async function drawAnalytics(){
  const trRes = await apiFetch(`/dashboard/trends/monthly?months=7`);
  if (!trRes || !trRes.success) return;
  const trends = trRes.data.reverse();

  // Line
  const lc=document.getElementById('lchart');if(!lc)return;
  const lctx=lc.getContext('2d');lc.width=lc.offsetWidth;lc.height=lc.offsetHeight;
  const W=lc.width,H=lc.height;
  const d=trends.map(t=>t.income - t.expense);
  const mn=Math.min(...d, 0),mx=Math.max(...d, 100),rng=mx-mn;
  const pts=d.map((v,i)=>({x:(i/(d.length-1))*(W-20)+10,y:(H-12)-((v-mn)/rng)*(H-22)+4}));
  const gr=lctx.createLinearGradient(0,0,0,H);gr.addColorStop(0,'rgba(0,255,135,0.3)');gr.addColorStop(1,'rgba(0,255,135,0)');
  lctx.beginPath();pts.forEach((p,i)=>i===0?lctx.moveTo(p.x,p.y):lctx.lineTo(p.x,p.y));
  lctx.lineTo(pts[pts.length-1].x,H);lctx.lineTo(pts[0].x,H);lctx.closePath();lctx.fillStyle=gr;lctx.fill();
  lctx.beginPath();pts.forEach((p,i)=>i===0?lctx.moveTo(p.x,p.y):lctx.lineTo(p.x,p.y));
  lctx.strokeStyle='#00FF87';lctx.lineWidth=2.5;lctx.lineJoin='round';lctx.stroke();
  pts.forEach(p=>{lctx.beginPath();lctx.arc(p.x,p.y,4,0,Math.PI*2);lctx.fillStyle='#04050A';lctx.fill();lctx.beginPath();lctx.arc(p.x,p.y,3,0,Math.PI*2);lctx.fillStyle='#00FF87';lctx.fill()});
  
  const mContainer = document.getElementById('lchartMonths');
  mContainer.innerHTML = '';
  trends.forEach(t => {
    const mName = new Date(t.month + '-01').toLocaleString('en', {month: 'short'});
    mContainer.innerHTML += `<span style="font-size:8px;letter-spacing:1px;color:var(--muted)">${mName.toUpperCase()}</span>`;
  });

  // Bar2
  const bc=document.getElementById('bchart2');if(!bc)return;
  const bctx=bc.getContext('2d');bc.width=bc.offsetWidth;bc.height=bc.offsetHeight;
  const bW2=bc.width,bH2=bc.height;
  const inc=$inc=trends.map(t=>t.income);const exp=$exp=trends.map(t=>t.expense);
  const bmax=Math.max(...inc, ...exp, 100);const gW2=bW2/inc.length;const bw3=gW2*.3;
  let p2=0;
  const fr2=()=>{
    bctx.clearRect(0,0,bW2,bH2);p2=Math.min(p2+.05,1);const e2=1-Math.pow(1-p2,3);
    inc.forEach((v,i)=>{
      const x=i*gW2+gW2*.1;const ih=(v/bmax)*(bH2-8)*e2;const eh=(exp[i]/bmax)*(bH2-8)*e2;
      const g1=bctx.createLinearGradient(0,0,0,bH2);g1.addColorStop(0,'rgba(0,255,135,.9)');g1.addColorStop(1,'rgba(0,255,135,.15)');
      bctx.fillStyle=g1;bctx.beginPath();bctx.roundRect(x,bH2-ih,bw3,ih,3);bctx.fill();
      const g2=bctx.createLinearGradient(0,0,0,bH2);g2.addColorStop(0,'rgba(255,61,113,.85)');g2.addColorStop(1,'rgba(255,61,113,.1)');
      bctx.fillStyle=g2;bctx.beginPath();bctx.roundRect(x+bw3+4,bH2-eh,bw3,eh,3);bctx.fill();
    });
    if(p2<1)requestAnimationFrame(fr2);
  };fr2();

  // Dist (Neural Orbit)
  const catRes = await apiFetch(`/dashboard/categories?period=year`);
  if(catRes && catRes.success) {
    const exps = catRes.data.filter(c=>c.expense>0).map(c=>({ category: c.category, total: c.expense })).sort((a,b)=>b.total-a.total);
    const total = exps.reduce((a,b)=>a+b.total, 0) || 1;
    const distContainer = document.getElementById('expDist');
    distContainer.innerHTML = '';
    distContainer.style.display = 'block';

    const canvas = document.createElement('canvas');
    const W = distContainer.offsetWidth || 800; // Fallback
    canvas.width = W;
    canvas.height = 340;
    canvas.style.width = '100%';
    canvas.style.height = '340px';
    canvas.style.borderRadius = '12px';
    canvas.style.border = '1px solid var(--border)';
    canvas.style.background = 'radial-gradient(circle at center, rgba(0,255,135,0.03) 0%, var(--bg1) 100%)';
    distContainer.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const colors = ['#FF3D71','#40C4FF','#FFD166','#B388FF','#FF8C42', '#00FF87'];

    const nodes = exps.map((c, i) => {
      const weight = Math.max(0.1, c.total / total);
      return {
        cat: c.category, amt: c.total, r: 8 + (weight * 35),
        col: colors[i % colors.length],
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.002) + 0.001 * (i%2==0?1:-1),
        dist: 70 + Math.random() * 50 + (i*15)
      };
    });

    const cx = W / 2, cy = 170;
    let hn = null;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (canvas.height / rect.height);
      hn = null;
      nodes.forEach(n => {
        const nx = cx + Math.cos(n.angle) * n.dist, ny = cy + Math.sin(n.angle) * n.dist;
        if (Math.hypot(mx - nx, my - ny) < n.r + 10) hn = n;
      });
      canvas.style.cursor = hn ? 'pointer' : 'default';
    });

    const fr = () => {
      if(!canvas.offsetParent) { requestAnimationFrame(fr); return; } // Pause if hidden
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 20);
      grad.addColorStop(0, '#fff'); grad.addColorStop(1, 'rgba(0, 255, 135, 0.4)');
      ctx.fillStyle = grad; ctx.shadowBlur = 25; ctx.shadowColor = '#00FF87'; ctx.fill(); ctx.shadowBlur = 0;

      const t = Date.now() / 1000;
      ctx.beginPath(); ctx.arc(cx, cy, 20 + (Math.sin(t*3)*4), 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(0, 255, 135, 0.5)'; ctx.lineWidth = 1; ctx.stroke();
      
      ctx.fillStyle = 'rgba(0, 255, 135, 0.7)';
      ctx.font = 'bold 9px JetBrains Mono'; ctx.textAlign = 'center';
      ctx.fillText('OUTFLOW', cx, cy + 34);

      nodes.forEach((n, i) => {
        n.angle += n.speed;
        const nx = cx + Math.cos(n.angle) * n.dist, ny = cy + Math.sin(n.angle) * n.dist;

        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
        ctx.strokeStyle = `rgba(255, 255, 255, ${hn===n ? 0.3 : 0.05})`;
        ctx.lineWidth = hn===n ? 2 : 1; ctx.stroke();

        for(let j=i+1; j<nodes.length; j++) {
           const o = nodes[j], ox = cx + Math.cos(o.angle) * o.dist, oy = cy + Math.sin(o.angle) * o.dist;
           if (Math.hypot(nx-ox, ny-oy) < 110) {
              ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(ox, oy);
              ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.stroke();
           }
        }
      });

      nodes.forEach((n) => {
        const nx = cx + Math.cos(n.angle) * n.dist, ny = cy + Math.sin(n.angle) * n.dist;
        ctx.beginPath(); ctx.arc(nx, ny, n.r + (hn===n ? 3 : 0), 0, Math.PI*2);
        ctx.fillStyle = n.col; ctx.shadowBlur = hn===n ? 20 : 10; ctx.shadowColor = n.col; ctx.fill(); ctx.shadowBlur = 0;

        if (hn === n || n.r > 12) {
          ctx.fillStyle = '#fff'; ctx.font = hn===n ? '11px JetBrains Mono' : '9px JetBrains Mono';
          ctx.fillText(n.cat.toUpperCase(), nx, ny - n.r - 6);
          if(hn === n) {
             ctx.fillStyle = n.col; ctx.fillText('₹' + n.amt.toLocaleString('en-IN'), nx, ny + n.r + 14);
          }
        }
      });

      requestAnimationFrame(fr);
    }
    fr();
  }
}

/* ─── TICKER ─── */
function buildTicker(){
  const items=[
    {n:'NIFTY 50',v:'22,418.35',c:'+0.48%',u:true},{n:'SENSEX',v:'73,961.42',c:'+0.52%',u:true},
    {n:'USD/INR',v:'83.42',c:'-0.12%',u:false},{n:'GOLD',v:'₹72,430',c:'+0.31%',u:true},
    {n:'RELIANCE',v:'₹2,872',c:'+1.2%',u:true},{n:'TCS',v:'₹3,541',c:'-0.35%',u:false},
    {n:'HDFC BANK',v:'₹1,642',c:'+0.87%',u:true},{n:'INFOSYS',v:'₹1,389',c:'+0.61%',u:true},
    {n:'BITCOIN',v:'$83,542',c:'+2.14%',u:true},{n:'CRUDE OIL',v:'$74.38',c:'-0.82%',u:false},
    {n:'NIFTY BANK',v:'48,221',c:'+0.33%',u:true},{n:'WIPRO',v:'₹462',c:'+0.45%',u:true},
  ];
  const html=items.map(i=>`<span class="titem"><span class="tname">${i.n}</span>${i.v}<span class="${i.u?'tup':'tdn'}">${i.c}</span></span>`).join('');
  const t=document.getElementById('ttrack');t.innerHTML=html+html;
}

/* ─── INIT DASHBOARD ─── */
function initDash(){
  loadDashboard();
  loadTransactions();
  buildTicker();
  setTimeout(()=>{
    drawSpk('ks1',[40,55,48,65,72,68,82,78,88,97],'#00FF87',300,40);
    drawSpk('ks2',[5200,6800,5900,7100,6400,8200,7600],'#FF3D71',300,40);
    drawSpk('ks3',[32,42,38,56,63,60,74,80,89,89.4],'#B388FF',300,40);
    drawSpk('ks4',[2,3,2,4,3,5,4,5,6,6],'#FF8C42',300,40);
    drawBigBar();
  },400);
}

/* ─── NAV ─── */
const VIEWS={overview:'vOverview',transactions:'vTransactions',analytics:'vAnalytics',settings:'vSettings'};
const TITLES={overview:'FINANCIAL OVERVIEW',transactions:'TRANSACTIONS',analytics:'ANALYTICS',settings:'SETTINGS'};
const SUBS={overview:'',transactions:'All Records',analytics:'Deep Insights',settings:'Preferences'};
function goView(v,el){
  Object.values(VIEWS).forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none'});
  const vEl=document.getElementById(VIEWS[v]);if(vEl)vEl.style.display='block';
  document.querySelectorAll('.nav').forEach(n=>n.classList.remove('on'));el.classList.add('on');
  document.getElementById('pvTitle').textContent=TITLES[v];
  if(v==='overview') {
    document.getElementById('pvSub').textContent=new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  } else {
    document.getElementById('pvSub').textContent=SUBS[v];
  }
  if(v==='analytics')setTimeout(drawAnalytics,100);
  if(v==='transactions')loadTransactions();
}
function setTT(period,el){
  document.querySelectorAll('.tt').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  currentPeriod = period;
  loadDashboard();
}

/* ─── TOAST ─── */
function showToast(ico,title,body){
  document.getElementById('tIco').textContent=ico;
  document.getElementById('tTitle').textContent=title;
  document.getElementById('tBody').textContent=body;
  const t=document.getElementById('toast');
  t.classList.add('in');
  const bar=t.querySelector('.tbar');bar.style.animation='none';void bar.offsetWidth;bar.style.animation='tbp 3.5s linear forwards';
  setTimeout(()=>t.classList.remove('in'),3600);
}
