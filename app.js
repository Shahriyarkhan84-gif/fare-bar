var SUPABASE_URL='https://fitscgmzxggpobzulpbe.supabase.co';
var SUPABASE_KEY='sb_publishable_uKwUj4XVuipFDdlI8NR8Pg_v0X3j84n'; // publishable key: safe to ship in the page
var TRIAL_DAYS=30;
var LITRES_PER_GALLON=4.54609; // UK gallon, to turn MPG and £ per litre into £ per mile
var COST_DEFAULTS={mpg:45,fuel:1.45,target:15,opp:0,tax:0,assume:true};
var $=function(id){return document.getElementById(id)};
var TITLES={loading:'Fare Bar',login:'Log in',signup:'Create account',home:'Fare Bar',log:'Log delivery',cost:'Cost model',auto:'Auto-detect',profile:'Profile',control:'Control Centre',plans:'Subscription'};
var STEPS={login:['Step 1 of 2','Log in'],plans:['Step 2 of 2','Choose a plan']};
var OFFER_IDS=['inPlatform','inRate','inMins','inOut','inRet'];
var COST_IDS={cMpg:'mpg',cFuel:'fuel',cTarget:'target',cOpp:'opp',cTax:'tax'};
var sb=null,session=null,trialRow=null,isOwner=false,ready=false,deliveries=[];

