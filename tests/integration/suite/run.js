const path = require('node:path');
const Mocha = require('mocha');

exports.run = (testsRoot, callback) => {
  const mocha = new Mocha({ ui: 'tdd', timeout: 10000, color: false });
  mocha.addFile(path.resolve(path.dirname(testsRoot), 'index.js'));
  mocha.run((failures) => callback(null, failures));
};
