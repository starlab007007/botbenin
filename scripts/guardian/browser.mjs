import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export async function visibleSignIn(page,timeout=15000){
 try{
  // Authentication uses a dialog portal outside #root.
  await page.getByRole('heading',{name:'Bienvenue sur WAOUH',exact:true}).waitFor({state:'visible',timeout});
  await page.locator('input[type="email"]').waitFor({state:'visible',timeout});
  await page.locator('input[type="password"]').waitFor({state:'visible',timeout});
  return !/Une erreur s'est produite|Nos équipes ont été notifiées|Application error/i.test(await page.locator('body').innerText());
 }catch{return false;}
}
async function main(){
 const browser=await chromium.launch();let ok=false,reason='PAGE_LOAD_FAILED';
 try{
  const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e));
  // No sign-in, anonymous session, mission, sale or other write.
  await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
  const response=await page.goto('https://bot.bj/auth?guardian=1',{waitUntil:'domcontentloaded',timeout:30000});
  let visible=await visibleSignIn(page);
  await page.waitForTimeout(2000);
  visible=visible&&await visibleSignIn(page,1000);
  ok=Boolean(response?.ok())&&visible&&errors.length===0;
  reason=ok?'OK':errors.length?'SCRIPT_ERROR':visible?'HTTP_UNAVAILABLE':'CONTENT_UNAVAILABLE';
 }catch{}finally{await browser.close();}
 await writeFile(process.argv[2],JSON.stringify({ok,reason}));
 console.log('GUARDIAN browser: '+reason);
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))await main();
