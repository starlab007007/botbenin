import{test}from'node:test';import assert from'node:assert/strict';import{chromium}from'playwright';import{visibleSignIn}from'./browser.mjs';
test('Visible authentication portal is checked instead of empty root',async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage(),form='<div role="dialog"><h2>Bienvenue sur WAOUH</h2><input type="email"><input type="password"></div>';
  await page.setContent('<div id="root"></div>'+form);assert.equal(await visibleSignIn(page,300),true);
  await page.setContent('<div id="root">'+'loading '.repeat(20)+'</div>');assert.equal(await visibleSignIn(page,300),false);
  await page.setContent('<div style="display:none">'+form+'</div>');assert.equal(await visibleSignIn(page,300),false);
  await page.setContent(form+'<p>Une erreur s\'est produite</p>');assert.equal(await visibleSignIn(page,300),false);
 }finally{await browser.close();}
});
