const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(type) {
  return path.join(DATA_DIR, `${type}.json`);
}

function load(type) {
  const filePath = getFilePath(type);
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function save(type, data) {
  const filePath = getFilePath(type);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
