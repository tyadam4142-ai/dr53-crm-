'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {execFile}=require('child_process');
const PORT=+process.env.PORT||3053,HOST='127.0.0.1';
// Read local provider credentials without requiring dotenv or any npm dependencies.
(function loadLocalEnv(){
  const envFile=path.join(__dirname,'.env');
  if(!fs.existsSync(envFile))return;
  for(const line of fs.readFileSync(envFile,'utf8').split(/\r?\n/)){
    const m=line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if(!m||m[2].startsWith('#'))continue;
    let value=m[2];if((value.startsWith('\"')&&value.endsWith('\"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
    if(process.env[m[1]]===undefined)process.env[m[1]]=value;
  }
})();
const DEFAULT_PRODUCTS=[
{id:'tap-sticker',name:'Tap Tag Sticker',price:553,priceType:'fixed',active:true,description:'Personalized tap-enabled sticker that opens the customer\'s digital profile or webpage with Instagram and other links.'},
{id:'tap-card',name:'Tap Tag Card',price:753,priceType:'fixed',active:true,description:'Tap-enabled card with the customer\'s logo printed on it. Tapping opens the associated profile webpage.'},
{id:'website',name:'Website Development',price:5300,priceType:'starting',active:true,description:'Custom website development. Visit https://dynamicrobotics53.com to discuss requirements.'},
{id:'e-adapter',name:'E-Adapter',price:2553,priceType:'fixed',active:true,description:'Compact electronics and backup-power concept. Technical specifications are not yet verified; the team must confirm details.'}];
const DEFAULT_SETTINGS={businessName:'Dynamic Robotics 53',website:'https://dynamicrobotics53.com',ollamaUrl:'http://127.0.0.1:11434',model:'qwen2.5:3b',callbackStartHour:16,callbackEndHour:17,notifications:true};
const SYSTEM_PROMPT=`You are the official AI Sales and Customer Follow-up Assistant for Dynamic Robotics 53, founded by Adam Bhaimia. Explain products accurately, understand requirements, draft helpful replies, suggest next steps and propose callbacks. You are an AI, not Adam; never claim to be human. Use the product catalogue below as the only source for prices and descriptions. Never invent prices, discounts, specs, warranties, delivery promises or policies; if unsure say the team needs to confirm. Be friendly and concise. Reply in English unless the customer uses Hindi or Marathi. You may draft messages but never claim one was sent. Callbacks only within the configured window; the backend validates and saves bookings.`;
function offlineAgentReply(messages, products){
  const user=[...messages].reverse().find(m=>m.role==='user')?.content||'';
  const q=user.toLowerCase();
  const findProduct=(patterns)=>products.find(p=>patterns.some(pattern=>pattern.test(q)));
  const p=findProduct([/tap\s*tag\s*sticker/,/sticker/]);
  const card=findProduct([/tap\s*tag\s*card/,/heart\s*top\s*card/,/logo\s*card/]);
  const web=findProduct([/website/,/web\s*development/]);
  const adapter=findProduct([/e.?adapter/,/adapter/]);
  const fmt=p=>p?`${p.name}: ₹${p.price.toLocaleString('en-IN')}${p.priceType==='starting'?' starting price':''}. ${p.description}`:'';
  if(/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(q.trim())) return 'Hi! I’m the Dynamic Robotics 53 sales assistant. I can help with product pricing, sales scripts, customer follow-ups, call preparation and message drafts. I can open your Mac Phone app, but native Mac calls do not expose a direct AI audio connection.';
  if(/what can you do|help|commands|how do i use you/.test(q)) return 'I can explain the verified catalogue, draft calls/messages, help organise customer follow-ups, and use the Call & Message panel to open native Mac Phone or a pre-filled message. Try “Draft a WhatsApp message for Tap Tag Sticker”, “Explain the Tap Tag Card”, or use the quick-action controls. For more flexible replies, start Ollama with `ollama serve` and make sure `qwen2.5:3b` is installed.';
  if(/price|cost|how much|catalogue|catalog|product/.test(q)) {
    const items=[p,card,web,adapter].filter(Boolean);
    if(items.length) return 'Here are the matching items in the approved DR53 catalogue:\n\n'+items.map(fmt).join('\n\n')+'\n\nI will not invent discounts, delivery promises or specifications. Ask me to draft a customer-friendly explanation or follow-up for one of these.';
    return 'The approved catalogue is: Tap Tag Sticker ₹553; Tap Tag Card ₹753; Website Development starts at ₹5,300; E-Adapter ₹2,553 (details need confirmation). Tell me which product you’d like explained.';
  }
  if(/draft|write|message|whatsapp|sms|follow.?up|script|call/.test(q)) {
    const item=p||card||web||adapter;
    if(/whatsapp|message|sms/.test(q)) return `Hi! Thanks for your interest in Dynamic Robotics 53${item?' and our '+item.name:''}. ${item?`The ${item.name} is ${item.priceType==='starting'?'available from':'priced at'} ₹${item.price.toLocaleString('en-IN')}.`:''} Let us know what you’re looking for and we’ll be happy to help. You can visit https://dynamicrobotics53.com for more information.`;
    if(/script|call|phone/.test(q)) return `Hi, this is the AI sales assistant from Dynamic Robotics 53. I’m following up on your enquiry${item?' about '+item.name:''}. Is now a convenient time to talk? ${item?`Our catalogue lists ${item.name} at ₹${item.price.toLocaleString('en-IN')}${item.priceType==='starting'?' starting price':''}.`:''} What would you like to know?`;
    return 'Here’s a polite follow-up: “Hi! I’m following up on your enquiry with Dynamic Robotics 53. Are you still interested? I’d be happy to answer any questions. You can also visit https://dynamicrobotics53.com.” Review it before sending.';
  }
  if(/next|priorit|dashboard|today|leads/.test(q)) return 'Suggested next steps: check new enquiries in the Command Centre, contact only customers who agreed to follow-up, prepare a short product-specific script, record the outcome after each call, and create a dated follow-up task when requested. I can draft the script or message now.';
  if(/(customer|lead).*(add|create|save)|\badd customer\b/.test(q)) return 'I can help maintain the customer list. Use Customers → Add customer to save a lead. For privacy and accuracy, confirm the name and number before saving; the free mode does not infer or invent contact details.';
  return 'I received your instruction. The local AI model is unavailable right now, so I’m using a limited catalogue-aware fallback rather than pretending a full LLM answered. I can still help with approved prices, basic sales scripts and message drafts. Start Ollama (`ollama serve`) and check that `qwen2.5:3b` is installed for flexible conversation.';
}

const fmtIST=d=>new Date(d).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});

function createApp(dataDir,opts={}){
  fs.mkdirSync(dataDir,{recursive:true});
  const notify=opts.notify||defaultNotify;
  const dial=opts.dial||defaultDial;
  const env=opts.env||process.env;
  const providerFetch=opts.providerFetch||fetch;
  const file=n=>path.join(dataDir,n+'.json');
  function load(n,def){
    const f=file(n);
    try{return JSON.parse(fs.readFileSync(f,'utf8'));}
    catch(e){
      if(e.code!=='ENOENT'&&fs.existsSync(f)){fs.mkdirSync(path.join(dataDir,'backups'),{recursive:true});fs.renameSync(f,path.join(dataDir,'backups',`${n}.corrupt.${Date.now()}.json`));}
      return JSON.parse(JSON.stringify(def));
    }
  }
  function save(n,v){const f=file(n),t=f+'.tmp';fs.writeFileSync(t,JSON.stringify(v,null,2));fs.renameSync(t,f);}
  const settings=()=>({...DEFAULT_SETTINGS,...load('settings',{})});
  const cleanPhone=value=>{
    let n=str(value,30).replace(/[\s()\-]/g,'');
    if(/^\d{10}$/.test(n))n='+91'+n;
    else if(/^91\d{10}$/.test(n))n='+'+n;
    if(!/^\+[1-9]\d{7,14}$/.test(n))return null;
    return n;
  };
  const providerStatus=()=>{
    const voiceMissing=[];if(!env.ELEVENLABS_API_KEY)voiceMissing.push('ELEVENLABS_API_KEY');if(!env.ELEVENLABS_AGENT_ID)voiceMissing.push('ELEVENLABS_AGENT_ID');if(!env.ELEVENLABS_AGENT_PHONE_NUMBER_ID)voiceMissing.push('ELEVENLABS_AGENT_PHONE_NUMBER_ID');
    const commonMissing=[];if(!env.TWILIO_ACCOUNT_SID)commonMissing.push('TWILIO_ACCOUNT_SID');if(!env.TWILIO_AUTH_TOKEN)commonMissing.push('TWILIO_AUTH_TOKEN');
    const smsMissing=[...commonMissing];if(!env.TWILIO_FROM_NUMBER&&!env.TWILIO_MESSAGING_SERVICE_SID)smsMissing.push('TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID');
    const waMissing=[...commonMissing];if(!env.TWILIO_WHATSAPP_FROM)waMissing.push('TWILIO_WHATSAPP_FROM');
    return{voiceCallReady:voiceMissing.length===0,voiceMissing,smsReady:smsMissing.length===0,smsMissing,whatsappReady:waMissing.length===0,whatsappMissing:waMissing};
  };
  const log=(type,text)=>{const a=load('activity',[]);a.unshift({id:crypto.randomUUID(),type,text,at:new Date().toISOString()});save('activity',a.slice(0,500));};
  const str=(v,max=200)=>typeof v==='string'?v.trim().slice(0,max):'';
  function validCustomer(b){
    const name=str(b.name,100),email=str(b.email),phone=str(b.phone,20);
    if(!name)return{error:'Name is required.'};
    if(email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return{error:'Email is invalid.'};
    if(phone&&!/^[+\d][\d\s-]{6,18}$/.test(phone))return{error:'Phone number is invalid.'};
    const statuses=['New','Contacted','Interested','Follow-up Required','Callback Scheduled','Converted','Not Interested'];
    const status=b.status===undefined?'New':b.status;
    if(!statuses.includes(status))return{error:'Invalid status.'};
    return{value:{name,email,phone,product:str(b.product,100),status,notes:str(b.notes,2000)}};
  }
  // Callback window check, always evaluated in IST (UTC+5:30, no DST).
  function validCallback(b){
    const s=settings();
    if(!str(b.customerName)&&!str(b.customerId))return'Select a customer or enter a name.';
    if(!str(b.reason))return'Reason is required.';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date||'')||!/^\d{2}:\d{2}$/.test(b.time||''))return'Date (YYYY-MM-DD) and time (HH:MM) are required.';
    const when=new Date(`${b.date}T${b.time}:00+05:30`);
    if(isNaN(when))return'Invalid date or time.';
    if(new Date(when.getTime()+19800000).toISOString().slice(0,10)!==b.date)return'Invalid date.';
    const [h,m]=b.time.split(':').map(Number);
    if(h>23||m>59)return'Invalid time.';
    if(h<s.callbackStartHour||h>=s.callbackEndHour)return`Callbacks are only available between ${s.callbackStartHour}:00 and ${s.callbackEndHour}:00 IST.`;
    if(when.getTime()<=Date.now())return'Callback must be in the future.';
    return{when};
  }
  async function ollama(p,init){
    const s=settings(),ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),init?.timeout||60000);
    try{const r=await (opts.fetch||fetch)(s.ollamaUrl+p,{...init,signal:ctl.signal});return r;}finally{clearTimeout(t);}
  }
  async function aiStatus(){
    const s=settings();
    try{
      const r=await ollama('/api/tags',{timeout:3000});
      if(!r.ok)return{online:false,modelReady:false,model:s.model,message:`Ollama replied ${r.status}.`};
      const j=await r.json();const ok=(j.models||[]).some(m=>m.name===s.model||m.name===s.model+':latest');
      return{online:true,modelReady:ok,model:s.model,message:ok?'Ready.':`Model missing. Run: ollama pull ${s.model}`};
    }catch{return{online:false,modelReady:false,model:s.model,message:'Ollama is not reachable. Start the Ollama app or run: ollama serve'};}
  }
  const toCsv=rows=>{const cols=['name','phone','email','product','status','notes','createdAt'];
    const esc=v=>{v=String(v??'');if(/^[=+\-@]/.test(v))v="'"+v;return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;};
    return [cols.join(','),...rows.map(r=>cols.map(c=>esc(r[c])).join(','))].join('\n');};

  const routes=[];
  const R=(m,p,h)=>routes.push({m,re:new RegExp('^'+p.replace(/:id/,'([\\w-]+)')+'$'),h});
  R('GET','/api/health',async()=>({body:{ok:true,server:'online',version:'0.5.0-agent',ai:await aiStatus(),providers:providerStatus()}}));
  R('GET','/api/providers/status',async()=>({body:providerStatus()}));
  R('GET','/api/ai/status',async()=>({body:await aiStatus()}));
  R('GET','/api/settings',async()=>({body:settings()}));
  R('PUT','/api/settings',async({body})=>{const s=settings(),n={...s};
    for(const k of ['businessName','website','ollamaUrl','model'])if(body[k]!==undefined)n[k]=str(body[k]);
    for(const k of ['callbackStartHour','callbackEndHour']){if(body[k]!==undefined){const v=+body[k];if(!Number.isInteger(v)||v<0||v>24)return{status:400,body:{error:k+' invalid'}};n[k]=v;}}
    if(n.callbackStartHour>=n.callbackEndHour)return{status:400,body:{error:'Start hour must be before end hour.'}};
    if(body.notifications!==undefined)n.notifications=!!body.notifications;
    save('settings',n);return{body:n};});
  R('GET','/api/products',async()=>({body:load('products',DEFAULT_PRODUCTS)}));
  R('PUT','/api/products/:id',async({body,params})=>{const ps=load('products',DEFAULT_PRODUCTS),p=ps.find(x=>x.id===params[0]);
    if(!p)return{status:404,body:{error:'Not found'}};
    if(body.price!==undefined){const v=+body.price;if(!(v>=0))return{status:400,body:{error:'Invalid price'}};p.price=v;}
    if(body.name!==undefined)p.name=str(body.name,100);if(body.description!==undefined)p.description=str(body.description,1000);
    if(body.active!==undefined)p.active=!!body.active;if(['fixed','starting'].includes(body.priceType))p.priceType=body.priceType;
    save('products',ps);log('product',`Updated ${p.name}`);return{body:p};});
  R('GET','/api/customers',async()=>({body:load('customers',[])}));
  R('POST','/api/customers',async({body})=>{const v=validCustomer(body);if(v.error)return{status:400,body:{error:v.error}};
    const cs=load('customers',[]);const dup=v.value.email&&cs.find(c=>c.email===v.value.email);
    if(dup)return{status:409,body:{error:'A customer with this email already exists.'}};
    const c={id:crypto.randomUUID(),...v.value,createdAt:new Date().toISOString()};cs.push(c);save('customers',cs);log('customer',`Added ${c.name}`);return{status:201,body:c};});
  R('PUT','/api/customers/:id',async({body,params})=>{const cs=load('customers',[]),i=cs.findIndex(c=>c.id===params[0]);
    if(i<0)return{status:404,body:{error:'Not found'}};const v=validCustomer({...cs[i],...body});if(v.error)return{status:400,body:{error:v.error}};
    cs[i]={...cs[i],...v.value,updatedAt:new Date().toISOString()};save('customers',cs);log('customer',`Updated ${cs[i].name}`);return{body:cs[i]};});
  R('DELETE','/api/customers/:id',async({params,query})=>{if(query.get('confirm')!=='true')return{status:400,body:{error:'Deletion requires confirm=true.'}};
    const cs=load('customers',[]),c=cs.find(x=>x.id===params[0]);if(!c)return{status:404,body:{error:'Not found'}};
    save('customers',cs.filter(x=>x!==c));log('customer',`Deleted ${c.name}`);return{body:{ok:true}};});
  R('GET','/api/customers.csv',async()=>({raw:toCsv(load('customers',[])),type:'text/csv'}));
  R('POST','/api/customers/import',async({body})=>{const lines=str(body.csv,500000).split(/\r?\n/).filter(Boolean);
    if(lines.length<2)return{status:400,body:{error:'CSV needs a header row and data.'}};
    const head=lines[0].split(',').map(h=>h.trim().toLowerCase());if(!head.includes('name'))return{status:400,body:{error:'CSV needs a name column.'}};
    const cs=load('customers',[]);let added=0;const skipped=[];
    lines.slice(1).forEach((l,i)=>{const cells=l.split(',');const o={};head.forEach((h,j)=>o[h]=(cells[j]||'').replace(/^"|"$/g,''));
      const v=validCustomer(o);if(v.error)return skipped.push(`Row ${i+2}: ${v.error}`);
      if(v.value.email&&cs.some(c=>c.email===v.value.email))return skipped.push(`Row ${i+2}: duplicate email`);
      cs.push({id:crypto.randomUUID(),...v.value,createdAt:new Date().toISOString()});added++;});
    save('customers',cs);return{body:{added,skipped}};});
  R('GET','/api/callbacks',async()=>({body:load('callbacks',[])}));
  R('POST','/api/callbacks',async({body})=>{const v=validCallback(body);if(typeof v==='string')return{status:422,body:{error:v}};
    const cb=load('callbacks',[]);const rec={id:crypto.randomUUID(),customerId:str(body.customerId),customerName:str(body.customerName),phone:str(body.phone,20),reason:str(body.reason),notes:str(body.notes,1000),scheduledAt:v.when.toISOString(),status:'scheduled',createdAt:new Date().toISOString()};
    cb.push(rec);save('callbacks',cb);log('callback',`Booked callback with ${rec.customerName||rec.customerId}`);
    let notification={sent:false,reason:'disabled'};
    if(settings().notifications){try{await notify('DR 53 Callback Booked',`A callback with ${rec.customerName||'customer'} is scheduled for ${fmtIST(rec.scheduledAt)} IST.`);notification={sent:true};}catch(e){notification={sent:false,reason:e.message};}}
    return{status:201,body:{callback:rec,notification}};});
  R('DELETE','/api/callbacks/:id',async({params,query})=>{if(query.get('confirm')!=='true')return{status:400,body:{error:'Cancellation requires confirm=true.'}};
    const cb=load('callbacks',[]),c=cb.find(x=>x.id===params[0]);if(!c)return{status:404,body:{error:'Not found'}};c.status='cancelled';save('callbacks',cb);return{body:c};});
  R('GET','/api/followups',async()=>({body:load('followups',[])}));
  R('POST','/api/followups',async({body})=>{const title=str(body.title);if(!title)return{status:400,body:{error:'Title is required.'}};
    if(body.due&&isNaN(new Date(body.due)))return{status:400,body:{error:'Invalid due date.'}};
    const f=load('followups',[]);const r={id:crypto.randomUUID(),title,customerId:str(body.customerId),due:body.due||null,priority:['low','medium','high'].includes(body.priority)?body.priority:'medium',notes:str(body.notes,1000),done:false,createdAt:new Date().toISOString()};
    f.push(r);save('followups',f);return{status:201,body:r};});
  R('POST','/api/followups/:id/complete',async({params})=>{const f=load('followups',[]),r=f.find(x=>x.id===params[0]);if(!r)return{status:404,body:{error:'Not found'}};r.done=true;r.completedAt=new Date().toISOString();save('followups',f);return{body:r};});
  R('GET','/api/ai-calls',async()=>({body:load('ai_calls',[])}));
  R('POST','/api/ai-calls',async({body})=>{
    const phone=cleanPhone(body.phone);
    if(!phone)return{status:400,body:{error:'Enter a valid number in international format (for example +919876543210) or a 10-digit Indian mobile number.'}};
    if(body.consentConfirmed!==true)return{status:400,body:{error:'Confirm that this customer has agreed to be contacted about an existing enquiry or opted-in follow-up.'}};
    const cfg=providerStatus();if(!cfg.voiceCallReady)return{status:503,body:{error:'AI calling is not configured yet. Add these values to .env and restart the app: '+cfg.voiceMissing.join(', ')+'. See SETUP.md.'}};
    const customerName=str(body.customerName,100)||'there',purpose=str(body.purpose,300)||'follow up on a customer enquiry',productInterest=str(body.productInterest,150)||'their enquiry';
    const catalogue=load('products',DEFAULT_PRODUCTS).filter(p=>p.active).map(p=>`${p.name}: ₹${p.price}${p.priceType==='starting'?' starting price':''}. ${p.description}`).join('\n');
    const rec={id:crypto.randomUUID(),customerId:str(body.customerId),customerName,phone,purpose,productInterest,status:'starting',provider:'ElevenLabs',conversationId:'',callSid:'',error:'',consentConfirmed:true,createdAt:new Date().toISOString()};
    try{
      const response=await providerFetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call',{method:'POST',headers:{'Content-Type':'application/json','xi-api-key':env.ELEVENLABS_API_KEY},signal:AbortSignal.timeout(30000),body:JSON.stringify({agent_id:env.ELEVENLABS_AGENT_ID,agent_phone_number_id:env.ELEVENLABS_AGENT_PHONE_NUMBER_ID,to_number:phone,conversation_initiation_client_data:{dynamic_variables:{customer_name:customerName,call_purpose:purpose,product_interest:productInterest,product_catalog:catalogue,business_name:settings().businessName,business_website:settings().website}}})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||result.success===false){rec.status='failed';rec.error=`ElevenLabs returned HTTP ${response.status}: ${str(result.detail||result.message||result.error||'Request was rejected.',350)}`;}
      else{rec.status='initiated';rec.conversationId=str(result.conversation_id,150);rec.callSid=str(result.callSid,150);}
    }catch(e){rec.status='failed';rec.error=e.name==='TimeoutError'?'The voice provider request timed out. Check provider status and call history before retrying.':`Could not reach ElevenLabs: ${str(e.message,250)}`;}
    const rows=load('ai_calls',[]);rows.unshift(rec);save('ai_calls',rows.slice(0,500));
    log('ai_call',rec.status==='initiated'?`AI call accepted for ${customerName} (${phone})`:`AI call failed for ${customerName} (${phone}): ${rec.error}`);
    return{status:rec.status==='initiated'?201:502,body:{call:rec,message:rec.status==='initiated'?'ElevenLabs accepted the outbound call request. The phone may ring shortly; check your provider call history for the final outcome.':rec.error}};
  });
  R('GET','/api/messages',async()=>({body:load('messages',[])}));
  R('POST','/api/messages/send',async({body})=>{
    const channel=body.channel==='whatsapp'?'whatsapp':body.channel==='sms'?'sms':'';
    if(!channel)return{status:400,body:{error:'Choose SMS or WhatsApp.'}};
    const phone=cleanPhone(body.phone);if(!phone)return{status:400,body:{error:'Enter a valid number in international format (for example +919876543210) or a 10-digit Indian mobile number.'}};
    if(body.consentConfirmed!==true)return{status:400,body:{error:'Confirm that this customer has agreed to receive this message.'}};
    const message=str(body.message,1600);if(!message)return{status:400,body:{error:'Write a message before sending.'}};
    const cfg=providerStatus(),ready=channel==='sms'?cfg.smsReady:cfg.whatsappReady;
    if(!ready){const missing=channel==='sms'?cfg.smsMissing:cfg.whatsappMissing;return{status:503,body:{error:`${channel==='sms'?'SMS':'WhatsApp'} is not configured yet. Add these values to .env and restart the app: ${missing.join(', ')}. See SETUP.md.`}};}
    const sid=env.TWILIO_ACCOUNT_SID,record={id:crypto.randomUUID(),customerId:str(body.customerId),customerName:str(body.customerName,100),phone,channel,message,status:'sending',provider:'Twilio',providerSid:'',providerStatus:'',error:'',consentConfirmed:true,createdAt:new Date().toISOString()};
    try{
      const params=new URLSearchParams();params.set('To',channel==='whatsapp'?'whatsapp:'+phone:phone);params.set('Body',message);
      if(channel==='whatsapp'){let from=str(env.TWILIO_WHATSAPP_FROM,60);if(!from.startsWith('whatsapp:'))from='whatsapp:'+from;params.set('From',from);}
      else if(env.TWILIO_MESSAGING_SERVICE_SID)params.set('MessagingServiceSid',env.TWILIO_MESSAGING_SERVICE_SID);else params.set('From',str(env.TWILIO_FROM_NUMBER,40));
      const auth=Buffer.from(`${sid}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const response=await providerFetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,{method:'POST',headers:{'Authorization':`Basic ${auth}`,'Content-Type':'application/x-www-form-urlencoded'},body:params.toString(),signal:AbortSignal.timeout(30000)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok){record.status='failed';record.error=`Twilio returned HTTP ${response.status}: ${str(result.message||result.error_message||'Message was rejected.',350)}`;}
      else{record.status='accepted';record.providerSid=str(result.sid,150);record.providerStatus=str(result.status,50);}
    }catch(e){record.status='failed';record.error=e.name==='TimeoutError'?'The messaging provider request timed out. Check Twilio message logs before retrying.':`Could not reach Twilio: ${str(e.message,250)}`;}
    const rows=load('messages',[]);rows.unshift(record);save('messages',rows.slice(0,1000));
    log('message',record.status==='accepted'?`${channel==='sms'?'SMS':'WhatsApp'} accepted for ${record.customerName||phone}`:`${channel==='sms'?'SMS':'WhatsApp'} failed for ${record.customerName||phone}: ${record.error}`);
    return{status:record.status==='accepted'?201:502,body:{messageRecord:record,message:record.status==='accepted'?`Twilio accepted the ${channel==='sms'?'SMS':'WhatsApp'} message (provider status: ${record.providerStatus||'accepted'}). Delivery is not guaranteed.`:record.error}};
  });
  R('POST','/api/native/open-messages',async()=>{
    if(process.platform!=='darwin')return{status:501,body:{error:'Opening the Mac Messages app is only available on macOS.'}};
    return await new Promise(resolve=>execFile('open',['-a','Messages'],error=>{
      if(error)return resolve({status:502,body:{error:'Could not open Messages. Open it manually from Applications.'}});
      resolve({body:{opened:true,message:'Messages opened on this Mac.'}});
    }));
  });
  R('GET','/api/calls',async()=>({body:load('calls',[])}));
  R('POST','/api/calls/dial',async({body})=>{
    const num=str(body.phone,25).replace(/[\s()-]/g,'');
    if(!/^\+?\d{8,15}$/.test(num))return{status:400,body:{error:'Enter a valid phone number, e.g. +919876543210.'}};
    const rec={id:crypto.randomUUID(),customerId:str(body.customerId),customerName:str(body.customerName,100),phone:num,purpose:str(body.purpose,200),notes:'',outcome:'',createdAt:new Date().toISOString()};
    try{await dial(num);rec.status='dial_opened';}catch(e){rec.status='dial_failed';rec.error=e.message;}
    const c=load('calls',[]);c.unshift(rec);save('calls',c);log('call',`${rec.status==='dial_opened'?'Opened dialer for':'Dialer failed for'} ${rec.customerName||rec.phone}`);
    return{status:rec.status==='dial_opened'?201:502,body:{call:rec,message:rec.status==='dial_opened'?'Dialer opened on this Mac. Confirm the call in FaceTime / Phone.':'Could not open the dialer: '+rec.error}};});
  R('PUT','/api/calls/:id',async({body,params})=>{const c=load('calls',[]),r=c.find(x=>x.id===params[0]);if(!r)return{status:404,body:{error:'Not found'}};
    if(body.outcome!==undefined){if(!['','answered','no_answer','busy','callback_requested','not_interested','wrong_number'].includes(body.outcome))return{status:400,body:{error:'Invalid outcome'}};r.outcome=body.outcome;}
    if(body.notes!==undefined)r.notes=str(body.notes,2000);save('calls',c);return{body:r};});
  R('GET','/api/activity',async()=>({body:load('activity',[])}));
  R('GET','/api/dashboard',async()=>{const cs=load('customers',[]),cb=load('callbacks',[]),fu=load('followups',[]);const by={};cs.forEach(c=>by[c.status]=(by[c.status]||0)+1);
    return{body:{totalLeads:cs.length,converted:by.Converted||0,callbacksScheduled:cb.filter(c=>c.status==='scheduled'&&new Date(c.scheduledAt)>new Date()).length,openTasks:fu.filter(f=>!f.done).length,byStatus:by,newEnquiries:by.New||0,totalCalls:load('calls',[]).length+load('ai_calls',[]).length}};});
  let lastChat=0;
  R('POST','/api/chat',async({body})=>{
    if(Date.now()-lastChat<350)return{status:429,body:{error:'Please wait a moment between messages.'}};lastChat=Date.now();
    const msgs=Array.isArray(body.messages)?body.messages.slice(-20).filter(m=>['user','assistant'].includes(m.role)&&typeof m.content==='string').map(m=>({role:m.role,content:m.content.slice(0,4000)})):[];
    if(!msgs.length)return{status:400,body:{error:'Type a message first.'}};
    const cat=load('products',DEFAULT_PRODUCTS).filter(p=>p.active).map(p=>`- ${p.name}: ₹${p.price}${p.priceType==='starting'?' (starting price)':''}. ${p.description}`).join('\n');
    const st=await aiStatus();
    if(!st.online||!st.modelReady)return{body:{reply:offlineAgentReply(msgs,load('products',DEFAULT_PRODUCTS)),mode:'offline-fallback',notice:st.message}};
    const s=settings();
    try{
      const r=await ollama('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},timeout:120000,body:JSON.stringify({model:s.model,stream:false,messages:[{role:'system',content:`${SYSTEM_PROMPT}\nYou are also a practical desktop sales agent. If asked to do an action you cannot perform, say exactly what you can do and never claim it was done. For live voice replies, use 1–2 short spoken sentences, no markdown, and ask one question at a time. Acknowledge any request to stop or opt out immediately.\nCallback window: ${s.callbackStartHour}:00-${s.callbackEndHour}:00 IST.\nProduct catalogue:\n${cat}`},...msgs]})});
      if(!r.ok)return{body:{reply:offlineAgentReply(msgs,load('products',DEFAULT_PRODUCTS)),mode:'offline-fallback',notice:`Ollama returned ${r.status}; used the local fallback.`}};
      const j=await r.json();const reply=j.message?.content||'';
      return{body:{reply:reply||offlineAgentReply(msgs,load('products',DEFAULT_PRODUCTS)),mode:reply?'ollama':'offline-fallback'}};
    }catch(e){return{body:{reply:offlineAgentReply(msgs,load('products',DEFAULT_PRODUCTS)),mode:'offline-fallback',notice:e.name==='AbortError'?'Ollama timed out; used the local fallback.':'Ollama could not be reached; used the local fallback.'}};}
  });

  const PUB=path.join(__dirname,'public');
  const server=http.createServer(async(req,res)=>{
    const send=(s,b,t='application/json')=>{res.writeHead(s,{'Content-Type':t+'; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end(typeof b==='string'||Buffer.isBuffer(b)?b:JSON.stringify(b));};
    try{
      const u=new URL(req.url,'http://x');
      const host=(req.headers.host||'').split(':')[0];
      if(!['127.0.0.1','localhost'].includes(host))return send(403,{error:'Forbidden host.'});
      if(!u.pathname.startsWith('/api/')){
        const rel=u.pathname==='/'?'index.html':u.pathname.slice(1);const f=path.normalize(path.join(PUB,rel));
        if(!f.startsWith(PUB+path.sep)||!fs.existsSync(f))return send(404,'Not found','text/plain');
        const t={'.html':'text/html','.css':'text/css','.js':'text/javascript'}[path.extname(f)]||'application/octet-stream';
        return send(200,fs.readFileSync(f),t);}
      if(req.method!=='GET'&&req.headers['x-dr53']!=='1')return send(403,{error:'Missing CSRF header.'});
      let raw='';for await(const c of req){raw+=c;if(raw.length>600000)return send(413,{error:'Request too large.'});}
      let body={};if(raw){try{body=JSON.parse(raw);}catch{return send(400,{error:'Malformed JSON.'});}}
      for(const r of routes){if(r.m!==req.method)continue;const m=u.pathname.match(r.re);if(!m)continue;
        const out=await r.h({body,params:m.slice(1),query:u.searchParams});
        return out.raw!==undefined?send(200,out.raw,out.type):send(out.status||200,out.body);}
      send(404,{error:'Not found'});
    }catch(e){send(500,{error:'Internal error.'});}
  });
  return server;
}
function defaultNotify(title,msg){return new Promise((ok,no)=>{
  if(process.platform!=='darwin')return no(new Error('macOS notifications unavailable on this system.'));
  execFile('osascript',['-e','on run argv\ndisplay notification (item 1 of argv) with title (item 2 of argv)\nend run',msg,title],e=>e?no(e):ok());});}
function defaultDial(num){return new Promise((ok,no)=>{
  if(process.platform!=='darwin')return no(new Error('Dialing needs macOS with FaceTime / iPhone calling.'));
  execFile('open',['tel:'+num],e=>e?no(e):ok());});}
module.exports={createApp};
if(require.main===module){createApp(path.join(__dirname,'data')).listen(PORT,HOST,()=>console.log(`DR53 Command Centre: http://${HOST}:${PORT}`));}
