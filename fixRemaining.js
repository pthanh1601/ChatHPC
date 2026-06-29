const fs = require('fs');

function replaceImport(file, fromStr, toStr) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(fromStr, toStr);
    fs.writeFileSync(file, content, 'utf8');
}

replaceImport('src/screens/Login.tsx', /from '\.\/matrix'/g, "from '../services/MatrixService'");
replaceImport('src/screens/Calls.tsx', /from '\.\/matrix'/g, "from '../services/MatrixService'");
replaceImport('src/screens/CreateRoom.tsx', /from '\.\/matrix'/g, "from '../services/MatrixService'");

// ChatList.tsx có import persistentLocalStorage
let chatList = fs.readFileSync('src/screens/ChatList.tsx', 'utf8');
chatList = chatList.replace(
    /import \{ getMatrixClient, setCurrentActiveRoomId, persistentLocalStorage \} from '\.\/matrix';/g,
    "import { getMatrixClient, setCurrentActiveRoomId } from '../services/MatrixService';\nimport { persistentLocalStorage } from '../services/StorageService';"
);
fs.writeFileSync('src/screens/ChatList.tsx', chatList, 'utf8');
