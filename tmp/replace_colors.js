const fs = require('fs');
const path = require('path');

const directories = [
  'd:/Appzeto/Healthy_delight/frontend/src/modules/admin',
  'd:/Appzeto/Healthy_delight/frontend/src/modules/seller'
];

const replacements = [
  { from: /bg-teal-700/g, to: 'bg-neutral-900' }, // Sidebar main wrapper background
  { from: /border-teal-600/g, to: 'border-neutral-800' }, 
  { from: /text-teal-100/g, to: 'text-neutral-400' }, 
  { from: /text-teal-200/g, to: 'text-neutral-500' }, 
  { from: /text-teal-300/g, to: 'text-neutral-500' }, 
  { from: /bg-teal-800/g, to: 'bg-neutral-800' }, 
  { from: /placeholder-teal-300/g, to: 'placeholder-neutral-500' },
  { from: /bg-teal-600\/50/g, to: 'bg-neutral-800' },
  { from: /text-teal-600/g, to: 'text-primary' }, // Text colors for inner panels
  { from: /text-teal-700/g, to: 'text-primary-dark' }, 
  { from: /bg-teal-600/g, to: 'bg-primary border-primary text-neutral-900' }, // Active selected background
  { from: /bg-teal-500/g, to: 'bg-primary' },
  { from: /border-teal-500/g, to: 'border-primary' },
  { from: /border-teal-600/g, to: 'border-neutral-800' },
  { from: /hover:bg-teal-600/g, to: 'hover:bg-primary-dark hover:text-neutral-900' },
  { from: /hover:bg-teal-700/g, to: 'hover:bg-primary-dark hover:text-neutral-900' },
  { from: /hover:text-teal-600/g, to: 'hover:text-primary-dark' },
  { from: /hover:text-teal-700/g, to: 'hover:text-primary-dark' },
  { from: /focus:ring-teal-500/g, to: 'focus:ring-primary' },
  { from: /focus:border-teal-500/g, to: 'focus:border-primary' },
  { from: /ring-teal-500/g, to: 'ring-primary' },
  { from: /bg-teal-50/g, to: 'bg-cream' },
  { from: /text-teal-500/g, to: 'text-primary' },
  { from: /text-teal-800/g, to: 'text-neutral-800' },
  { from: /bg-teal-100/g, to: 'bg-cream' },
  { from: /text-teal-900/g, to: 'text-neutral-900' },
  { from: /\bteal\b/gi, to: 'primary' } // Catch-all for plain instances if there are
];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

let changedFiles = 0;

directories.forEach(dir => {
  const files = walk(dir);
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;
    replacements.forEach(rep => {
      newContent = newContent.replace(rep.from, rep.to);
    });
    
    // Quick fix for potentially doubled text colors or conflict
    newContent = newContent.replace(/text-neutral-900 text-white/g, 'text-neutral-900');
    newContent = newContent.replace(/text-white text-neutral-900/g, 'text-neutral-900');
    newContent = newContent.replace(/hover:text-neutral-900 hover:text-white/g, 'hover:text-neutral-900');
    newContent = newContent.replace(/hover:text-white hover:text-neutral-900/g, 'hover:text-neutral-900');
    
    if (content !== newContent) {
      fs.writeFileSync(file, newContent);
      changedFiles++;
      console.log(`Updated ${file}`);
    }
  });
});

console.log(`\nUpdated ${changedFiles} files with the new theme colors.`);