/* ---------- small helpers ---------- */
function get(k){try{return localStorage.getItem(k)}catch(e){return null}}
function set(k,v){try{v===null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}
function num(v){var n=parseFloat(String(v).replace(',','.'));return isFinite(n)?n:NaN}
function money(n){return(n<0?'−£':'£')+Math.abs(n).toFixed(2)}
function note(id,text,bad){var n=$(id);n.textContent=text;n.className='small'+(bad?' bad':'')}

/* ---------- cost model and profit ---------- */
function cost(){
  var c={},saved={};
  try{saved=JSON.parse(get('fareBarCost')||'{}')||{}}catch(e){}
  Object.keys(COST_DEFAULTS).forEach(function(k){c[k]=saved[k]!=null?saved[k]:COST_DEFAULTS[k]});
  return c;
}
function saveCost(c){set('fareBarCost',JSON.stringify(c))}
function costPerMile(c){return c.mpg>0?c.fuel*LITRES_PER_GALLON/c.mpg:0}
// Net profit = rate − (outbound + return miles) × cost per mile − time cost − tax
function compute(o,c){
  var ret=c.assume?o.out:o.ret,miles=o.out+ret,cpm=costPerMile(c);
  var mileCost=miles*cpm,timeCost=o.mins>0?c.opp*o.mins/60:0,before=o.rate-mileCost-timeCost;
  var tax=before>0?before*c.tax/100:0,net=before-tax;
  var perHour=o.mins>0?net/o.mins*60:null,status='none';
  if(perHour!==null)status=perHour>=c.target?'green':perHour>=c.target*0.7?'yellow':'red';
  return{ret:ret,miles:miles,cpm:cpm,mileCost:mileCost,timeCost:timeCost,tax:tax,net:net,perHour:perHour,status:status,strong:perHour!==null&&perHour>=c.target*1.25};
}
function offer(){
  return{platform:$('inPlatform').value.trim(),rate:num($('inRate').value),out:num($('inOut').value),ret:num($('inRet').value),mins:num($('inMins').value)||0};
}
function offerValid(o,c){return o.rate>=0&&o.out>=0&&(c.assume||o.ret>=0)&&(o.out>0||o.ret>0)}
function loadOffer(){try{var s=JSON.parse(get('fareBarOffer')||'{}');OFFER_IDS.forEach(function(id){if(s[id]!=null)$(id).value=s[id]})}catch(e){}}
function saveOffer(){var s={};OFFER_IDS.forEach(function(id){s[id]=$(id).value});set('fareBarOffer',JSON.stringify(s))}

function isActive(){return get('fareBarActive')!=='0'}
function setActive(on){
  set('fareBarActive',on?'1':'0');
  $('activeToggle').setAttribute('aria-checked',on?'true':'false');
  $('activeNote').textContent=on?'On: new orders update the bar':'Off: new orders are ignored';
  calc();
}
function calc(){
  var c=cost(),o=offer(),bar=$('bar'),banner=$('banner');
  $('inRet').disabled=c.assume;
  if(c.assume&&o.out>=0)$('inRet').value=o.out;
  if(!isActive()){
    bar.className='bar none';$('bRate').textContent='(–)';$('bMiles').textContent='–';$('bNet').textContent='OFF';
    banner.className='banner none';banner.textContent='Fare Bar is off. Turn Active on to see profit.';
    $('breakdown').textContent='';return null;
  }
  if(!offerValid(o,c)){
    bar.className='bar none';$('bRate').textContent='(–)';$('bMiles').textContent='–';$('bNet').textContent='–';
    banner.className='banner none';banner.textContent='Enter a rate and miles to see profit.';
    $('breakdown').textContent='';return null;
  }
  var r=compute(o,c);
  bar.className='bar '+r.status;
  $('bRate').textContent='('+o.rate.toFixed(2)+')';
  $('bMiles').textContent=r.miles.toFixed(1);
  $('bNet').textContent=r.net.toFixed(2);
  banner.className='banner '+r.status;
  banner.textContent=r.perHour===null?'Add the time to compare with your £'+c.target.toFixed(2)+' per hour target.':
    (r.status==='green'?(r.strong?'Strong offer':'On target'):r.status==='yellow'?'Below target':'Low-value offer')+' · '+money(r.perHour)+'/hr vs £'+c.target.toFixed(2)+' target';
  $('breakdown').textContent='Rate '+money(o.rate)+' − mileage '+money(r.mileCost)+' ('+r.miles.toFixed(1)+' mi × '+(r.cpm*100).toFixed(1)+'p)'+(r.timeCost?' − time '+money(r.timeCost):'')+(r.tax?' − tax '+money(r.tax):'')+' = net '+money(r.net)+'.';
  return{o:o,r:r};
}
function showCost(){
  var c=cost();
  Object.keys(COST_IDS).forEach(function(id){if(document.activeElement!==$(id))$(id).value=c[COST_IDS[id]]});
  $('assumeToggle').setAttribute('aria-checked',c.assume?'true':'false');
  $('assumeNote').textContent=c.assume?'Return miles are filled in for you':'You enter return miles yourself';
  $('costLine').textContent='Fuel costs you '+(costPerMile(c)*100).toFixed(1)+'p per mile ('+c.mpg+' mpg at £'+Number(c.fuel).toFixed(2)+' per litre).';
}

/* ---------- reading a delivery request ---------- */
function parseOffer(text){
  var t=String(text||'').replace(/(\d),(\d)/g,'$1.$2'),m,out={};
  var fares=[],re=/£\s*(\d+(?:\.\d{1,2})?)/g;
  while((m=re.exec(t)))fares.push(parseFloat(m[1]));
  if(fares.length)out.fare=Math.max.apply(null,fares); // the biggest £ amount is the total, tip included
  var dist=[],total=null;re=/(\d+(?:\.\d+)?)\s*(mi|miles?|km)\b(?=([^\n]{0,12}))/gi;
  while((m=re.exec(t))){var d=parseFloat(m[1])*(m[2].toLowerCase()==='km'?0.621371:1);dist.push(d);if(/total/i.test(m[3]))total=d}
  if(dist.length)out.miles=Math.round((total!==null?total:dist.reduce(function(a,b){return a+b},0))*100)/100; // "total" if shown, else pickup + drop-off
  var mins=[];re=/(\d+)\s*min/gi;
  while((m=re.exec(t)))mins.push(parseInt(m[1],10));
  if(mins.length)out.mins=Math.max.apply(null,mins);
  return out;
}
function applyOffer(o,source){
  var n=$('detected');n.hidden=false;
  if(!isActive()){n.className='small detected bad';n.textContent='Fare Bar is off, so that order was ignored.';return false}
  if(!(o.fare>=0)||!(o.miles>0)){n.className='small detected bad';n.textContent='Could not find a rate and a distance in that '+source+'.';return false}
  $('inRate').value=o.fare;$('inOut').value=o.miles;$('inMins').value=o.mins>0?o.mins:'';
  saveOffer();calc();
  n.className='small detected';
  n.textContent='Detected from '+source+': £'+o.fare.toFixed(2)+' · '+o.miles+' mi outbound'+(o.mins>0?' · '+o.mins+' min':'')+'.';
  return true;
}
function fromLink(){
  // ?text=... carries the text of a request screenshot; ?fare=3.07&miles=1&mins=7.5 carries the numbers directly
  var q=new URLSearchParams(location.search),o={},has=false;
  if(q.get('text')){o=parseOffer(q.get('text'));has=true}
  else['fare','miles','mins'].forEach(function(k){var v=num(q.get(k)||'');if(v>=0){o[k]=v;has=true}});
  if(!has)return;
  history.replaceState(null,'',location.pathname+location.hash);
  applyOffer(o,q.get('text')?'screenshot':'link');
}

/* ---------- deliveries, today and session ---------- */
function loadDeliveries(){
  if(!session){deliveries=[];return Promise.resolve()}
  return sb.from('deliveries').select('*').order('created_at',{ascending:false}).limit(500).then(function(r){deliveries=r.error?[]:r.data});
}
function totals(rows){
  var t={count:rows.length,net:0,miles:0,mins:0};
  rows.forEach(function(d){t.net+=Number(d.net);t.miles+=Number(d.outbound_miles)+Number(d.return_miles);t.mins+=Number(d.minutes)});
  t.perHour=t.mins>0?t.net/t.mins*60:null;
  return t;
}
function showDeliveries(){
  var c=cost(),start=new Date();start.setHours(0,0,0,0);
  var today=totals(deliveries.filter(function(d){return new Date(d.created_at)>=start}));
  $('tCount').textContent=today.count;$('tNet').textContent=money(today.net);$('tMiles').textContent=today.miles.toFixed(1);
  $('tHour').textContent=today.perHour===null?'–':money(today.perHour);
  var s=get('fareBarSession'),line=$('sessionLine');
  if(s){
    var st=totals(deliveries.filter(function(d){return new Date(d.created_at)>=new Date(s)}));
    var since=new Date(s).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
    var below=st.perHour!==null&&st.perHour<c.target;
    line.textContent='Since '+since+': '+st.count+(st.count===1?' delivery':' deliveries')+', '+money(st.net)+' net'+(st.perHour===null?'.':', '+money(st.perHour)+'/hr.')+(below?' Below your £'+c.target.toFixed(2)+' target pace.':'');
    line.className=below?'bad':'';
    $('sessionBtn').textContent='End session';
  }else{line.textContent='No session running.';line.className='';$('sessionBtn').textContent='Start session'}
  var list=$('recent');list.textContent='';
  if(!deliveries.length){var e=document.createElement('li');e.className='empty';e.textContent='No deliveries logged yet.';list.appendChild(e)}
  deliveries.slice(0,5).forEach(function(d){
    var li=document.createElement('li'),what=document.createElement('span'),b=document.createElement('b'),sm=document.createElement('small'),net=document.createElement('span'),del=document.createElement('button');
    var miles=Number(d.outbound_miles)+Number(d.return_miles),ph=Number(d.minutes)>0?Number(d.net)/Number(d.minutes)*60:null;
    what.className='what';b.textContent=d.platform||'Delivery';
    sm.textContent='('+Number(d.rate).toFixed(2)+')+ '+miles.toFixed(1)+' · '+new Date(d.created_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    what.appendChild(b);what.appendChild(sm);
    net.className='net '+(ph===null?'none':ph>=c.target?'green':ph>=c.target*0.7?'yellow':'red');net.textContent=money(Number(d.net));
    del.className='del';del.type='button';del.textContent='×';del.setAttribute('aria-label','Delete this delivery');del.dataset.id=d.id;
    li.appendChild(what);li.appendChild(net);li.appendChild(del);list.appendChild(li);
  });
  $('exportCsv').disabled=!deliveries.length;
}
function logDelivery(noteId){
  var calcd=calc(),c=cost();
  if(!session)return Promise.resolve(false);
  if(!calcd){note(noteId,isActive()?'Enter a rate and miles first.':'Turn Active on first.',true);return Promise.resolve(false)}
  var o=calcd.o,r=calcd.r;
  note(noteId,'Saving…');
  return sb.from('deliveries').insert({user_id:session.user.id,platform:o.platform.slice(0,40),rate:o.rate.toFixed(2),outbound_miles:o.out.toFixed(2),return_miles:r.ret.toFixed(2),minutes:o.mins.toFixed(1),cost_per_mile:r.cpm.toFixed(4),time_cost:r.timeCost.toFixed(2),tax:r.tax.toFixed(2),net:r.net.toFixed(2)}).select().single().then(function(res){
    if(res.error){note(noteId,'Could not save: '+res.error.message,true);return false}
    deliveries.unshift(res.data);showDeliveries();
    note(noteId,'Delivery logged: '+money(Number(res.data.net))+' net.');
    return true;
  },function(){note(noteId,'Could not reach the server. Check your connection and try again.',true);return false});
}
function exportCsv(){
  var head=['date','platform','rate','outbound_miles','return_miles','minutes','cost_per_mile','time_cost','tax','net'];
  var q=function(v){v=String(v==null?'':v);if(/^[=+\-@]/.test(v))v="'"+v;return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  var rows=deliveries.map(function(d){return[d.created_at,d.platform,d.rate,d.outbound_miles,d.return_miles,d.minutes,d.cost_per_mile,d.time_cost,d.tax,d.net].map(q).join(',')});
  var a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([head.join(',')+'\n'+rows.join('\n')+'\n'],{type:'text/csv'}));
  a.download='fare-bar-deliveries.csv';document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(a.href)},1000);
}

