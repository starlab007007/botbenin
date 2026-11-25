"""Real document adapters. Acquisition remains in the authorised shared worker.

No URL is downloaded here. Browser subrequests are blocked, and production runs
this service with Docker network_mode=none. No user-provided Python/JS is eval'ed
by the service. A page's own inline scripts run only inside isolated Chromium.
"""
import asyncio
import contextlib
import io
import json
import os
from pathlib import Path
import sys


async def browser_document(html):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, channel='chromium', args=['--disable-background-networking'])
        try:
            context = await browser.new_context(service_workers='block', accept_downloads=False)
            await context.route('**/*', lambda route: route.abort())
            page = await context.new_page()
            await page.set_content(html, wait_until='domcontentloaded', timeout=15000)
            await page.wait_for_timeout(100)
            return await page.content()
        finally:
            await browser.close()


async def crawl4ai_document(html):
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
    async with AsyncWebCrawler(config=BrowserConfig(headless=True, verbose=False)) as crawler:
        async def isolate(page, context, **kwargs):
            await context.route('**/*', lambda route: route.abort())
            return page
        crawler.crawler_strategy.set_hook('on_page_context_created', isolate)
        result = await crawler.arun(url='raw:' + html, config=CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS, page_timeout=15000, verbose=False,
            wait_until='domcontentloaded', delay_before_return_html=0.1))
        if not result.success:
            raise ValueError('crawl4ai_execution_failed')
        return result.html


def scrapy_document(html, url):
    import scrapy
    from scrapy.crawler import CrawlerProcess
    from scrapy.http import HtmlResponse
    captured = []
    class SuppliedDocument:
        def process_request(self, request, spider):
            if request.url != url:
                raise ValueError('external_navigation_disabled')
            return HtmlResponse(url, body=html.encode(), encoding='utf-8', request=request)
    class DocumentSpider(scrapy.Spider):
        name = 'waouh_supplied_document'
        async def start(self):
            yield scrapy.Request(url, callback=self.parse, dont_filter=True)
        def parse(self, response):
            # Round-trip through Scrapy's HTML selector rather than replacing it
            # with another engine. Original JSON-LD and source links are retained.
            captured.append(response.selector.get())
    process = CrawlerProcess(settings={
        'LOG_ENABLED': False, 'TELNETCONSOLE_ENABLED': False,
        'DOWNLOADER_MIDDLEWARES': {SuppliedDocument: 1},
        'RETRY_ENABLED': False, 'REDIRECT_ENABLED': False,
        'ROBOTSTXT_OBEY': False,  # Already enforced before supplying the document.
        'CONCURRENT_REQUESTS': 1,
    })
    process.crawl(DocumentSpider)
    process.start(install_signal_handlers=False)
    if len(captured) != 1:
        raise ValueError('scrapy_document_not_processed')
    return captured[0]


def execute(data):
    html, engine = data['html'], data['engine']
    if engine == 'beautifulsoup':
        from bs4 import BeautifulSoup
        return str(BeautifulSoup(html, 'html.parser'))
    if engine == 'scrapy':
        return scrapy_document(html, data['url'])
    if engine == 'playwright':
        return asyncio.run(browser_document(html))
    if engine == 'crawl4ai':
        return asyncio.run(crawl4ai_document(html))
    raise ValueError('unknown_engine')


if __name__ == '__main__':
    data = json.load(sys.stdin)
    # Some libraries print startup banners; stdout is a strict JSON protocol.
    with contextlib.redirect_stdout(io.StringIO()):
        result = execute(data)
    print(json.dumps({'html': result}, ensure_ascii=False))
