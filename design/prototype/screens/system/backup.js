// system/backup — backup and restore (FR-041, FR-034; Document 07 §7 migrations, backups and restore
// validation; Document 11 §4 personal installation and recovery).
//
// Full-screen page. A backup holds versioned metadata and media REFERENCES; media copies are opt-in and
// rights-aware; tokens, provider secrets and restricted caches are excluded. Restore validates the archive
// (version, schema, paths, size, duplicate IDs) before anything changes, saves a checkpoint of the current
// data first, and keeps cue / grid conflicts for a deliberate decision. No writer or validator exists:
// THIS SCREEN STANDS IN FOR THEM and prints fixture results; backup progress is honestly "unknown".
import { register } from '../../app/registry.js';
import { load } from '../../app/fixtures.js';
import { h, button, icon } from '../../components/base.js';
import { pageHead, notice, panel, kv, bullets, statusWord, setFlash, takeFlash } from './index.js';

const SYS = await load('system');
const B = SYS.backup;
const ID = 'system/backup';
const A = (id) => B.archives.find((a) => a.id === id);

register({
  id: ID, family: 'system', title: 'Backup and restore', order: 4,
  fr: ['FR-041', 'FR-034', 'FR-040'],
  shell: false,
  states: {
    backup: { label: 'Backup and available archives', exercised: true },
    'in-progress-unknown': { label: 'Backing up — progress unknown', exercised: true, via: { from: 'backup', control: 'Back up now' } },
    'restore-ok': { label: 'Restore — archive validated', exercised: true, via: { from: 'backup', control: 'Restore backup-2026-10-24' } },
    'restore-mismatch': { label: 'Restore — newer version mismatch', exercised: true, via: { from: 'backup', control: 'Restore backup-tablet-0.5' } },
    'restore-rejected': { label: 'Restore — archive rejected (unsafe path)', exercised: true, via: { from: 'backup', control: 'Restore shared-archive' } },
    'restore-conflicts': { label: 'Restored — cue / grid conflicts kept for you', exercised: true, via: { from: 'restore-ok', control: 'Restore now' } },
    'restore-resolved': { label: 'First conflict resolved (kept mine)', exercised: true, via: { from: 'restore-conflicts', control: 'Keep mine' } },
  },
  defaultState: 'backup',
  render(ctx) {
    const st = ctx.state;
    const flash = takeFlash(ID, st);
    const root = h('div', { class: 'system-page system-backup stage', dataset: { state: st } });
    const head = pageHead(ctx, { title: 'Backup and restore', sub: 'Your preparation and settings, separate from media and caches.', back: { label: 'Back to Settings', to: 'system/settings' } });
    const live = h('div', { class: 'system-live', 'aria-live': 'polite' });
    if (flash) live.appendChild(notice({ tone: flash.tone, ic: flash.ic, lead: flash.lead, text: flash.text, role: 'status' }));
    const say = (n) => live.replaceChildren(n);
    let content;
    if (st === 'backup') content = backupHome(ctx);
    else if (st === 'in-progress-unknown') content = inProgress(ctx);
    else if (st === 'restore-ok') content = restoreOk(ctx);
    else if (st === 'restore-mismatch') content = restoreMismatch(ctx, say);
    else if (st === 'restore-rejected') content = restoreRejected(ctx, say);
    else content = conflicts(ctx, st === 'restore-resolved');
    root.append(head, h('div', { class: 'system-page__scroll' }, [live, content]));
    return root;
  },
});

function archiveCard(a, extra = []) {
  return h('div', { class: 'system-archive raised', role: 'group', 'aria-label': `Archive ${a.id}` }, [
    h('div', { class: 'system-archive__head' }, [
      h('span', { class: 'system-archive__icon', 'aria-hidden': 'true' }, [icon('backup', { size: 18 })]),
      h('div', { class: 'system-archive__titles' }, [
        h('span', { class: 'title numeral system-archive__id', text: a.id }),
        h('span', { class: 'body muted', text: `${a.date} · app ${a.app} · schema ${a.schema} · ${a.size}${a.media ? ' · includes media' : ''}` }),
      ]),
    ]),
    ...extra,
  ]);
}

