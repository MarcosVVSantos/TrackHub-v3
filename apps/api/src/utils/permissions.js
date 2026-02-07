const rolePriority = {
  owner: 3,
  editor: 2,
  viewer: 1,
};

function canAccess(requiredRole, memberRole) {
  return rolePriority[memberRole] >= rolePriority[requiredRole];
}

module.exports = { canAccess };
