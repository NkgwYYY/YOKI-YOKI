import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { japanDay, safeHome, activeEntitlement, validReceipt } from '../src/community/policy.ts';
import { checkSsvSignature, parseSsv } from '../src/community/ssv.ts';
test('daily quota changes at midnight in Japan, independent of device timezone',()=>{
 assert.equal(japanDay(Date.parse('2026-10-15T14:59:59Z')),'2026-10-15');
 assert.equal(japanDay(Date.parse('2026-10-15T15:00:00Z')),'2026-10-16');
});
test('public room payload discards all health data, names, arbitrary URLs, and unknown stages',()=>{
 assert.deepEqual(safeHome({stage:'stage3',furniture:'sofa',flower:'rainbow',robot:true,mood:1,diary:'private',name:'private',assetUrl:'https://tracking.example'}),{stage:'stage3',furniture:'sofa',flower:'rainbow',robot:true});
 assert.deepEqual(safeHome({stage:'<script>',furniture:'x',flower:'x'}),{stage:'egg',furniture:'none',flower:'none',robot:false});
});
test('pass expiry, cancellation at period end, sandbox exclusion and billing grace',()=>{
 const now=Date.parse('2026-10-15T00:00:00Z');
 const body={subscriber:{entitlements:{bonus:{product_identifier:'monthly',expires_date:'2026-10-16T00:00:00Z'}},subscriptions:{monthly:{is_sandbox:false,unsubscribe_detected_at:'2026-10-14T00:00:00Z'}}}};
 assert.equal(activeEntitlement(body,'bonus',now,false),true);
 body.subscriber.entitlements.bonus.expires_date='2026-10-14T00:00:00Z';assert.equal(activeEntitlement(body,'bonus',now,false),false);
 body.subscriber.entitlements.bonus.grace_period_expires_date='2026-10-16T00:00:00Z';assert.equal(activeEntitlement(body,'bonus',now,false),true);
 body.subscriber.subscriptions.monthly.is_sandbox=true;assert.equal(activeEntitlement(body,'bonus',now,false),false);assert.equal(activeEntitlement(body,'bonus',now,true),true);
 assert.equal(activeEntitlement({},'bonus',now,false),false);
});
// Independent, literal wire/signing strings follow Tink's testShouldVerifyWithEncodedUrl.
test('Google SSV verifies decoded UTF-8 bytes, including the configured Japanese reward',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),pem=publicKey.export({format:'pem',type:'spki'});
 const wire='custom_data=abc%2F123&reward_item=YOKI%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88&transaction_id=transaction-1&user_id=user-1';
 const signed='custom_data=abc/123&reward_item=YOKIポイント&transaction_id=transaction-1&user_id=user-1';
 const suffix='&signature='+sign('sha256',Buffer.from(signed),privateKey).toString('base64url')+'&key_id=12';
 const query=wire+suffix;
 assert.equal(checkSsvSignature(query,pem).get('reward_item'),'YOKIポイント');
 assert.equal(checkSsvSignature(query,pem).get('custom_data'),'abc/123');
 assert.equal(checkSsvSignature(query.replace('abc%2F123','abc/123'),pem).get('custom_data'),'abc/123');
 assert.throws(()=>checkSsvSignature(query.replace('user-1','user-2'),pem));
 assert.throws(()=>checkSsvSignature(query.replace('YOKI','OTHER'),pem));
 const wrong='&signature='+sign('sha256',Buffer.from(wire),privateKey).toString('base64url')+'&key_id=12';
 assert.throws(()=>checkSsvSignature(wire+wrong,pem));
 assert.throws(()=>checkSsvSignature(query.replace('custom_data=abc%2F123&','') .replace('&reward_item=','reward_item='),pem));
 assert.throws(()=>parseSsv('transaction_id=a&transaction_id=b&signature=x&key_id=1'));
 assert.throws(()=>parseSsv(query+'&user_id=user-2'));
});
test('SSV decodes once, preserves plus and spaces, and rejects ambiguous separators',()=>{
 const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),pem=publicKey.export({format:'pem',type:'spki'});
 const wire='custom_data=one%252Ftwo&reward_item=hello%20world%2Bplus+literal&transaction_id=t';
 const signed='custom_data=one%2Ftwo&reward_item=hello world+plus+literal&transaction_id=t';
 const query=wire+'&signature='+sign('sha256',Buffer.from(signed),privateKey).toString('base64url')+'&key_id=12';
 assert.equal(checkSsvSignature(query,pem).get('custom_data'),'one%2Ftwo');
 assert.equal(checkSsvSignature(query,pem).get('reward_item'),'hello world+plus+literal');
 for(const bad of [wire.replace('one%252Ftwo','x%26user_id%3Dfake'),wire.replace('custom_data','%63ustom_data'),wire.replace('one%252Ftwo','%ZZ'),wire.replace('one%252Ftwo','%FF')]) {
  assert.throws(()=>parseSsv(bad+'&signature=x&key_id=12'));
 }
});
test('only explicit workshop and daily placement receipt formats are accepted',()=>{
 assert.equal(validReceipt('egg-1792030000000-abc1234'),true);
 assert.equal(validReceipt('free-money'),false);assert.equal(validReceipt(null),false);
});

test('daily receipt IDs allow only the three placements and a v4 UUID',()=>{
 for(const placement of ['home','street','meal']) assert.equal(validReceipt(`daily-${placement}-12345678-1234-4234-8234-123456789abc`),true);
 for(const id of ['daily-chat-12345678-1234-4234-8234-123456789abc','daily-home-free-money','daily-home-12345678-1234-1234-8234-123456789abc'])assert.equal(validReceipt(id),false);
});
