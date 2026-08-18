const fs = require('fs');
const path = require('path');
const s = fs.readFileSync(path.join(__dirname, 'rogue.html'), 'utf8');
const a = s.lastIndexOf('<script>') + '<script>'.length;
const b = s.lastIndexOf('</script>');
const js = s.slice(a, b);
fs.writeFileSync(path.join(__dirname, '_game.tmp.js'), js);
console.log('extracted', js.length, 'chars');
