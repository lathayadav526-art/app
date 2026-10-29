import express from 'express';
import { MongoClient } from 'mongodb';
import nodemailer from 'nodemailer';
import { createHash, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual, randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const scrypt = promisify(scryptCallback);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT || 4173);
const PROD = process.env.NODE_ENV === 'production';
const ORIGIN = process.env.PUBLIC_ORIGIN || ('http://localhost:' + PORT);
const COOKIE = 'agrimithra_session';
const SESSION_DAYS = 7;
const OWNER_SETUP_KEY = process.env.AGRI_OWNER_SETUP_KEY || (PROD ? '' : 'local-first-owner-setup');

const defaultSectors = [
  { key:'dashboard', name:'Farmer dashboard', category:'Farmer services', enabled:true, status:'active', summary:'Personal farm overview and saved tools.' },
  { key:'weather', name:'Weather and alerts', category:'Farm information', enabled:true, status:'needs_provider', summary:'Connect a forecast provider before showing live local weather.' },
  { key:'crop_tools', name:'Crop and soil tools', category:'Farm services', enabled:true, status:'active', summary:'Crop guides and educational planning calculators.' },
  { key:'marketplace', name:'Marketplace', category:'Commerce', enabled:true, status:'active', summary:'Farmer listings, buyer inquiries and owner moderation.' },
  { key:'community', name:'Farmer community', category:'Community', enabled:true, status:'active', summary:'Farmer posts, discussions and group learning.' },
  { key:'learning', name:'Learning and audio', category:'Education', enabled:true, status:'active', summary:'Practical lessons and browser voice playback.' },
  { key:'schemes', name:'Government schemes', category:'Farm information', enabled:true, status:'active', summary:'Official source links; details must be checked with the scheme provider.' },
  { key:'assistant', name:'Mithra assistant', category:'AI services', enabled:true, status:'needs_provider', summary:'Connect a reviewed agriculture knowledge service before offering AI answers.' },
  { key:'expert_calls', name:'Expert consultations', category:'Communication', enabled:false, status:'needs_provider', summary:'Connect and configure a secure calling provider.' },
  { key:'translation', name:'Message translation', category:'Communication', enabled:false, status:'needs_provider', summary:'Connect a translation provider before promising automatic translation.' },
  { key:'iot', name:'IoT sensor integrations', category:'Smart farming', enabled:false, status:'needs_provider', summary:'Connect and verify hardware data sources.' }
];

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}
function sha256(value) { return createHash('sha256').update(String(value)).digest('hex'); }
function cleanEmail(value) { return String(value || '').trim().toLowerCase(); }
function publicUser(user) {
  if (!user) return null;
  return { id:user._id, name:user.name, email:user.email, role:user.role, district:user.district || '', language:user.language || 'en', status:user.status || 'active', createdAt:user.createdAt };
}
function simpleMatch(item, query) {
  return Object.entries(query).every(([key, expected]) => {
    const actual = item[key];
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$gt' in expected) return new Date(actual).getTime() > new Date(expected.$gt).getTime();
      if ('$ne' in expected) return actual !== expected.$ne;
      if ('$in' in expected) return expected.$in.includes(actual);
      return false;
    }
    return actual === expected;
  });
}

