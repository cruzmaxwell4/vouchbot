// Shared XP system state - persists across all commands
let xpData = {};
let xpRoles = [];
let xpResetTimer = null;
let resetTimestamp = null;

module.exports = {
  // XP Data functions
  getXpData: () => xpData,
  setXpData: (data) => { xpData = data; },
  addXp: (userId, amount) => {
    xpData[userId] = (xpData[userId] || 0) + amount;
  },
  resetXpData: () => { xpData = {}; },

  // XP Roles functions
  getXpRoles: () => [...xpRoles], // Return copy
  setXpRoles: (roles) => { xpRoles = [...roles]; },
  addXpRole: (roleId) => {
    if (!xpRoles.includes(roleId)) {
      xpRoles.push(roleId);
      return true;
    }
    return false;
  },
  removeXpRole: (roleId) => {
    const index = xpRoles.indexOf(roleId);
    if (index > -1) {
      xpRoles.splice(index, 1);
      return true;
    }
    return false;
  },

  // Reset timer functions
  getResetTimer: () => xpResetTimer,
  setResetTimer: (timer) => { xpResetTimer = timer; },
  getResetTimestamp: () => resetTimestamp,
  setResetTimestamp: (timestamp) => { resetTimestamp = timestamp; },
};