function backupHome(ctx) {
  const media = h('mdj-settings-row', { kind: 'toggle', name: 'backup-media', label: 'Include media copies', value: 'off', detail: 'Opt-in. Copies only files you imported yourself; provider-controlled media is never copied. Can be large.', icon: 'music' });
  media.addEventListener('mdj:setting-change', (e) => { media.setAttribute('value', e.detail.value); media.setAttribute('dirty', e.detail.value === 'on' ? '' : 'false'); });
  const backupPanel = panel({ title: 'Back up', ic: 'backup', fixture: 'backup contents', children: [
    h('p', { class: 'body', text: `Last backup: ${B.lastBackup}. Writes a versioned archive to Phone storage › Mobile DJ › Backups.` }),
    kv(B.contents),
    h('p', { class: 'label', text: 'Never included' }),
    bullets(B.excluded, 'x', 'system-bullets--excluded'),
    media,
    h('div', { class: 'system-actions' }, [
      button({ label: 'Back up now', icon: 'backup', hit: 48, cls: 'btn--primary', fr: ['FR-041'], on: { click: () => ctx.setState('in-progress-unknown') } }),
    ]),
  ] });
  const list = h('ul', { class: 'system-archives' }, B.archives.map((a) => h('li', {}, [archiveCard(a, [
    h('div', { class: 'system-archive__actions' }, [
      button({ label: `Restore ${a.id}`, icon: 'restore', hit: 48, cls: 'btn--secondary system-archive__restore', fr: ['FR-041'], on: { click: () => {
        const next = a.id === 'backup-tablet-0.5' ? 'restore-mismatch' : a.id === 'shared-archive' ? 'restore-rejected' : 'restore-ok';
        ctx.setState(next);
      } } }),
    ]),
  ])])));
  const restorePanel = panel({ title: 'Restore', ic: 'restore', note: 'Pick an archive. It is checked before anything changes, and your current data is saved as a checkpoint first.', children: [list] });
  return h('div', { class: 'system-grid system-grid--two' }, [backupPanel, restorePanel]);
}

function inProgress(ctx) {
  const steps = [
    ['done', 'Checkpoint of current data taken at 21:52 (fixture)'],
    ['current', 'Writing metadata and media references'],
    ['todo', 'Verify the archive (checksums, paths, size)'],
    ['todo', 'Publish backup-2026-10-31 to Backups'],
  ];
  return h('div', { class: 'system-grid system-grid--two' }, [
    panel({ title: 'Backing up', ic: 'backup', fixture: 'backup writer', children: [
      h('div', { class: 'system-progress', role: 'progressbar', 'aria-label': 'Backup progress', 'aria-valuetext': 'Progress unknown' }, [h('span', { class: 'system-progress__hatch' })]),
      h('p', { class: 'title', text: 'Progress unknown' }),
      h('p', { class: 'body muted', text: 'The writer reports no measurable total, so no percentage is shown. Playback, preparation and the library stay usable meanwhile.' }),
      h('ol', { class: 'system-steps' }, steps.map(([s, t]) => h('li', { class: `system-steps__item is-${s}` }, [
        h('span', { class: 'system-steps__mark', 'aria-hidden': 'true' }, [icon(s === 'done' ? 'check' : s === 'current' ? 'loader' : 'minus', { size: 14 })]),
        h('span', { class: 'body', text: t }),
        h('span', { class: 'label system-steps__word', text: s === 'done' ? 'Done (fixture)' : s === 'current' ? 'Now' : 'To do' }),
      ]))),
    ] }),
    panel({ title: 'If you stop now', ic: 'info', children: [
      h('p', { class: 'body', text: 'Cancel deletes the partial file. Your last complete backup (24 Oct, 21:15) is not touched, and nothing in your library changes.' }),
      h('div', { class: 'system-actions' }, [
        button({ label: 'Cancel backup', icon: 'cancel', hit: 48, cls: 'btn--danger', fr: ['FR-041'], on: { click: () => { setFlash(ID, { state: 'backup', tone: 'neutral', ic: 'cancel', lead: 'Backup cancelled.', text: 'The writer confirmed the partial file was removed (fixture acknowledgement). Last backup: 24 Oct, 21:15.' }); ctx.setState('backup'); } } }),
      ]),
    ] }),
  ]);
}

