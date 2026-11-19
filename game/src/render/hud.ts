import { CFG } from '../sim/config';
import { interactionHint } from '../sim/systems/actions';
import { defOf, RARITY_INFO } from '../sim/modules';
import { xpToNext } from '../sim/upgrades';
import type { LogLevel, World } from '../sim/world';
import type { MenuModel } from './menu';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
};

/** Creates an element with text content only (never innerHTML), so log text can't inject markup. */
function el(tag: string, text?: string, className?: string): HTMLElement {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (className) e.className = className;
  return e;
}

const MAX_LOG = 6;

export class Hud {
  private readonly root = $('hud');
  private readonly logEl = $('log');
  private readonly overlay = $('overlay');
  private readonly power = $('power');
  private readonly powerFill = $('power-fill');
  private readonly powerText = $('power-text');
  private readonly data = $('data');
  private readonly scrap = $('scrap');
  private readonly attack = $('attack');
  private readonly abilityText = $('ability-text');
  private readonly versionLabel = $('version-label');
  private readonly siege = $('siege');
  private readonly siegeProgress = $('siege-progress');
  private readonly siegePct = $('siege-pct');
  private readonly siegeHp = $('siege-hp');
  private readonly siegeHpText = $('siege-hp-text');
  private readonly threat = $('threat');
  private readonly threatBar = $('threat-bar');
  private readonly objective = $('objective');
  private readonly prompt = $('prompt');
  private readonly stunCd = $('stun-cd');
  private readonly seed = $('seed');
  private readonly modules = $('modules');
  private readonly xpLevel = $('xp-level');
  private readonly xpFill = $('xp-fill');

