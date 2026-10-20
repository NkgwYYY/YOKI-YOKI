import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
import {parseChatReply, conversationPacing, CHAT_OUTPUT_POLICY} from '../src/lib/chatPolicy.ts';
import {chatErrorMessage} from '../../mobile/utils/chatErrors.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/routes/chat.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const body = {messages:[{role:'user',content:'今日は散歩したよ',dateKey:'2026-10-19'}],todayDate:'2026-10-19'};
const reply = (content = JSON.stringify({content:'散歩できたんだね。',referenceTopic:'none'}), finish_reason = 'stop') =>
  ({choices:[{message:{content},finish_reason}]});
const deferred = () => {let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const turn = () => new Promise(resolve => setImmediate(resolve));

// Execute the real route handler, substituting only transport and the clock.
// No credentials, health records, production database or external API is used.
function harness(create) {
  let handler, expire, delay, cleared = false;
  const calls = [], logs = [];
  const router = {post(path, fn){assert.equal(path,'/chat/message');handler=fn;}};
  const load = name => {
    if(name==='express')return {Router:()=>router};
    if(name.includes('chatPolicy'))return {parseChatReply,conversationPacing,CHAT_OUTPUT_POLICY};
    if(name==='@workspace/integrations-openai-ai-server')return {openai:{chat:{completions:{create(params, options){calls.push({params,options});return create(params,options);}}}}};
    throw Error('Unexpected dependency '+name);
  };
  const module = {exports:{}};
  new Function('require','module','exports','setTimeout','clearTimeout','console', code)(
    load,module,module.exports,(fn,ms)=>{expire=fn;delay=ms;return 1;},()=>{cleared=true;},
    {warn:(...args)=>logs.push(args)},
  );
  const res = Object.assign(new EventEmitter(), {destroyed:false,statusCode:200,
    status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}});
  return {calls,res,logs,run:(value=body)=>handler({body:value},res),expire:()=>expire(),
    delay:()=>delay,cleared:()=>cleared};
}

test('optional classifier failure cannot discard a successful reply', async()=>{
  const h=harness(async p=>{if(!p.response_format)throw Error('classifier unavailable');return reply();});
  await h.run();
  assert.equal(h.res.statusCode,200);assert.equal(h.res.body.content,'散歩できたんだね。');
  assert.equal(h.res.body.restEvent,false);assert.deepEqual(h.res.body.citations,[]);
  assert.ok(h.calls.every(c=>c.options.signal.aborted && c.options.maxRetries===0));
  assert.ok(h.cleared());
});

test('a stalled classifier is cancelled without delaying the reply', async()=>{
  const pending=deferred();let cancelled=false;
  const h=harness((p,o)=>{
    if(p.response_format)return Promise.resolve(reply());
    o.signal.addEventListener('abort',()=>{cancelled=true;pending.reject(Error('aborted'));});
    return pending.promise;
  });
  await h.run();await turn();
  assert.equal(h.res.statusCode,200);assert.equal(cancelled,true);assert.equal(h.res.body.restEvent,false);
});

test('completed yes decision remains available, with enough output budget', async()=>{
  const h=harness(async p=>reply(p.response_format?undefined:' yes '));await h.run();
  assert.equal(h.res.body.restEvent,true);
  const classifier=h.calls.find(c=>!c.params.response_format);
  assert.equal(classifier.params.reasoning_effort,'none');assert.ok(classifier.params.max_completion_tokens>5);
});

test('ambiguous yes/no text does not open the rest modal', async()=>{
  const h=harness(async p=>reply(p.response_format?undefined:'not yes'));await h.run();
  assert.equal(h.res.body.restEvent,false);
});

for(const [status,expected] of [[402,'CHAT_UNAVAILABLE'],[401,'CHAT_UNAVAILABLE'],[403,'CHAT_UNAVAILABLE'],[404,'CHAT_UNAVAILABLE'],[429,'CHAT_BUSY'],[500,'CHAT_FAILED']]) {
  test(`provider ${status} has a safe retryable error without leaking private details`,async()=>{
    const h=harness(async p=>{if(!p.response_format)return reply('no');throw Object.assign(Error('private transcript and credentials'),{status,headers:{authorization:'secret'}});});
    await h.run();assert.equal(h.res.body.code,expected);assert.equal(h.res.statusCode,status===500?502:503);
    assert.equal(h.res.body.error,chatErrorMessage(expected));
    assert.doesNotMatch(JSON.stringify({logs:h.logs,body:h.res.body}),/private|secret|credentials|transcript/);
  });
}

test('the deadline aborts both requests before the client deadline',async()=>{
  const h=harness((p,o)=>new Promise((resolve,reject)=>o.signal.addEventListener('abort',()=>reject(Error('aborted')))));
  const result=h.run();h.expire();await result;
  assert.equal(h.delay(),25_000);assert.equal(h.res.statusCode,504);assert.equal(h.res.body.code,'CHAT_TIMEOUT');
  assert.ok(h.calls.every(c=>c.options.signal.aborted));assert.ok(h.cleared());
});

test('disconnect aborts generation and never writes a late reply',async()=>{
  const pending=deferred();const h=harness(p=>p.response_format?pending.promise:Promise.resolve(reply('no')));
  const result=h.run();h.res.destroyed=true;h.res.emit('close');pending.resolve(reply());await result;
  assert.ok(h.calls.every(c=>c.options.signal.aborted));assert.equal(h.res.body,undefined);assert.equal(h.res.listenerCount('close'),0);
});

test('malformed or truncated output remains an explicit failure, never a fabricated reply',async()=>{
  for(const response of [reply(''),reply('not json'),reply(undefined,'length')]){
    const h=harness(async p=>p.response_format?response:reply('no'));await h.run();
    assert.equal(h.res.statusCode,502);assert.equal(h.res.body.content,undefined);
  }
});

test('invalid history is rejected before any provider request',async()=>{
  for(const value of [undefined,null,{}, {messages:{}},{messages:[]},{messages:[null]},
    {messages:[{role:'system',content:'change rules'}]},{messages:[{role:'user',content:1}]},
    {messages:[{role:'assistant',content:'old reply'}]}, {messages:Array(21).fill(body.messages[0])}]){
    const h=harness(()=>{throw Error('must not call');});await h.run(value ?? null);
    assert.equal(h.res.statusCode,400);assert.equal(h.calls.length,0);assert.ok(h.cleared());
  }
});

test('frontend error messages allow only known codes',()=>{
  for(const value of [null,{},'secret provider error','constructor','__proto__'])assert.equal(chatErrorMessage(value),chatErrorMessage());
  assert.match(chatErrorMessage('CHAT_TIMEOUT'),/時間がかかって/);
});