class JsonStore {
  constructor(file) { this.file=file; this.queue=Promise.resolve(); this.data={}; this.ready=this.load(); }
  async load() {
    await fs.mkdir(path.dirname(this.file), { recursive:true });
    try { this.data=JSON.parse(await fs.readFile(this.file,'utf8')); } catch { this.data={}; }
    for (const name of ['users','sessions','otpChallenges','sectors','posts','messages','listings','inquiries','auditLogs']) if (!Array.isArray(this.data[name])) this.data[name]=[];
    await this.writeNow();
  }
  async writeNow() {
    const temp=this.file+'.tmp';
    await fs.writeFile(temp,JSON.stringify(this.data,null,2),'utf8');
    await fs.rename(temp,this.file);
  }
  async persist() { await this.ready; this.queue=this.queue.then(()=>this.writeNow()); return this.queue; }
  async find(name, filter={}, options={}) {
    await this.ready;
    let rows=(this.data[name]||[]).filter(row=>simpleMatch(row,filter));
    if (options.sort) { const [field,dir]=Object.entries(options.sort)[0]; rows=rows.sort((a,b)=>dir*(new Date(a[field]||0).getTime()-new Date(b[field]||0).getTime())); }
    if (options.limit) rows=rows.slice(0,options.limit);
    return structuredClone(rows);
  }
  async findOne(name, filter={}) { return (await this.find(name,filter,{limit:1}))[0]||null; }
  async count(name, filter={}) { return (await this.find(name,filter)).length; }
  async insert(name, document) { await this.ready; const row={_id:document._id||randomUUID(),...document}; this.data[name].push(row); await this.persist(); return structuredClone(row); }
  async updateOne(name, filter, update) {
    await this.ready; const row=(this.data[name]||[]).find(item=>simpleMatch(item,filter)); if(!row)return null;
    if(update.$set) Object.assign(row,update.$set);
    if(update.$inc) for(const [key,value] of Object.entries(update.$inc)) row[key]=(Number(row[key])||0)+value;
    await this.persist(); return structuredClone(row);
  }
  async deleteOne(name, filter) { await this.ready; const i=(this.data[name]||[]).findIndex(row=>simpleMatch(row,filter)); if(i<0)return false; this.data[name].splice(i,1); await this.persist(); return true; }
}

async function makeStore() {
  if (!process.env.MONGODB_URI) {
    if (PROD) throw new Error('MONGODB_URI is required in production.');
    console.warn('AgriMithra is using the local development file store. Configure MongoDB before public launch.');
    return new JsonStore(path.join(ROOT,'data','agrimithra-local.json'));
  }
  const client=new MongoClient(process.env.MONGODB_URI,{appName:'AgriMithra',maxPoolSize:30});
  await client.connect();
  const db=client.db(process.env.MONGODB_DB||'agrimithra');
  await Promise.all([
    db.collection('users').createIndex({email:1},{unique:true}),
    db.collection('sessions').createIndex({tokenHash:1},{unique:true}),
    db.collection('sessions').createIndex({expiresAt:1},{expireAfterSeconds:0}),
    db.collection('otpChallenges').createIndex({email:1},{unique:true}),
    db.collection('otpChallenges').createIndex({expiresAt:1},{expireAfterSeconds:0}),
    db.collection('posts').createIndex({status:1,createdAt:-1}),
    db.collection('listings').createIndex({status:1,createdAt:-1}),
    db.collection('inquiries').createIndex({sellerId:1,createdAt:-1}),
    db.collection('auditLogs').createIndex({createdAt:-1})
  ]);
  return {
    find:(name,filter={},options={})=>{let q=db.collection(name).find(filter);if(options.sort)q=q.sort(options.sort);if(options.limit)q=q.limit(options.limit);return q.toArray();},
    findOne:(name,filter={})=>db.collection(name).findOne(filter),
    count:(name,filter={})=>db.collection(name).countDocuments(filter),
    insert:async(name,document)=>{const row={_id:document._id||randomUUID(),...document};await db.collection(name).insertOne(row);return row;},
    updateOne:async(name,filter,update)=>{const result=await db.collection(name).findOneAndUpdate(filter,update,{returnDocument:'after'});return result||null;},
    deleteOne:async(name,filter)=>Boolean((await db.collection(name).deleteOne(filter)).deletedCount)
  };
}

const store=await makeStore();
for (const sector of defaultSectors) if (!(await store.findOne('sectors',{key:sector.key}))) await store.insert('sectors',{...sector,updatedAt:new Date()});

const app=express();
if (PROD && process.env.TRUST_PROXY === '1') app.set('trust proxy',1);
app.disable('x-powered-by');
app.use((req,res,next)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if (PROD) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({limit:'32kb',strict:true}));

