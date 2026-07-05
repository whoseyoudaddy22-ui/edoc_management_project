-- Audit log immutability (module-12-audit-log.md): no endpoint may ever UPDATE or DELETE a row in
-- "AuditLog", not even ADMIN. The application layer already never exposes such an endpoint, but this
-- trigger enforces the same rule at the database level in case of direct DB access (e.g. a leaked
-- DATABASE_URL, a future endpoint added without this constraint in mind, or an ad-hoc admin query).
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog records are immutable and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_immutable
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
