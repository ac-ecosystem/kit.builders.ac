import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSwapPlan} from './swap-plan.mjs';
const good = () => {
  const common={esp:'microsoft',status:'ACTIVE',warmup_status:'ACTIVE',in_recovery:false,warmup_age_days:20,daily_limit:3,capacity_today:3,interval:120,sent:0,sender_bounces:0,recipient_bounces:0,warmup:{inbox:70,spam:0,promotion:0,sent:70},dns:{spf:true,dkim:true,dmarc:true,mx:true,checked_at:'2026-11-18T10:00:00Z'},domain_ever_catchall:false};
  const source={...common,id:'source',email:'source@example-source.com',domain:'example-source.com',infrastructure_group_id:'tenant-a',daily_limit:2,capacity_today:2,interval:28,warmup:{inbox:46,spam:24,promotion:0,sent:70}};
  const standby={...common,id:'standby',email:'standby@example-spare.net',domain:'example-spare.net',infrastructure_group_id:'tenant-b',memberships:[],membership_complete:true,designated:true,standby_for:'catchall',first_name:'Example'};
  source.dns={...common.dns,verified_for_email:source.email};standby.dns={...common.dns,verified_for_email:standby.email};
  return {workspace_id:'workspace-example',observed_at:'2026-11-18T10:00:00Z',windows:{warmup:{start:'2026-11-11',end:'2026-11-17'},sending:{start:'2026-11-15',end:'2026-11-17'}},campaign:{id:'campaign-example',status:'DRAFT',lane:'catchall',membership_mode:'direct',members:[source.email,'healthy@example-source.com']},source,standby,diagnosis:{scope:'domain',confirmed:true}};
};
test('draft plan preserves healthy peers and verifies addition before removal',()=>{
 const i=good(),p=buildSwapPlan(i);assert.equal(p.status,'ready_for_review');assert.equal(p.executable,false);
 assert.equal(p.operations[0].args.daily_limit,2);assert.equal(p.operations[0].args.interval_limit_in_min,120);assert.equal(p.operations[0].args.force_exit_recovery,0);
 assert.equal(p.operations[3].tool,'get_campaign_email_accounts');assert.equal(p.operations[4].tool,'remove_campaign_email_account');
 assert.deepEqual(p.after,['healthy@example-source.com','standby@example-spare.net']);
 assert.ok(p.operations[3].verify.exact_members.includes(i.source.email));
});
test('inactive or unproven spare cannot produce mutation operations',()=>{
 for(const change of [i=>i.standby.warmup_status='INACTIVE',i=>i.standby.warmup=null,i=>i.standby.warmup_age_days=null,i=>i.standby.membership_complete=false,i=>i.standby.capacity_today=0,i=>i.standby.dns.verified_for_email=null]){
 const i=good();change(i);const p=buildSwapPlan(i);assert.equal(p.status,'blocked');assert.deepEqual(p.operations,[]);}
});
test('unknown failure scope and infrastructure are blocked',()=>{for(const change of [i=>i.diagnosis.scope='unknown',i=>i.diagnosis.confirmed=false,i=>i.standby.infrastructure_group_id=null]){const i=good();change(i);assert.equal(buildSwapPlan(i).status,'blocked');}});
test('tenant-wide failure cannot use another mailbox or domain on the same tenant',()=>{const i=good();i.diagnosis.scope='tenant';i.standby.infrastructure_group_id='tenant-a';assert.equal(buildSwapPlan(i).status,'blocked');});
test('known domain-local failure can use another healthy domain on a verified unaffected tenant',()=>{const i=good();i.standby.infrastructure_group_id='tenant-a';assert.equal(buildSwapPlan(i).status,'ready_for_review');});
test('Catch-all history excludes Primary even when mailbox health passes',()=>{const i=good();i.campaign.lane='primary';i.standby.standby_for='primary';i.standby.domain_ever_catchall=true;assert.equal(buildSwapPlan(i).status,'blocked');});
test('live, tag-driven and changed membership are outside this draft procedure',()=>{for(const change of [i=>i.campaign.status='ACTIVE',i=>i.campaign.membership_mode='tag',i=>i.campaign.members.push(i.standby.email)]){const i=good();change(i);assert.deepEqual(buildSwapPlan(i).operations,[]);}});
test('bounce signal requires sender-failure diagnostics',()=>{const i=good();i.source.warmup={inbox:70,spam:0,promotion:0,sent:70};i.source.sent=20;i.source.sender_bounces=3;assert.equal(buildSwapPlan(i).status,'blocked');i.diagnosis.sender_failure_confirmed=true;assert.equal(buildSwapPlan(i).status,'ready_for_review');});

test('malformed, stale and unknown-provider evidence cannot produce a ready plan',()=>{
 for(const change of [i=>i.source.esp=undefined,i=>i.standby.warmup.spam=500,i=>i.source.dns.checked_at='2026-11-15T10:00:00Z']){
 const i=good();change(i);assert.equal(buildSwapPlan(i).status,'blocked');}
});
