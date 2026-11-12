export const allowedPermissionValues = ['freely', 'editable', 'limited', 'locked', 'protected', 'private']

export function checkViewPermission (req, note) {
  const permission = note.permission
  const authenticated = Boolean(req.user && (typeof req.isAuthenticated === 'function' ? req.isAuthenticated() : req.user.logged_in))
  const ownerId = note.ownerId !== undefined ? note.ownerId : note.owner

  // Private notes should only be readable to their owner
  if (permission === 'private') {
    return authenticated && req.user.id === ownerId
  }

  // Limited and protected notes should be readable by all logged-in users
  if (permission === 'limited' || permission === 'protected') {
    return authenticated
  }

  // Freely, Editable and Locked notes should be readable by everyone
  if (permission === 'freely' || permission === 'editable' || permission === 'locked') {
    return true
  }

  // Invalid permission
  return false
}
