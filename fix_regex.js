const fs = require('fs');

const files = [
  'src/screens/Profile.tsx',
  'src/screens/Contacts.tsx',
  'src/screens/ChatList.tsx',
  'src/screens/ChatSingle.tsx',
  'src/services/MatrixService.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  // replace double backslashes with single backslash
  content = content.replace(/\\\\\s\*\\\\\[/g, '\\s*\\[');
  content = content.replace(/\\\\\]\\\\s\*\$/g, '\\]\\s*$');
  content = content.replace(/\\\\\]/g, '\\]');
  content = content.replace(/\\\\d\+/g, '\\d+');
  content = content.replace(/\\\\s\*/g, '\\s*');
  
  // Actually, let's just forcefully replace the exact bad strings we know exist.
  // In Profile.tsx:
  content = content.replace(/(.+?)\\\\s\*\\\\\\[(\\\\d+)\\\\\\]\\\\s\*\$/g, '(.+?)\\s*\\[(\\d+)\\]\\s*$');
  
  // In Contacts.tsx:
  content = content.replace(/\(\\\\s\*\\\\\\[\\\\d\+\\\\\\]\)\+\\\\s\*\$/g, '(\\s*\\[\\d+\\])+\\s*$');
  
  fs.writeFileSync(file, content);
}
console.log("Done");
