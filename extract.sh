#!/bin/bash
# Lấy từ đầu đến hết dòng import
sed -n '1,10p' src/screens/matrix.ts > src/services/MatrixService.ts

# Bổ sung các import mới
echo "import { persistentLocalStorage } from './StorageService';" >> src/services/MatrixService.ts
echo "import { voipService } from './VoipService';" >> src/services/MatrixService.ts

# Lấy từ dòng 12 (OlmInstance) đến dòng 30 (trước PersistentLocalStorage)
sed -n '12,30p' src/screens/matrix.ts >> src/services/MatrixService.ts

# Lấy từ dòng 103 (currentActiveRoomId) đến dòng 110
sed -n '103,110p' src/screens/matrix.ts >> src/services/MatrixService.ts

# Lấy class MatrixService từ dòng 141 đến dòng 495 (clearCache)
sed -n '141,495p' src/screens/matrix.ts >> src/services/MatrixService.ts

# Lấy từ _handleVerificationRequest (dòng 558) đến sendSystemMessage (dòng 633)
sed -n '558,633p' src/screens/matrix.ts >> src/services/MatrixService.ts

# Lấy từ searchUsers (dòng 784) đến sendTyping (dòng 990)
sed -n '784,990p' src/screens/matrix.ts >> src/services/MatrixService.ts

# Lấy export matrixService (dòng 1061) đến hết dòng 1068
sed -n '1061,1068p' src/screens/matrix.ts >> src/services/MatrixService.ts

