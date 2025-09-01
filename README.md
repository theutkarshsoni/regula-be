# Regula

A compliance monitoring engine that ingests trade/position data, applies configurable rules, and flags regulatory breaches.  

## Use Case
Regula helps financial institutions ensure regulatory compliance by:  
- Uploading datasets of trades/positions
- Defining rules (e.g., issuer concentration, asset class exposure, large trade limits)
- Running those rules to automatically detect breaches
- Tracking breaches through their lifecycle with audit logs

This mirrors real-world compliance monitoring similar to what regulators and risk SaaS providers require.  

## Tech Stack
- **Backend**: Node.js, Express, TypeScript  
- **Database**: PostgreSQL  
- **ORM/Queries**: node-postgres (pg) with raw SQL  
- **Validation**: Zod  
- **File Handling**: Multer + csv-parse (for CSV ingestion)  
- **Testing (later)**: Jest  

## Milestones
1. Project scaffold + health check  
2. Database setup & migrations  
3. Datasets & CSV upload  
4. Rules CRUD  
5. Rule execution (concentration, exposure, large trade)  
6. Breach management & audit log  
7. Validation, auth & polish  

# 🚀 Design Decisions in Practice

## From PUT to PATCH: A Compliance Story

- Started with `PUT` for rule updates → realized it forced full replacements and risked overwriting data.  
- Switched to `PATCH` for partial updates → safer, more natural for toggling `active` or tweaking thresholds.  
- Introduced **soft delete** (`active=false`) instead of hard deletes → preserves audit trail of past breaches.  
- Added a **PostgreSQL trigger** to auto-update updated_at → ensures timestamp accuracy without relying on logic.
- Future plan: log before/after diffs in audit table → gold for compliance reviews and incident tracing.  

## Handling Failed Rule Runs: Ensuring Honest Audit Trails

- Initially, rule runs were marked `"running"` and updated to `"completed"` at the end.  
- Discovered a gap: if the process crashed, the run would stay stuck as `"running"`, misleading auditors.  
- Fixed it by marking runs as `"failed"` with a `finished_at` timestamp on error.  
- This ensures the audit trail tells the truth: some rules passed, others failed, and both outcomes are visible.  
- Future enhancement: add monitoring to auto-flag stale `"running"` runs and trigger retries.  

---
