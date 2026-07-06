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
  content = content.replace(/\\s\*\\\\\\[/g, '\\s*\\[');
  fs.writeFileSync(file, content);
}
console.log("Done");
