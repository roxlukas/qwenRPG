const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'rogue.html');
let s = fs.readFileSync(file, 'utf8');

const old = "if(keys>0){ keys--; map[ny][nx]='floor'; log('Otwierasz drzwi (\u22121 klucza).','p'); }";
const nw  = "if(keys>0){ keys--; map[ny][nx]='floor'; const c=ri(1,10); if(c===10){ coins+=20; log('Otwierasz drzwi! \u2728 CRITICAL: +20 monet!','g'); } else { coins+=c; log('Otwierasz drzwi (\u22121 klucza). +'+c+' monet.','p'); } }";

if (s.includes(old)) {
  s = s.replace(old, nw);
  fs.writeFileSync(file, s, 'utf8');
  console.log('door: ok');
} else {
  console.log('door: NOT FOUND');
  console.log('Searching for partial...');
  const idx = s.indexOf("Otwierasz drzwi");
  if (idx !== -1) {
    console.log('Found at idx', idx);
    console.log('Context:', JSON.stringify(s.slice(idx-60, idx+60)));
  }
}