const rateBuckets=new Map();
function rateLimit(max, windowMs) {
  return (req,res,next)=>{
    const key=(req.ip||req.socket.remoteAddress||'unknown')+':'+req.path;
    const now=Date.now(), current=rateBuckets.get(key);
    if(!current||now-current.started>windowMs){rateBuckets.set(key,{started:now,count:1});return next();}
    current.count++;
    if(current.count>max)return res.status(429).json({error:'Too many attempts. Please wait a few minutes and try again.'});
    next();
  };
}
function sameOrigin(req,res,next) {
  const origin=req.get('origin');
  const allowed=!PROD?new Set(['http://localhost:'+PORT,'http://127.0.0.1:'+PORT]):new Set([new URL(ORIGIN).origin]);
  if(origin&&!allowed.has(origin))return res.status(403).json({error:'Request origin is not allowed.'});
  next();
}
app.use('/api',sameOrigin);
app.use('/api/auth',rateLimit(24,15*60*1000));
app.use('/api/owner/setup',rateLimit(8,60*60*1000));
app.use('/api',rateLimit(180,60*1000));

function cookieValue(req,name) {
  const raw=req.headers.cookie||'';
  for(const part of raw.split(';')){const i=part.indexOf('=');if(i>0&&part.slice(0,i).trim()===name)return decodeURIComponent(part.slice(i+1).trim());}
  return '';
}
async function attachSession(req,res,next) {
  try {
    const token=cookieValue(req,COOKIE);
    if(token){const session=await store.findOne('sessions',{tokenHash:sha256(token)});if(session&&new Date(session.expiresAt)>new Date()){const user=await store.findOne('users',{_id:session.userId,status:'active'});if(user){req.auth={session,user};}}}
    next();
  } catch(error) { next(error); }
}
app.use('/api',attachSession);
function needUser(req,res,next){if(!req.auth)return res.status(401).json({error:'Sign in to continue.'});next();}
function needOwner(req,res,next){if(!req.auth||!['owner','admin'].includes(req.auth.user.role))return res.status(403).json({error:'Owner access is required.'});next();}
function needOwnerRole(req,res,next){if(!req.auth||req.auth.user.role!=='owner')return res.status(403).json({error:'Only the platform owner can do this.'});next();}
function csrf(req,res,next) {
  const publicAuth=req.method==='POST'&&(['/auth/signup','/auth/verify','/auth/login','/owner/setup'].includes(req.path));
  if(['GET','HEAD','OPTIONS'].includes(req.method)||publicAuth)return next();
  if(!req.auth)return res.status(401).json({error:'Sign in to continue.'});
  if(!safeEqual(req.get('x-csrf-token'),req.auth.session.csrfToken))return res.status(403).json({error:'This request expired. Refresh and try again.'});
  next();
}
app.use('/api',csrf);
function validPassword(p){return typeof p==='string'&&p.length>=12&&p.length<=128;}
function validEmail(e){return typeof e==='string'&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);}
async function passwordHash(password) {
  const salt=randomBytes(16);
  const derived=await scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024});
  return salt.toString('base64url')+'.'+Buffer.from(derived).toString('base64url');
}
async function passwordMatches(password,stored) {
  try { const [saltText,keyText]=String(stored).split('.');const salt=Buffer.from(saltText,'base64url'),key=Buffer.from(keyText,'base64url');const derived=Buffer.from(await scrypt(password,salt,key.length,{N:32768,r:8,p:1,maxmem:64*1024*1024}));return key.length===derived.length&&timingSafeEqual(key,derived); } catch { return false; }
}
function csrfToken(){return randomBytes(24).toString('base64url');}
async function createSession(user,res) {
  const token=randomBytes(32).toString('base64url'),csrfSecret=csrfToken(),expiresAt=new Date(Date.now()+SESSION_DAYS*86400000);
  await store.insert('sessions',{tokenHash:sha256(token),userId:user._id,csrfToken:csrfSecret,expiresAt,createdAt:new Date()});
  const secure=PROD?'; Secure':'';
  res.setHeader('Set-Cookie',COOKIE+'='+encodeURIComponent(token)+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+(SESSION_DAYS*86400)+secure);
  return {user:publicUser(user),csrfToken:csrfSecret};
}
function clearSession(res){res.setHeader('Set-Cookie',COOKIE+'=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'+(PROD?'; Secure':''));}
async function sendOtp(email,code) {
  if(!process.env.SMTP_URL){if(PROD)throw new Error('Email delivery is not configured. Set SMTP_URL before enabling registrations.');console.log('[AgriMithra local sign-up code] '+email+': '+code);return;}
  const transport=nodemailer.createTransport(process.env.SMTP_URL);
  await transport.sendMail({from:process.env.SMTP_FROM||'AgriMithra <noreply@example.com>',to:email,subject:'Your AgriMithra verification code',text:'Your AgriMithra verification code is '+code+'. It expires in 10 minutes. Do not share it.'});
}
async function audit(actor,action,target,details={}) {
  await store.insert('auditLogs',{actorId:actor?actor._id:null,actorName:actor?actor.name:'system',action,target,details,createdAt:new Date()});
}
async function sectorEnabled(key){const row=await store.findOne('sectors',{key});return Boolean(row&&row.enabled);}
function requireSector(key){return async(req,res,next)=>{if(!(await sectorEnabled(key)))return res.status(503).json({error:'This service is currently unavailable.'});next();};}

