import { getMatrixClient, currentActiveRoomId } from './src/services/MatrixService';
const room = getMatrixClient()?.getRoom(currentActiveRoomId);
console.log(room?.getMembers());
