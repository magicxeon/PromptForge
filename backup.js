import fs from 'fs';
import path from 'path';

const files = [
  'client/index.html',
  'client/app.js',
  'client/style.css'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.bak`);
    console.log(`Backed up ${file} to ${file}.bak`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