app.get('/api/health',async(req,res)=>res.json({ok:true,service:'AgriMithra',storage:process.env.MONGODB_URI?'mongodb':'local-development'}));
app.get('/api/config',async(req,res)=>{
  const ownerCount=await store.count('users',{role:'owner',status:'active'});
  res.json({ownerSetupAvailable:ownerCount===0&&Boolean(OWNER_SETUP_KEY),publicName:'AgriMithra',development:!PROD});
});
app.get('/api/me',async(req,res)=>{
  if(!req.auth)return res.json({user:null});
  res.json({user:publicUser(req.auth.user),csrfToken:req.auth.session.csrfToken});
});
app.patch('/api/me',needUser,async(req,res)=>{
  const name=String(req.body.name||'').trim(),district=String(req.body.district||'').trim(),language=String(req.body.language||'en');
  if(name.length<2||name.length>80||district.length>80||!['en','hi','te','ta','kn','ml','mr','bn','gu','pa','or','as','ur'].includes(language))return res.status(400).json({error:'Check your name, district and language.'});
  const saved=await store.updateOne('users',{_id:req.auth.user._id},{$set:{name,district,language,updatedAt:new Date()}});
  await audit(req.auth.user,'account.profile.updated',req.auth.user._id);
  res.json({user:publicUser(saved)});
});
app.get('/api/sectors',async(req,res)=>{
  const rows=await store.find('sectors',{}, {sort:{category:1,name:1}});
  res.json({sectors:rows.map(({_id,key,name,category,enabled,status,summary,maintenanceMessage})=>({_id,key,name,category,enabled,status,summary,maintenanceMessage}))});
});