function restoreOk(ctx) {
  const a = A('backup-2026-10-24');
  return h('div', { class: 'system-grid system-grid--two' }, [
    h('div', { class: 'system-stack' }, [
      archiveCard(a),
      notice({ tone: 'ok', ic: 'validate', lead: 'Archive checked — safe to restore.', text: 'Validation ran on the file only. Nothing in your library has changed yet.' }),
      panel({ title: 'What Restore now does', ic: 'restore', children: [bullets([
        'Saves a checkpoint of your current data first, so you can go back',
        'Replaces sessions, crates, cues, grids and settings with the backup’s',
        'Re-links media references to files on this phone; missing files stay marked missing',
        'Keeps any cue or grid you edited since the backup as a conflict for you to decide',
      ], 'check')] }),
    ]),
    panel({ title: 'Validation report', ic: 'validate', fixture: 'validation result', children: [
      kv(B.validation.map(([k, v]) => [k, v, k === 'Media' ? 'warning' : 'ok'])),
      h('div', { class: 'system-actions system-actions--end' }, [
        button({ label: 'Choose another backup', hit: 48, cls: 'btn--ghost', on: { click: () => ctx.setState('backup') } }),
        button({ label: 'Restore now', icon: 'restore', hit: 48, cls: 'btn--primary', fr: ['FR-041', 'FR-034'], on: { click: () => ctx.setState('restore-conflicts') } }),
      ]),
    ] }),
  ]);
}

function restoreMismatch(ctx, say) {
  const a = A('backup-tablet-0.5');
  return h('div', { class: 'system-grid system-grid--two' }, [
    h('div', { class: 'system-stack' }, [
      archiveCard(a),
      notice({ tone: 'critical', ic: 'blocked', lead: 'Backup from a newer version 0.5 — restore needs app 0.5 or a compatible backup.', text: 'This app is 0.4.0 and reads schema v12. The archive was written by 0.5.0 with schema v13; an older app cannot read a newer database safely. Nothing was changed.' }),
    ]),
    panel({ title: 'Validation report', ic: 'validate', fixture: 'validation result', children: [
      kv([['App version', '0.5.0 — newer than this app (0.4.0)', 'critical'], ['Schema', 'v13 — this app reads up to v12', 'critical'], ['Paths', 'Not checked — stopped at the version check'], ['Size', '41.0 MB']]),
      h('div', { class: 'system-actions system-actions--end' }, [
        button({ label: 'How to update the app', icon: 'info', hit: 48, cls: 'btn--ghost', on: { click: () => say(notice({ tone: 'info', ic: 'info', lead: 'Install 0.5 or newer, then restore again.', text: 'This is a personal build: install the signed 0.5 package over this one (your data is kept and migrated with a checkpoint first). Or restore an older backup written by 0.4.', role: 'status' })) } }),
        button({ label: 'Choose another backup', icon: 'restore', hit: 48, cls: 'btn--primary', on: { click: () => ctx.setState('backup') } }),
      ]),
    ] }),
  ]);
}

function restoreRejected(ctx, say) {
  const a = A('shared-archive');
  return h('div', { class: 'system-grid system-grid--two' }, [
    h('div', { class: 'system-stack' }, [
      archiveCard(a),
      notice({ tone: 'critical', ic: 'blocked', lead: 'Archive rejected: unsafe path.', text: 'An entry points outside the archive (../../shared_prefs/settings.xml), and the file is over the 2 GB restore limit. Nothing was extracted and nothing in your library changed.' }),
    ]),
    panel({ title: 'Validation report', ic: 'validate', fixture: 'validation result', children: [
      kv([['Paths', '1 entry escapes the archive root — rejected', 'critical'], ['Size', '2.1 GB — over the 2 GB limit', 'critical'], ['IDs', 'Not checked — stopped at the path check'], ['Origin', 'Unknown — not written by this app']]),
      h('div', { class: 'system-actions system-actions--end' }, [
        button({ label: 'Delete this archive file', icon: 'trash', hit: 48, cls: 'btn--danger', on: { click: () => say(notice({ tone: 'neutral', ic: 'trash', lead: 'Delete shared-archive?', text: 'Deleting removes only this archive file from Backups. In this prototype the archive list is a fixture and stays as it is.', role: 'status' })) } }),
        button({ label: 'Choose another backup', icon: 'restore', hit: 48, cls: 'btn--primary', on: { click: () => ctx.setState('backup') } }),
      ]),
    ] }),
  ]);
}

