import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { withDisposableAuthDatabase,createFakeClock,createFakeMail,createFakeProvider } from './fixtures.mjs';
import { runMigrations } from '../../server/repositories/postgres/migrations.js';
import { identityMigrations } from '../../server/repositories/identity/identityMigrations.js';
import { securityAuditMigrations } from '../../server/repositories/audit/securityAuditMigrations.js';
import { identityOperationMigrations } from '../../server/repositories/identity/identityOperationMigrations.js';
import { identityChallengeMigrations } from '../../server/repositories/identity/identityChallengeMigrations.js';
import { identityEmailDeliveryMigrations } from '../../server/repositories/identity/identityEmailDeliveryMigrations.js';
import { identitySessionMigrations } from '../../server/repositories/identity/identitySessionMigrations.js';
import { PostgresIdentityEmailEventRepository } from '../../server/repositories/identity/PostgresIdentityEmailEventRepository.js';
import { PostgresIdentityRepository } from '../../server/repositories/identity/PostgresIdentityRepository.js';
import { PostgresIdentityOperationRepository } from '../../server/repositories/identity/PostgresIdentityOperationRepository.js';
import { PostgresSecurityAuditRepository } from '../../server/repositories/audit/PostgresSecurityAuditRepository.js';
import { AuditService } from '../../server/domain/audit/AuditService.js';
import { IdentityOperationService } from '../../server/domain/identity/IdentityOperationService.js';
import { IdentityDeliveryService } from '../../server/domain/identity/IdentityDeliveryService.js';
import { openDelivery,sealDelivery,fingerprint } from '../../server/domain/identity/identitySecrets.js';