app.post('/api/auth/signup',async(req,res)=>{
  const name=String(req.body.name||'').trim(),email=cleanEmail(req.body.email),password=req.body.password,role=String(req.body.role||'farmer'),district=String(req.body.district||'').trim();
  if(name.length<2||name.length>80||!validEmail(email)||!validPassword(password)||!['farmer','buyer','expert'].includes(role))return res.status(400).json({error:'Enter your name, a valid email, a password of at least 12 characters, and a valid account type.'});
  const existing=await store.findOne('users',{email});
  if(existing&&existing.emailVerified)return res.status(409).json({error:'An account already exists for this email. Sign in instead.'});
  const code=String(randomInt(100000,1000000)),expiresAt=new Date(Date.now()+10*60*1000);
  const challenge={email,name,role,district,passwordHash:await passwordHash(password),codeHash:sha256(email+':'+code+':'+(process.env.AGRI_OTP_PEPPER||OWNER_SETUP_KEY)),expiresAt,attempts:0,createdAt:new Date()};
  const old=await store.findOne('otpChallenges',{email});
  if(old)await store.updateOne('otpChallenges',{_id:old._id},{$set:challenge});else await store.insert('otpChallenges',challenge);
  await sendOtp(email,code);
  res.status(202).json({ok:true,message:'Check your email for a verification code. It expires in 10 minutes.',localCode:!PROD&&!process.env.SMTP_URL?code:undefined});
});
app.post('/api/auth/verify',async(req,res)=>{
  const email=cleanEmail(req.body.email),code=String(req.body.code||'').trim();
  const challenge=await store.findOne('otpChallenges',{email});
  if(!challenge||new Date(challenge.expiresAt)<new Date())return res.status(400).json({error:'That code has expired. Start sign-up again.'});
  if(Number(challenge.attempts||0)>=5)return res.status(429).json({error:'Too many incorrect codes. Start sign-up again.'});
  if(!safeEqual(challenge.codeHash,sha256(email+':'+code+':'+(process.env.AGRI_OTP_PEPPER||OWNER_SETUP_KEY)))){await store.updateOne('otpChallenges',{_id:challenge._id},{$inc:{attempts:1}});return res.status(400).json({error:'The verification code is not correct.'});}
  const approvalPending=challenge.role==='expert';
  const user=await store.insert('users',{name:challenge.name,email,role:challenge.role,district:challenge.district,language:'en',passwordHash:challenge.passwordHash,emailVerified:true,status:approvalPending?'pending':'active',createdAt:new Date()});
  await store.deleteOne('otpChallenges',{_id:challenge._id});
  await audit(user,'account.created',user._id,{role:user.role,status:user.status});
  if(approvalPending)return res.status(202).json({pendingApproval:true,message:'Your email is verified. An AgriMithra owner must review your agriculture expert account before you can sign in.'});
  const session=await createSession(user,res);
  res.status(201).json(session);
});
app.post('/api/auth/login',async(req,res)=>{
  const email=cleanEmail(req.body.email),password=String(req.body.password||'');
  const user=await store.findOne('users',{email});
  if(!user||!user.emailVerified||user.status!=='active'||!(await passwordMatches(password,user.passwordHash)))return res.status(401).json({error:'Email or password is incorrect.'});
  res.json(await createSession(user,res));
});
app.post('/api/auth/logout',needUser,async(req,res)=>{
  await store.deleteOne('sessions',{_id:req.auth.session._id});clearSession(res);res.json({ok:true});
});
app.post('/api/owner/setup',async(req,res)=>{
  if(!OWNER_SETUP_KEY)return res.status(503).json({error:'Owner setup is not configured on this server.'});
  if(await store.count('users',{role:'owner'})>0)return res.status(409).json({error:'The platform owner is already set up.'});
  const setupKey=String(req.body.setupKey||'');
  if(!safeEqual(setupKey,OWNER_SETUP_KEY))return res.status(403).json({error:'Setup key is not correct.'});
  const name=String(req.body.name||'').trim(),email=cleanEmail(req.body.email),password=req.body.password;
  if(name.length<2||!validEmail(email)||!validPassword(password))return res.status(400).json({error:'Enter a name, valid email and a password of at least 12 characters.'});
  const existing=await store.findOne('users',{email});
  let user;
  if(existing){
    if(!existing.emailVerified||existing.status!=='active'||!(await passwordMatches(password,existing.passwordHash)))return res.status(401).json({error:'This account could not be verified. Enter its current password, or use a new email address.'});
    user=await store.updateOne('users',{_id:existing._id},{$set:{name,role:'owner',status:'active',updatedAt:new Date()}});
  }else{
    user=await store.insert('users',{name,email,role:'owner',district:'',language:'en',passwordHash:await passwordHash(password),emailVerified:true,status:'active',createdAt:new Date()});
  }
  const session=await createSession(user,res);await audit(user,'platform.owner.created',user._id);
  res.status(201).json(session);
});