function conflicts(ctx, firstResolved) {
  const tracks = ctx.fixtures;
  const list = B.conflicts.map((c) => ({ ...c, title: tracks.track(c.track)?.title || c.track }));
  const decided = firstResolved ? { c1: 'mine' } : {};
  const wrap = h('div', { class: 'system-grid system-grid--two' });
  const left = h('div', { class: 'system-stack' });
  const right = h('div', { class: 'system-stack' });
  const draw = () => {
    const open = list.filter((c) => !decided[c.id]);
    left.replaceChildren(
      notice({ tone: open.length ? 'warning' : 'ok', ic: open.length ? 'warning' : 'check', role: 'status',
        lead: open.length ? `Restored — ${open.length} ${open.length === 1 ? 'conflict' : 'conflicts'} kept for you to decide.` : 'Restore finished — every conflict decided.',
        text: open.length ? 'Sessions, crates, settings and the other cues and grids were restored (fixture acknowledgement). These edits differ from the backup; neither side wins automatically.' : 'The library store confirmed the restore (fixture acknowledgement). A checkpoint of your previous data is kept in Backups.' }),
      kv(B.contents.map(([k, v]) => [k, `${v} restored`])),
    );
    const cards = [];
    list.forEach((c, i) => {
      const isFocus = open[0] && open[0].id === c.id;
      const d = decided[c.id];
      const card = h('div', { class: `system-conflict raised${isFocus ? ' is-focus' : ''}`, role: 'group', 'aria-label': `Conflict ${i + 1} of ${list.length}: ${c.title}, ${c.what}` }, [
        h('div', { class: 'system-conflict__head' }, [
          h('span', { class: 'label', text: `Conflict ${i + 1} of ${list.length} · ${c.what}` }),
          d ? statusWord('ok', d === 'mine' ? 'Kept yours' : d === 'theirs' ? 'Used backup' : 'Kept both') : statusWord(isFocus ? 'warning' : 'neutral', isFocus ? 'Decide now' : 'Waiting'),
        ]),
        h('p', { class: 'title wrap-2 system-conflict__title', text: c.title }),
        h('div', { class: 'system-conflict__sides' }, [
          h('div', { class: 'system-conflict__side' }, [h('span', { class: 'label', text: 'Yours (on this phone)' }), h('span', { class: 'body', text: c.mine })]),
          h('div', { class: 'system-conflict__side' }, [h('span', { class: 'label', text: 'Backup' }), h('span', { class: 'body', text: c.theirs })]),
        ]),
        isFocus ? h('div', { class: 'system-actions' }, [
          button({ label: 'Keep mine', icon: 'check', hit: 48, cls: 'btn--primary', fr: ['FR-041', 'FR-008'], on: { click: () => { if (!firstResolved && c.id === 'c1') ctx.setState('restore-resolved'); else { decided[c.id] = 'mine'; draw(); } } } }),
          button({ label: 'Use backup', hit: 48, cls: 'btn--secondary', on: { click: () => { decided[c.id] = 'theirs'; draw(); } } }),
          button({ label: 'Keep both', hit: 48, cls: 'btn--secondary', on: { click: () => { decided[c.id] = 'both'; draw(); } } }),
        ]) : !d ? h('p', { class: 'body muted', text: 'Decide after the conflict above. Until then the version on this phone stays in use.' }) : null,
      ]);
      cards.push(card);
    });
    right.replaceChildren(...cards);
  };
  draw();
  wrap.append(left, right);
  return wrap;
}