/* ---------- account, plan and pages ---------- */
function trial(){
  if(!trialRow)return null;
  return{plan:trialRow.plan,left:TRIAL_DAYS-Math.floor((Date.now()-new Date(trialRow.started_at).getTime())/864e5)};
}
function gate(){
  if(!ready)return'loading';
  if(!session)return'login';
  if(!trialRow&&!isOwner)return'plans';
  return null;
}
function go(view){
  var g=gate();
  if(g==='login'&&view==='signup');
  else if(g)view=g;
  else if(!TITLES[view]||view==='login'||view==='signup'||view==='loading')view='home';
  Object.keys(TITLES).forEach(function(v){$(v).hidden=v!==view});
  $('title').textContent=view==='signup'?TITLES.signup:STEPS[g]?STEPS[g][1]:TITLES[view];
  $('step').hidden=!STEPS[g];
  if(STEPS[g])$('step').textContent=STEPS[g][0];
  $('badge').hidden=view!=='home';
  $('back').hidden=view==='home'||!!g;
  var showBar=view==='home'||view==='log'||view==='cost';
  $('bar').hidden=!showBar;$('banner').hidden=!showBar;
  if(view==='cost')showCost();
  if(view==='home')showDeliveries();
  history.replaceState(null,'',view==='signup'?'#signup':view==='home'||g?location.pathname:'#'+view);
  window.scrollTo(0,0);
}
function showPlan(){
  var t=trial(),active=t&&t.left>0,u=session&&session.user;
  $('who').textContent=u?u.email:'Your account, password and log out';
  $('pEmail').textContent=u?u.email:'–';
  $('pSince').textContent=u&&u.created_at?new Date(u.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}):'–';
  $('pPlan').textContent=isOwner?'Owner · everything free':active?t.plan+' trial · '+t.left+(t.left===1?' day left':' days left'):t?t.plan+' trial ended':'No plan yet';
  if(isOwner){
    // Owner accounts get everything free: no trial and no subscription
    $('badge').textContent='OWNER · FREE';
    $('trialState').className='';
    $('trialState').textContent='You are the owner. Everything is free for you, with no trial and no payment.';
    document.querySelectorAll('.plan').forEach(function(c){var btn=c.querySelector('.trial');c.classList.remove('on');btn.disabled=true;btn.textContent='Free for the owner'});
    return;
  }
  $('badge').textContent=active?t.plan.toUpperCase()+' TRIAL · '+t.left+(t.left===1?' DAY':' DAYS'):t?'TRIAL ENDED':'FREE';
  $('trialState').className='';
  $('trialState').textContent=active?t.plan+' trial: '+t.left+(t.left===1?' day':' days')+' left.':t?'Your '+t.plan+' trial has ended.':'Both plans start with a 30-day free trial.';
  document.querySelectorAll('.plan').forEach(function(c){
    var mine=active&&c.dataset.plan===t.plan,btn=c.querySelector('.trial');
    c.classList.toggle('on',!!mine);
    btn.disabled=!!t;
    btn.textContent=mine?'Trial running':t?(c.dataset.plan===t.plan?'Trial used':'Trial already used'):'Start 30-day free trial';
  });
}
function loadAccount(){
  trialRow=null;isOwner=false;deliveries=[];
  if(!session)return Promise.resolve();
  var id=session.user.id;
  return Promise.all([
    sb.from('trials').select('plan,started_at').eq('user_id',id).maybeSingle(),
    sb.from('owners').select('user_id').eq('user_id',id).maybeSingle(),
    loadDeliveries()
  ]).then(function(r){trialRow=r[0].error?null:r[0].data;isOwner=!r[1].error&&!!r[1].data});
}
function setSession(s){
  var changed=(s&&s.user.id)!==(session&&session.user.id);
  session=s;
  if(!changed&&ready)return Promise.resolve();
  return loadAccount().then(function(){ready=true;showPlan();go(location.hash.slice(1))});
}
function busy(on){['doLogin','toSignup','email','password','doSignup','toLogin','newEmail','newPassword','newPassword2'].forEach(function(id){$(id).disabled=on})}
function offline(id){busy(false);note(id,'Could not reach the login service. Check your connection and try again.',true)}
function logIn(){
  var email=$('email').value.trim(),password=$('password').value;
  if(!email||!password){note('authNote','Enter your email and password.',true);return}
  busy(true);note('authNote','Logging in…');
  sb.auth.signInWithPassword({email:email,password:password}).then(function(r){
    busy(false);
    if(r.error){note('authNote',r.error.message,true);return}
    $('password').value='';note('authNote','');
    return setSession(r.data.session);
  },function(){offline('authNote')});
}
function changePassword(){
  var p1=$('pw1').value,p2=$('pw2').value;
  if(p1.length<6){note('passwordNote','Use a password of at least 6 characters.',true);return}
  if(p1!==p2){note('passwordNote','The two passwords do not match.',true);return}
  $('doPassword').disabled=true;note('passwordNote','Changing your password…');
  sb.auth.updateUser({password:p1}).then(function(r){
    $('doPassword').disabled=false;
    if(r.error){note('passwordNote',r.error.message,true);return}
    $('pw1').value='';$('pw2').value='';
    note('passwordNote','Password changed. Use the new one next time you log in.');
  },function(){$('doPassword').disabled=false;note('passwordNote','Could not reach the login service. Check your connection and try again.',true)});
}
function signUp(){
  var email=$('newEmail').value.trim(),p1=$('newPassword').value,p2=$('newPassword2').value;
  if(!email){note('signupNote','Enter your email.',true);return}
  if(p1.length<6){note('signupNote','Use a password of at least 6 characters.',true);return}
  if(p1!==p2){note('signupNote','The two passwords do not match.',true);return}
  busy(true);note('signupNote','Creating your account…');
  sb.auth.signUp({email:email,password:p1}).then(function(r){
    busy(false);
    if(r.error){note('signupNote',r.error.message,true);return}
    $('newPassword').value='';$('newPassword2').value='';
    if(r.data.session){note('signupNote','');return setSession(r.data.session)}
    $('email').value=email;
    go('login');
    note('authNote','Account created. Open the confirmation email we sent to '+email+', then log in here.');
  },function(){offline('signupNote')});
}
function copyLink(link,noteId,label){
  var n=$(noteId);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(function(){n.textContent=label+' copied: '+link},function(){n.textContent='Copy this link: '+link});
  }else{n.textContent='Copy this link: '+link}
}

