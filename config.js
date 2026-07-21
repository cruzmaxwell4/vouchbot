const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'vouch-config.json');

// Default config
const DEFAULT_CONFIG = {
  vouchPerson: null,
  vouchCategories: ['accounts', 'prem_gen', 'methods', 'replacements', 'amazon_card', 'other'],
};

// Load config from file
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return DEFAULT_CONFIG;
}

// Save config to file
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

module.exports = {
  loadConfig,
  saveConfig,
  DEFAULT_CONFIG,
};

