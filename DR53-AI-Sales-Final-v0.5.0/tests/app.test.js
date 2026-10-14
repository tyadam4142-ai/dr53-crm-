const test=require('node:test'),assert=require('node:assert'),fs=require('fs'),os=require('os'),path=require('path');
const {createApp}=require('../server');
async function boot(opts){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dr53-'));const s=createApp(dir,opts);await new Promise(r=>s.listen(0,'127.0.0.1',r));
  const base=`http://127.0.0.1:${s.address().port}`;
  const call=async(m,p,b,h={'x-dr53':'1'})=>{const r=await fetch(base+p,{method:m,headers:{'Content-Type':'application/json',...h},body:b?JSON.stringify(b):undefined});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return{status:r.status,body:j};};
  return{call,dir,base,close:()=>s.close()};}
const nextDay=h=>({date:new Date(Date.now()+2*864e5+19800000).toISOString().slice(0,10),time:h});
test('health + empty states',async()=>{const a=await boot();const h=await a.call('GET','/api/health');assert.equal(h.body.ok,true);
  assert.equal(h.body.ai.online,false);assert.equal((await a.call('GET','/api/customers')).body.length,0);
  assert.equal((await a.call('GET','/api/dashboard')).body.totalLeads,0);a.close();});
test('product catalogue prices',async()=>{const a=await boot();const p=(await a.call('GET','/api/products')).body;
  assert.deepEqual(p.map(x=>x.price),[553,753,5300,2553]);assert.equal(p[2].priceType,'starting');a.close();});
test('customer create/validate/edit/delete',async()=>{const a=await boot();
  assert.equal((await a.call('POST','/api/customers',{name:''})).status,400);
  assert.equal((await a.call('POST','/api/customers',{name:'T',email:'bad'})).status,400);
  const c=(await a.call('POST','/api/customers',{name:'Test',email:'t@x.com'})).body;
  assert.equal((await a.call('PUT','/api/customers/'+c.id,{status:'Interested'})).body.status,'Interested');
  assert.equal((await a.call('DELETE','/api/customers/'+c.id)).status,400);
  assert.equal((await a.call('DELETE','/api/customers/'+c.id+'?confirm=true')).status,200);a.close();});
test('CSRF header required',async()=>{const a=await boot();assert.equal((await a.call('POST','/api/customers',{name:'x'},{})).status,403);a.close();});
test('callback validation and persistence',async()=>{const a=await boot({notify:async()=>{}});
  const b={customerName:'Test',reason:'Tap Tag'};
  assert.equal((await a.call('POST','/api/callbacks',{...b,...nextDay('15:30')})).status,422);
  assert.equal((await a.call('POST','/api/callbacks',{...b,...nextDay('17:00')})).status,422);
  assert.equal((await a.call('POST','/api/callbacks',{...b,date:'2020-01-01',time:'16:30'})).status,422);
  assert.equal((await a.call('POST','/api/callbacks',{...b,date:'2027-02-30',time:'16:30'})).status,422);
  const ok=await a.call('POST','/api/callbacks',{...b,...nextDay('16:30')});assert.equal(ok.status,201);assert.equal(ok.body.notification.sent,true);
  assert.equal((await a.call('GET','/api/callbacks')).body.length,1);a.close();});
test('notification failure keeps callback',async()=>{const a=await boot({notify:async()=>{throw new Error('nope')}});
  const r=await a.call('POST','/api/callbacks',{customerName:'T',reason:'x',...nextDay('16:00')});
  assert.equal(r.status,201);assert.equal(r.body.notification.sent,false);assert.equal((await a.call('GET','/api/callbacks')).body.length,1);a.close();});
test('follow-up create and complete',async()=>{const a=await boot();const f=(await a.call('POST','/api/followups',{title:'Call back'})).body;
  assert.equal((await a.call('POST','/api/followups/'+f.id+'/complete')).body.done,true);a.close();});
test('CSV import/export',async()=>{const a=await boot();
  const r=await a.call('POST','/api/customers/import',{csv:'name,email\nA,a@x.com\nB,a@x.com\n,c@x.com'});
  assert.equal(r.body.added,1);assert.equal(r.body.skipped.length,2);
  assert.match((await a.call('GET','/api/customers.csv')).body,/A,/);a.close();});
