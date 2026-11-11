var SUPABASE_URL='https://fitscgmzxggpobzulpbe.supabase.co';
var SUPABASE_KEY='sb_publishable_uKwUj4XVuipFDdlI8NR8Pg_v0X3j84n'; // publishable key: safe to ship in the page
var TRIAL_DAYS=30;
var $=function(id){return document.getElementById(id)};
var ids=['inFare','inMiles','inMins','inMin'];
var TITLES={loading:'Fare Bar',login:'Log in',signup:'Create account',home:'Fare Bar',config:'Configuration',control:'Control Centre',plans:'Subscription'};
var STEPS={login:['Step 1 of 2','Log in'],plans:['Step 2 of 2','Choose a plan']};
var sb=null,session=null,trialRow=null,isOwner=false,ready=false;

function num(id){return parseFloat($(id).value.replace(',','.'))}
function load(){try{var s=JSON.parse(localStorage.getItem('fareBar')||'{}');ids.forEach(function(id){if(s[id]!=null)$(id).value=s[id]})}catch(e){}}
function save(){try{var s={};ids.forEach(function(id){s[id]=$(id).value});localStorage.setItem('fareBar',JSON.stringify(s))}catch(e){}}
function fromLink(){
  // A link such as ?fare=3.07&miles=1&mins=7.5 fills the bar, so a Shortcut can send an order to the app
  var q=new URLSearchParams(location.search),map={fare:'inFare',miles:'inMiles',mins:'inMins'},used=false;
  Object.keys(map).forEach(function(k){var v=parseFloat((q.get(k)||'').replace(',','.'));if(isFinite(v)&&v>=0){$(map[k]).value=v;used=true}});
  if(used){save();history.replaceState(null,'',location.pathname+location.hash)}
}
function calc(){
  var fare=num('inFare'),miles=num('inMiles'),mins=num('inMins'),min=num('inMin'),bar=$('bar');
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
  $('who').textContent=session&&session.user?session.user.email:'Go back to the login screen';
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
  $('who').textContent=session&&session.user?session.user.email:'Go back to the login screen';
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

load();fromLink();calc();
if(window.supabase){
  sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
  sb.auth.getSession().then(function(r){return setSession(r.data.session)},function(){ready=true;go('home')});
  sb.auth.onAuthStateChange(function(event,s){if(event==='SIGNED_OUT'||event==='SIGNED_IN')setTimeout(function(){setSession(s)},0)});
}else{
  ready=true;go('home');busy(true);note('authNote','Could not load the login service. Check your connection and reload.',true);
}

document.querySelectorAll('.nav[data-go]').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.go)})});
$('back').addEventListener('click',function(){go('home')});
$('loginForm').addEventListener('submit',function(e){e.preventDefault();logIn()});
$('signupForm').addEventListener('submit',function(e){e.preventDefault();signUp()});
$('toSignup').addEventListener('click',function(){go('signup')});
$('toLogin').addEventListener('click',function(){go('login')});
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
