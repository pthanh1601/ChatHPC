const fs = require('fs');
const file = '/Users/pthanh/Downloads/ChatHPC/src/screens/InviteMembers.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const res = await client\.members\(currentActiveRoomId, undefined, \'join\'\);\n\s*const ids = res\.chunk\.filter\(\(m\: any\) => m\.content\?\.membership === \'join\'\)\.map\(\(m\: any\) => m\.state_key\);/, 
\`const res = await client.members(currentActiveRoomId);
          const ids = res.chunk.filter((m: any) => m.content && m.content.membership === 'join').map((m: any) => m.state_key);
          console.log("Fetched members for exclusion:", ids);\`);

fs.writeFileSync(file, code);
