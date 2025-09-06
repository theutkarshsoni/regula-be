INSERT INTO users (email, name, password_hash, role)
VALUES (
  'admin@regula.app',
  'Admin',
  '$2a$10$ct4eGwT/65Bdq.V3D5USAuS5QsOeENTC9obESVA7sucLxhJwZxibu', -- bcrypt hash of "admin123"
  'admin'
)
ON CONFLICT DO NOTHING;