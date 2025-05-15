const fs = require('fs');
const path = require('path');

const GIT_MARKER = '//git';

function cleanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(GIT_MARKER)) {
    const lines = content.trimEnd().split('\n');
    const lastLine = lines[lines.length - 1];
    if (lastLine.trim() === GIT_MARKER) {
      lines.pop(); // sondaki marker satırını sil
      const updated = lines.join('\n');
      fs.writeFileSync(filePath, updated, 'utf-8');
      console.log(`✔ Cleaned: ${filePath}`);
    }
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (
      /\.(tsx?|jsx?|json|css|html)$/.test(file)
    ) {
      cleanFile(fullPath);
    }
  }
}

walk(process.cwd());
