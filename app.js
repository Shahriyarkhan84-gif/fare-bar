var SUPABASE_URL='https://fitscgmzxggpobzulpbe.supabase.co';
var SUPABASE_KEY='sb_publishable_uKwUj4XVuipFDdlI8NR8Pg_v0X3j84n'; // publishable key: safe to ship in the page
var TRIAL_DAYS=30;
var $=function(id){return document.getElementById(id)};
var ids=['inFare','inMiles','inMins','inMin'];
var TITLES={loading:'Fare Bar',login:'Log in',signup:'Create account',home:'Fare Bar',config:'Configuration',auto:'Auto-detect',profile:'Profile',control:'Control Centre',plans:'Subscription'};
var STEPS={login:['Step 1 of 2','Log in'],plans:['Step 2 of 2','Choose a plan']};
var sb=null,session=null,trialRow=null,isOwner=false,ready=false;

function num(id){return parseFloat($(id).value.replace(',','.'))}
function load(){try{var s=JSON.parse(localStorage.getItem('fareBar')||'{}');ids.forEach(function(id){if(s[id]!=null)$(id).value=s[id]})}catch(e){}}
function save(){try{var s={};ids.forEach(function(id){s[id]=$(id).value});localStorage.setItem('fareBar',JSON.stringify(s))}catch(e){}}
function isActive(){try{return localStorage.getItem('fareBarActive')!=='0'}catch(e){return true}}
function setActive(on){
  try{localStorage.setItem('fareBarActive',on?'1':'0')}catch(e){}
  $('activeToggle').setAttribute('aria-checked',on?'true':'false');
  $('activeNote').textContent=on?'On: new orders update the bar':'Off: new orders are ignored';
  calc();
}
// Reads a delivery request's text (from a screenshot) and finds the fare, distance and time.
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
  if(!(o.fare>=0)||!(o.miles>0)){n.className='small detected bad';n.textContent='Could not find a fare and a distance in that '+source+'.';return false}
  $('inFare').value=o.fare;$('inMiles').value=o.miles;$('inMins').value=o.mins>0?o.mins:'';
  save();calc();
  n.className='small detected';
  n.textContent='Detected from '+source+': £'+o.fare.toFixed(2)+' · '+o.miles+' mi'+(o.mins>0?' · '+o.mins+' min':'')+'.';
  return true;
}
function fromLink(){
  // ?text=... carries the text of a request screenshot; ?fare=3.07&miles=1&mins=7.5 carries the numbers directly
  var q=new URLSearchParams(location.search),o={},has=false;
  if(q.get('text')){o=parseOffer(q.get('text'));has=true}
  else['fare','miles','mins'].forEach(function(k){var v=parseFloat((q.get(k)||'').replace(',','.'));if(isFinite(v)&&v>=0){o[k]=v;has=true}});
  if(!has)return;
  history.replaceState(null,'',location.pathname+location.hash);
  applyOffer(o,q.get('text')?'screenshot':'link');
}
function calc(){
  var fare=num('inFare'),miles=num('inMiles'),mins=num('inMins'),min=num('inMin'),bar=$('bar');
  if(!isActive()){bar.className='bar empty';$('verdict').textContent='OFF';$('fare').textContent='£–';$('perMile').textContent='–';$('details').textContent='turn Active on';return}
  var ok=isFinite(fare)&&fare>=0&&miles>0;
  $('fare').textContent=isFinite(fare)?'£'+fare.toFixed(2):'£–';
  if(!ok){bar.className='bar empty';$('verdict').textContent='SET UP';$('perMile').textContent='–';$('details').textContent='fare and miles';return}
  var perMile=fare/(miles*1.5);
  var accept=!isFinite(min)||perMile>=min;
  bar.className='bar '+(accept?'accept':'reject');
  $('verdict').textContent=accept?'ACCEPT':'REJECT';
  $('perMile').textContent='£'+perMile.toFixed(2)+'/mi';
  $('details').textContent=miles.toFixed(1)+' mi'+(mins>0?' · £'+(fare/mins*60).toFixed(2)+'/hr':'');
}

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
  $('bar').hidden=view!=='home'&&view!=='config';
  history.replaceState(null,'',view==='signup'?'#signup':view==='home'||g?location.pathname:'#'+view);
  window.scrollTo(0,0);
}
function showPlan(){
  var t=trial(),active=t&&t.left>0;
  var u=session&&session.user;
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
function note(id,text,bad){var n=$(id);n.textContent=text;n.className='small'+(bad?' bad':'')}

function loadTrial(){
  trialRow=null;isOwner=false;
  if(!session)return Promise.resolve();
  var id=session.user.id;
  return Promise.all([
    sb.from('trials').select('plan,started_at').eq('user_id',id).maybeSingle(),
    sb.from('owners').select('user_id').eq('user_id',id).maybeSingle()
  ]).then(function(r){trialRow=r[0].error?null:r[0].data;isOwner=!r[1].error&&!!r[1].data});
}
function setSession(s){
  var changed=(s&&s.user.id)!==(session&&session.user.id);
  session=s;
  if(!changed&&ready)return Promise.resolve();
  return loadTrial().then(function(){ready=true;showPlan();go(location.hash.slice(1))});
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

load();setActive(isActive());fromLink();
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
$('copyScan').addEventListener('click',function(){
  var link=location.origin+location.pathname+'?text=',n=$('scanNote');
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(function(){n.textContent='Scan link copied: '+link},function(){n.textContent='Copy this link: '+link});
  }else{n.textContent='Copy this link: '+link}
});
$('pasteForm').addEventListener('submit',function(e){
  e.preventDefault();
  var ok=applyOffer(parseOffer($('pasteText').value),'text'),n=$('pasteNote');
  n.className='small'+(ok?'':' bad');n.textContent=$('detected').textContent;
  if(ok){$('pasteText').value='';go('home')}
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
$('form').addEventListener('input',function(){calc();save()});
$('form').addEventListener('submit',function(e){e.preventDefault()});
$('copy').addEventListener('click',function(){
  var link=location.origin+location.pathname,n=$('copyNote');
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(link).then(function(){n.textContent='Link copied: '+link},function(){n.textContent='Copy this link: '+link});
  }else{n.textContent='Copy this link: '+link}
});
