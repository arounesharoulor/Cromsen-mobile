const fs = require('fs');
const path = require('path');

// Folders to scan for .js files
const foldersToMigrate = [
  path.join(__dirname, 'src', 'screens'),
  path.join(__dirname, 'src', 'components'),
  path.join(__dirname, 'src', 'navigation'),
];

// Single files to migrate
const filesToMigrate = [
  path.join(__dirname, 'App.js'),
];

console.log('Starting migration to .jsx...\n');

// 1. Rename files in directories
foldersToMigrate.forEach(folder => {
  if (fs.existsSync(folder)) {
    const files = fs.readdirSync(folder);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const oldPath = path.join(folder, file);
        const newPath = path.join(folder, file.replace('.js', '.jsx'));
        
        fs.renameSync(oldPath, newPath);
        console.log(`Renamed: ${path.relative(__dirname, oldPath)} -> ${path.relative(__dirname, newPath)}`);
      }
    });
  }
});

// 2. Rename specific individual files (like App.js)
filesToMigrate.forEach(oldPath => {
  if (fs.existsSync(oldPath)) {
    const newPath = oldPath.replace('.js', '.jsx');
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed: ${path.relative(__dirname, oldPath)} -> ${path.relative(__dirname, newPath)}`);
  }
});

console.log('\n✅ Migration complete! Your project is now using .jsx files.');
console.log('Please restart your Expo server by running: npx expo start -c');