/* ---------- start ---------- */
loadOffer();setActive(isActive());fromLink();
if(window.supabase){
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  sb.auth.getSession().then(function(r){return setSession(r.data.session)},function(){ready=true;go('home')});
  sb.auth.onAuthStateChange(function(event,s){if(event==='SIGNED_OUT'||event==='SIGNED_IN')setTimeout(function(){setSession(s)},0)});
}else{
  ready=true;go('home');busy(true);note('authNote','Could not load the login service. Check your connection and reload.',true);
}

document.querySelectorAll('.nav[data-go]').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.go)})});
$('back').addEventListener('click',function(){go('home')});
$('activeToggle').addEventListener('click',function(){setActive(!isActive())});
$('assumeToggle').addEventListener('click',function(){var c=cost();c.assume=!c.assume;saveCost(c);showCost();calc();saveOffer()});
$('costForm').addEventListener('input',function(){
  var c=cost();
  Object.keys(COST_IDS).forEach(function(id){var v=num($(id).value);if(v>=0)c[COST_IDS[id]]=v});
  saveCost(c);showCost();calc();
});
$('costForm').addEventListener('submit',function(e){e.preventDefault()});
$('logForm').addEventListener('input',function(){calc();saveOffer()});
$('logForm').addEventListener('submit',function(e){
  e.preventDefault();
  logDelivery('logFormNote').then(function(ok){if(ok){note('logNote',$('logFormNote').textContent);note('logFormNote','');go('home')}});
});
$('logNow').addEventListener('click',function(){logDelivery('logNote')});
$('sessionBtn').addEventListener('click',function(){set('fareBarSession',get('fareBarSession')?null:new Date().toISOString());showDeliveries()});
$('exportCsv').addEventListener('click',exportCsv);
$('recent').addEventListener('click',function(e){
  var b=e.target.closest('.del');
  if(!b||!confirm('Delete this delivery?'))return;
  sb.from('deliveries').delete().eq('id',b.dataset.id).then(function(r){
    if(r.error){note('logNote','Could not delete: '+r.error.message,true);return}
    deliveries=deliveries.filter(function(d){return d.id!==b.dataset.id});showDeliveries();note('logNote','Delivery deleted.');
  });
});
$('loginForm').addEventListener('submit',function(e){e.preventDefault();logIn()});
$('signupForm').addEventListener('submit',function(e){e.preventDefault();signUp()});
$('toSignup').addEventListener('click',function(){go('signup')});
$('toLogin').addEventListener('click',function(){go('login')});
$('passwordForm').addEventListener('submit',function(e){e.preventDefault();changePassword()});
$('logout').addEventListener('click',function(){if(sb)sb.auth.signOut().then(function(){return setSession(null)})});
document.querySelectorAll('.trial').forEach(function(b){b.addEventListener('click',function(){
  if(trialRow||isOwner||!session)return;
  var onboarding=gate()==='plans';
  b.disabled=true;
  sb.from('trials').insert({user_id:session.user.id,plan:b.dataset.plan}).select('plan,started_at').single().then(function(r){
    if(r.error){b.disabled=false;$('trialState').className='bad';$('trialState').textContent='Could not start the trial: '+r.error.message;return}
    trialRow=r.data;showPlan();if(onboarding)go('home');
  });
})});
$('copy').addEventListener('click',function(){copyLink(location.origin+location.pathname,'copyNote','Link')});
$('copyScan').addEventListener('click',function(){copyLink(location.origin+location.pathname+'?text=','scanNote','Scan link')});
$('pasteForm').addEventListener('submit',function(e){
  e.preventDefault();
  var ok=applyOffer(parseOffer($('pasteText').value),'text');
  note('pasteNote',$('detected').textContent,!ok);
  if(ok){$('pasteText').value='';go('home')}
});
