// Persistent XP data storage
const fs = require('fs');
const path = require('path');

const XP_FILE = path.join(__dirname, 'xp-data.json');
const ROLES_FILE = path.join(__dirname, 'xp-roles.json');

function loadXpData() {
  try {
    if (fs.existsSync(XP_FILE)) {
      const data = JSON.parse(fs.readFileSync(XP_FILE, 'utf8'));
      return data;
    }
  } catch (err) {
    console.error('Error loading XP data:', err);
  }
  return {};
}

function saveXpData(data) {
  try {
    fs.writeFileSync(XP_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving XP data:', err);
  }
}

function loadXpRoles() {
  try {
    if (fs.existsSync(ROLES_FILE)) {
      const data = JSON.parse(fs.readFileSync(ROLES_FILE, 'utf8'));
      return data || [];
    }
  } catch (err) {
    console.error('Error loading XP roles:', err);
  }
  return [];
}

function saveXpRoles(roles) {
  try {
    fs.writeFileSync(ROLES_FILE, JSON.stringify(roles, null, 2));
  } catch (err) {
    console.error('Error saving XP roles:', err);
  }
}

function resetXpData() {
  try {
    if (fs.existsSync(XP_FILE)) {
      fs.unlinkSync(XP_FILE);
    }
  } catch (err) {
    console.error('Error resetting XP data:', err);
  }
}

module.exports = {
  loadXpData,
  saveXpData,
  loadXpRoles,
  saveXpRoles,
  resetXpData,
};

