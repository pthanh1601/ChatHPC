import * as sdk from 'matrix-js-sdk';
const room = new sdk.Room('1', {} as any, 'user1');
console.log(typeof room.getJoinedMembers);
