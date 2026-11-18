import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defaults, validateSnapshot} from './swap-review.mjs';
import {assessSignals} from './swap-policy.mjs';

/** Build a reviewable native-MCP call plan. This module never executes provider calls. */
export function buildSwapPlan(input) {
  const {workspace_id, campaign = {}, source, standby, diagnosis = {}, observed_at, windows} = input;
  const blockers = [];
  if (!workspace_id || !observed_at || !windows) throw new Error('Workspace, observation timestamp and windows are required');
  if (!source || !standby) return {status:'blocked', executable:false, blockers:['An exact source and standby are required'], operations:[]};
  const need = (ok, message) => { if (!ok) blockers.push(message); };
  need(['DRAFT','ACTIVE'].includes(campaign.status), 'Target must be a draft preflight or an active campaign');
  need(campaign.status === 'DRAFT', 'Live execution needs a verified cold-sending hold and interruption-safe runner; not implemented here');
  need(['primary','catchall'].includes(campaign.lane), 'Campaign lane must be confirmed');
  need(campaign.membership_mode === 'direct', 'Tag-based or unknown membership cannot use this direct-membership procedure');
  need(source.id && standby.id && source.id !== standby.id && source.email !== standby.email, 'Source and standby must be different exact mailboxes');
  need(['microsoft','google'].includes(source.esp) && source.esp === standby.esp, 'Mailbox providers must match');
  need(source.domain !== standby.domain, 'Standby must be outside the affected source domain');
  need(source.infrastructure_group_id && standby.infrastructure_group_id, 'Verify source and standby tenant/infrastructure group IDs');
  need(diagnosis.confirmed === true && ['mailbox','domain','tenant'].includes(diagnosis.scope), 'Failure scope is unresolved; do not assume a mailbox-local failure');
  if (diagnosis.scope === 'tenant') need(source.infrastructure_group_id !== standby.infrastructure_group_id, 'Tenant-wide failures require a different verified infrastructure group');
  need(standby.designated === true && standby.standby_for === campaign.lane, 'Standby designation and target lane must be confirmed');
  if (campaign.lane === 'primary') need(standby.domain_ever_catchall === false && source.domain_ever_catchall === false, 'Primary requires verified clean Catch-all history for both domains');
  need(standby.membership_complete === true && Array.isArray(standby.memberships) && standby.memberships.length === 0, 'Standby must have complete evidence of no campaign attachments');
  need(standby.status === 'ACTIVE' && standby.warmup_status === 'ACTIVE' && standby.in_recovery === false, 'Standby must be active, warming and outside provider recovery');
  need(Number.isInteger(standby.warmup_age_days) && standby.warmup_age_days >= defaults.ready_days, 'Standby warming age must be known and at least 15 days');
  const ownDns = (a) => a.dns?.verified_for_email === a.email;
  need(ownDns(source) && ownDns(standby), 'Verify each exact mailbox authentication; a domain sample is context only');
  if (source.dns && source.warmup !== undefined && standby.dns && standby.warmup !== undefined) {
    try {
      validateSnapshot({version:1,run_id:'pair-plan',workspace_id,observed_at,windows,coverage:{complete:true,description:'Exact pair health validation'},campaigns:[],domains:[source,standby].map((a)=>({...a,mailboxes:1,memberships:[],membership_complete:true,dns:{...a.dns,source:'exact-mailbox check'}}))});
    } catch (error) { blockers.push('Invalid health evidence: '+error.message); }
    const src = assessSignals(source, {observed_at, windows}, defaults);
    need(src.dnsFresh, 'Source authentication evidence must be fresh');
    const dst = assessSignals(standby, {observed_at, windows}, defaults);
    need(src.health === 'recovery', 'Source needs its own fresh recovery signal; DNS-only findings require configuration review');
    need(dst.health === 'healthy', 'Standby must pass fresh individual DNS and warmup checks');
    if (src.reasons.includes('Sender-side bounce threshold reached')) need(diagnosis.sender_failure_confirmed === true, 'Confirm sender-related failure diagnostics before a bounce-triggered swap');
  } else blockers.push('Complete individual mailbox health evidence is required');
  const cap = Math.min(source.daily_limit, source.capacity_today, standby.daily_limit, standby.capacity_today);
  const caps = [source.daily_limit, source.capacity_today, standby.daily_limit, standby.capacity_today];
  need(caps.every((n) => Number.isInteger(n) && n > 0), 'Verify positive daily limits and actual available capacity on both sides');
  need([source.interval, standby.interval].every((n) => Number.isInteger(n) && n >= 2), 'Verify valid sending intervals on both sides');
  need(typeof standby.first_name === 'string' && standby.first_name.length > 0, 'Replacement first name must be captured for the update API');
  const members = campaign.members;
  need(Array.isArray(members) && members.every((email) => typeof email === 'string') && new Set(members).size === members.length && members.includes(source.email) && !members.includes(standby.email), 'Read exact current membership: source present, standby absent, no duplicates');
  need(typeof campaign.id === 'string' && campaign.id.length > 0, 'Exact campaign ID required');
  if (blockers.length) return {status:'blocked', executable:false, blockers, operations:[]};
  const withSpare = [...members, standby.email].sort();
  const final = withSpare.filter((email) => email !== source.email);
  const args = {workspace_id, campaign_id:campaign.id};
  return {
    status:'ready_for_review', executable:false, blockers:[],
    phase:'draft_preflight',
    pair:{source_id:source.id,standby_id:standby.id,campaign_id:campaign.id},
    before:members.slice().sort(), after:final,
    requirements:['Explicit scoped authorization before any write','Reserve this exact pair durably with one executor','Re-read and revalidate provider state immediately before applying','On interruption retain the same pair and reconcile remote state; never allocate a second spare'],
    operations:[
      {tool:'update_email_account',args:{workspace_id,id:standby.id,first_name:standby.first_name,daily_limit:cap,interval_limit_in_min:Math.max(source.interval,standby.interval),force_exit_recovery:0}},
      {tool:'list_email_accounts',args:{workspace_id,email:standby.email,starting_after:''},verify:{daily_limit:cap,interval:Math.max(source.interval,standby.interval),recovery_unchanged:true}},
      {tool:'add_campaign_email_account',args:{...args,email:standby.email}},
      {tool:'get_campaign_email_accounts',args,verify:{exact_members:withSpare}},
      {tool:'remove_campaign_email_account',args:{...args,email:source.email}},
      {tool:'get_campaign_email_accounts',args,verify:{exact_members:final}},
    ],
    on_failure:'Stop. Do not detach after failed attachment/read-back. Keep draft unlaunched, preserve the reservation and reconcile provider state before retrying.',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) throw new Error('usage: node scripts/swap-plan.mjs <private-input.json> <private-plan.json>');
  const plan = buildSwapPlan(JSON.parse(await readFile(input,'utf8')));
  await writeFile(output, JSON.stringify(plan,null,2)+'\n');
  console.log(plan.status+'; '+plan.blockers.length+' blockers; provider writes: 0');
}
