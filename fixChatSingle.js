const fs = require('fs');
let content = fs.readFileSync('src/screens/ChatSingle.tsx', 'utf8');

content = content.replace(
    /import \{ getMatrixClient, currentActiveRoomId, matrixService, decryptMatrixFile \} from '\.\/matrix';/g,
    "import { getMatrixClient, currentActiveRoomId, matrixService } from '../services/MatrixService';\nimport { mediaService, decryptMatrixFile } from '../services/MediaService';\nimport { voipService } from '../services/VoipService';"
);

content = content.replace(/matrixService\.uploadFile/g, 'mediaService.uploadFile');
content = content.replace(/matrixService\.placeCall/g, 'voipService.placeCall');

fs.writeFileSync('src/screens/ChatSingle.tsx', content, 'utf8');