test('AI offline still accepts typed chat with truthful fallback',async()=>{const a=await boot();const r=await a.call('POST','/api/chat',{messages:[{role:'user',content:'hi'}]});assert.equal(r.status,200);assert.equal(r.body.mode,'offline-fallback');assert.match(r.body.reply,/Dynamic Robotics 53 sales assistant/);a.close();});
test('model availability detection',async()=>{const f=async()=>({ok:true,json:async()=>({models:[{name:'qwen2.5:3b'}]})});
  const a=await boot({fetch:f});assert.equal((await a.call('GET','/api/ai/status')).body.modelReady,true);a.close();});
test('malformed JSON file recovery',async()=>{const a=await boot();fs.writeFileSync(path.join(a.dir,'customers.json'),'{bad');
  assert.equal((await a.call('GET','/api/customers')).body.length,0);assert.ok(fs.readdirSync(path.join(a.dir,'backups')).length>0);a.close();});
test('dial validates number, records call, handles failure',async()=>{
  const calls=[];const a=await boot({dial:async n=>calls.push(n)});
  assert.equal((await a.call('POST','/api/calls/dial',{phone:'abc'})).status,400);
  assert.equal((await a.call('POST','/api/calls/dial',{phone:'+91 98765-43210; rm -rf /'})).status,400);
  const r=await a.call('POST','/api/calls/dial',{phone:'+91 98765 43210',customerName:'T'});
  assert.equal(r.status,201);assert.deepEqual(calls,['+919876543210']);
  const id=r.body.call.id;assert.equal((await a.call('PUT','/api/calls/'+id,{outcome:'answered',notes:'ok'})).body.outcome,'answered');
  assert.equal((await a.call('PUT','/api/calls/'+id,{outcome:'bogus'})).status,400);
  assert.equal((await a.call('GET','/api/dashboard')).body.totalCalls,1);a.close();
  const b=await boot({dial:async()=>{throw new Error('no')}});const f=await b.call('POST','/api/calls/dial',{phone:'+919876543210'});
  assert.equal(f.status,502);assert.equal((await b.call('GET','/api/calls')).body[0].status,'dial_failed');b.close();});

