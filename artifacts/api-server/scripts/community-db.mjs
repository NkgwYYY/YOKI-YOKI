import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const requireDb=createRequire(new URL('../../../lib/db/package.json',import.meta.url));
const {Pool}=requireDb('pg');
if(!process.env.DATABASE_URL)throw Error('DATABASE_URL is required');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try{
 const action=process.argv[2];
 if(action==='migrate'){
  await pool.query(await readFile(new URL('../migrations/20261015_community.sql',import.meta.url),'utf8'));
  console.log('Community tables ready; existing diary and wallet tables unchanged.');
 }else if(action==='report'){
  const metrics=await pool.query("SELECT event,count(*)::int AS events,count(DISTINCT player_id)::int AS devices,round(avg(duration_ms)) AS average_ms FROM yoki_feature_metrics WHERE created_at>now()-interval '30 days' GROUP BY event ORDER BY event");
  const rewards=await pool.query("SELECT mode,state,count(*)::int AS claims FROM yoki_bonus_claims WHERE created_at>now()-interval '30 days' GROUP BY mode,state ORDER BY mode,state");
  const revenue=await pool.query("SELECT revenue_currency AS currency,revenue_test AS test,count(*)::int AS impressions,sum(estimated_revenue_micros)/1000000.0 AS client_estimated_revenue FROM yoki_bonus_claims WHERE estimated_revenue_micros IS NOT NULL AND created_at>now()-interval '30 days' GROUP BY revenue_currency,revenue_test");
  console.log(JSON.stringify({period:'last 30 days',metrics:metrics.rows,rewards:rewards.rows,revenueEstimates:revenue.rows,note:'SDK estimates are not final revenue. Reconcile with AdMob and store settlement reports; never sum different currencies.'},null,2));
 }else throw Error('Usage: node artifacts/api-server/scripts/community-db.mjs migrate|report');
}finally{await pool.end();}
