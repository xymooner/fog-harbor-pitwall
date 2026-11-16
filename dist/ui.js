'use strict';
const $ = id => document.getElementById(id);
const paceNames = {save:'保胎', balanced:'均衡', push:'追击'};
const pitNames = {none:'留场', slick:'换干胎', wet:'换雨胎'};
const compounds = {slick:'干胎', wet:'雨胎'};
const modes = {
  hyper:{name:'邀请赛 · 32 圈',length:32,start:0,engine:HyperRace},
  full:{name:'全程 32 圈',length:32,start:0,engine:FullRace,mission:'从 P6 发车。掌握四轮状态和雨势，指挥 27 号车跑完 32 圈。'},
  sprint:{name:'最后八圈',length:8,start:24,engine:RaceEngine,mission:'接手比赛的最后八圈。右后胎只剩 43%，19 号车已经追进一秒。'}
};
const saveKey = 'pitwall.fogharbor.v2';
function loadJson(key) {
  try {return JSON.parse(localStorage.getItem(key));} catch {return null;}
}
function validOrders(list, limit) {
  return Array.isArray(list) && list.length<=limit && list.every(c=>c && Object.hasOwn(paceNames,c.pace) && Object.hasOwn(pitNames,c.pit));
}
function restoreRace(saved, limit) {
  return {orders:validOrders(saved?.orders,limit)?saved.orders:[],previous:validOrders(saved?.previous,limit) && saved.previous.length===limit?saved.previous:null};
}
function loadGame() {
  const stored=loadJson(saveKey);
  const old=loadJson('pitwall.fogharbor.v1');
  const full=restoreRace(stored?.full,32);
  const sprint=restoreRace(stored?.sprint ?? old,8);
  const teams=Object.fromEntries(HyperGrid.entries.map(team=>[team.id,restoreRace(stored?.hyper?.teams?.[team.id],32)]));
  const selected=Object.hasOwn(teams,stored?.hyper?.selected)?stored.hyper.selected:'warspite';
  const mode=Object.hasOwn(modes,stored?.mode)?stored.mode:
    sprint.orders.length || sprint.previous?'sprint':stored && (full.orders.length || full.previous)?'full':'hyper';
  const coachMode=['all','key','off'].includes(stored?.coachMode) ? stored.coachMode : 'all';
  return {mode,full,sprint,hyper:{selected,teams},coachMode};
}
const game=loadGame();
function currentSession() {
  return game.mode==='hyper'?game.hyper.teams[game.hyper.selected]:game[game.mode];
}
let session=currentSession();
let mode=modes[game.mode];
function simulateOrders(orders) {
  return mode.engine.simulate(orders,game.hyper.selected);
}
function replayFrames() {
  return Array.from({length:session.orders.length + 1}, (_, count) =>
    simulateOrders(session.orders.slice(0, count)));
}
let frames=replayFrames();
let race=frames.at(-1);
let advice=null;
let next={pace:session.orders.at(-1)?.pace||'balanced',pit:'none'};
let showTrack=false;
function save() {
  try {localStorage.setItem(saveKey,JSON.stringify(game));} catch {$('toast').textContent='浏览器未能保存；本轮仍可继续。';}
}
function time(seconds) {
  if(!Number.isFinite(seconds))return '—';
  const ms=Math.round(seconds*1000);
  return Math.floor(ms/60000)+':'+String(Math.floor(ms%60000/1000)).padStart(2,'0')+'.'+String(ms%1000).padStart(3,'0');
}
function signed(value) {return (value>0?'+':'')+value.toFixed(2);}
function rivalReport(s) {
  const i=s.position-1, me=s.standings[i], ahead=s.standings[i-1], behind=s.standings[i+1];
  if(!s.lap)return '前车 #'+ahead.number+' '+ahead.name+'\n后车 #'+behind.number+' '+behind.name+'\n首圈冲线后显示实测车距和圈速。';
  function report(car,gap,front) {
    if(!car)return front?'我们领跑。':'我们排在最后。';
    const prefix=(front?'前车':'后车')+' #'+car.number+'，相距 '+gap.toFixed(2)+' 秒。它上圈 '+time(car.lastLap)+'。';
    if(me.pitted || car.pitted)return prefix+(me.pitted && car.pitted?'双方均进站':me.pitted?'我方进站':'对方进站')+'，此圈含进站损失。';
    const diff=s.lastLap-car.lastLap;
    const words=Math.abs(diff)<.005?'与我们同速':(diff>0?'比我们快 ':'比我们慢 ')+Math.abs(diff).toFixed(2)+' 秒';
    return prefix+words+'。';
  }
  return report(ahead,me.interval,true)+'\n'+report(behind,behind?.interval,false);
}
function tyreReport(s) {
  if(s.tyres) {
    const labels={LF:'左前',RF:'右前',LR:'左后',RR:'右后'};
    const [id,wheel]=Object.entries(s.tyres).sort((a,b)=>a[1].remaining-b[1].remaining)[0];
    return compounds[s.tyre]+' · 已跑 '+s.stint+' 圈\n'+labels[id]+'胎余量 '+wheel.remaining+'%，胎温 '+wheel.temp+'°C。工作温区 '+s.tyreWindow.low+'–'+s.tyreWindow.high+'°C。';
  }
  const prev=s.history.at(-2),last=s.history.at(-1);
  return compounds[s.tyre]+' · 右后胎 '+s.rr+'%\n'+(last.pit==='none'?'上圈消耗 '+Math.max(0,prev.rr-last.rr)+' 个百分点。':'上圈刚换过胎。');
}
function renderRadioReports(s, frames) {
  function report(id, heading, lines) {
    const content=[];
    if(heading) {
      const title=document.createElement('strong');
      title.textContent=heading;
      content.push(title);
    }
    for(const line of lines) {
      const paragraph=document.createElement('p');
      paragraph.textContent=line;
      content.push(paragraph);
    }
    $(id).replaceChildren(...content);
  }
  report('radioWeather',s.weather.label,[s.weather.forecast]);
  const driverFrame=frames.findLast(frame=>frame.radioCalls.some(call=>call.role==='driver'));
  const lastCall=driverFrame?.radioCalls.findLast(call=>call.role==='driver');
  const driver=s.driver?.name || s.standings[s.position-1].number+' 号车手';
  const when=driverFrame && driverFrame.lap!==s.lap ? ' · 上次通话 L'+driverFrame.lap : '';
  report('radioDriver',driver+when,[lastCall?.text || s.driver?.feedback || '暂无车手来讯。']);
  const [tyre,details]=tyreReport(s).split('\n');
  report('radioTyres',tyre,[details]);
  report('radioRivals','',rivalReport(s).split('\n'));
}
function renderRadio() {
  const lapLabel=lap=>lap ? '第 '+lap+' 圈' : '发车格';
  function callRows(frame, archived) {
    const calls=archived ? frame.radioCalls : frame.radioCalls.filter(call=>call.role!=='driver');
    return [...calls].reverse().map(call=>{
      const item=document.createElement('li');
      const label=document.createElement('strong');
      const body=document.createElement('p');
      item.className='call-'+call.role;
      const sender=call.role==='driver' ? (frame.driver?.name||'#27')+' · 车手' : '比赛工程师';
      label.textContent=archived ? lapLabel(frame.lap)+' · '+sender : sender;
      body.textContent=call.text;
      item.append(label,body);
      return item;
    });
  }
  $('radioLap').textContent=lapLabel(race.lap);
  $('radioFeed').replaceChildren(...callRows(race,false));
  const older=frames.slice(0,-1).reverse().flatMap(frame=>callRows(frame,true));
  $('radioArchive').hidden=!older.length;
  $('archiveCount').textContent='往圈通话（'+older.length+' 条）';
  $('olderCalls').replaceChildren(...older);
  renderRadioReports(race,frames);
  window.PitwallCrew?.render(game.mode==='hyper' ? HyperGrid.entries.find(entry=>entry.id===game.hyper.selected) : null);
}
function renderCoach() {
  const box=$('coachAdvice');
  $('coachMode').value=game.coachMode;
  advice=game.coachMode==='off'||race.finished ? null : PitwallAdvisor.recommend(race,frames.slice(-4),game.mode);
  box.replaceChildren();
  box.hidden=!advice;
  if(!advice)return;
  if(game.coachMode==='key' && advice.priority!=='key') {
    box.textContent='正在监听。进站窗口或关键攻防出现时提醒你。';
    return;
  }
  const action=document.createElement('strong');
  const reason=document.createElement('p');
  const risk=document.createElement('p');
  const use=document.createElement('button');
  action.textContent=advice.action;
  reason.textContent=advice.reason;
  risk.className='coach-risk';risk.textContent='风险 · '+advice.risk;
  use.type='button';use.id='takeAdvice';
  use.textContent='选用这条建议';
  box.append(action,reason,risk,use);
}
function drawTrace() {
  const rows=race.history.slice(-5);
  if(!rows.length) {
    $('trace').innerHTML='<p class="trace-empty">等待首圈计时</p>';
    $('lastTime').textContent='—';
    $('timingHistory').replaceChildren();
    return;
  }
  const times=rows.map(r=>r.time), high=Math.max(...times), span=Math.max(0.5,high-Math.min(...times));
  const points=rows.map((r,i)=>({x:43+i*73,y:14+(high-r.time)/span*46}));
  const line=points.map(p=>p.x+','+p.y.toFixed(1)).join(' ');
  const labels=points.map((p,i)=>'<g><title>L'+rows[i].lap+' · '+time(rows[i].time)+'</title><circle cx="'+p.x+'" cy="'+p.y+'" r="3.5" fill="'+(i===rows.length-1?'#df6544':'#537c69')+'"/><text x="'+p.x+'" y="84" text-anchor="middle">L'+rows[i].lap+'</text></g>').join('');
  const aria=rows.map(r=>'第'+r.lap+'圈 '+time(r.time)).join('，');
  $('trace').innerHTML='<svg viewBox="0 0 390 94" role="img" aria-label="'+aria+'"><g stroke="#dce1d6" stroke-dasharray="3 3"><path d="M34 14H342 M34 37H342 M34 60H342"/></g><g fill="#526358" font-family="monospace" font-size="9"><text x="2" y="17">'+high.toFixed(1)+'</text><text x="2" y="63">'+(high-span).toFixed(1)+'</text><text x="346" y="17">秒</text><polyline points="'+line+'" fill="none" stroke="#547e68" stroke-width="2.5"/>'+labels+'</g></svg>';
  $('lastTime').textContent=time(race.lastLap);
  const splits=Boolean(rows[0].sectors);
  $('timingHistory').innerHTML='<table><thead><tr><th>圈</th>'+(splits?'<th>S1</th><th>S2</th><th>S3</th>':'<th>节奏</th>')+'<th>圈速</th></tr></thead><tbody>'+
    [...rows].reverse().map(r=>'<tr><td>L'+r.lap+'</td>'+(splits?r.sectors.map(t=>'<td>'+t.toFixed(2)+'</td>').join(''):'<td>'+paceNames[r.pace]+'</td>')+'<td>'+time(r.time)+(r.pit!=='none'?' · PIT':'')+'</td></tr>').join('')+'</tbody></table>';
  if(race.effects) {
    const labels={pace:'配速指令',weather:'路况与胎种',tyres:'胎温与磨耗',driver:'车手与赛车',traffic:'车流',pit:'进站'};
    const factors=Object.entries(race.effects).map(([key,seconds])=>'<li><span>'+labels[key]+'</span><b>'+signed(seconds)+' s</b></li>').join('');
    $('timingHistory').insertAdjacentHTML('beforeend','<details class="lap-effects"><summary>上一圈的时间花在哪？</summary><p>以模拟基准 '+time(race.referenceTime)+' 为起点；正值表示损失时间。</p><ul>'+factors+'</ul></details>');
  }
}
function result() {
  const s=race, rows=s.history.filter(r=>r.lap>mode.start);
  const stops=rows.filter(r=>r.pit!=='none');
  const placeDelta=6-s.position;
  $('result').textContent='P'+s.position+' 完赛 · '+(placeDelta===0?'守住发车位':(placeDelta>0?'净升 ':'净降 ')+Math.abs(placeDelta)+' 位')+'。用时 '+time(s.elapsed)+'。'+(stops.length?stops.map(r=>'L'+r.lap+' '+pitNames[r.pit]).join('，')+'。':'全程未进站。');
  if(session.previous) {
    const prior=simulateOrders(session.previous),delta=s.elapsed-prior.elapsed;
    $('compare').textContent='上次 P'+prior.position+' / '+time(prior.elapsed)+'。本次'+(Math.abs(delta)<.0005?'用时相同。':(delta<0?'快 ':'慢 ')+Math.abs(delta).toFixed(3)+' 秒。');
  } else $('compare').textContent='重试可以比较另一种策略的完赛时间。';
  $('timeline').innerHTML=rows.map(r=>'<div class="logrow"><b>L'+r.lap+'</b><span>'+paceNames[r.pace]+' · '+pitNames[r.pit]+' · '+r.weather+' · '+time(r.time)+'</span><b>P'+r.position+'</b></div>').join('');
  $('reviewLap').innerHTML=rows.map(r=>'<option value="'+(r.lap-mode.start-1)+'">第 '+r.lap+' 圈前</option>').join('');
  $('reviewLap').selectedIndex=Math.max(0,rows.findIndex(r=>r.pit!=='none'));
}
function reviewDecision() {
  if(!race.finished || !$('decisionReview').open)return;
  // Change one input at one lap. Every other order, including later stops, stays fixed.
  let best=null;
  session.orders.forEach((order,index)=>{
    for(const [field,labels] of [['pace',paceNames],['pit',pitNames]]) {
      for(const value of Object.keys(labels)) {
        if(order[field]===value)continue;
        const trial=session.orders.slice();
        trial[index]={...order,[field]:value};
        const replay=simulateOrders(trial);
        if(replay.elapsed<race.elapsed && (!best || replay.elapsed<best.elapsed)) {
          best={index, old:labels[order[field]], choice:labels[value], elapsed:replay.elapsed, position:replay.position};
        }
      }
    }
  });
  $('decisionText').textContent=best
    ? '在本场回放里，只把 L'+(mode.start+best.index+1)+' 的「'+best.old+'」改成「'+best.choice+'」，其余指令照旧，可快 '+(race.elapsed-best.elapsed).toFixed(3)+' 秒，以 P'+best.position+' 完赛。这是逐圈单独改一项时收益最大的一处。'
    : '逐圈试过单独改一项配速或进站指令，均未缩短本场总用时。组合调整仍可能有收益。';
  if(best)$('reviewLap').value=String(best.index);
}
function renderControls() {
  $('rewind').disabled=!session.orders.length;
  $('strategy').hidden=race.finished;$('debrief').hidden=!race.finished;
  if(race.finished){result();return;}
  $('nextLap').textContent='LAP '+(race.lap+1)+' / '+race.totalLaps;
  $('advance').innerHTML='下达指令 · 跑第 '+(race.lap+1)+' 圈<b>→</b>';
  const allowCruise=game.mode!=='sprint';
  $('cruise').hidden=!allowCruise;$('cruiseHint').hidden=!allowCruise;
  $('cruise').disabled=next.pit!=='none' || race.remaining<2;
  $('cruiseHint').textContent=next.pit!=='none'?'进站指令逐圈执行。':'路况、名次变化或出现新警报时交回指挥。';
  const take=$('takeAdvice');
  if(take && advice) {
    take.disabled=next.pace===advice.pace && next.pit===advice.pit;
    take.textContent=take.disabled?'已选此策略':'选用这条建议';
  }
  for(const key of ['pace','pit'])for(const btn of $(key).querySelectorAll('button'))btn.setAttribute('aria-pressed',String(btn.dataset.value===next[key]));
}
function renderRaceVisual() {
  const hyper=game.mode==='hyper';
  const showPhoto=hyper && !showTrack;
  const photo=$('heroPhoto');
  if(showPhoto && photo.dataset.team!==game.hyper.selected) {
    photo.replaceChildren(PitwallGarage.figure(game.hyper.selected));
    photo.dataset.team=game.hyper.selected;
  }
  photo.hidden=!showPhoto;
  $('raceVisual').classList.toggle('show-car',showPhoto);
  $('switchVisual').hidden=!hyper;
  $('switchVisual').textContent=showPhoto?'看赛道图':'看本队赛车';
}
function render() {
  const s=race, behind=s.standings[s.position], isFull=game.mode!=='sprint';
  const me=s.standings[s.position-1], hyper=game.mode==='hyper';
  $('heroMode').textContent=mode.name;
  $('mission').textContent=hyper ? '#'+me.number+' '+me.name+' · '+s.car.name+'　/　'+s.driver.name : mode.mission;
  $('ownTeam').textContent=me.name.toUpperCase();
  $('ownNumber').textContent=me.number;
  $('mastClass').textContent=(hyper?'雾港邀请赛':'GT3')+' / 策略模拟';
  $('traceTag').textContent='#'+me.number+' / LAST 5';
  renderRaceVisual();
  $('phaseText').textContent=(s.finished?'方格旗':!s.lap?'发车格就位':'剩余 '+s.remaining+' 圈')+'　/　'+s.weather.label;
  $('raceProgress').max=mode.length;$('raceProgress').value=session.orders.length;
  $('rank').innerHTML='<i class="letter">P</i>'+s.position+'<small>/ '+s.standings.length+'</small>';
  $('lap').innerHTML=s.lap+'<small>/ '+s.totalLaps+'</small>';
  $('gap').innerHTML=Number.isFinite(behind?.interval)?'+'+behind.interval.toFixed(1)+'<small>s</small>':'—';
  $('rr').innerHTML=s.rr+'<small>%</small>';
  PitwallTiming.render(s,frames.slice(-4));
  $('engineeringSection').hidden=!isFull;
  const engNav=document.querySelector('a[href="#engineeringSection"]');if(engNav)engNav.hidden=!isFull;
  if(isFull)Engineering.render($('engineering'),s);
  drawTrace();renderRadio();renderCoach();renderControls();
  for(const b of $('modeDialog').querySelectorAll('[data-mode]')){b.dataset.active=String(b.dataset.mode===game.mode);b.setAttribute('aria-pressed',b.dataset.active);}
  window.drawCircuit?.($('circuit'),s.weather.wetness);
}
function brief() {
  const s=race;
  const me=s.standings[s.position-1];
  const recent=s.history.slice(-5).map(r=>'L'+r.lap+' '+time(r.time)+' P'+r.position+' '+r.weather+' '+pitNames[r.pit]).join('；')||'尚未发车';
  const event=game.mode==='hyper'?'雾港邀请赛':'雾港 GT3 耐力赛';
  return ['你是虚构的'+event+' #'+me.number+' '+me.name+' 的比赛工程师。请只用下列已知数据，给下一圈一个建议、理由和最大的不确定性。若已完赛请复盘。不要虚构未来天气或对手计划。由我下令。',
    mode.name+'。已完成 L'+s.lap+'/'+s.totalLaps+'，P'+s.position+'。进站损失约 22 秒。指令为保胎、均衡或追击，另选留场、换干胎或换雨胎。',
    s.tyres?Engineering.brief(s):tyreReport(s)+' '+s.weather.forecast,
    rivalReport(s),'无线电：'+s.radio,'最近五圈：'+recent,'排名：'+s.standings.map(c=>'P'+c.position+' #'+c.number+' '+c.name+' '+(c.gap===null?'发车格':'距头车 '+c.gap.toFixed(2)+'s')+(c.position>1 && Number.isFinite(c.interval)?' 距前车 '+c.interval.toFixed(2)+'s':'')+' '+compounds[c.tyre]).join('；')
  ].join('\n');
}
function applyLap(order) {
  session.orders.push({...order});
  race=simulateOrders(session.orders);
  frames.push(race);
}
function stopReason(before,after) {
  if(after.finished)return '比赛结束';
  if(before.weather.label!==after.weather.label)return '路况变化';
  if(before.position!==after.position)return '排名变化';
  if(before.rr>25 && after.rr<=25)return '右后胎余量已到 25% 以下';
  if(before.driver.fatigue<75 && after.driver.fatigue>=75)return '车手疲劳达到 75%';
  if(game.coachMode!=='off') {
    const now=PitwallAdvisor.recommend(after,frames.slice(-4),game.mode);
    const prior=PitwallAdvisor.recommend(before,frames.slice(-5,-1),game.mode);
    if(now.priority==='key' && (now.pit!==next.pit || now.pace!==next.pace) &&
      (prior.priority!=='key' || now.pit!==prior.pit || now.pace!==prior.pace))return '副队长有新的关键建议';
  }
  return '';
}
function sendOrder(count) {
  if(race.finished || count>1 && (game.mode==='sprint'||next.pit!=='none'))return;
  const total=Math.min(count,race.remaining);
  let reason='',laps=0;
  for(let i=0;i<total;i++) {
    const before=race;
    applyLap(next);laps++;next.pit='none';
    if(count>1){reason=stopReason(before,race);if(reason)break;}
  }
  $('toast').textContent=count>1?'已跑 '+laps+' 圈'+(reason?'，'+reason:'')+'。':'';
  save();render();
}
function branch(index) {
  if(race.finished)session.previous=session.orders.slice();
  const old=session.orders[index];
  session.orders=session.orders.slice(0,index);
  next={pace:old?.pace||'balanced',pit:old?.pit||'none'};
  frames.length=index+1;race=frames.at(-1);
  $('decisionReview').open=false;
  $('toast').textContent='已回到第 '+(race.lap+1)+' 圈下令前。';
  save();render();
}
for(const key of ['pace','pit'])$(key).addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b || race.finished)return;
  next[key]=b.dataset.value;renderControls();
});
$('coachMode').addEventListener('change',e=>{game.coachMode=e.target.value;save();renderCoach();renderControls();});
$('coachAdvice').addEventListener('click',e=>{
  if(e.target.id!=='takeAdvice'||!advice)return;
  next={pace:advice.pace,pit:advice.pit};renderControls();
});
$('decisionReview').addEventListener('toggle',reviewDecision);
$('openGarage').addEventListener('click',()=>PitwallGarage.open(game.hyper.selected,game.hyper.teams));
$('switchVisual').addEventListener('click',()=>{
  showTrack=!showTrack;renderRaceVisual();
  if(showTrack)window.drawCircuit?.($('circuit'),race.weather.wetness);
});
$('teamGarage').addEventListener('pickteam',event=>{
  if(!Object.hasOwn(game.hyper.teams,event.detail.id))return;
  game.hyper.selected=event.detail.id;
  switchSession('hyper');
});
$('openGallery').addEventListener('click',()=>$('carGallery').showModal());
$('carGallery').addEventListener('click',event=>{
  const thumbnail=event.target.closest('.gallery-photo');
  if(!thumbnail)return;
  const card=thumbnail.closest('.car-sheet');
  $('photoTitle').textContent=card.querySelector('h3').textContent;
  $('largePhoto').replaceChildren(thumbnail.querySelector('img').cloneNode(),card.querySelector('.sheet-credit').cloneNode(true));
  $('photoDialog').showModal();
});
$('advance').addEventListener('click',()=>sendOrder(1));
$('cruise').addEventListener('click',()=>sendOrder(3));
$('rewind').addEventListener('click',()=>{if(session.orders.length)branch(session.orders.length-1);});
$('branch').addEventListener('click',()=>branch(Number($('reviewLap').value)));
$('restart').addEventListener('click',()=>{branch(0);next={pace:'balanced',pit:'none'};renderControls();});
$('chooseMode').addEventListener('click',()=>$('modeDialog').showModal());
$('closeMode').addEventListener('click',()=>$('modeDialog').close());
$('modeDialog').addEventListener('click',e=>{
  const choice=e.target.closest('[data-mode]');if(!choice)return;
  $('modeDialog').close();
  if(choice.dataset.mode==='hyper')PitwallGarage.open(game.hyper.selected,game.hyper.teams);
  else switchSession(choice.dataset.mode);
});
function switchSession(selectedMode) {
  game.mode=selectedMode;session=currentSession();mode=modes[game.mode];
  showTrack=false;
  next={pace:session.orders.at(-1)?.pace||'balanced',pit:'none'};
  frames=replayFrames();race=frames.at(-1);$('toast').textContent='';
  $('decisionReview').open=false;$('radioArchive').open=false;
  save();render();
}
$('copy').addEventListener('click',async()=>{
  const content=brief();
  try{await navigator.clipboard.writeText(content);$('toast').textContent='已复制当前战况，可粘贴给 AI 工程师。';}
  catch{$('copyText').value=content;$('copyDialog').showModal();$('copyText').focus();$('copyText').select();}
});
$('closeDialog').addEventListener('click',()=>$('copyDialog').close());
window.addEventListener('resize',()=>window.drawCircuit?.($('circuit'),race.weather.wetness));
render();
