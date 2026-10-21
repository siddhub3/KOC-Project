// Example JWT auth - issuing httpOnly cookie
// POST /api/v1/auth/login {email,password} -> set cookie jwt
// JWT payload {sub, role, email}
// GET /api/v1/auth/me checks cookie
// Socket.IO middleware verifies cookie jwt, allows room join only if user is participant of match