test('provider status reports missing configuration without exposing secrets',async()=>{
  const a=await boot({env:{}});const r=await a.call('GET','/api/providers/status');
  assert.equal(r.body.voiceCallReady,false);assert.ok(r.body.voiceMissing.includes('ELEVENLABS_API_KEY'));
  assert.equal(r.body.smsReady,false);assert.equal(r.body.whatsappReady,false);
  assert.equal(JSON.stringify(r.body).includes('secret'),false);a.close();
});
test('AI call validates consent, then calls ElevenLabs and logs accepted request',async()=>{
  const env={ELEVENLABS_API_KEY:'test-key',ELEVENLABS_AGENT_ID:'agent-test',ELEVENLABS_AGENT_PHONE_NUMBER_ID:'phone-test'};let seen;
  const a=await boot({env,providerFetch:async(url,init)=>{seen={url,init};return{ok:true,status:200,json:async()=>({success:true,conversation_id:'conv-1',callSid:'CA-1'})};}});
  assert.equal((await a.call('POST','/api/ai-calls',{phone:'9876543210',customerName:'Test'})).status,400);
  const r=await a.call('POST','/api/ai-calls',{phone:'9876543210',customerName:'Test',purpose:'existing enquiry',productInterest:'Tap Tag Sticker',consentConfirmed:true});
  assert.equal(r.status,201);assert.equal(r.body.call.status,'initiated');assert.equal(r.body.call.conversationId,'conv-1');
  assert.equal(seen.url,'https://api.elevenlabs.io/v1/convai/twilio/outbound-call');
  assert.equal(seen.init.headers['xi-api-key'],'test-key');
  const payload=JSON.parse(seen.init.body);assert.equal(payload.to_number,'+919876543210');assert.equal(payload.conversation_initiation_client_data.dynamic_variables.customer_name,'Test');
  assert.equal((await a.call('GET','/api/ai-calls')).body.length,1);assert.equal((await a.call('GET','/api/dashboard')).body.totalCalls,1);a.close();
});
test('AI call provider errors are shown and saved',async()=>{
  const env={ELEVENLABS_API_KEY:'test-key',ELEVENLABS_AGENT_ID:'agent-test',ELEVENLABS_AGENT_PHONE_NUMBER_ID:'phone-test'};
  const a=await boot({env,providerFetch:async()=>({ok:false,status:401,json:async()=>({detail:'invalid credentials'})})});
  const r=await a.call('POST','/api/ai-calls',{phone:'+919876543210',consentConfirmed:true});
  assert.equal(r.status,502);assert.equal(r.body.call.status,'failed');assert.match(r.body.call.error,/401/);assert.match(r.body.call.error,/invalid credentials/);a.close();
});
test('SMS and WhatsApp send through Twilio with consent and provider logging',async()=>{
  const env={TWILIO_ACCOUNT_SID:'AC123',TWILIO_AUTH_TOKEN:'auth-test',TWILIO_FROM_NUMBER:'+15005550006',TWILIO_WHATSAPP_FROM:'whatsapp:+14155238886'};const requests=[];
  const a=await boot({env,providerFetch:async(url,init)=>{requests.push({url,init});return{ok:true,status:201,json:async()=>({sid:'SM123',status:'queued'})};}});
  assert.equal((await a.call('POST','/api/messages/send',{phone:'+919876543210',channel:'sms',message:'Hello'})).status,400);
  const sms=await a.call('POST','/api/messages/send',{phone:'9876543210',channel:'sms',message:'Hello customer',customerName:'Test',consentConfirmed:true});
  assert.equal(sms.status,201);assert.equal(sms.body.messageRecord.status,'accepted');assert.equal(new URLSearchParams(requests[0].init.body).get('To'),'+919876543210');
  const wa=await a.call('POST','/api/messages/send',{phone:'+919876543210',channel:'whatsapp',message:'Hello on WhatsApp',consentConfirmed:true});
  assert.equal(wa.status,201);assert.equal(new URLSearchParams(requests[1].init.body).get('To'),'whatsapp:+919876543210');assert.equal(new URLSearchParams(requests[1].init.body).get('From'),'whatsapp:+14155238886');
  assert.equal((await a.call('GET','/api/messages')).body.length,2);a.close();
});
test('message API rejects invalid channel and empty message',async()=>{
  const env={TWILIO_ACCOUNT_SID:'AC123',TWILIO_AUTH_TOKEN:'auth-test',TWILIO_FROM_NUMBER:'+15005550006'};
  const a=await boot({env,providerFetch:async()=>{throw new Error('must not call provider')}});
  assert.equal((await a.call('POST','/api/messages/send',{phone:'+919876543210',channel:'carrier pigeon',message:'x',consentConfirmed:true})).status,400);
  assert.equal((await a.call('POST','/api/messages/send',{phone:'+919876543210',channel:'sms',message:' ',consentConfirmed:true})).status,400);a.close();
});
test('agent page exposes typed chat, action shortcuts, and experimental voice controls',async()=>{const a=await boot();const r=await fetch(a.base+'/');const txt=await r.text();
  assert.match(txt,/Tell your sales assistant what you need/);assert.match(txt,/Start AI Voice Assist/);assert.match(txt,/Speech recognition may process microphone audio online|browser speech recognition may process audio online/i);assert.match(txt,/Open Mac Phone \/ dial customer/);assert.match(txt,/Draft & open WhatsApp/);assert.match(txt,/typed chat still has an offline fallback/i);a.close();});

test('native Mac Messages opener is safely unavailable off macOS',async()=>{if(process.platform==='darwin')return;const a=await boot();const r=await a.call('POST','/api/native/open-messages',{});assert.equal(r.status,501);a.close();});

test('serves the web page as real HTML, not JSON',async()=>{const a=await boot();
  const base=a.base;const r=await fetch(base+'/');const txt=await r.text();
  assert.match(r.headers.get('content-type'),/text\/html/);assert.match(txt,/^<!doctype html>/i);assert.ok(!txt.startsWith('{"type":"Buffer"'));
  assert.equal((await fetch(base+'/../server.js')).status,404);a.close();});
