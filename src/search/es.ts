import { Client } from '@elastic/elasticsearch';

export const esclient = new Client({ node: process.env.ELASTIC_URL || 'http://localhost:9200' });
export const IDX_BREACHES = 'regula-breaches';
export const IDX_AUDIT = 'regula-audit';