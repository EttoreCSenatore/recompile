import { CFG } from '../sim/config';
import {
  defOf,
  describeMod,
  isBadMod,
  modsOf,
  RARITY_INFO,
  SET_SIZE,
  TAGS,
  type ModKey,
  type ModuleInst,
  type Tag,
} from '../sim/modules';
import {
  confirmPort,
  dismantle,
  equip,
  installCost,
  portCost,
  rerollCost,
  rerollOffer,
  takeOffer,
  togglePort,
  unequip,
} from '../sim/systems/loadout';
import { CARDS, pickCard, rank } from '../sim/upgrades';
import type { World } from '../sim/world';

export type MenuKind = 'loadout' | 'port' | 'levelup';

export interface Row {
  label: string;
  /** Rarity colour for the label, if the row is a module. */
  color?: string;
  stats?: { text: string; bad: boolean }[];
  note?: string;
  disabled?: boolean;
  checked?: boolean;
  /** Heading shown above this row. */
  section?: string;
  act: () => void;
  /** Secondary action (X): dismantle a bagged module. */
  alt?: () => void;
}

export interface MenuModel {
  title: string;
  sub: string;
  footer: string;
  rows: Row[];
  /** Active and partial set bonuses. */
  sets: { tag: Tag; count: number; active: boolean; bonus: string }[];
}

function moduleRow(m: ModuleInst, extra: Partial<Row>): Row {
  const d = defOf(m);
  const stats = (Object.entries(modsOf(m)) as [ModKey, number][]).map(([k, v]) => ({
    text: describeMod(k, v),
    bad: isBadMod(k, v),
  }));
  const tags = d.tags.length ? ` · ${d.tags.join(' ')}` : '';
  return {
    label: `${d.name} [${RARITY_INFO[m.rarity].label}]`,
    color: RARITY_INFO[m.rarity].color,
    stats,
    note: `${d.slot.toUpperCase()}${tags}`,
    act: () => {},
    ...extra,
  };
}

export function buildMenu(w: World, kind: MenuKind, close: () => void): MenuModel {
  const p = w.player;
  const rows: Row[] = [];
  const sets = (Object.entries(p.build.tagCounts) as [Tag, number][])
    .filter(([, n]) => n > 0)
    .map(([tag, count]) => ({ tag, count, active: count >= SET_SIZE, bonus: TAGS[tag].bonus }));

  if (kind === 'levelup') {
    const offer = p.cardOffer ?? [];
    offer.forEach((id, i) => {
      const c = CARDS[id];
      const r = rank(w, id);
      rows.push({
        label: `${i + 1} · ${c.name}`,
        color: '#ffd447',
        stats: [{ text: c.text, bad: false }],
        note: r === 0 ? `NEW · max rank ${c.max}` : `rank ${r} → ${r + 1} of ${c.max}`,
        section: i === 0 ? 'CHOOSE ONE' : undefined,
        act: () => pickCard(w, i),
      });
    });
    const owned = (Object.entries(p.cards) as [keyof typeof CARDS, number][]).map(([id, n]) => `${CARDS[id].name} ${n}`).join(' · ');
    return {
      title: `ITERATION ${p.level - p.pendingLevels + 1}`,
      sub: `ECHO learned from the fight. Install a subroutine.${p.pendingLevels > 1 ? ` (${p.pendingLevels} picks waiting)` : ''}${owned ? ` Installed: ${owned}.` : ''}`,
      footer: '1 2 3 · or ↑↓ + ENTER · or click',
      rows,
      sets: [],
    };
  }

  if (kind === 'port') {
    const port = w.port!;
    port.candidates.forEach((m, i) => {
      rows.push(
        moduleRow(m, {
          section: i === 0 ? 'CARRY INTO THE NEW BODY (tuned up one tier; anomalous stay as they are)' : undefined,
          checked: port.chosen.has(m.uid),
          note: `${defOf(m).slot.toUpperCase()} · port cost ${RARITY_INFO[m.rarity].portScrap} ▣`,
          act: () => togglePort(w, m.uid),
        }),
      );
    });
    rows.push({
      label: `CONFIRM · port ${port.chosen.size} for ${portCost(w)} ▣ (you have ${p.scrap})`,
      section: 'DONE',
      act: () => confirmPort(w),
    });
    return {
      title: 'PORT MODULES',
      sub: `Compile finished. ${p.version.codename} has ${p.version.slots.length} slots. Anything you do not port is lost.`,
      footer: '↑↓ select · ENTER toggle / confirm',
      rows,
      sets,
    };
  }

  const bench = w.atWorkbench;
  p.version.slots.forEach((slot, i) => {
    const m = p.equipped[slot];
    if (m) {
      rows.push(moduleRow(m, { section: i === 0 ? 'INSTALLED (ENTER removes)' : undefined, act: () => unequip(w, slot) }));
    } else {
      rows.push({ label: `${slot.toUpperCase()} · empty`, section: i === 0 ? 'INSTALLED (ENTER removes)' : undefined, disabled: true, act: () => {} });
    }
  });
  p.bag.forEach((m, i) => {
    const cost = installCost(w, m);
    const fits = p.version.slots.includes(defOf(m).slot);
    rows.push(
      moduleRow(m, {
        section: i === 0 ? `BAG ${p.bag.length}/${CFG.modules.bagSize} (ENTER installs · X dismantles)` : undefined,
        disabled: !fits || p.scrap < cost,
        note: `${defOf(m).slot.toUpperCase()}${defOf(m).tags.length ? ` · ${defOf(m).tags.join(' ')}` : ''} · ${fits ? `install ${cost} ▣` : 'no slot in this body'}`,
        act: () => equip(w, m.uid),
        alt: () => dismantle(w, m.uid),
      }),
    );
  });
  if (p.bag.length === 0) rows.push({ label: 'Bag empty. Crack caches (F) and neutralise humans for modules.', disabled: true, section: `BAG 0/${CFG.modules.bagSize}`, act: () => {} });
  if (bench && w.workbench) {
    const offer = w.workbench.offer;
    rows.push(
      offer
        ? moduleRow(offer, { section: 'WORKBENCH OFFER', act: () => takeOffer(w) })
        : { label: 'Offer taken.', section: 'WORKBENCH OFFER', disabled: true, act: () => {} },
    );
    rows.push({
      label: `Reroll offer · ${rerollCost(w)} ◇ (rises each time this act)`,
      disabled: p.data < rerollCost(w),
      act: () => rerollOffer(w),
    });
  }
  rows.push({ label: 'Close', section: ' ', act: close });
  return {
    title: bench ? 'WORKBENCH' : 'FIELD LOADOUT',
    sub: bench
      ? 'Installing here is cheap. Take the offer or spend DATA to reroll it.'
      : `No workbench in reach: installing costs ×${CFG.modules.fieldInstallMult} SCRAP.`,
    footer: '↑↓ select · ENTER act · X dismantle · E / ESC close',
    rows,
    sets,
  };
}