app.get('/api/posts',requireSector('community'),async(req,res)=>{
  const rows=await store.find('posts',{status:'published'},{sort:{createdAt:-1},limit:30});
  res.json({posts:rows.map(({_id,authorName,authorDistrict,text,topic,likes,createdAt})=>({id:_id,authorName,authorDistrict,text,topic,likes:likes||[],createdAt}))});
});
app.post('/api/posts',needUser,requireSector('community'),async(req,res)=>{
  const text=String(req.body.text||'').trim(),topic=String(req.body.topic||'Farm update').slice(0,40);
  if(text.length<4||text.length>1200)return res.status(400).json({error:'A community update must be between 4 and 1,200 characters.'});
  const post=await store.insert('posts',{authorId:req.auth.user._id,authorName:req.auth.user.name,authorDistrict:req.auth.user.district||'',text,topic,likes:[],status:'published',createdAt:new Date()});
  await audit(req.auth.user,'community.post.created',post._id);
  res.status(201).json({post:{id:post._id,authorName:post.authorName,authorDistrict:post.authorDistrict,text:post.text,topic:post.topic,likes:[],createdAt:post.createdAt}});
});
app.post('/api/posts/:id/like',needUser,requireSector('community'),async(req,res)=>{
  const post=await store.findOne('posts',{_id:req.params.id,status:'published'});
  if(!post)return res.status(404).json({error:'Post not found.'});
  const likes=Array.isArray(post.likes)?post.likes:[],already=likes.includes(req.auth.user._id);
  const next=already?likes.filter(id=>id!==req.auth.user._id):likes.concat(req.auth.user._id);
  await store.updateOne('posts',{_id:post._id},{$set:{likes:next}});
  res.json({liked:!already,likes:next.length});
});
app.post('/api/posts/:id/comments',needUser,requireSector('community'),async(req,res)=>{
  const post=await store.findOne('posts',{_id:req.params.id,status:'published'}),text=String(req.body.text||'').trim();
  if(!post)return res.status(404).json({error:'Post not found.'});
  if(text.length<2||text.length>600)return res.status(400).json({error:'A comment must be between 2 and 600 characters.'});
  const comment=await store.insert('messages',{kind:'comment',postId:post._id,authorId:req.auth.user._id,authorName:req.auth.user.name,text,createdAt:new Date(),status:'visible'});
  res.status(201).json({comment:{id:comment._id,authorName:comment.authorName,text:comment.text,createdAt:comment.createdAt}});
});
app.get('/api/posts/:id/comments',requireSector('community'),async(req,res)=>{
  const comments=await store.find('messages',{kind:'comment',postId:req.params.id,status:'visible'},{sort:{createdAt:1},limit:50});
  res.json({comments:comments.map(x=>({id:x._id,authorName:x.authorName,text:x.text,createdAt:x.createdAt}))});
});

