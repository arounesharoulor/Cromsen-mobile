const fs = require('fs');
const path = require('path');

const srcDirs = [
  path.join(__dirname, 'src', 'screens'),
  path.join(__dirname, 'src', 'components'),
  path.join(__dirname, 'src', 'navigation')
];

function processDir(dirPath) {
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(' COLORS.')) {
        console.log(`Fixing: ${fullPath}`);
        content = content.replace(/ COLORS\./g, ' THEME_COLORS.');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

srcDirs.forEach(processDir);
console.log('Done replacing COLORS. with THEME_COLORS.');
