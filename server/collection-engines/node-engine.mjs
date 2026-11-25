import {load} from 'cheerio';
import {BasicCrawler,Configuration,RequestList,log} from 'crawlee';
import fs from 'node:fs';
const input=JSON.parse(fs.readFileSync(0,'utf8'));
const normalize=()=>load(input.html).html();
if(input.engine==='cheerio')process.stdout.write(JSON.stringify({html:normalize()}));
else if(input.engine==='crawlee'){
  // Network acquisition and publication belong to the existing shared worker.
  // Crawlee processes that worker's bounded document through its real task lifecycle.
  log.setLevel(log.LEVELS.OFF);
  const requestList=await RequestList.open(null,[{url:input.url}]);
  let html;
  const crawler=new BasicCrawler({requestList,maxConcurrency:1,maxRequestsPerCrawl:1,
    maxRequestRetries:0,requestHandlerTimeoutSecs:20,
    requestHandler:async()=>{html=normalize();}},new Configuration({persistStorage:false}));
  await crawler.run();
  if(typeof html!=='string')throw Error('crawlee_document_not_processed');
  process.stdout.write(JSON.stringify({html}));
}else throw Error('unknown_engine');
