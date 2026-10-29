const LANGUAGES=[['en','English'],['hi','हिन्दी'],['te','తెలుగు'],['ta','தமிழ்'],['kn','ಕನ್ನಡ'],['ml','മലയാളം'],['mr','मराठी'],['bn','বাংলা'],['gu','ગુજરાતી'],['pa','ਪੰਜਾਬੀ'],['or','ଓଡ଼ିଆ'],['as','অসমীয়া'],['ur','اردو']];
const NAV_TEXT={
  en:['Dashboard','Farm tools','Marketplace','Community','Learning','Government schemes','Admin panel','Sign out'],
  hi:['डैशबोर्ड','खेती के साधन','बाज़ार','समुदाय','सीखें','सरकारी योजनाएँ','मालिक कंट्रोल','साइन आउट'],
  te:['డ్యాష్‌బోర్డ్','వ్యవసాయ సాధనాలు','మార్కెట్','సంఘం','నేర్చుకోండి','ప్రభుత్వ పథకాలు','యజమాని నియంత్రణ','సైన్ అవుట్'],
  ta:['முகப்புப் பலகை','விவசாயக் கருவிகள்','சந்தை','சமூகம்','கற்றல்','அரசுத் திட்டங்கள்','உரிமையாளர் கட்டுப்பாடு','வெளியேறு'],
  kn:['ಡ್ಯಾಶ್‌ಬೋರ್ಡ್','ಕೃಷಿ ಸಾಧನಗಳು','ಮಾರುಕಟ್ಟೆ','ಸಮುದಾಯ','ಕಲಿಕೆ','ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು','ಮಾಲೀಕರ ನಿಯಂತ್ರಣ','ಸೈನ್ ಔಟ್'],
  ml:['ഡാഷ്ബോർഡ്','കൃഷി ഉപകരണങ്ങൾ','വിപണി','കൂട്ടായ്മ','പഠനം','സർക്കാർ പദ്ധതികൾ','ഉടമയുടെ നിയന്ത്രണം','സൈൻ ഔട്ട്'],
  mr:['डॅशबोर्ड','शेतीची साधने','बाजारपेठ','समुदाय','शिका','शासकीय योजना','मालक नियंत्रण','साइन आउट'],
  bn:['ড্যাশবোর্ড','কৃষি সরঞ্জাম','বাজার','সম্প্রদায়','শেখা','সরকারি প্রকল্প','মালিক নিয়ন্ত্রণ','সাইন আউট'],
  gu:['ડેશબોર્ડ','ખેતીનાં સાધનો','બજાર','સમુદાય','શીખો','સરકારી યોજનાઓ','માલિક નિયંત્રણ','સાઇન આઉટ'],
  pa:['ਡੈਸ਼ਬੋਰਡ','ਖੇਤੀ ਦੇ ਸਾਧਨ','ਮੰਡੀ','ਭਾਈਚਾਰਾ','ਸਿੱਖੋ','ਸਰਕਾਰੀ ਯੋਜਨਾਵਾਂ','ਮਾਲਕ ਕੰਟਰੋਲ','ਸਾਈਨ ਆਉਟ'],
  or:['ଡ୍ୟାସବୋର୍ଡ','ଚାଷ ସାଧନ','ବଜାର','ସମୁଦାୟ','ଶିଖନ୍ତୁ','ସରକାରୀ ଯୋଜନା','ମାଲିକ ନିୟନ୍ତ୍ରଣ','ସାଇନ ଆଉଟ'],
  as:['ডেশ্বব’ৰ্ড','কৃষি সঁজুলি','বজাৰ','সমাজ','শিক্ষা','চৰকাৰী আঁচনি','গৰাকীৰ নিয়ন্ত্ৰণ','ছাইন আউট'],
  ur:['ڈیش بورڈ','زرعی اوزار','منڈی','برادری','سیکھیں','سرکاری اسکیمیں','مالک کا کنٹرول','سائن آؤٹ']
};
const SERVICE_CARDS=[
  ['crop_tools','🧮','Farm tools','Crop guides, soil notes and practical calculators.'],
  ['marketplace','🧺','Farmer marketplace','Buy directly from local growers and list your produce.'],
  ['community','🤝','Farmer community','Share questions, field updates and what is working.'],
  ['learning','📚','Learning','Short lessons for the decisions that matter on your farm.'],
  ['schemes','🪪','Scheme information','Reach official program sources from one place.'],
  ['weather','🌦️','Weather and alerts','Local forecasts will appear when a weather provider is connected.']
];
const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const esc=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(value)=>'₹'+Number(value||0).toLocaleString('en-IN');
const state={user:null,csrf:'',sectors:[],posts:[],listings:[],config:{},language:localStorage.getItem('agrimithra-language')||'en',voice:localStorage.getItem('agrimithra-voice')==='on',ownerTab:'overview',query:''};
function t(index){const rows=NAV_TEXT[state.language]||NAV_TEXT.en;return rows[index]||NAV_TEXT.en[index];}
async function api(path,options={}){
  const method=(options.method||'GET').toUpperCase(),headers={'Content-Type':'application/json',...(options.headers||{})};
  if(!['GET','HEAD','OPTIONS'].includes(method)&&state.csrf)headers['X-CSRF-Token']=state.csrf;
  const response=await fetch('/api'+path,{method,headers,credentials:'same-origin',body:options.body?JSON.stringify(options.body):undefined});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'The request could not be completed.');
  return data;
}
function toast(message,error=false){const item=document.createElement('div');item.className='toast'+(error?' error':'');item.textContent=message;$('#toastRegion').appendChild(item);setTimeout(()=>item.remove(),3600);if(state.voice)speak(message);}
function speak(text){if(!('speechSynthesis'in window)){toast('Voice playback is not available in this browser.');return;}speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=state.language==='en'?'en-IN':state.language+'-IN';utterance.rate=.95;speechSynthesis.speak(utterance);}
function section(title,description='',action=''){return `<div class="section-head"><div><h2>${title}</h2>${description?`<p>${description}</p>`:''}</div>${action}</div>`;}
function heading(eyebrow,title,description,actions=''){return `<div class="page-heading"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${title}</h1><p>${esc(description)}</p></div><div class="heading-actions">${actions}</div></div>`;}
function modal(title,description,content,footer=''){const root=$('#modalRoot');root.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-header"><div><h2>${esc(title)}</h2><p>${esc(description||'')}</p></div><button class="modal-close" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${content}</div>${footer?`<div class="modal-footer">${footer}</div>`:''}</div>`;$('.modal',root).addEventListener('click',e=>e.stopPropagation());root.onclick=e=>{if(e.target===root)closeModal();};}
function closeModal(){$('#modalRoot').innerHTML='';}
function langOptions(selected){return LANGUAGES.map(([code,name])=>`<option value="${code}" ${selected===code?'selected':''}>${name}</option>`).join('');}
function languageControl(){const select=$('#languageSelect');if(select)select.innerHTML=langOptions(state.language);const pub=$('#publicLanguage');if(pub){pub.innerHTML=langOptions(state.language);pub.value=state.language;}if(select)select.value=state.language;applyLanguage();applyNavigationVisibility();}
function applyLanguage(){const labels=NAV_TEXT[state.language]||NAV_TEXT.en;$$('.main-nav [data-route]').forEach((button,index)=>{const node=Array.from(button.childNodes).find(n=>n.nodeType===3);if(node)node.nodeValue=' '+labels[index];});const owner=$('#ownerNav');if(owner){const node=Array.from(owner.childNodes).find(n=>n.nodeType===3);if(node)node.nodeValue=' '+labels[6];}const logout=$('[data-action="logout"]');if(logout)logout.textContent=labels[7];}
function applyNavigationVisibility(){const active=new Set((state.sectors||[]).filter(x=>x.enabled).map(x=>x.key));const routeSector={tools:'crop_tools',market:'marketplace',community:'community',learn:'learning',schemes:'schemes'};$$('.main-nav [data-route]').forEach(button=>{const key=routeSector[button.dataset.route];if(key)button.classList.toggle('hidden',!active.has(key));});}
function publicPage(){
  $('#publicView').classList.remove('hidden');$('#appView').classList.add('hidden');
  const enabled=new Set(state.sectors.filter(x=>x.enabled).map(x=>x.key));
  $('#publicServices').innerHTML=SERVICE_CARDS.filter(x=>enabled.has(x[0])).map(x=>`<article class="service-card"><span class="service-icon">${x[1]}</span><h3>${x[2]}</h3><p>${x[3]}</p></article>`).join('');
  $('#year').textContent=new Date().getFullYear();languageControl();
}
function openAuth(mode='login'){
  const tabs=`<div class="auth-tabs"><button class="${mode==='login'?'active':''}" data-auth-mode="login">Sign in</button><button class="${mode==='signup'?'active':''}" data-auth-mode="signup">Create account</button></div>`;
  let form='';
  if(mode==='login')form=`<form id="loginForm" class="auth-form"><div class="field field-full"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="field field-full"><label>Password</label><input name="password" type="password" autocomplete="current-password" minlength="12" required></div><button class="btn btn-primary btn-large">Sign in securely</button></form>`;
  if(mode==='signup')form=`<form id="signupForm" class="auth-form"><div class="form-grid"><div class="field field-full"><label>Your name</label><input name="name" maxlength="80" autocomplete="name" required></div><div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div class="field"><label>Account type</label><select name="role"><option value="farmer">Farmer</option><option value="buyer">Buyer</option><option value="expert">Agriculture expert (owner review required)</option></select></div><div class="field"><label>District or town</label><input name="district" maxlength="80" autocomplete="address-level2"></div><div class="field"><label>Password</label><input name="password" type="password" minlength="12" autocomplete="new-password" required><small>At least 12 characters</small></div></div><button class="btn btn-primary btn-large">Create account and verify email</button><small class="muted">We’ll email a one-time verification code. By joining, you agree to use AgriMithra respectfully.</small></form>`;
  if(mode==='verify')form=`<form id="verifyForm" class="auth-form"><div class="field field-full"><label>Email address</label><input name="email" type="email" autocomplete="email" value="${esc(window.pendingSignupEmail||'')}" required></div><div class="field field-full"><label>6-digit verification code</label><input name="code" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></div><button class="btn btn-primary btn-large">Verify email and continue</button><small class="muted">The code expires after 10 minutes.</small></form>`;
  const body=`<div class="auth-modal">${tabs}${form}<div class="divider"></div><button class="text-link" data-action="owner-setup">Set up the platform owner account →</button></div>`;
  modal(mode==='verify'?'Verify your email':'Welcome to AgriMithra','Your account connects your tools, market and farmer community.',body);
}
function openOwnerSetup(){
  if(!state.config.ownerSetupAvailable)return toast('The platform owner account is already set up.',true);
  const defaultKey=state.config.development?'local-first-owner-setup':'';
  const body=`<div class="callout" style="margin-bottom:12px">This one-time setup creates your owner access. If you already made a member account, enter that same email and its current password to promote it. Keep the setup key private.</div><form id="ownerSetupForm" class="auth-form"><div class="field"><label>Private owner setup key</label><input name="setupKey" type="password" autocomplete="off" value="${defaultKey}" required></div><div class="form-grid"><div class="field"><label>Owner name</label><input name="name" maxlength="80" required></div><div class="field"><label>Owner email</label><input name="email" type="email" required></div><div class="field field-full"><label>Account password</label><input name="password" type="password" minlength="12" autocomplete="new-password" required><small>Use your existing password for an existing account, or choose at least 12 characters for a new account.</small></div></div><button class="btn btn-primary btn-large">Set up owner access</button></form>`;
  modal('Set up AgriMithra ownership','Only available once, before the first owner account exists.',body);
}
async function boot(){
  $('#year').textContent=new Date().getFullYear();
  try{
    state.config=await api('/config');
    const [sectors,me]=await Promise.all([api('/sectors'),api('/me')]);
    state.sectors=sectors.sectors||[];
    if(me.user){state.user=me.user;state.csrf=me.csrfToken||'';await enterApp();}
    else publicPage();
  }catch(error){$('#publicView').classList.remove('hidden');$('#appView').classList.add('hidden');$('#publicServices').innerHTML='<div class="notice-box">AgriMithra’s service is temporarily unavailable. Please refresh in a moment.</div>';toast(error.message,true);}
}

const crops=[['🌾','Paddy','Rice','Track crop stages and water checks with local guidance.'],['🌱','Groundnut','Oilseeds','Review seed quality, drainage and regional advice.'],['🌽','Maize','Cereals','Keep notes on crop stage and local practices.'],['🧵','Cotton','Fibre crops','Use verified pest monitoring and follow product labels.'],['🍅','Vegetables','Horticulture','Record planting, irrigation and harvest dates.'],['🥭','Horticulture','Fruit crops','Check crop-specific practices with extension services.']];
const lessons=[['🧪','Understand your soil test','Learn what soil test values mean.','5 min'],['💧','Plan irrigation checks','Simple observations to discuss locally.','4 min'],['🛡️','Use crop protection safely','Read labels and follow verified guidance.','6 min'],['🧺','Prepare produce for sale','Keep quantity, grade and pickup records.','4 min'],['📒','Keep a farm diary','Track planting, inputs and harvest dates.','3 min'],['🤝','Ask a useful field question','Include crop, stage, location and observations.','3 min']];
const schemes=[['PM-KISAN','Income support information and beneficiary services.','https://pmkisan.gov.in/'],['PMFBY','Crop insurance information and application guidance.','https://pmfby.gov.in/'],['Kisan Call Centre · 1800-180-1551','Agriculture advice helpline and local-language support.','https://www.dackkms.gov.in/Account/contactus.aspx'],['Soil Health Card','Soil testing and soil health card information.','https://soilhealth.dac.gov.in/']];
const roleNames={farmer:'Farmer',buyer:'Buyer',expert:'Agriculture expert',admin:'Administrator',owner:'Platform owner'};
const routeTitles={dashboard:'Your farm dashboard',user:'My user panel',tools:'Farm tools and crop guides',market:'Farmer marketplace',community:'Farmer community',learn:'Learning for the field',schemes:'Government scheme links',owner:'AgriMithra admin panel'};
function setRoute(route){if(route==='owner'&&!['owner','admin'].includes(state.user?.role))route='dashboard';state.route=route;$$('[data-route]').forEach(x=>x.classList.toggle('active',x.dataset.route===route));$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('visible');renderRoute().catch(e=>toast(e.message,true));}
async function enterApp(){$('#publicView').classList.add('hidden');$('#appView').classList.remove('hidden');$('#userName').textContent=state.user.name;$('#userRole').textContent=roleNames[state.user.role]||state.user.role;$('#userAvatar').textContent=(state.user.name||'A').trim().slice(0,1).toUpperCase();$('#ownerNav').classList.toggle('hidden',!['owner','admin'].includes(state.user.role));languageControl();setRoute(state.route||'dashboard');}
function empty(message,sub){return '<div class="empty-state"><strong>'+esc(message)+'</strong>'+esc(sub||'')+'</div>';}
function pageHeading(route,sub,actions){return heading('AGRIMITHRA',routeTitles[route]||routeTitles.dashboard,sub,actions||'');}
function quickAction(icon,title,description,route){return '<button class="quick-card" data-route="'+route+'"><span class="quick-icon">'+icon+'</span><span><strong>'+title+'</strong><small>'+description+'</small></span><span class="quick-arrow">→</span></button>';}
async function renderRoute(){const route=state.route||'dashboard';if(route==='dashboard')return renderDashboard();if(route==='user')return renderUserPanel();if(route==='tools')return renderTools();if(route==='market')return renderMarket();if(route==='community')return renderCommunity();if(route==='learn')return renderLearning();if(route==='schemes')return renderSchemes();if(route==='owner')return renderOwner();setRoute('dashboard');}
const renderEnabledRoute=renderRoute;
renderRoute=async function(){const route=state.route||'dashboard',required={tools:'crop_tools',market:'marketplace',community:'community',learn:'learning',schemes:'schemes'}[route];if(required&&!state.sectors.some(x=>x.key===required&&x.enabled)){$('#pageRoot').innerHTML=pageHeading(route,'This AgriMithra service is currently unavailable.')+'<div class="callout">The platform owner has paused this service. Please check back later.</div>';return;}return renderEnabledRoute();};
function renderUserPanel(){
 const user=state.user||{},language=LANGUAGES.find(x=>x[0]===user.language)?.[1]||'English',isAdmin=['owner','admin'].includes(user.role);
 const adminCard=isAdmin?'<article class="panel account-access"><span class="eyebrow">PLATFORM CONTROL</span><h2>Admin panel</h2><p>Manage AgriMithra services, accounts, marketplace listings and community content.</p><button class="btn btn-primary" data-route="owner">Open admin panel</button></article>':'';
 const setupCard=state.config.development&&state.config.ownerSetupAvailable?'<article class="panel account-access"><span class="eyebrow">STARTUP OWNER</span><h2>Finish platform owner setup</h2><p>This local app has no owner account yet. You can promote your existing member account by confirming its password and the setup key.</p><button class="btn btn-primary" data-action="owner-setup">Set up owner access</button></article>':'';
 $('#pageRoot').innerHTML=pageHeading('user','Manage your account and open the services available to you.')+
 '<div class="account-grid"><section class="panel account-profile"><div class="section-head"><div><span class="eyebrow">YOUR ACCOUNT</span><h2>'+esc(user.name||'AgriMithra member')+'</h2><p>'+esc(user.email||'')+'</p></div><span class="avatar account-avatar">'+esc((user.name||'A').trim().slice(0,1).toUpperCase())+'</span></div><div class="account-details"><div><small>Account type</small><strong>'+esc(roleNames[user.role]||user.role||'Member')+'</strong></div><div><small>District or town</small><strong>'+esc(user.district||'Not added yet')+'</strong></div><div><small>Preferred language</small><strong>'+esc(language)+'</strong></div><div><small>Account status</small><strong>'+esc(user.status==='active'?'Active':(user.status||'Active'))+'</strong></div></div><button class="btn btn-outline" data-action="profile">Edit my profile</button></section>'+
 '<section class="panel account-access"><span class="eyebrow">MEMBER SERVICES</span><h2>What would you like to do?</h2><p>Use your AgriMithra account to connect with agriculture services.</p><div class="account-actions"><button class="btn btn-outline" data-route="dashboard">Open my dashboard</button><button class="btn btn-outline" data-route="market">Visit marketplace</button><button class="btn btn-outline" data-route="community">Visit community</button></div></section>'+setupCard+adminCard+'</div>'+
 '<div class="callout">Your account details are used to personalize AgriMithra. Keep your sign-in details private and sign out when using a shared device.</div>';
}
async function renderDashboard(){
 const active=new Set(state.sectors.filter(x=>x.enabled).map(x=>x.key));const result=await Promise.all([active.has('community')?api('/posts'):Promise.resolve({posts:[]}),active.has('marketplace')?api('/listings'):Promise.resolve({listings:[]})]);state.posts=result[0].posts||[];state.listings=result[1].listings||[];
 const district=state.user.district?esc(state.user.district):'Add your district in your profile';
 const updates=state.posts.length?state.posts.slice(0,3).map(postPreview).join(''):empty('The community is getting started','Share your first field question or update.');
 const listings=state.listings.length?state.listings.slice(0,3).map(x=>'<div class="mini-row"><span class="mini-icon">🧺</span><span><strong>'+esc(x.title)+'</strong><small>'+esc(x.district||'Location not listed')+' · '+money(x.price)+'/'+esc(x.unit)+'</small></span></div>').join(''):empty('No listings yet','Approved listings will appear here.');
 $('#pageRoot').innerHTML=pageHeading('dashboard','Find farming tools, local connections and useful information.')+
 '<div class="welcome-card"><div><span class="eyebrow">WELCOME TO AGRIMITHRA</span><h2>Good to see you, '+esc(state.user.name.split(' ')[0])+'.</h2><p>Your account is ready. Start with a tool or community service that helps today.</p></div><div class="welcome-location">📍 '+district+'</div></div>'+
 '<div class="quick-grid">'+quickAction('🧮','Farm tools','Plan and learn','tools')+quickAction('🧺','Marketplace','Browse local listings','market')+quickAction('🤝','Community','Ask and share','community')+quickAction('📚','Learning','Short field lessons','learn')+'</div>'+
 '<div class="dashboard-lower"><section class="panel"><div class="section-head"><div><h2>Community updates</h2><p>Ideas and questions shared by members.</p></div><button class="btn btn-outline btn-small" data-route="community">Open community</button></div>'+updates+'</section><aside class="panel"><div class="section-head"><div><h2>Marketplace</h2><p>Produce offered by local growers.</p></div><button class="btn btn-outline btn-small" data-route="market">Browse</button></div>'+listings+'</aside></div>'+
 '<div class="callout">Weather, sensor readings, crop diagnosis and live market prices appear only after verified providers are connected. Use local agriculture guidance for crop-specific decisions.</div>';
}
function postPreview(post){return '<article class="feed-card"><div class="feed-head"><span class="avatar">'+esc((post.authorName||'A').slice(0,1).toUpperCase())+'</span><span><strong>'+esc(post.authorName)+'</strong><small>'+esc(post.authorDistrict||'AgriMithra community')+' · '+dateLabel(post.createdAt)+'</small></span></div><div class="feed-body"><span class="badge">'+esc(post.topic||'Farm update')+'</span><p>'+esc(post.text)+'</p></div></article>';}
function dateLabel(value){const d=new Date(value);return Number.isNaN(d.getTime())?'Recently':new Intl.DateTimeFormat(state.language==='en'?'en-IN':state.language,{dateStyle:'medium'}).format(d);}
function renderTools(){
 const cards=crops.map(c=>'<article class="guide-card"><div class="guide-cover">'+c[0]+'</div><div class="guide-copy"><span class="badge">'+esc(c[2])+'</span><h3>'+esc(c[1])+'</h3><p>'+esc(c[3])+'</p><div class="guide-meta"><button class="text-link" data-action="speak" data-text="'+esc(c[1]+'. '+c[3])+'">Listen</button></div></div></article>').join('');
 $('#pageRoot').innerHTML=pageHeading('tools','Practical planning tools and crop notes in one place.')+
 '<div class="feature-grid"><article class="feature-card"><span class="feature-icon">📏</span><h3>Area converter</h3><p>Convert your plot between acres and hectares.</p><div class="form-grid"><div class="field"><label>Area</label><input id="areaInput" type="number" min="0" step="any" value="1"></div><div class="field"><label>Unit</label><select id="areaUnit"><option value="acres">Acres</option><option value="hectares">Hectares</option></select></div></div><div class="tool-result" id="areaResult">1 acre = 0.4047 hectares</div></article>'+
 '<article class="feature-card"><span class="feature-icon">🧾</span><h3>Input quantity planner</h3><p>Calculate using a rate confirmed by your soil test or local advisor.</p><div class="form-grid"><div class="field"><label>Farm area (acres)</label><input id="doseArea" type="number" min="0" step="any"></div><div class="field"><label>Confirmed rate (kg per acre)</label><input id="doseRate" type="number" min="0" step="any"></div></div><div class="tool-result" id="doseResult">Enter a confirmed rate to calculate the total.</div><small class="muted">This calculator does not recommend an input rate.</small></article></div>'+
 '<div class="panel"><div class="section-head"><div><h2>Crop guides</h2><p>General learning notes. Practices vary by region and crop.</p></div></div><div class="guide-grid">'+cards+'</div></div>';
 $('#areaInput').addEventListener('input',updateArea);$('#areaUnit').addEventListener('change',updateArea);$('#doseArea').addEventListener('input',updateDose);$('#doseRate').addEventListener('input',updateDose);
}
function updateArea(){const n=Number($('#areaInput').value)||0;$('#areaResult').textContent=$('#areaUnit').value==='acres'?n.toLocaleString()+' acres = '+(n*.4046856422).toFixed(4)+' hectares':n.toLocaleString()+' hectares = '+(n*2.4710538147).toFixed(4)+' acres';}
function updateDose(){const a=Number($('#doseArea').value),r=Number($('#doseRate').value);$('#doseResult').textContent=a>0&&r>0?'Calculated total: '+(a*r).toLocaleString()+' kg, using your entered rate.':'Enter a confirmed rate to calculate the total.';}

async function renderMarket(){
 const result=await api('/listings');state.listings=result.listings||[];
 const visible=state.query?state.listings.filter(x=>[x.title,x.category,x.district,x.sellerName].join(' ').toLowerCase().includes(state.query)):state.listings;
 const cards=visible.map(x=>'<article class="listing-card"><div class="listing-photo">🧺<span class="listing-category">'+esc(x.category)+'</span></div><div class="listing-copy"><h3>'+esc(x.title)+'</h3><p>'+esc(x.quantity||'Quantity on request')+' · '+esc(x.district||'Location not listed')+'</p><div class="listing-price">'+money(x.price)+' <small>/ '+esc(x.unit)+'</small></div><div class="seller-name">Offered by '+esc(x.sellerName||'AgriMithra farmer')+'</div><button class="btn btn-outline btn-small" data-action="inquire" data-id="'+esc(x.id)+'">Contact seller</button></div></article>').join('');
 $('#pageRoot').innerHTML=pageHeading('market','Discover produce from growers and share what you have available.','<button class="btn btn-primary" data-action="new-listing">List your produce</button>')+
 '<div class="market-banner"><span>Listings are reviewed by AgriMithra before they appear publicly.</span><span>Prices are provided by sellers.</span></div>'+
 '<div class="market-grid"><section><div class="section-head"><div><h2>Local produce</h2><p>Contact sellers to discuss details and pickup.</p></div></div><div class="listing-grid">'+(cards||(state.query?empty('No matching listings','Try another crop or location.'):empty('No approved listings yet','Be the first to submit produce for review.')))+'</div></section>'+ 
 '<aside class="panel"><div class="section-head"><div><h2>Sell with AgriMithra</h2><p>Reach buyers in your community.</p></div></div><p>Share a clear product name, quantity, price and district. Your listing will be reviewed before it is visible to the public.</p><button class="btn btn-primary" data-action="new-listing">Create a listing</button><div class="callout" style="margin-top:12px">AgriMithra currently connects buyers and sellers. Payments and delivery are arranged directly between them.</div></aside></div>';
}
async function renderCommunity(){
 const result=await api('/posts');state.posts=result.posts||[];
 const feed=state.posts.map(post=>{
  const liked=(post.likes||[]).includes(state.user.id);
  return '<article class="feed-card"><div class="feed-head"><span class="avatar">'+esc((post.authorName||'A').slice(0,1).toUpperCase())+'</span><span><strong>'+esc(post.authorName)+'</strong><small>'+esc(post.authorDistrict||'AgriMithra community')+' · '+dateLabel(post.createdAt)+'</small></span><span class="badge">'+esc(post.topic||'Farm update')+'</span></div><div class="feed-body"><p>'+esc(post.text)+'</p><div class="feed-actions"><button class="feed-action '+(liked?'active':'')+'" data-action="like" data-id="'+esc(post.id)+'">♥ '+(post.likes||[]).length+' helpful</button><button class="feed-action" data-action="comments" data-id="'+esc(post.id)+'">💬 Discuss</button></div></div></article>';
 }).join('');
 $('#pageRoot').innerHTML=pageHeading('community','Share field updates, ask questions and learn from other members.')+
 '<div class="social-layout"><section><div class="form-card" style="margin-bottom:14px"><div class="section-head"><div><h2>Share with the community</h2><p>Include enough context for others to understand your question.</p></div></div><form id="postForm" class="auth-form"><div class="form-grid"><div class="field"><label>Topic</label><select name="topic"><option>Farm update</option><option>Question</option><option>Crop care</option><option>Market and sales</option><option>Learning</option></select></div><div class="field"><label>Post as</label><input value="'+esc(state.user.name)+'" disabled></div><div class="field field-full"><label>Your update</label><textarea name="text" maxlength="1200" minlength="4" placeholder="What would you like to share?" required></textarea></div></div><button class="btn btn-primary">Share update</button></form></div><div class="feed">'+(feed||empty('No community posts yet','Start the conversation with a useful question or field update.'))+'</div></section>'+
 '<aside><div class="feed-side-card"><h3>Community guidelines</h3><p>Be respectful. Avoid sharing private information. Verify crop treatment advice with a qualified local expert.</p></div><div class="feed-side-card"><h3>Need help with a crop?</h3><p>Include the crop, growth stage, district and what you have already observed.</p><button class="btn btn-outline btn-small" data-route="tools">Open crop guides</button></div></aside></div>';
}
function renderLearning(){
 const cards=lessons.map((x,i)=>'<article class="lesson-card"><div class="lesson-art">'+x[0]+'</div><div class="lesson-copy"><span class="badge">FIELD NOTE · '+x[3]+'</span><h3>'+esc(x[1])+'</h3><p>'+esc(x[2])+'</p><button class="text-link" data-action="speak" data-text="'+esc(x[1]+'. '+x[2])+'">Listen to this lesson →</button></div></article>').join('');
 $('#pageRoot').innerHTML=pageHeading('learn','Short practical learning notes you can revisit whenever you need them.')+
 '<div class="callout">AgriMithra learning notes are general information. Follow product labels and confirm crop-specific decisions with a qualified local agriculture professional.</div>'+
 '<div class="section-head"><div><h2>Field learning library</h2><p>Simple guides for farm planning, safe practices and sales.</p></div><button class="btn btn-outline" data-action="voice">Voice: '+(state.voice?'On':'Off')+'</button></div><div class="learning-grid">'+cards+'</div>';
}
function renderSchemes(){
 const cards=schemes.map(x=>'<article class="scheme-card"><span class="badge">OFFICIAL SOURCE</span><h3>'+esc(x[0])+'</h3><p>'+esc(x[1])+'</p><a href="'+esc(x[2])+'" target="_blank" rel="noopener noreferrer">Visit official website ↗</a></article>').join('');
 $('#pageRoot').innerHTML=pageHeading('schemes','Use official government sources to check current eligibility, documents and application steps.')+
 '<div class="callout">Program rules, eligibility and deadlines can change. AgriMithra links to source websites; confirm the latest details directly with the relevant department or local agriculture office.</div><div class="scheme-grid">'+cards+'</div>';
}

const ownerTabs=[['overview','Overview'],['sectors','Services and sectors'],['users','People and access'],['moderation','Content review'],['audit','Activity log']];
async function renderOwner(){
 const tab=state.ownerTab||'overview';
 const tabButtons=ownerTabs.map(x=>'<button class="owner-tab '+(tab===x[0]?'active':'')+'" data-owner-tab="'+x[0]+'">'+x[1]+'</button>').join('');
 let content='';
 if(tab==='overview'){
  const o=await api('/owner/overview');
  const stats=[['Public accounts',o.totalUsers],['Published posts',o.posts],['Marketplace listings',o.listings],['Waiting for review',o.pendingListings],['Enabled services',o.sectorsEnabled+' / '+o.sectorsTotal]];
  content='<div class="owner-grid">'+stats.map(x=>'<div class="owner-stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join('')+'</div><div class="owner-split"><div class="panel"><div class="section-head"><div><h2>Account types</h2><p>Active accounts by role.</p></div></div>'+Object.entries(o.users).map(x=>'<div class="mini-row"><span class="mini-icon">👥</span><span><strong>'+esc(roleNames[x[0]]||x[0])+'</strong><small>'+x[1]+' active</small></span></div>').join('')+'</div><div class="panel"><h2>Startup operations</h2><p>Turn each public service on or off, review user content and keep activity visible from this console.</p><button class="btn btn-primary" data-owner-tab="sectors">Manage services</button><div class="callout" style="margin-top:12px">Services that need a verified provider are clearly labeled. Connect providers before offering live data or automated advice.</div></div></div>';
 }else if(tab==='sectors'){
  const res=await api('/owner/sectors');state.sectors=res.sectors||[];
  const groups={};state.sectors.forEach(s=>(groups[s.category]=groups[s.category]||[]).push(s));
  content=Object.keys(groups).map(category=>'<section class="panel"><div class="section-head"><div><h2>'+esc(category)+'</h2></div></div><div class="sector-list">'+groups[category].map(s=>'<article class="sector-item"><div class="sector-copy"><strong>'+esc(s.name)+'</strong><small>'+esc(s.summary||'')+'</small><small class="sector-status">'+(s.status==='needs_provider'?'Provider connection required':(s.enabled?'Available to the public':'Disabled by owner'))+'</small></div><label class="switch" aria-label="Toggle '+esc(s.name)+'"><input type="checkbox" data-sector-toggle="'+esc(s.key)+'" '+(s.enabled?'checked':'')+'><span></span></label></article>').join('')+'</div></section>').join('');
  content+='<div class="callout">Turning a service off hides or pauses that service for the public. Services that depend on an external provider need that connection before live features can work.</div>';
 }else if(tab==='users'){
  if(state.user.role!=='owner'){content='<div class="callout">Only the platform owner can change account roles and access.</div>';}
  else{
   const res=await api('/owner/users'),users=res.users||[];
   content='<div class="panel"><div class="section-head"><div><h2>Public accounts</h2><p>Manage roles and access. Suspended accounts cannot sign in.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Person</th><th>Account type</th><th>Access</th><th>Joined</th><th></th></tr></thead><tbody>'+users.map(u=>'<tr><td><strong>'+esc(u.name)+'</strong><br><small>'+esc(u.email)+'</small></td><td><select data-user-role="'+esc(u.id)+'" '+(u.role==='owner'?'disabled':'')+'>'+['farmer','buyer','expert','admin'].map(r=>'<option value="'+r+'" '+(u.role===r?'selected':'')+'>'+esc(roleNames[r])+'</option>').join('')+(u.role==='owner'?'<option selected value="owner">Platform owner</option>':'')+'</select></td><td><select data-user-status="'+esc(u.id)+'" '+(u.role==='owner'?'disabled':'')+'><option value="active" '+(u.status==='active'?'selected':'')+'>Active</option><option value="suspended" '+(u.status==='suspended'?'selected':'')+'>Suspended</option></select></td><td>'+dateLabel(u.createdAt)+'</td><td><button class="btn btn-outline btn-small" data-action="save-user" data-id="'+esc(u.id)+'" '+(u.role==='owner'?'disabled':'')+'>Save</button></td></tr>').join('')+'</tbody></table></div></div>';
  }
 }else if(tab==='moderation'){
  const res=await api('/owner/moderation');
  content='<div class="owner-split"><section class="panel"><div class="section-head"><div><h2>Marketplace listings</h2><p>Review listings before publication.</p></div></div>'+((res.listings||[]).map(x=>'<div class="moderation-row"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.sellerName)+' · '+esc(x.category)+' · '+money(x.price)+'</small><span class="badge '+esc(x.status)+'">'+esc(x.status)+'</span></div><div class="row-actions">'+(x.status!=='published'?'<button class="btn btn-outline btn-small" data-action="moderate" data-type="listings" data-id="'+esc(x.id)+'" data-status="published">Approve</button>':'')+'<button class="btn btn-outline btn-small" data-action="moderate" data-type="listings" data-id="'+esc(x.id)+'" data-status="hidden">Hide</button></div></div>').join('')||empty('No marketplace items','New submissions will appear here.'))+'</section>'+
  '<section class="panel"><div class="section-head"><div><h2>Community posts</h2><p>Keep the public community helpful and respectful.</p></div></div>'+((res.posts||[]).map(x=>'<div class="moderation-row"><div><strong>'+esc(x.authorName)+'</strong><small>'+esc(x.text)+'</small><span class="badge '+esc(x.status)+'">'+esc(x.status)+'</span></div><div class="row-actions"><button class="btn btn-outline btn-small" data-action="moderate" data-type="posts" data-id="'+esc(x.id)+'" data-status="hidden">Hide</button><button class="btn btn-outline btn-small" data-action="moderate" data-type="posts" data-id="'+esc(x.id)+'" data-status="deleted">Remove</button></div></div>').join('')||empty('No community posts','Published posts will appear here.'))+'</section></div>';
 }else if(tab==='audit'){
  const res=await api('/owner/audit');
  content='<div class="panel"><div class="section-head"><div><h2>Recent activity</h2><p>Owner and member actions recorded by AgriMithra.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>When</th><th>Person</th><th>Action</th><th>Record</th></tr></thead><tbody>'+((res.events||[]).map(x=>'<tr><td>'+dateLabel(x.createdAt)+'</td><td>'+esc(x.actorName)+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.target||'—')+'</td></tr>').join('')||'<tr><td colspan="4">No activity recorded yet.</td></tr>')+'</tbody></table></div></div>';
 }
 $('#pageRoot').innerHTML=pageHeading('owner','Control AgriMithra services, community access and marketplace activity.')+'<div class="owner-tabs">'+tabButtons+'</div>'+content;
}

function openProfile(){
 const body='<form id="profileForm" class="auth-form"><div class="field"><label>Name</label><input name="name" value="'+esc(state.user.name)+'" maxlength="80" required></div><div class="field"><label>District or town</label><input name="district" value="'+esc(state.user.district||'')+'" maxlength="80"></div><div class="field"><label>Language</label><select name="language">'+LANGUAGES.map(x=>'<option value="'+x[0]+'" '+(state.user.language===x[0]?'selected':'')+'>'+x[1]+'</option>').join('')+'</select></div><button class="btn btn-primary">Save profile</button></form>';
 modal('Your AgriMithra profile','Update your name, district and preferred language.',body);
}
function openListingForm(){
 const body='<form id="listingForm" class="auth-form"><div class="form-grid"><div class="field field-full"><label>Produce name</label><input name="title" maxlength="100" required></div><div class="field"><label>Category</label><select name="category"><option>Grains</option><option>Vegetables</option><option>Fruits</option><option>Oilseeds</option><option>Spices</option><option>Other produce</option></select></div><div class="field"><label>Price per unit (₹)</label><input name="price" type="number" min="1" step="any" required></div><div class="field"><label>Unit</label><input name="unit" placeholder="kg, bag, crate" maxlength="20" required></div><div class="field"><label>Available quantity</label><input name="quantity" maxlength="60"></div><div class="field"><label>District</label><input name="district" value="'+esc(state.user.district||'')+'" maxlength="80"></div><div class="field field-full"><label>Details</label><textarea name="description" maxlength="600" placeholder="Quality, harvest date or pickup details"></textarea></div></div><button class="btn btn-primary">Submit for review</button></form>';
 modal('List your produce','Your listing will be checked before it appears in the public marketplace.',body);
}
async function openInquiry(id){
 const listing=state.listings.find(x=>x.id===id);if(!listing)return toast('This listing is no longer available.',true);
 const body='<form id="inquiryForm" data-id="'+esc(id)+'" class="auth-form"><p>Message the seller about <strong>'+esc(listing.title)+'</strong>. Arrange price and delivery directly with the seller.</p><div class="field"><label>Your message</label><textarea name="message" maxlength="500" placeholder="Ask about availability or pickup" required></textarea></div><button class="btn btn-primary">Send inquiry</button></form>';
 modal('Contact seller','Your name and account email are shared with the seller.',body);
}

async function openComments(id){
 const result=await api('/posts/'+encodeURIComponent(id)+'/comments');
 const rows=result.comments||[];
 const list=rows.map(c=>'<div class="mini-row"><span class="avatar">'+esc((c.authorName||'A').slice(0,1))+'</span><span><strong>'+esc(c.authorName)+'</strong><small>'+esc(c.text)+' · '+dateLabel(c.createdAt)+'</small></span></div>').join('');
 const body='<div class="comment-list">'+(list||empty('No replies yet','Be the first to add a helpful reply.'))+'</div><form id="commentForm" data-id="'+esc(id)+'" class="auth-form"><div class="field"><label>Your reply</label><textarea name="text" maxlength="600" minlength="2" required></textarea></div><button class="btn btn-primary">Add reply</button></form>';
 modal('Community discussion','Keep replies practical and respectful.',body);
}
function formValues(form){return Object.fromEntries(new FormData(form).entries());}
function finishLogin(data){state.user=data.user;state.csrf=data.csrfToken||'';closeModal();enterApp();}
function revealLocalCode(code){
 if(!code)return;
 const note=document.createElement('div');note.className='callout';note.style.marginBottom='12px';note.textContent='Local preview verification code: '+code+' (visible only in this development app).';
 $('#modalRoot .auth-modal').prepend(note);
}
document.addEventListener('click',async event=>{
 const route=event.target.closest('[data-route]');if(route){event.preventDefault();setRoute(route.dataset.route);return;}
 const tab=event.target.closest('[data-owner-tab]');if(tab){state.ownerTab=tab.dataset.ownerTab;renderOwner().catch(e=>toast(e.message,true));return;}
 const mode=event.target.closest('[data-auth-mode]');if(mode){openAuth(mode.dataset.authMode);return;}
 const action=event.target.closest('[data-action]');if(!action)return;
 const key=action.dataset.action;
 try{
  if(key==='login'){openAuth('login');return;}
  if(key==='signup'){openAuth('signup');return;}
  if(key==='owner-setup'){openOwnerSetup();return;}
  if(key==='close-modal'){closeModal();return;}
  if(key==='logout'){await api('/auth/logout',{method:'POST'});state.user=null;state.csrf='';publicPage();toast('You are signed out.');return;}
  if(key==='profile'){openProfile();return;}
  if(key==='new-listing'){openListingForm();return;}
  if(key==='inquire'){await openInquiry(action.dataset.id);return;}
  if(key==='like'){await api('/posts/'+encodeURIComponent(action.dataset.id)+'/like',{method:'POST',body:{}});await renderCommunity();return;}
  if(key==='comments'){await openComments(action.dataset.id);return;}
  if(key==='speak'){speak(action.dataset.text||'');return;}
  if(key==='voice'){state.voice=!state.voice;localStorage.setItem('agrimithra-voice',state.voice?'on':'off');$('#voiceToggle').innerHTML='<span>◖</span><span class="voice-label">Voice '+(state.voice?'on':'off')+'</span>';toast('Voice guidance '+(state.voice?'on':'off')+'.');return;}
  if(key==='notifications'){toast('You’re all caught up.');return;}
  if(key==='save-user'){
   const id=action.dataset.id,role=$('[data-user-role="'+CSS.escape(id)+'"]').value,status=$('[data-user-status="'+CSS.escape(id)+'"]').value;
   await api('/owner/users/'+encodeURIComponent(id),{method:'PATCH',body:{role,status}});toast('Account access updated.');await renderOwner();return;
  }
  if(key==='moderate'){
   await api('/owner/content/'+encodeURIComponent(action.dataset.type)+'/'+encodeURIComponent(action.dataset.id),{method:'PATCH',body:{status:action.dataset.status}});toast('Content status updated.');await renderOwner();return;
  }
 }catch(error){toast(error.message,true);}
});
document.addEventListener('submit',async event=>{
 const form=event.target;if(!form.matches('form'))return;
 if(!['loginForm','signupForm','verifyForm','ownerSetupForm','postForm','profileForm','listingForm','inquiryForm','commentForm'].includes(form.id))return;
 event.preventDefault();const submit=$('button[type="submit"]',form)||form.querySelector('button:not([type])');if(submit){submit.disabled=true;submit.dataset.oldText=submit.textContent;submit.textContent='Please wait…';}
 try{
  const values=formValues(form);
  if(form.id==='loginForm'){
   finishLogin(await api('/auth/login',{method:'POST',body:values}));
  }else if(form.id==='signupForm'){
   const data=await api('/auth/signup',{method:'POST',body:values});window.pendingSignupEmail=values.email;window.pendingLocalCode=data.localCode||'';openAuth('verify');revealLocalCode(window.pendingLocalCode);toast(data.message);
  }else if(form.id==='verifyForm'){
   const verified=await api('/auth/verify',{method:'POST',body:values});window.pendingLocalCode='';window.pendingSignupEmail='';if(verified.pendingApproval){closeModal();publicPage();toast(verified.message);return;}finishLogin(verified);
  }else if(form.id==='ownerSetupForm'){
   const data=await api('/owner/setup',{method:'POST',body:values});state.config.ownerSetupAvailable=false;finishLogin(data);toast('Your AgriMithra owner account is ready.');
  }else if(form.id==='postForm'){
   await api('/posts',{method:'POST',body:values});toast('Your update was shared.');await renderCommunity();
  }else if(form.id==='profileForm'){
   const result=await api('/me',{method:'PATCH',body:values});state.user=result.user;localStorage.setItem('agrimithra-language',state.user.language);state.language=state.user.language;closeModal();await enterApp();toast('Profile saved.');
  }else if(form.id==='listingForm'){
   values.price=Number(values.price);const data=await api('/listings',{method:'POST',body:values});closeModal();toast('Listing submitted for review.');await renderMarket();if(data.listing?.status==='pending')toast('It will appear after owner approval.');
  }else if(form.id==='inquiryForm'){
   await api('/listings/'+encodeURIComponent(form.dataset.id)+'/inquiries',{method:'POST',body:values});closeModal();toast('Your inquiry was sent to the seller.');
  }else if(form.id==='commentForm'){
   await api('/posts/'+encodeURIComponent(form.dataset.id)+'/comments',{method:'POST',body:values});await openComments(form.dataset.id);
  }
 }catch(error){toast(error.message,true);}
 finally{if(submit&&submit.isConnected){submit.disabled=false;submit.textContent=submit.dataset.oldText||'Submit';}}
});
document.addEventListener('change',async event=>{
 const el=event.target;
 if(el.id==='languageSelect'||el.id==='publicLanguage'){
  state.language=el.value;localStorage.setItem('agrimithra-language',state.language);
  if(state.user){try{const result=await api('/me',{method:'PATCH',body:{name:state.user.name,district:state.user.district||'',language:state.language}});state.user=result.user;}catch(error){toast(error.message,true);}}
  languageControl();if(state.user)renderRoute().catch(e=>toast(e.message,true));return;
 }
 if(el.matches('[data-sector-toggle]')){
  const key=el.dataset.sectorToggle;el.disabled=true;
  try{await api('/owner/sectors/'+encodeURIComponent(key),{method:'PATCH',body:{enabled:el.checked}});const latest=await api('/sectors');state.sectors=latest.sectors||[];toast('Service availability updated.');applyNavigationVisibility();await renderOwner();}
  catch(error){el.checked=!el.checked;toast(error.message,true);}finally{el.disabled=false;}
 }
});
$('#globalSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){state.query=event.target.value.trim().toLowerCase();setRoute('market');}});
$('#mobileMenu').addEventListener('click',()=>{$('#sidebar').classList.toggle('open');$('#mobileOverlay').classList.add('visible');});
$('#mobileOverlay').addEventListener('click',()=>{$('#sidebar').classList.remove('open');$('#mobileOverlay').classList.remove('visible');});
document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('#globalSearch').focus();}if(event.key==='Escape')closeModal();});
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}));
boot();