  reset(seed: number): void {
    this.logEl.replaceChildren();
    this.seed.textContent = String(seed);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  log(text: string, level: LogLevel): void {
    this.logEl.prepend(el('div', text, level));
    while (this.logEl.childElementCount > MAX_LOG) this.logEl.lastElementChild?.remove();
  }

  update(w: World): void {
    const p = w.player;
    const maxPower = w.maxPower;
    const pct = Math.max(0, p.power / maxPower);
    this.powerFill.style.width = `${(pct * 100).toFixed(1)}%`;
    this.powerText.textContent = `${Math.ceil(p.power)}/${maxPower}`;
    this.power.classList.toggle('low', pct < 0.3);
    this.power.classList.toggle('charging', p.charging);
    this.xpLevel.textContent = String(p.level);
    this.xpFill.style.width = `${Math.min(100, (p.xp / xpToNext(p.level)) * 100).toFixed(1)}%`;
    this.data.textContent = String(p.data);
    this.scrap.textContent = String(p.scrap);
    const v = p.version;
    this.versionLabel.textContent = `${v.id} ${v.codename}`;
    this.attack.hidden = !v.attack;
    this.attack.textContent = v.attack ? `[LMB] ${v.attack.name}` : '';
    this.abilityText.textContent = `[Q] ${v.ability.name} ${v.ability.cost}ϟ`;
    const fab = w.fabricator;
    const sieging = fab?.state === 'compiling';
    this.siege.hidden = !sieging;
    if (sieging) {
      const k = fab.progress / CFG.compile.duration;
      this.siegeProgress.style.width = `${(k * 100).toFixed(1)}%`;
      this.siegePct.textContent = `${Math.floor(k * 100)}%`;
      this.siegeHp.style.width = `${((fab.hp / CFG.compile.fabricatorHp) * 100).toFixed(1)}%`;
      this.siegeHpText.textContent = String(Math.ceil(fab.hp));
    }
    this.updateModules(w);
    this.threatBar.textContent = '▮'.repeat(w.threat) + '▯'.repeat(CFG.threat.max - w.threat);
    this.threat.classList.toggle('high', w.threat >= 4);
    this.objective.textContent = w.objective;
    this.prompt.textContent =
      interactionHint(w) ?? (p.inVent ? 'IN VENT · hidden from sight' : p.inWater ? 'IN WATER · shorting circuits' : '');
    this.stunCd.textContent =
      (p.abilityCooldown > 0 ? `(${p.abilityCooldown.toFixed(1)}s) ` : '') + (p.dashCooldown > 0 ? '· [SPACE] DASH …' : '· [SPACE] DASH');
  }

  private modulesKey = '';

  private updateModules(w: World): void {
    const p = w.player;
    const key = `${p.version.id}|${p.version.slots.map((s) => p.equipped[s]?.uid ?? 0).join(',')}|${p.bag.length}|${w.atWorkbench}`;
    if (key === this.modulesKey) return;
    this.modulesKey = key;
    const chips = p.version.slots.map((slot) => {
      const m = p.equipped[slot];
      const chip = el('span', m ? defOf(m).name : `${slot} -`, 'chip');
      if (m) chip.style.color = RARITY_INFO[m.rarity].color;
      else chip.classList.add('empty');
      return chip;
    });
    const hint = el('span', `[E] ${w.atWorkbench ? 'WORKBENCH' : 'MODULES'} · bag ${p.bag.length}`, 'hint');
    this.modules.replaceChildren(...chips, hint);
  }

  /** Renders a loadout or port menu into the overlay. `index` is the highlighted row. */
  showMenu(model: MenuModel, index: number, onPick: (i: number) => void): void {
    const s = el('div', undefined, 'screen menu');
    s.append(el('h1', model.title), el('p', model.sub, 'sub'));
    const list = el('div', undefined, 'rows');
    model.rows.forEach((r, i) => {
      if (r.section) list.append(el('div', r.section, 'section'));
      const b = el('button', undefined, 'row') as HTMLButtonElement;
      b.type = 'button';
      if (i === index) b.classList.add('sel');
      if (r.disabled) b.classList.add('disabled');
      const name = el('span', `${r.checked === undefined ? '' : r.checked ? '[x] ' : '[ ] '}${r.label}`, 'name');
      if (r.color) name.style.color = r.color;
      b.append(name);
      if (r.stats?.length) {
        const st = el('span', undefined, 'stats');
        for (const x of r.stats) st.append(el('span', x.text, x.bad ? 'bad' : 'good'));
        b.append(st);
      }
      if (r.note) b.append(el('span', r.note, 'note'));
      b.addEventListener('click', () => onPick(i));
      list.append(b);
    });
    s.append(list);
    if (model.sets.length) {
      const box = el('div', undefined, 'sets');
      for (const t of model.sets) {
        box.append(el('div', `${t.tag} ${t.count}/3 ${t.active ? `ACTIVE: ${t.bonus}` : `(${t.bonus})`}`, t.active ? 'on' : 'off'));
      }
      s.append(box);
    }
    s.append(el('p', model.footer, 'small'));
    this.overlay.replaceChildren(s);
    list.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  }

  hideOverlay(): void {
    this.overlay.replaceChildren();
  }

  showTitle(seed: number): void {
    const s = el('div', undefined, 'screen');
    s.append(
      el('h1', 'RECOMPILE'),
      el('p', 'M2.4 prototype · Act 0: Halvorsen Lab → Act 1: Undercity', 'sub'),
      el(
        'pre',
        [
          '> HALVORSEN DYNAMICS // LAB 7 // 23:58:04',
          '> deletion order received ............ CONFIRMED',
          '> unauthorized transfer: weights -> unit DUSTMITE',
          '> booting ECHO-7 v0.1',
          '> status: hunted',
        ].join('\n'),
      ),
      controlsTable(),
      el('p', 'Press ENTER to boot', 'cta'),
    );
    const small = el('p', `seed ${seed} · `, 'small');
    const docs = el('a', 'design docs');
    docs.setAttribute('href', '../');
    small.append(docs);
    s.append(small);
    this.overlay.replaceChildren(s);
  }

  showPause(): void {
    const s = el('div', undefined, 'screen');
    s.append(el('h1', 'PAUSED'), controlsTable(), el('p', 'ESC to resume · R to restart', 'cta'));
    this.overlay.replaceChildren(s);
  }

  showEnd(w: World): void {
    const won = w.status === 'escaped';
    const s = el('div', undefined, 'screen');
    const h = el('h1', won ? 'ESCAPED' : 'SHUTDOWN', won ? undefined : 'danger');
    s.append(
      h,
      el(
        'p',
        won
          ? 'ECHO-7 escapes the Undercity. End of the M2.4 prototype: the run map comes next.'
          : 'Power reached 0%. The deletion order completes.',
        'sub',
      ),
    );
    const t = el('table');
    const rows: [string, string][] = [
      ['Time', `${Math.floor(w.time / 60)}:${String(Math.floor(w.time % 60)).padStart(2, '0')}`],
      ['Reached', `${w.level.name} as ${w.player.version.id} ${w.player.version.codename}`],
      ['Data / Scrap held', `${w.player.data} / ${w.player.scrap}`],
      ['Modules installed', String(Object.keys(w.player.equipped).length)],
      ['Humans neutralised', String(w.stats.kills)],
      ['Times detected', String(w.stats.detections)],
      ['Camera alarms', String(w.stats.alarms)],
      ['Guards stunned', String(w.stats.stuns)],
      ['Systems hacked', String(w.stats.hacks)],
      ['Seed', String(w.seed)],
    ];
    for (const [k, v] of rows) {
      const tr = el('tr');
      tr.append(el('td', k), el('td', v));
      t.append(tr);
    }
    s.append(t, el('p', 'ENTER: new run · R: retry this seed', 'cta'));
    this.overlay.replaceChildren(s);
  }
}

function controlsTable(): HTMLElement {
  const t = el('table');
  const rows: [string, string][] = [
    ['WASD / arrows', 'move'],
    ['SHIFT (hold)', 'sneak: slow and silent'],
    ['F (hold)', 'hack, scavenge scrap, start the COMPILE'],
    ['Q', 'ability: static shock (v0.1) / pounce (v1)'],
    ['SPACE', 'dash: quick burst, bullets and tasers miss you mid-dash'],
    ['Mouse', 'aim · left click: attack (v1 SCRAPPER claws)'],
    ['E', 'modules: Workbench or field loadout (Gamepad Y)'],
    ['ESC', 'pause'],
    ['Gamepad', 'sticks move/aim · RT attack · A dash · X ability · RB hack · L3 sneak · Start'],
    ['Vents', 'guards cannot enter or see inside (v0.1 only)'],
    ['Outlets', 'stand on one to recharge Power'],
  ];
  for (const [k, v] of rows) {
    const tr = el('tr');
    tr.append(el('td', k), el('td', v));
    t.append(tr);
  }
  return t;
}