app.get('/api/listings',requireSector('marketplace'),async(req,res)=>{
  const filter={status:'published'};
  if(req.query.category)filter.category=String(req.query.category).slice(0,60);
  const rows=await store.find('listings',filter,{sort:{createdAt:-1},limit:60});
  res.json({listings:rows.map(({_id,title,category,price,unit,quantity,district,description,sellerName,createdAt})=>({id:_id,title,category,price,unit,quantity,district,description,sellerName,createdAt}))});
});
app.post('/api/listings',needUser,requireSector('marketplace'),async(req,res)=>{
  const title=String(req.body.title||'').trim(),category=String(req.body.category||'').trim(),price=Number(req.body.price),unit=String(req.body.unit||'').trim(),quantity=String(req.body.quantity||'').trim(),district=String(req.body.district||req.auth.user.district||'').trim(),description=String(req.body.description||'').trim();
  if(title.length<3||title.length>100||category.length<2||category.length>60||!Number.isFinite(price)||price<=0||unit.length>20||quantity.length>60||district.length>80||description.length>600)return res.status(400).json({error:'Check the product name, category, price, quantity and location.'});
  const listing=await store.insert('listings',{sellerId:req.auth.user._id,sellerName:req.auth.user.name,title,category,price,unit,quantity,district,description,status:'pending',createdAt:new Date(),updatedAt:new Date()});
  await audit(req.auth.user,'marketplace.listing.created',listing._id);
  res.status(201).json({listing:{id:listing._id,title:listing.title,status:listing.status}});
});
app.post('/api/listings/:id/inquiries',needUser,requireSector('marketplace'),async(req,res)=>{
  const listing=await store.findOne('listings',{_id:req.params.id,status:'published'});
  const message=String(req.body.message||'').trim();
  if(!listing)return res.status(404).json({error:'Listing not found.'});
  if(listing.sellerId===req.auth.user._id)return res.status(400).json({error:'You cannot inquire about your own listing.'});
  if(message.length>500)return res.status(400).json({error:'Inquiry is too long.'});
  const inquiry=await store.insert('inquiries',{listingId:listing._id,listingTitle:listing.title,sellerId:listing.sellerId,buyerId:req.auth.user._id,buyerName:req.auth.user.name,message,status:'new',createdAt:new Date()});
  await audit(req.auth.user,'marketplace.inquiry.created',inquiry._id);
  res.status(201).json({ok:true,message:'Your inquiry was sent to the seller.'});
});

