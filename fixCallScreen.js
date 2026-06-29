const fs = require('fs');
let content = fs.readFileSync('src/screens/CallScreen.tsx', 'utf8');

content = content.replace(
    /import \{ matrixService, getMatrixClient \} from '\.\/matrix';/g,
    "import { getMatrixClient } from '../services/MatrixService';\nimport { voipService } from '../services/VoipService';"
);

content = content.replace(/matrixService\./g, 'voipService.');

fs.writeFileSync('src/screens/CallScreen.tsx', content, 'utf8');
