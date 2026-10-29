import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch();let ok=false;
try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844}}),errors=[];
 page.on('pageerror',e=>errors.push(e));
 // Public sign-in shell only; no sign-in, anonymous session, mission or sale.
 await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():route.abort());
 const response=await page.goto('https://bot.bj/auth?guardian=1',{waitUntil:'domcontentloaded',timeout:30000});
 await page.waitForFunction(()=>(document.querySelector('#root')?.textContent?.trim().length||0)>60,null,{timeout:15000});
 await page.waitForTimeout(2000);const text=await page.locator('#root').innerText();
 ok=Boolean(response?.ok())&&errors.length===0&&!/Une erreur s'est produite|Nos équipes ont été notifiées|Application error/i.test(text);
}catch{}finally{await browser.close();}
await writeFile(process.argv[2],JSON.stringify({ok}));