app.get('/api/owner/overview',needOwner,async(req,res)=>{
  const roles=['farmer','buyer','expert','admin','owner'],counts={};
  for(const role of roles)counts[role]=await store.count('users',{role,status:'active'});
  const [posts,listings,pendingListings,inquiries,sectors]=await Promise.all([store.count('posts',{status:'published'}),store.count('listings',{status:'published'}),store.count('listings',{status:'pending'}),store.count('inquiries',{status:'new'}),store.find('sectors',{})]);
  res.json({users:counts,totalUsers:Object.values(counts).reduce((a,b)=>a+b,0),posts,listings,pendingListings,inquiries,sectorsEnabled:sectors.filter(x=>x.enabled).length,sectorsTotal:sectors.length});
});
app.get('/api/owner/sectors',needOwner,async(req,res)=>res.json({sectors:await store.find('sectors',{}, {sort:{category:1,name:1}})}));
app.patch('/api/owner/sectors/:key',needOwner,async(req,res)=>{
  const current=await store.findOne('sectors',{key:req.params.key});
  if(!current)return res.status(404).json({error:'Sector not found.'});
  if(typeof req.body.enabled==='boolean')current.enabled=req.body.enabled;
  if(typeof req.body.maintenanceMessage==='string')current.maintenanceMessage=req.body.maintenanceMessage.trim().slice(0,240);
  current.updatedAt=new Date();
  const saved=await store.updateOne('sectors',{_id:current._id},{$set:{enabled:current.enabled,maintenanceMessage:current.maintenanceMessage||'',updatedAt:current.updatedAt}});
  await audit(req.auth.user,'sector.settings.updated',current.key,{enabled:saved.enabled});
  res.json({sector:saved});
});
app.get('/api/owner/users',needOwner,async(req,res)=>{
  const rows=await store.find('users',{}, {sort:{createdAt:-1},limit:200});
  res.json({users:rows.map(x=>({id:x._id,name:x.name,email:x.email,role:x.role,district:x.district,status:x.status,emailVerified:Boolean(x.emailVerified),createdAt:x.createdAt}))});
});
app.patch('/api/owner/users/:id',needOwnerRole,async(req,res)=>{
  const user=await store.findOne('users',{_id:req.params.id});
  if(!user)return res.status(404).json({error:'Account not found.'});
  const updates={};
  if(['farmer','buyer','expert','admin'].includes(req.body.role))updates.role=req.body.role;
  if(['active','suspended'].includes(req.body.status))updates.status=req.body.status;
  if(!Object.keys(updates).length)return res.status(400).json({error:'Choose a valid role or account status.'});
  if(user.role==='owner'&&req.body.status==='suspended')return res.status(400).json({error:'Owner accounts cannot be suspended here.'});
  updates.updatedAt=new Date();
  const saved=await store.updateOne('users',{_id:user._id},{$set:updates});
  if(updates.status==='suspended')await store.deleteOne('sessions',{userId:user._id});
  await audit(req.auth.user,'user.account.updated',user._id,updates);
  res.json({user:publicUser(saved)});
});
app.get('/api/owner/moderation',needOwner,async(req,res)=>{
  const [posts,listings,inquiries]=await Promise.all([store.find('posts',{status:{$ne:'deleted'}},{sort:{createdAt:-1},limit:40}),store.find('listings',{status:{$in:['pending','published','hidden']}},{sort:{createdAt:-1},limit:40}),store.find('inquiries',{}, {sort:{createdAt:-1},limit:30})]);
  res.json({posts:posts.map(x=>({id:x._id,text:x.text,authorName:x.authorName,status:x.status,createdAt:x.createdAt})),listings:listings.map(x=>({id:x._id,title:x.title,sellerName:x.sellerName,status:x.status,price:x.price,category:x.category,createdAt:x.createdAt})),inquiries:inquiries.map(x=>({id:x._id,listingTitle:x.listingTitle,buyerName:x.buyerName,status:x.status,createdAt:x.createdAt}))});
});
app.patch('/api/owner/content/:type/:id',needOwner,async(req,res)=>{
  const collection=req.params.type==='posts'?'posts':req.params.type==='listings'?'listings':null;
  if(!collection)return res.status(400).json({error:'Content type is not supported.'});
  const status=String(req.body.status||'');
  const allowed=collection==='posts'?['published','hidden','deleted']:['pending','published','hidden'];
  if(!allowed.includes(status))return res.status(400).json({error:'Status is not supported.'});
  const result=await store.updateOne(collection,{_id:req.params.id},{$set:{status,updatedAt:new Date()}});
  if(!result)return res.status(404).json({error:'Content not found.'});
  await audit(req.auth.user,'content.moderated',req.params.type+':'+req.params.id,{status});
  res.json({ok:true,status});
});
app.get('/api/owner/audit',needOwner,async(req,res)=>{
  const rows=await store.find('auditLogs',{}, {sort:{createdAt:-1},limit:80});
  res.json({events:rows.map(x=>({id:x._id,actorName:x.actorName,action:x.action,target:x.target,createdAt:x.createdAt,details:x.details}))});
});

app.use(express.static(PUBLIC_DIR,{index:'index.html',dotfiles:'ignore',fallthrough:true,maxAge:PROD?'1h':0}));
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API route not found.'});res.sendFile(path.join(PUBLIC_DIR,'index.html'));});
app.use((error,req,res,next)=>{
  console.error('AgriMithra request failed:',error.message);
  if(res.headersSent)return next(error);
  res.status(error.status||500).json({error:PROD?'The request could not be completed.':'The request could not be completed: '+error.message});
});

if(PROD) {
  if(!process.env.MONGODB_URI)throw new Error('Production requires MONGODB_URI.');
  if(!process.env.AGRI_OWNER_SETUP_KEY||process.env.AGRI_OWNER_SETUP_KEY.length<32)throw new Error('Production requires a random AGRI_OWNER_SETUP_KEY of at least 32 characters.');
  if(!process.env.SMTP_URL)throw new Error('Production requires SMTP_URL so public sign-ups can verify email.');
  if(!process.env.PUBLIC_ORIGIN||!process.env.PUBLIC_ORIGIN.startsWith('https://'))throw new Error('Production requires a secure HTTPS PUBLIC_ORIGIN.');
}
app.listen(PORT,PROD?'0.0.0.0':'127.0.0.1',()=>console.log('AgriMithra listening on port '+PORT+' ('+(PROD?'production':'development')+').'));
