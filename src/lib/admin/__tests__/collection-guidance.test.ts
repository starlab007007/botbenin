import {describe,it,expect} from 'vitest';
import {collectionGuidance,explainCollectionReason,platformProgress} from '../collectionControl';
const platform={platform_key:'example',access_state:'authorized',adapter_key:'classifieds'};
describe('collection guidance',()=>{
 it('distinguishes a configured target, a paused target and an enabled collector',()=>{
  const entries=[{target_id:'t1'},{target_id:'t2',alias_of:1}];
  expect(platformProgress(platform,entries,[]).label).toContain('état à vérifier');
  expect(platformProgress(platform,entries,[{id:'t1',enabled:false}]).label).toBe('Cible en pause');
  expect(platformProgress(platform,entries,[{id:'t1',enabled:true}]).active).toBe(1);
 });
 it('never presents an old extraction test as ready to connect',()=>{
  expect(platformProgress(platform,[{test_status:'passed',test_at:'2000-01-01'}]).label).toBe('Test requis');
  expect(platformProgress(platform,[{test_status:'passed',test_at:new Date().toISOString()}]).label).toBe('Prête à raccorder');
 });
 it('explains a daily reserved budget without recommending automatic retries or increasing spend',()=>{
  const issues=collectionGuidance({policies:[{provider:'apify',paused:false,estimated_daily_cost_limit:.2,cost_currency:'USD'}],usage:[{provider:'apify',estimated_cost:.15},{provider:'apify',estimated_cost:.05}]},null,null);
  expect(issues).toHaveLength(1);expect(issues[0].title).toContain('plafond');expect(issues[0].detail).toContain('0.20 USD réservés');expect(issues[0].section).toBe('settings');
 });
 it('preserves the platform identity in a targeted next action',()=>{
  const [issue]=collectionGuidance(null,{platforms:[{platform_key:'coin',label:'CoinAfrique'}],entries:[{platform_key:'coin',test_status:'failed',test_report:{reason:'provider_quota_exhausted'}}]},null);
  expect(issue.platform).toBe('coin');expect(issue.action).toBe('Voir la source');
  expect(explainCollectionReason('secret_internal_error').detail).not.toContain('secret_internal');
 });
});
