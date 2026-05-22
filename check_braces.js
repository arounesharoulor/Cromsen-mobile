const fs = require('fs');
const code = fs.readFileSync('src/screens/RegisterScreen.jsx', 'utf8');
let stack = [];
let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  for (let j = 0; j < line.length; j++) {
    let char = line[j];
    if (char === '{') stack.push({char, line: i+1});
    if (char === '}') {
      if (stack.length === 0) {
        console.log('Extra } at line ' + (i+1));
      } else {
        stack.pop();
      }
    }
  }
}
if (stack.length > 0) {
  stack.forEach(s => console.log('Unclosed { at line ' + s.line));
} else {
  console.log('Braces are balanced');
}
