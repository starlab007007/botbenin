import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:waouh_app_native/live/convergence/live_convergence_contract.dart';
void main(){
 final fixtures=jsonDecode(File('../tests/fixtures/waouh-convergence.json').readAsStringSync()) as List;
 for(final f in fixtures)test('${f['name']}',(){final row=convergenceMap(f['row']);expect(liveConvergenceKind(row),f['kind']);expect(liveConvergenceMissing(row),f['missing']);});
 test('unknown is not zero and totals distinguish missing fees',(){for(final v in [null,'',' ',[],{},'0x10',true,-1,'NaN',double.infinity]){expect(convergenceAmount(v),isNull);}expect(convergenceAmount(0),0);expect(liveConvergenceTotal([{'amount':1000}])['complete'],false);expect(liveConvergenceTotal([{'amount':1000,'extra_cost':0}])['complete'],true);});
 test('current all-inclusive agreement replaces estimates without counting fees twice',(){expect(liveConvergenceTotal([{'amount':9000,'extra_cost':2000,'agreement':{'status':'accepted','terms':{'amount':8000}}}])['known'],8000);expect(liveConvergenceTotal([{'amount':9000,'extra_cost':2000,'agreement':{'status':'rejected','terms':{'amount':8000}}}])['known'],11000);});
 test('five safe distinct source references maximum',(){final refs=List.generate(8,(i)=>{'url':'https://market.example/$i','price':1000+i,'model':'M1','comparable':true});final found=liveConvergenceReferences({'model':'M1','market_references':[{'url':'javascript:alert(1)','price':1},...refs,...refs]});expect(found.length,5);expect(found.every((x)=>x['comparable']==true),true);expect(liveConvergenceReferences({'model':'M2','market_references':refs}).every((x)=>x['comparable']==false),true);});
 test('market enrichment preserves original IDs and explicit scope',(){final rows=liveConvergenceWithReferences([{'id':'a','model':'M1','condition':'new','price':1000,'source_url':'https://market.example/a'},{'id':'b','model':'M1','condition':'new','price':1200,'source_url':'https://market.example/b'}]);expect(rows.first['id'],'a');expect(rows.first['market_reference_scope'],'search_results');expect(liveConvergenceReferences(rows.first).single['comparable'],true);});
}
