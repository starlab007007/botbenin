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

it('requires verified evidence for every distinct rubric before marking a platform complete',()=>{
 const targets=[{id:'t1',enabled:true,last_outcome:'succeeded'}];
 const valid={target_id:'t1',connection_validation:{validated:true}};
 expect(platformProgress(platform,[valid],targets).label).toBe('Raccordement vérifié');
 expect(platformProgress(platform,[valid,{connection_validation:{validated:false}}],targets).label).toBe('Raccordement à valider');
 expect(platformProgress(platform,[valid,{alias_of:1,connection_validation:{validated:false}}],targets).label).toBe('Raccordement vérifié');
 expect(platformProgress(platform,[valid],[{...targets[0],last_outcome:'blocked'}]).label).toBe('Dernier passage à vérifier');
});

it('does not confuse an enabled collector with a successful last passage',()=>{
 const state=platformProgress(platform,[{target_id:'t1'}],[{id:'t1',enabled:true,last_outcome:'blocked'}]);
 expect(state.label).toBe('Dernier passage à vérifier');expect(state.tone).toBe('warning');expect(state.active).toBe(1);
 const issues=collectionGuidance({policies:[],targets:[{enabled:true,last_outcome:'blocked'}]},null,null);
 expect(issues[0].title).toContain('1 collecteur');expect(issues[0].action).toBe('Voir les collecteurs');
});
