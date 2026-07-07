const sdk = require('matrix-js-sdk');
console.log(typeof sdk.MatrixCall.prototype.upgradeCall === 'function');
