// Persistent XP timer tracking
const fs = require('fs');
const path = require('path');

const TIMER_FILE = path.join(__dirname, 'xp-timer.json');

function loadTimer() {
  try {
    if (fs.existsSync(TIMER_FILE)) {
      const data = JSON.parse(fs.readFileSync(TIMER_FILE, 'utf8'));
      return data;
    }
  } catch (err) {
    console.error('Error loading timer:', err);
  }
  return null;
}

function saveTimer(timestamp) {
  try {
    fs.writeFileSync(TIMER_FILE, JSON.stringify({ resetTime: timestamp }, null, 2));
  } catch (err) {
    console.error('Error saving timer:', err);
  }
}

function deleteTimer() {
  try {
    if (fs.existsSync(TIMER_FILE)) {
      fs.unlinkSync(TIMER_FILE);
    }
  } catch (err) {
    console.error('Error deleting timer:', err);
  }
}

module.exports = {
  loadTimer,
  saveTimer,
  deleteTimer,
};

