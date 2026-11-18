'use strict';
(function () {
  const data = window.FLEET_DATA;
  const $ = (id) => document.getElementById(id);
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const number = (v) => v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US');
  const percent = (v, precision) => v === null || v === undefined ? '—' : (v * 100).toFixed(precision ?? 1) + '%';
  const count = (rows) => rows.reduce((sum, d) => sum + d.mailboxes, 0);
  const state = {view:'overview', filter:'all', pool:null, campaign:null, query:'', path:'success', step:0};
  const healthLabel = {'healthy':'Healthy','recovery':'Recovery','configuration review':'Config check','unverified':'Unverified'};
  const healthClass = {'healthy':'healthy','recovery':'recovery','configuration review':'config','unverified':'unverified'};
  const badge = (label, kind) => '<span class="badge badge-' + kind + '">' + escape(label) + '</span>';
  const healthBadge = (d) => badge(healthLabel[d.health] || d.health, healthClass[d.health] || 'unverified');
  const lane = (role) => '<span class="lane ' + role + '">' + (role === 'catchall' ? 'Catch-all' : role === 'primary' ? 'Primary' : 'Standby') + '</span>';
  const lanes = (d) => '<div class="lanes">' + (d.pool === 'standby' ? lane('standby') : d.lanes.map(lane).join('') || '<span class="muted">Unassigned</span>') + '</div>';
  const priority = (d) => (d.name === data.simulation.success?.domain ? -1 : d.health === 'configuration review' ? 0 : d.health === 'recovery' ? 1 : 2);
  const ordered = data.domains.slice().sort((a,b) => priority(a)-priority(b) || a.name.localeCompare(b.name));
  const selected = () => data.domains.find((d) => d.name === data.simulation.success?.domain) || ordered[0];

  function chart(d) {
    const points = d.daily.map((p) => ({date:p.date, value:p.inbox+p.spam+p.promotion ? p.inbox/(p.inbox+p.spam+p.promotion) : null}));
    if (!points.length) return '<div class="empty">Daily history was not captured for this domain.<br>The seven-day aggregate is shown above.</div>';
    const times = points.map((p) => Date.parse(p.date)), start=times[0], end=times[times.length-1];
    const x = (t) => 34 + (t-start)/Math.max(86400000,end-start)*506;
    const y = (v) => 145-(v-0.6)/0.4*125;
    const known = points.filter((p)=>p.value!==null);
    let lines='';
    for(let i=1;i<points.length;i++){
      const a=points[i-1],b=points[i];
      if(a.value!==null&&b.value!==null&&Date.parse(b.date)-Date.parse(a.date)===86400000) lines+='<line x1="'+x(Date.parse(a.date))+'" y1="'+y(a.value)+'" x2="'+x(Date.parse(b.date))+'" y2="'+y(b.value)+'" stroke="#7d9e85" stroke-width="2"/>';
    }
    const ticks=[.7,.8,.9,1].map((v)=>'<line x1="34" y1="'+y(v)+'" x2="540" y2="'+y(v)+'" stroke="#edf1e8"/><text x="3" y="'+(y(v)+3)+'">'+Math.round(v*100)+'%</text>').join('');
    const labels=[points[0],points[Math.floor(points.length/2)],points[points.length-1]].map((p,i)=>'<text x="'+x(Date.parse(p.date))+'" y="164" text-anchor="'+(i===0?'start':i===2?'end':'middle')+'">'+escape(new Date(p.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}))+'</text>').join('');
    const marks=known.map((p)=>'<circle cx="'+x(Date.parse(p.date))+'" cy="'+y(p.value)+'" r="2.6" fill="#7d9e85"><title>'+escape(p.date+' · '+percent(p.value,2))+'</title></circle>').join('');
    return '<svg class="trend-svg" viewBox="0 0 560 180" role="img" aria-label="'+escape(d.name)+' daily warmup inbox rate. Warmup is not campaign placement.">'+ticks+'<line x1="34" y1="'+y(data.policy.warmupThreshold)+'" x2="540" y2="'+y(data.policy.warmupThreshold)+'" stroke="#c6b89a" stroke-dasharray="4 4"/>'+lines+marks+labels+'</svg>';
  }
  function pools() {
    $('pool-cards').innerHTML=['primary','catchall','standby'].map((role,i)=>{
      const p=data.pools[role], standby=role==='standby', unknown=standby&&!p.domains;
      const healthy=p.mailboxes?100*(p.mailboxes-p.attention)/p.mailboxes:0;
      return '<button class="pool-card '+role+(state.pool===role?' selected':'')+'" data-pool="'+role+'" aria-pressed="'+(state.pool===role)+'"><div class="pool-top"><span class="pool-letter">'+['A','B','C'][i]+'</span><span>'+['Primary','Catch-all','Standby'][i]+'</span><span class="pool-arrow">↗</span></div><div class="pool-value"><strong class="'+(unknown?'unknown-stock':'')+'">'+(unknown?'Unverified':number(standby?p.ready:p.mailboxes))+'</strong><small>'+(unknown?'availability unknown':'mailboxes')+'</small></div><div class="pool-bar">'+(unknown?'<span class="unknown" style="width:100%"></span>':'<span style="width:'+healthy+'%"></span><span class="bad" style="width:'+(100-healthy)+'%"></span>')+'</div><div class="pool-foot"><span>'+number(p.domains)+' '+(standby?'designated':'assigned')+' domains</span><span>'+(standby?'Unknown readiness':number(p.attention)+' need attention')+'</span></div></button>';
    }).join('');
    $('overlap-text').textContent=number(data.totals.overlap)+' shared senders · pools are not isolated';
    $('overlap-notice').hidden=!data.totals.overlap;
  }
  function spotlight() {
    const d=selected(); if(!d)return;
    $('spotlight-name').textContent=d.name;
    $('spotlight-rate').textContent=percent(d.warmupRate,2);
    $('spotlight-status').innerHTML=healthBadge(d);
    $('spotlight-chart').innerHTML=chart(d);
    $('spotlight-footer').innerHTML='<div class="dns-mini">'+['spf','dkim','dmarc','mx'].map((k)=>'<span>'+k.toUpperCase()+' '+(d.dns[k]===true?'✓':d.dns[k]===false?'!':'?')+'</span>').join('')+'</div><span>'+number(d.sent)+' sent · '+number(d.senderBounces===null||d.recipientBounces===null?null:d.senderBounces+d.recipientBounces)+' bounces in window</span>';
    $('attention-count').textContent=data.totals.attention;
    $('attention-list').innerHTML=ordered.filter((d)=>d.reasons.length).slice(0,5).map((d)=>'<button class="attention-row" data-domain="'+d.name+'"><span class="attention-dot '+(d.health==='configuration review'?'config':'')+'"></span><span><strong>'+escape(d.name)+'</strong><small>'+(d.health==='configuration review'?'Authentication check':'Low warmup inbox rate')+'</small></span><span class="attention-metric">'+(d.health==='configuration review'?'DNS':percent(d.warmupRate))+'</span><span class="row-arrow">↗</span></button>').join('') || '<p class="empty">No flagged domain in this snapshot.</p>';
  }
  function campaignTable() {
    return '<div class="table-wrap"><table><thead><tr><th>Campaign</th><th>Status</th><th>Lane</th><th>Assigned</th><th>Lifetime sends</th><th>Bounces</th></tr></thead><tbody>'+data.campaigns.map((c)=>'<tr><td><button class="campaign-name" data-campaign="'+c.key+'">'+escape(c.name)+'<small>'+number(c.domains.length)+' domains ↗</small></button></td><td>'+badge(c.status[0]+c.status.slice(1).toLowerCase(),c.status.toLowerCase())+'</td><td>'+(c.lane==='unknown'?'<span class="muted">Unmapped</span>':lane(c.lane))+'</td><td class="num">'+number(c.mailboxes)+'</td><td class="num">'+number(c.sent)+'</td><td class="num">'+number(c.bounces)+'</td></tr>').join('')+'</tbody></table></div>';
  }
  function campaigns() {
    const active=data.campaigns.filter((c)=>c.status==='ACTIVE').length;
    $('nav-campaign-count').textContent=data.campaigns.length;
    $('campaign-summary').textContent='· '+active+' active in captured scope';
    $('campaign-preview-table').innerHTML=campaignTable();
    $('campaign-full-table').innerHTML=campaignTable();
    $('campaign-status-cards').innerHTML=['ACTIVE','COMPLETED','DRAFT'].map((status)=>'<div class="status-summary"><span>'+status[0]+status.slice(1).toLowerCase()+'</span><strong>'+data.campaigns.filter((c)=>c.status===status).length+'</strong><span>in selected snapshot</span></div>').join('');
  }
  function inventory() {
    const filters=[['all','All domains',data.domains.length],['attention','Needs attention',data.totals.attention],['unassigned','Unassigned',data.totals.unassigned]];
    $('inventory-filters').innerHTML=filters.map(([id,label,n])=>'<button data-filter="'+id+'" class="'+(state.filter===id?'active':'')+'" aria-pressed="'+(state.filter===id)+'">'+label+'<small>'+n+'</small></button>').join('');
    let rows=ordered.filter((d)=>(state.filter!=='attention'||d.reasons.length)&&(state.filter!=='unassigned'||(!d.pool&&!d.lanes.length))&&(!state.pool||(state.pool==='overlap'?d.overlap:state.pool==='standby'?d.pool==='standby':d.lanes.includes(state.pool)||d.pool===state.pool))&&(!state.campaign||d.campaigns.includes(state.campaign))&&d.name.includes(state.query.toLowerCase()));
    $('inventory-count').textContent=rows.length;
    $('clear-filter').hidden=!state.pool&&!state.campaign;
    $('clear-filter').textContent=state.campaign?'Clear campaign filter ×':state.pool==='overlap'?'Clear overlap filter ×':'Clear '+state.pool+' filter ×';
    $('domain-table').innerHTML=rows.length?'<div class="table-wrap"><table><thead><tr><th>Domain</th><th>Assignments</th><th>Mailboxes</th><th>7d warmup</th><th>Health</th><th>DNS</th></tr></thead><tbody>'+rows.map((d)=>'<tr><td><button class="domain-link" data-domain="'+d.name+'">'+escape(d.name)+'<small>'+escape(d.esp==='microsoft'?'Microsoft 365':d.esp==='google'?'Google':'Provider unverified')+'</small></button></td><td>'+lanes(d)+'</td><td class="num">'+number(d.mailboxes)+'</td><td class="num '+(d.warmupRate!==null&&d.warmupRate<data.policy.warmupThreshold?'rate-low':'')+'">'+percent(d.warmupRate)+'</td><td>'+healthBadge(d)+'</td><td class="num">'+(Object.values({spf:d.dns.spf,dkim:d.dns.dkim,dmarc:d.dns.dmarc,mx:d.dns.mx}).every((v)=>v===true)?'4/4 pass':Object.values({spf:d.dns.spf,dkim:d.dns.dkim,dmarc:d.dns.dmarc,mx:d.dns.mx}).some((v)=>v===false)?'Review':'Unknown')+'</td></tr>').join('')+'</tbody></table></div>':'<div class="empty">'+(state.pool==='standby'?'Standby not identified in this snapshot.':'No domains match these filters.')+'</div>';
  }
  function showView(view) {
    if(!['overview','campaigns','simulation'].includes(view))view='overview';
    state.view=view;
    for(const v of ['overview','campaigns','simulation'])$('view-'+v).hidden=v!==view;
    document.querySelectorAll('[data-view]').forEach((b)=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
    const titles={overview:'Fleet overview',campaigns:'Campaigns',simulation:'Swap rehearsal'};
    const descriptions={overview:'Know what is sending, what is healthy, and what needs a closer look.',campaigns:'Campaign status and sender assignments, from the same saved evidence.',simulation:'Explore expected behavior without changing a single real mailbox.'};
    $('page-title').innerHTML=escape(titles[view])+'<span class="title-period">.</span>';
    $('page-description').textContent=descriptions[view];
    $('breadcrumb-view').textContent=view==='overview'?'OVERVIEW':view.toUpperCase();
    if(view==='simulation')simulation();
  }
  function openDomain(name) {
    const d=data.domains.find((x)=>x.name===name);if(!d)return;
    $('detail-title').textContent=d.name;
    $('detail-body').innerHTML=healthBadge(d)+'<div class="detail-stats"><div class="detail-stat"><label>Mailboxes</label><strong>'+number(d.mailboxes)+'</strong></div><div class="detail-stat"><label>7d warmup inbox</label><strong>'+percent(d.warmupRate,2)+'</strong></div><div class="detail-stat"><label>Campaign sends</label><strong>'+number(d.sent)+'</strong></div></div>'+chart(d)+'<section class="detail-section"><h3>Authentication checks</h3><div class="detail-dns">'+['spf','dkim','dmarc','mx'].map((k)=>'<div class="dns-check '+(d.dns[k]===false?'bad':'')+'">'+k.toUpperCase()+'<span>'+(d.dns[k]===true?'Pass ✓':d.dns[k]===false?'Review !':'Unknown')+'</span></div>').join('')+'</div></section><details class="detail-section evidence"><summary>Evidence & readiness</summary><ul>'+(d.reasons.length?d.reasons.map((reason)=>'<li>'+escape(reason)+'</li>').join(''):'<li>No captured health rule was breached.</li>')+(d.overlap?'<li>This domain is assigned to both primary and catch-all campaigns in the snapshot.</li>':'')+'<li>Warming age: '+(d.warmupAge===null?'not established':d.warmupAge+' days')+'. Standby readiness: '+(d.ready?'verified for the declared scope':'not established')+'.</li></ul><p>Provider checks describe configuration, not historical message authentication. A failed check does not prove a record is absent. Warmup is not campaign placement.</p></details><section class="detail-section"><h3>Campaign assignments</h3><ul class="detail-list">'+data.campaigns.filter((c)=>d.campaigns.includes(c.key)).map((c)=>'<li><span>'+escape(c.name)+'</span>'+badge(c.status.toLowerCase(),c.status.toLowerCase())+'</li>').join('')+(d.campaigns.length?'':'<li>No assignments in the inspected scope.</li>')+'</ul></section><p class="page-note">Warmup window '+escape(data.windows.warmup.start)+'–'+escape(data.windows.warmup.end)+'. Sending window '+escape(data.windows.sending.start)+'–'+escape(data.windows.sending.end)+'. Unknowns are not treated as zero.</p>';
    $('detail-dialog').showModal();
  }
  function simulation() {
    const sim=data.simulation[state.path];
    if(!sim){$('simulation-intro').textContent='No qualifying incident was captured. A replacement scenario was not invented.';$('simulator')?.setAttribute('hidden','');$('sim-next').disabled=true;return;}
    state.step=Math.min(state.step,sim.steps.length-1);
    const step=sim.steps[state.step];
    $('simulation-intro').textContent=sim.domain+' · '+sim.source+' affected · '+sim.initialStandby+' assumed standbys';
    $('step-counter').textContent='STEP '+(state.step+1)+' / '+sim.steps.length;
    $('step-title').textContent=step.event;
    $('sim-next').disabled=state.step===sim.steps.length-1;
    $('sim-progress').innerHTML=sim.steps.map((_,i)=>'<span class="'+(i<=state.step?'done':'')+'"></span>').join('');
    const tiles=[['Campaign copy',step.assigned,'Source still attached: '+step.source],['Standby ready',step.ready,'Reserved for this pair: '+step.reserved],['Recovery',step.recovery,'Removed source mailboxes'],['Warming',step.warming,'Refill requested: '+step.requested]];
    $('sim-pools').innerHTML=tiles.map(([label,n,detail])=>'<div class="sim-pool"><label>'+label+'</label><strong>'+number(n)+'</strong><small>'+detail+'</small></div>').join('');
    const explanations={
      'Start':'Start with '+step.assigned+' assigned and '+sim.initialStandby+' assumed ready.',
      'Detect health breach':'Warmup below '+percent(data.policy.warmupThreshold,0)+'. Flag '+sim.source+' mailboxes for recovery.',
      'Reserve and attach replacements':'Attach '+step.replacements+' replacements. Keep all '+step.source+' source mailboxes.',
      'Verify all replacement attachments':'All '+step.verified+' replacements verified. Source removal can proceed.',
      'Remove source; verify final membership':'Move '+step.recovery+' source mailboxes to recovery. Assignment count returns to baseline.',
      'Emit refill requirement':'Ready '+step.ready+' / target '+sim.reserveTarget+'. Refill gap: '+sim.refill+'. No order placed.',
      'Assume external provisioning completes':'Assume '+step.warming+' new mailboxes arrive. They enter warming.',
      'Assume warming age and health gates pass':'Assume age and health gates pass. Promote warmed inventory to standby.',
      'Verification failed — source stays attached':'Verification failed. Keep all '+step.source+' source mailboxes; reconcile partial attachments.'
    };
    $('sim-explanation').textContent=explanations[step.event]||step.event;
    $('sim-assumptions').textContent='ASSUMPTIONS · '+sim.initialStandby+' standbys, matching ESP and lane, at least '+data.policy.readyDays+' days warmed, passing health, no campaign commitments and independent of failing infrastructure. These quantities are not observed inventory.';
    $('simulation-table').innerHTML='<div class="table-wrap"><table><thead><tr><th>Step</th><th>Assigned</th><th>Source attached</th><th>Ready</th><th>Reserved</th><th>Recovery</th><th>Warming</th></tr></thead><tbody>'+sim.steps.map((s,i)=>'<tr class="'+(i===state.step?'trace-current':'')+'"><td>'+escape(s.event)+'</td><td class="num">'+s.assigned+'</td><td class="num">'+s.source+'</td><td class="num">'+s.ready+'</td><td class="num">'+s.reserved+'</td><td class="num">'+s.recovery+'</td><td class="num">'+s.warming+'</td></tr>').join('')+'</tbody></table></div>';
    document.querySelectorAll('[data-sim-path]').forEach((b)=>{b.classList.toggle('selected',b.dataset.simPath===state.path);b.setAttribute('aria-pressed',String(b.dataset.simPath===state.path));});
  }
  document.addEventListener('click',(event)=>{
    const button=event.target.closest('button');if(!button)return;
    if(button.dataset.view){showView(button.dataset.view);return;}
    if(button.dataset.go){showView(button.dataset.go);return;}
    if(button.dataset.domain){openDomain(button.dataset.domain);return;}
    if(button.dataset.campaign){state.campaign=button.dataset.campaign;state.pool=null;state.filter='all';showView('overview');inventory();$('domain-table').scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(button.dataset.pool){state.pool=state.pool===button.dataset.pool?null:button.dataset.pool;state.campaign=null;state.filter='all';pools();inventory();$('domain-table').scrollIntoView({behavior:'smooth',block:'center'});return;}
    if(button.dataset.filter){state.filter=button.dataset.filter;inventory();return;}
    if(button.dataset.simPath){state.path=button.dataset.simPath;state.step=0;simulation();}
  });
  $('search').addEventListener('input',(e)=>{state.query=e.target.value;inventory();});
  $('reload').addEventListener('click',()=>window.location.reload());
  $('reload').title='Reload the published snapshot. A new agent run is required to collect and publish new evidence.';
  $('spotlight-detail').addEventListener('click',()=>openDomain(selected()?.name));
  $('all-attention').addEventListener('click',()=>{state.filter='attention';state.pool=null;state.campaign=null;pools();inventory();$('domain-table').scrollIntoView({behavior:'smooth',block:'center'});});
  $('overlap-notice').addEventListener('click',()=>{state.pool='overlap';state.campaign=null;state.filter='all';pools();inventory();$('domain-table').scrollIntoView({behavior:'smooth',block:'center'});});
  $('clear-filter').addEventListener('click',()=>{state.pool=null;state.campaign=null;pools();inventory();});
  $('detail-close').addEventListener('click',()=>$('detail-dialog').close());
  $('sim-next').addEventListener('click',()=>{state.step++;simulation();});
  $('sim-reset').addEventListener('click',()=>{state.step=0;simulation();});
  $('snapshot-time').textContent=data.snapshotLabel;
  $('scope-text').title='Warmup: '+data.windows.warmup.start+'–'+data.windows.warmup.end+'; sending: '+data.windows.sending.start+'–'+data.windows.sending.end;
  $('scope-text').textContent=(data.synthetic?'Example':'PlusVibe')+' · '+number(data.totals.domains)+' domains · '+number(data.totals.mailboxes)+' mailboxes';
  document.querySelector('.scope-tag').textContent=data.complete?'Declared scope complete':'Partial fleet view';
  $('lane-mapping-label').textContent=data.campaigns.some((c)=>c.laneSource==='name')?'Inferred campaign lanes':'Campaign lanes';
  $('lane-mapping-label').title='Memberships are captured observations. Lane labels may be inferred from campaign names; explicit pool designation is separate.';
  pools();spotlight();campaigns();inventory();showView('overview');
})();
