const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'rogue.html');
let s = fs.readFileSync(file, 'utf8');
let n = 0;

function rep(old, nw, label, useIncludes) {
  if (useIncludes) {
    if (!s.includes(old)) { console.log(label + ': NOT FOUND (includes)'); return; }
    const i = s.indexOf(old);
    s = s.slice(0, i) + nw + s.slice(i + old.length);
  } else {
    if (!s.includes(old)) { console.log(label + ': NOT FOUND'); return; }
    s = s.replace(old, nw);
  }
  n++;
  console.log(label + ': ok');
}

// 1. Add coins to state
rep(
  "let depth=1, turn=0, potions=2, keys=0, state='playing', shake=0;",
  "let depth=1, turn=0, potions=2, keys=0, coins=0, state='playing', shake=0;",
  'state'
);

// 2. Add coin chip after keys chip
rep(
  '<span class="chip">\u{1F5DD} Klucze <b id="keycnt">0</b></span>',
  '<span class="chip">\u{1F5DD} Klucze <b id="keycnt">0</b></span>\n      <span class="chip">\u{1FA99} Monety <b id="coincnt">0</b></span>',
  'chip'
);

// 3. hud(): add coin line after keycnt
rep(
  '$(\'keycnt\').textContent=keys;',
  '$(\'keycnt\').textContent=keys;\n  $(\'coincnt\').textContent=coins;',
  'hud'
);

// 4. Door logic: replace the door branch
rep(
  "if(keys>0){ keys--; map[ny][nx]='floor'; log('Otwierasz drzwi (\u22121 klucz\u0119).','p'); }",
  "if(keys>0){ keys--; map[ny][nx]='floor'; const c=ri(1,10); if(c===10){ coins+=20; log('Otwierasz drzwi! \u2728 CRITICAL: +20 monet!','g'); } else { coins+=c; log('Otwierasz drzwi (\u22121 klucz\u0119). +'+c+' monet.','p'); } }",
  'door'
);

// 5. startGame(): reset coins
rep(
  "state='playing'; depth=1; turn=0; potions=2; keys=0; shake=0;",
  "state='playing'; depth=1; turn=0; potions=2; keys=0; coins=0; shake=0;",
  'startGame'
);

if (n > 0) {
  fs.writeFileSync(file, s, 'utf8');
  console.log('done: ' + n + ' replacement(s) written');
} else {
  console.log('nothing to do');
}
