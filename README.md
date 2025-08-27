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

---