test('prepared Identity operations, transactional Audit and bounded fixture delivery',async t=> {
  await withDisposableAuthDatabase(process.env,async({database,schema})=> {
    const s=`"${schema}"`;
    await runMigrations(database,[...identityMigrations(schema),...securityAuditMigrations(schema),...identityOperationMigrations(schema),...identityChallengeMigrations(schema),...identityEmailDeliveryMigrations(schema),...identitySessionMigrations(schema)],{mode:'apply',schema});
    const clock=createFakeClock(Date.now()),now=()=>new Date(clock.now());
    const repository=new PostgresIdentityOperationRepository({database,schema});
    const identityRepository=new PostgresIdentityRepository({database,schema});
    const ring=()=>({current:1,keys:{1:randomBytes(32)}});
    const fingerprintKeys=ring(),receiptKeys=ring(),deliveryKeys=ring(),recipientKeys=ring();
    const eventRepository=new PostgresIdentityEmailEventRepository({database,schema});
    const mail=createFakeMail();
    const deliveryService=new IdentityDeliveryService({repository,keyring:deliveryKeys,recipientKeys,eventRepository,adapter:mail,clock,fixtureOnly:true});
    const auditService=new AuditService({securityRepository:new PostgresSecurityAuditRepository({schema}),securityFingerprintKey:randomBytes(32),securityFingerprintKeyVersion:1});
    let failAudit=false,failMutation=false,proofDelay=0,handlerDelay=0,auditDelay=0,deliveryLifetime=300000;
    const auditWrapper={async recordSecurityEvent(...args) {
      if(failAudit) throw new Error('Injected audit failure.');
      const result=await auditService.recordSecurityEvent(...args);
      clock.advance(auditDelay);
      return result;
    }};
    const service=new IdentityOperationService({repository,identityRepository,auditService:auditWrapper,deliveryService,fingerprintKeys,receiptKeys,clock,
      verifyProof:async({proof})=> { clock.advance(proofDelay); return proof==='fixture-independent-proof'; },
      handlers:{password_change:async({input,identity})=> {
        await identity.advanceSecurityVersion({accountId:input.accountId,expectedSecurityVersion:input.securityVersion});
        clock.advance(handlerDelay);
        if(failMutation) throw new Error('Injected mutation failure.');
        return {nextAction:'sign_in',accountId:input.accountId,audit:{action:'password_change',targetAccountId:input.accountId,targetFingerprint:'a'.repeat(64)},
          deliveries:[{purpose:'security_notification',proofExpiresAt:new Date(clock.now()+deliveryLifetime),payload:{to:'fixture@example.invalid',kind:'password_changed'}}]};
      },social_login:async({identity,extra})=> {
        await identity.createAccount({id:extra.accountId,status:'active',displayName:'Fixture'});
        return {nextAction:'sign_in',accountId:extra.accountId,audit:{action:'social_login',targetFingerprint:'b'.repeat(64)}};
      }}});
    let seq=0;
    async function fixture({account=true,purpose='reauthentication',action='password_change'}={}) {
      const n=++seq,accountId=account?`account_${n}`:undefined,contextId=`context_${n}`,browserDigest=n.toString(16).padStart(64,'0');
      if(account) await identityRepository.transaction(r=>r.createAccount({id:accountId,status:'active',displayName:'Fixture'}));
      await database.query(`INSERT INTO ${s}.identity_contexts(id,account_id,purpose,digest,key_version,browser_digest,security_version,created_at,expires_at)
        VALUES($1,$2,$3,$4,1,$4,$5,$6,$7)`,[contextId,accountId??null,purpose,browserDigest,account?1:null,now(),new Date(clock.now()+300000)]);
      return {accountId,contextId,browserDigest,securityVersion:account?1:undefined,action,target:accountId??'enrollment',key:`fixture_key_${n.toString().padStart(16,'0')}`,
        payload:{newPassword:'private-fixture-value'},proof:'fixture-independent-proof',peerAddress:'127.0.0.1'};
    }
    const lookup=(input,prepared)=>service.lookup({operationId:prepared.operationId,browserDigest:input.browserDigest,receiptSecret:prepared.receiptSecret});
    const count=async table=>(await database.query(`SELECT count(*)::int AS n FROM ${s}.${table}`)).rows[0].n;
    await t.test('proof expiration during account lock wait cannot prepare an operation',async()=> {
      const i=await fixture();
      let release,locked;
      const gate=new Promise(resolve=> { release=resolve; });
      const ready=new Promise(resolve=> { locked=resolve; });
      const blocker=identityRepository.transaction(async r=> { await r.lockAccount(i.accountId,1); locked(); await gate; });
      await ready;
      const attempt=service.prepare(i);
      // Register rejection immediately while observing the lock wait.
      const rejected=assert.rejects(attempt,{code:'IDENTITY_PROOF_UNAVAILABLE'});
      let waiting=false;
      try {
        for(let n=0;n<50&&!waiting;n++) {
          waiting=(await database.query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE $1) AS waiting`,[`%${schema}%identity_accounts%`])).rows[0].waiting;
          if(!waiting) await new Promise(resolve=>setTimeout(resolve,10));
        }
        assert.equal(waiting,true);
        clock.advance(300001);
      } finally { release(); }
      await blocker; await rejected;
      assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_operations WHERE scope_id=$1`,[i.accountId])).rows[0].n,0);
    });
    await t.test('fresh clock checks proof callback, mutation handler and final write boundaries',async()=> {
      const beforeAudit=await count('audit_security_events'),beforeDelivery=await count('identity_notification_outbox');
      const prepareInput=await fixture();
      proofDelay=300001;
      try { await assert.rejects(service.prepare(prepareInput),{code:'IDENTITY_PROOF_UNAVAILABLE'}); }
      finally { proofDelay=0; }
      for(const boundary of ['proof','handler','audit']) {
        const i=await fixture(),p=await service.prepare(i);
        if(boundary==='proof') proofDelay=300001;
        if(boundary==='handler') handlerDelay=300001;
        if(boundary==='audit') auditDelay=300001;
        try { await assert.rejects(service.commit({...i,operationId:p.operationId})); }
        finally { proofDelay=0; handlerDelay=0; auditDelay=0; }
        assert.equal((await identityRepository.findAccount(i.accountId)).securityVersion,1);
        assert.equal((await database.query(`SELECT status FROM ${s}.identity_operations WHERE id=$1`,[p.operationId])).rows[0].status,'pending');
      }
      assert.equal(await count('audit_security_events'),beforeAudit);
      assert.equal(await count('identity_notification_outbox'),beforeDelivery);
    });
    await t.test('prepared handle survives lost response, receipt replacement is capped and immutable',async()=> {
      const i=await fixture();
      const first=await service.prepare(i),second=await service.prepare(i),third=await service.prepare(i);
      assert.equal(first.operationId,second.operationId); assert.equal(+first.expiresAt,+third.expiresAt);
      await assert.rejects(lookup(i,first),{code:'IDENTITY_RECEIPT_UNAVAILABLE'});
      assert.equal((await lookup(i,third)).status,'pending');
      await assert.rejects(service.prepare(i),{code:'IDENTITY_PREPARATION_UNAVAILABLE'});
      assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_operation_receipts WHERE operation_id=$1`,[first.operationId])).rows[0].n,3);
      await assert.rejects(database.query(`UPDATE ${s}.identity_operation_receipts SET expires_at=expires_at+interval '1 second' WHERE operation_id=$1`,[first.operationId]),{sqlState:'23514'});
    });
    await t.test('concurrent preparations share one operation and preserve one current receipt',async()=> {
      const i=await fixture();
      const prepared=await Promise.all([service.prepare(i),service.prepare(i),service.prepare(i)]);
      assert.equal(new Set(prepared.map(p=>p.operationId)).size,1);
      const reads=await Promise.allSettled(prepared.map(p=>lookup(i,p)));
      assert.equal(reads.filter(r=>r.status==='fulfilled').length,1);
      await assert.rejects(service.prepare({...i,payload:{newPassword:'changed'}}),{code:'IDENTITY_IDEMPOTENCY_CONFLICT'});
    });
    await t.test('receipt never authorizes commit; changed payload, browser and proof fail',async()=> {
      const i=await fixture(),p=await service.prepare(i);
      await assert.rejects(service.commit({...i,operationId:p.operationId,proof:p.receiptSecret}),{code:'IDENTITY_PROOF_UNAVAILABLE'});
      await assert.rejects(service.commit({...i,operationId:p.operationId,payload:{newPassword:'changed'}}),{code:'IDENTITY_IDEMPOTENCY_CONFLICT'});
      await assert.rejects(service.commit({...i,operationId:p.operationId,browserDigest:'f'.repeat(64)}),{code:'IDENTITY_PROOF_UNAVAILABLE'});
      await assert.rejects(lookup({...i,browserDigest:'f'.repeat(64)},p),{code:'IDENTITY_RECEIPT_UNAVAILABLE'});
      await identityRepository.transaction(r=>r.advanceSecurityVersion({accountId:i.accountId,expectedSecurityVersion:1}));
      await assert.rejects(service.commit({...i,operationId:p.operationId}),{code:'IDENTITY_PROOF_UNAVAILABLE'});
      assert.equal((await lookup(i,p)).status,'pending');
    });
    await t.test('Audit failure rolls back mutation and outbox; authorized concurrent retry commits once',async()=> {
      const i=await fixture(),p=await service.prepare(i),before=await count('identity_notification_outbox');
      failAudit=true; await assert.rejects(service.commit({...i,operationId:p.operationId})); failAudit=false;
      assert.equal((await identityRepository.findAccount(i.accountId)).securityVersion,1);
      assert.equal((await lookup(i,p)).status,'pending'); assert.equal(await count('identity_notification_outbox'),before);
      const results=await Promise.allSettled([service.commit({...i,operationId:p.operationId}),service.commit({...i,operationId:p.operationId})]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal((await identityRepository.findAccount(i.accountId)).securityVersion,2);
      assert.deepEqual(await lookup(i,p),{contractVersion:1,operationId:p.operationId,status:'succeeded',nextAction:'sign_in'});
      assert.equal(await count('audit_security_events'),1); assert.equal(await count('identity_notification_outbox'),before+1);
      await database.transaction(tx=>service.invalidateReceipts(tx,i.contextId));
      await assert.rejects(lookup(i,p),{code:'IDENTITY_RECEIPT_UNAVAILABLE'});
    });
    await t.test('notification send uses stable logical id, outside transaction, then erases ciphertext',async()=> {
      assert.deepEqual(await deliveryService.process(),{processed:1});
      assert.equal(mail.messages().length,1);
      const r=(await database.query(`SELECT status,protected_payload FROM ${s}.identity_notification_outbox`)).rows[0];
      assert.deepEqual(r,{status:'sent',protected_payload:null});
    });
    async function queued() {
      const i=await fixture(),p=await service.prepare(i); await service.commit({...i,operationId:p.operationId}); return {i,p};
    }
    await t.test('AES authentication binds key, record, operation, purpose, version and expiry',async()=> {
      const item={id:'delivery',operationId:'operation',purpose:'security_notification',keyVersion:1,expiresAt:new Date(clock.now()+300000)};
      const protectedPayload=sealDelivery(deliveryKeys,item,{to:'fixture@example.invalid',code:'012345'});
      assert.equal(openDelivery(deliveryKeys,{...item,protectedPayload}).code,'012345');
      for(const change of [{id:'other'},{operationId:'other'},{purpose:'challenge_code'},{expiresAt:new Date(clock.now()+200000)},{keyVersion:2},{protectedPayload:'AAAA'}]) {
        assert.throws(()=>openDelivery(deliveryKeys,{...item,protectedPayload,...change}),{code:'IDENTITY_DELIVERY_REJECTED'});
      }
      assert.throws(()=>openDelivery(ring(),{...item,protectedPayload}),{code:'IDENTITY_DELIVERY_REJECTED'});
      assert.throws(()=>sealDelivery(deliveryKeys,item,{value:'x'.repeat(2048)}),{code:'IDENTITY_DELIVERY_REJECTED'});
      assert.notEqual(fingerprint(fingerprintKeys,1,'password_change',{password:'x'}),fingerprint(ring(),1,'password_change',{password:'x'}));
    });
    await t.test('expired lease is fenced, retry budget is four and terminal failure erases payload',async()=> {
      await queued();
      const first=await repository.transaction(r=>r.claim(now())); clock.advance(15001);
      const second=await repository.transaction(r=>r.claim(now()));
      assert.equal(second.id,first.id); assert.equal(second.generation,first.generation+1);
      assert.equal(await repository.transaction(r=>r.acknowledge(first,'sent',now)),false);
      assert.equal(await repository.transaction(r=>r.acknowledge(second,'retry',now)),true);
      clock.advance(2000); const third=await repository.transaction(r=>r.claim(now()));
      await repository.transaction(r=>r.acknowledge(third,'retry',now)); clock.advance(4000);
      const fourth=await repository.transaction(r=>r.claim(now())); assert.equal(fourth.attempts,4);
      await repository.transaction(r=>r.acknowledge(fourth,'retry',now));
      const row=(await database.query(`SELECT status,protected_payload,attempts FROM ${s}.identity_notification_outbox WHERE id=$1`,[fourth.id])).rows[0];
      assert.deepEqual(row,{status:'failed',protected_payload:null,attempts:4});
      await assert.rejects(database.query(`UPDATE ${s}.identity_notification_outbox SET attempts=0,generation=0 WHERE id=$1`,[fourth.id]),{sqlState:'23514'});
    });
    await t.test('missing delivery key fails closed and terminalizes without sending',async()=> {
      await queued(); const before=mail.messages().length;
      const old=deliveryKeys.keys[1]; delete deliveryKeys.keys[1];
      await deliveryService.process(); deliveryKeys.keys[1]=old;
      assert.equal(mail.messages().length,before);
      assert.equal((await database.query(`SELECT count(*)::int AS n FROM ${s}.identity_notification_outbox WHERE status='failed' AND protected_payload IS NULL`)).rows[0].n,2);
    });
    await t.test('acknowledgement rechecks lease with fresh time after its actual PostgreSQL lock wait',async()=> {
      const {p}=await queued();
      const item=await repository.transaction(r=>r.claim(now()));
      let release,locked;
      const gate=new Promise(resolve=> {release=resolve;});
      const ready=new Promise(resolve=> {locked=resolve;});
      const blocker=database.transaction(async tx=> {
        await tx.query(`SELECT id FROM ${s}.identity_notification_outbox WHERE id=$1 FOR UPDATE`,[item.id]);
        locked();await gate;
      });
      await ready;
      const pending=repository.transaction(r=>r.acknowledge(item,'sent',now));
      let waiting=false;
      try {
        for(let n=0;n<50&&!waiting;n++) {
          waiting=(await database.query(`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE $1) AS waiting`,[`%${schema}%identity_notification_outbox%`])).rows[0].waiting;
          if(!waiting) await new Promise(resolve=>setTimeout(resolve,10));
        }
        assert.equal(waiting,true);clock.advance(16000);
      } finally {release();}
      await blocker;assert.equal(await pending,false);
      const row=(await database.query(`SELECT status,generation FROM ${s}.identity_notification_outbox WHERE operation_id=$1`,[p.operationId])).rows[0];
      assert.deepEqual(row,{status:'leased',generation:item.generation});
      // A current claimant may reclaim; the rejected old acknowledgement cannot
      // erase the item or prevent normal bounded recovery.
      const reclaimed=await repository.transaction(r=>r.claim(now()));
      assert.equal(reclaimed.generation,item.generation+1);
      await repository.transaction(r=>r.acknowledge(reclaimed,'expired',now));
    });
    await t.test('expired work cleanup erases abandoned lease and preparation expiry is not extended',async()=> {
      const {i,p}=await queued(); await repository.transaction(r=>r.claim(now())); clock.advance(300001);
      assert.equal(await deliveryService.cleanup(),1);
      await assert.rejects(lookup(i,p),{code:'IDENTITY_RECEIPT_UNAVAILABLE'});
      assert.equal((await database.query(`SELECT protected_payload FROM ${s}.identity_notification_outbox WHERE operation_id=$1`,[p.operationId])).rows[0].protected_payload,null);
    });
    await t.test('provider success followed by failed SQL finalization exposes no account and cannot replay code',async()=> {
      const i=await fixture({account:false,purpose:'login',action:'social_login'}),p=await service.prepare(i);
      i.operationId=p.operationId;i.exchangeId='social_exchange';
      await database.query(`INSERT INTO ${s}.identity_social_exchanges(id,context_id,operation_id,provider,intent,digest,key_version,created_at,expires_at)
        VALUES($1,$2,$3,'google','login',$4,1,$5,$6)`,[i.exchangeId,i.contextId,p.operationId,'e'.repeat(64),now(),new Date(clock.now()+300000)]);
      const claims=await Promise.all([service.claimSocial(i),service.claimSocial(i)]);
      assert.equal(claims.filter(r=>r.status==='exchange_claimed').length,1);
      await assert.rejects(service.commit(i),{code:'IDENTITY_SOCIAL_CLAIM_REQUIRED'});
      await assert.rejects(service.completeSocial({...i,browserDigest:'f'.repeat(64)},{accountId:'forbidden'}),{code:'IDENTITY_PROOF_UNAVAILABLE'});
      assert.equal((await database.query(`SELECT status FROM ${s}.identity_social_exchanges WHERE id=$1`,[i.exchangeId])).rows[0].status,'exchange_claimed');
      const provider=createFakeProvider(),code=provider.issue({accountId:'social_new_account'}),proof=await provider.exchange(code);
      failAudit=true; await assert.rejects(service.completeSocial(i,proof)); failAudit=false;
      assert.equal(await identityRepository.findAccount('social_new_account'),null);
      assert.equal((await service.claimSocial(i)).status,'interrupted');
      await assert.rejects(provider.exchange(code)); await assert.rejects(service.completeSocial(i,proof));
      assert.equal((await lookup(i,p)).status,'failed');
    });
    await t.test('social abandoned lease interrupts; expired operation or exchange cannot complete',async()=> {
      async function social(expiry=300000) {
        const i=await fixture({account:false,purpose:'login',action:'social_login'}),p=await service.prepare(i);
        i.operationId=p.operationId;i.exchangeId=`social_${seq}`;
        await database.query(`INSERT INTO ${s}.identity_social_exchanges(id,context_id,operation_id,provider,intent,digest,key_version,created_at,expires_at)
          VALUES($1,$2,$3,'google','login',$4,1,$5,$6)`,[i.exchangeId,i.contextId,p.operationId,(seq+500).toString(16).padStart(64,'0'),now(),new Date(clock.now()+expiry)]);
        return {i,p};
      }
      const a=await social(); await service.claimSocial(a.i); clock.advance(15001);
      assert.equal((await service.claimSocial(a.i)).status,'interrupted'); assert.equal((await lookup(a.i,a.p)).status,'failed');
      await assert.rejects(service.completeSocial(a.i,{accountId:'expired_claim'}),{code:'IDENTITY_SOCIAL_UNAVAILABLE'});
      const b=await social(1000); await service.claimSocial(b.i); clock.advance(1001);
      await assert.rejects(service.completeSocial(b.i,{accountId:'expired_exchange'}),{code:'IDENTITY_SOCIAL_UNAVAILABLE'});
      const c=await social(); await service.claimSocial(c.i); clock.advance(300001);
      await assert.rejects(service.completeSocial(c.i,{accountId:'expired_operation'}));
      assert.equal(await identityRepository.findAccount('expired_claim'),null);
    });
    await t.test('trusted reconciliation interrupts expired initiated and claimed exchanges and erases transient proof',async()=> {
      // Reconcile abandoned rows from earlier failure cases first.
      await service.reconcileSocial();
      const items=[];
      for(const claimed of [false,true]) {
        const i=await fixture({account:false,purpose:'login',action:'social_login'}),p=await service.prepare(i);
        i.operationId=p.operationId;i.exchangeId=`cleanup_social_${seq}`;
        await database.query(`INSERT INTO ${s}.identity_social_exchanges(id,context_id,operation_id,provider,intent,digest,key_version,protected_verifier,nonce_digest,created_at,expires_at)
          VALUES($1,$2,$3,'google','login',$4,1,'fixture-protected-verifier',$4,$5,$6)`,[i.exchangeId,i.contextId,p.operationId,(seq+800).toString(16).padStart(64,'0'),now(),new Date(clock.now()+300000)]);
        if(claimed) await service.claimSocial(i);
        items.push({i,p});
      }
      clock.advance(300001);
      for(const {i} of items) await assert.rejects(service.claimSocial(i),{code:'IDENTITY_PROOF_UNAVAILABLE'});
      assert.deepEqual(await service.reconcileSocial(),{interrupted:2});
      assert.deepEqual(await service.reconcileSocial(),{interrupted:0});
      for(const {i,p} of items) {
        const row=(await database.query(`SELECT status,protected_verifier,nonce_digest FROM ${s}.identity_social_exchanges WHERE id=$1`,[i.exchangeId])).rows[0];
        assert.deepEqual(row,{status:'interrupted',protected_verifier:null,nonce_digest:null});
        const op=(await database.query(`SELECT status,next_action FROM ${s}.identity_operations WHERE id=$1`,[p.operationId])).rows[0];
        assert.deepEqual(op,{status:'failed',next_action:'fresh_sign_in_required'});
      }
    });
    await t.test('code eligibility rejects superseded, revoked, expired and stale-version proof',async()=> {
      async function codeFixture(change) {
        const i=await fixture({purpose:'login'}),opid=`code_operation_${seq}`,challengeId=`challenge_${seq}`;
        await database.transaction(async tx=> {
          const bound=repository.bind(tx);
          const op=await bound.insertOperation({...i,id:opid,action:'challenge_issue',fingerprint:'d'.repeat(64),keyVersion:1,now:now(),expiresAt:new Date(clock.now()+300000)});
          await tx.query(`INSERT INTO ${s}.identity_challenges(id,context_id,account_id,security_version,purpose,target_digest,digest,key_version,created_at,expires_at,resend_at)
            VALUES($1,$2,$3,1,'login',$4,$4,1,$5,$6,$5)`,[challengeId,i.contextId,i.accountId,'d'.repeat(64),now(),new Date(clock.now()+300000)]);
          await bound.finish(op.id,{nextAction:'verify_code',accountId:i.accountId});
          await deliveryService.enqueue(bound,op,{purpose:'challenge_code',challengeId,proofExpiresAt:op.expires_at,payload:{to:'fixture@example.invalid',code:'012345'}});
        });
        if(change==='stale') await identityRepository.transaction(r=>r.advanceSecurityVersion({accountId:i.accountId,expectedSecurityVersion:1}));
        else if(change==='expired') await database.query(`UPDATE ${s}.identity_challenges SET expires_at=$2 WHERE id=$1`,[challengeId,new Date(clock.now()+1)]);
        else if(change) await database.query(`UPDATE ${s}.identity_challenges SET status=$2 WHERE id=$1`,[challengeId,change]);
        return {i,opid,challengeId};
      }
      // Existing unrelated abandoned work is expired before the code cases.
      await deliveryService.cleanup();
      for(const change of ['superseded','revoked','stale']) {
        const before=mail.messages().length; await codeFixture(change); await deliveryService.process(); assert.equal(mail.messages().length,before);
      }
      const fresh=await codeFixture(); await deliveryService.process();
      assert.equal(mail.messages().at(-1).code,'012345');
      assert.equal((await database.query(`SELECT delivery_status FROM ${s}.identity_challenges WHERE id=$1`,[fresh.challengeId])).rows[0].delivery_status,'sent');
      const exp=await codeFixture(); clock.advance(300001); const before=mail.messages().length;
      await deliveryService.process(); assert.equal(mail.messages().length,before);
      assert.equal((await database.query(`SELECT protected_payload FROM ${s}.identity_notification_outbox WHERE operation_id=$1`,[exp.opid])).rows[0].protected_payload,null);
    });
    await t.test('delivery retry reuses logical id and never repeats committed mutation',async()=> {
      const {i,p}=await queued(); const before=mail.messages().length;
      mail.failNext(); await deliveryService.process(); assert.equal(mail.messages().length,before);
      clock.advance(1000); await deliveryService.process(); await deliveryService.process();
      assert.equal(mail.messages().length,before+1);
      assert.equal((await identityRepository.findAccount(i.accountId)).securityVersion,2);
      assert.equal((await database.query(`SELECT attempts FROM ${s}.identity_notification_outbox WHERE operation_id=$1`,[p.operationId])).rows[0].attempts,2);
      assert.equal((await lookup(i,p)).status,'succeeded');
      await assert.rejects(database.query(`UPDATE ${s}.identity_operations SET next_action='different' WHERE id=$1`,[p.operationId]),{sqlState:'23514'});
    });
    await t.test('one invocation processes at most ten with two concurrent external sends',async()=> {
      for(let n=0;n<11;n++) await queued();
      let active=0,max=0,sent=0;
      const bounded=new IdentityDeliveryService({repository,keyring:deliveryKeys,recipientKeys,eventRepository,clock,fixtureOnly:true,adapter:{async send() {
        active++; max=Math.max(max,active);
        // Shared pool rejects use inside a live transaction, so this also proves
        // external adapters run after the claim transaction has been released.
        await database.query('SELECT 1'); await new Promise(resolve=>setTimeout(resolve,5));
        sent++;active--;
      }}});
      assert.deepEqual(await bounded.process(),{processed:10}); assert.equal(sent,10); assert.ok(max<=2);
      assert.deepEqual(await bounded.process(),{processed:1});
    });
    await t.test('fresh eligibility deadlines stop dispatch after awaited delivery, challenge, context or lease expiry',async()=> {
      for(const deadline of ['delivery','challenge','context','lease']) {
        const isCode=deadline==='challenge'||deadline==='context';
        const i=await fixture({purpose:isCode?'login':'reauthentication'});
        const operationId=`expiry_operation_${seq}`,challengeId=isCode?`expiry_challenge_${seq}`:null;
        const expiresAt=new Date(clock.now()+(deadline==='delivery'||deadline==='challenge'?2000:300000));
        await database.transaction(async tx=> {
          const r=repository.bind(tx);
          const op=await r.insertOperation({...i,id:operationId,action:'challenge_issue',fingerprint:'c'.repeat(64),keyVersion:1,now:now(),expiresAt:new Date(clock.now()+300000)});
          if(isCode) await tx.query(`INSERT INTO ${s}.identity_challenges(id,context_id,account_id,security_version,purpose,target_digest,digest,key_version,created_at,expires_at,resend_at)
            VALUES($1,$2,$3,1,'login',$4,$4,1,$5,$6,$5)`,[challengeId,i.contextId,i.accountId,'c'.repeat(64),now(),expiresAt]);
          if(deadline==='context') await tx.query(`UPDATE ${s}.identity_contexts SET expires_at=$2 WHERE id=$1`,[i.contextId,new Date(clock.now()+2000)]);
          await r.finish(operationId,{nextAction:'verify_code',accountId:i.accountId});
          await deliveryService.enqueue(r,op,{purpose:isCode?'challenge_code':'security_notification',challengeId:challengeId??undefined,
            proofExpiresAt:expiresAt,payload:isCode?{to:'fixture@example.invalid',code:'012345'}:{to:'fixture@example.invalid',kind:'password_changed'}});
        });
        let reads=0,sends=0;
        const delayedRepository={transaction(work) {
          return repository.transaction((r,tx)=>work({...r,async eligible(item) {
            // This is the real PostgreSQL locked eligibility read. Move time
            // across the deadline during its awaited transaction, reproducing
            // the stale pre-query timestamp that previously permitted sending.
            const snapshot=await r.eligible(item);
            if(++reads===2) clock.advance(deadline==='lease'?16000:3000);
            return snapshot;
          }},tx));
        }};
        const delayed=new IdentityDeliveryService({repository:delayedRepository,keyring:deliveryKeys,recipientKeys,eventRepository,clock,fixtureOnly:true,adapter:{async send(){sends++;}}});
        assert.equal(await delayed.claimAndSend(),true);
        assert.equal(reads,2,deadline);assert.equal(sends,0,deadline);
        const row=(await database.query(`SELECT status,generation,protected_payload FROM ${s}.identity_notification_outbox WHERE operation_id=$1`,[operationId])).rows[0];
        if(deadline==='context') {
          assert.equal(row.status,'expired');assert.equal(row.protected_payload,null);
        } else if(deadline==='lease') {
          // Expired claim cannot acknowledge. Its fencing generation remains
          // intact, and the abandoned row is left for bounded reclaim/cleanup.
          assert.equal(row.status,'leased');assert.equal(row.generation,1);
        }
        clock.advance(300001);await deliveryService.cleanup();
      }
    });
    await t.test('ten-second timeout aborts adapter and quarantines an unsettled external send',async()=> {
      const {p}=await queued(); let aborted=false;
      const stalled=new IdentityDeliveryService({repository,keyring:deliveryKeys,recipientKeys,eventRepository,clock,fixtureOnly:true,adapter:{send(message,{signal}) {
        signal.addEventListener('abort',()=> {aborted=true;},{once:true}); return new Promise(()=>{});
      }}});
      assert.equal(await stalled.claimAndSend(),true); assert.equal(aborted,true);
      const row=(await database.query(`SELECT status,attempts FROM ${s}.identity_notification_outbox WHERE operation_id=$1`,[p.operationId])).rows[0];
      assert.deepEqual(row,{status:'pending',attempts:1});
      assert.deepEqual(await stalled.process(),{processed:0});
      assert.equal(await stalled.claimAndSend(),false);
    });
    await t.test('uncertain short-deadline sends retain both slots across calls until real settlement',async()=> {
      // Expire the preceding test's pending retry before creating this batch.
      clock.advance(300001); await deliveryService.cleanup();
      deliveryLifetime=1100;
      try { for(let n=0;n<10;n++) await queued(); }
      finally { deliveryLifetime=300000; }
      let active=0,max=0,calls=0;
      const settle=[];
      const adapter={send() {
        active++;calls++;max=Math.max(max,active);
        return new Promise(resolve=>settle.push(()=> {active--;resolve();}));
      }};
      const stalled=new IdentityDeliveryService({repository,keyring:deliveryKeys,recipientKeys,eventRepository,clock,fixtureOnly:true,adapter});
      assert.deepEqual(await stalled.process(),{processed:2});
      assert.equal(active,2);assert.equal(max,2);assert.equal(calls,2);
      assert.deepEqual(await stalled.process(),{processed:0});
      const sameAdapter=new IdentityDeliveryService({repository,keyring:deliveryKeys,recipientKeys,eventRepository,clock,fixtureOnly:true,adapter});
      assert.deepEqual(await sameAdapter.process(),{processed:0});assert.equal(calls,2);
      settle.splice(0).forEach(resolve=>resolve()); await Promise.resolve(); await Promise.resolve();
      assert.equal(active,0);
      const next=sameAdapter.process();
      for(let n=0;n<50&&settle.length<2;n++) await new Promise(resolve=>setTimeout(resolve,5));
      assert.equal(settle.length,2);assert.equal(max,2);
      // Settle this pair; subsequent pairs may be dispatched only after actual
      // completion. Remaining pairs time out and retain at most two slots.
      settle.splice(0).forEach(resolve=>resolve());
      await next;
      assert.ok(active<=2);assert.equal(max,2);
      settle.splice(0).forEach(resolve=>resolve());
    });
  });
});
