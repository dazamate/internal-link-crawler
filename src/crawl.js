const { connect } = require('../lib/cjs/index.js');
const fs = require('fs');

const realBrowserOption = {
    args: ["--start-maximized"],
    turnstile: true,
    headless: false,
    // disableXvfb: true,
    customConfig: {},
    connectOption: {
        defaultViewport: getRandomDesktopViewport()
    },
    plugins: []
};

function getRandomDesktopViewport() {
    const minWidth = 1100;
    const maxWidth = 1920;
    const minHeight = 600;
    const maxHeight = 1050;

    const width = Math.floor(Math.random() * (maxWidth - minWidth + 1)) + minWidth;
    const height = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

    return {
        width,
        height
    };
}

function getDomainFromUrl(url) {
    try {
        const { hostname } = new URL(url);
        return hostname;
    } catch (err) {
        console.error("Invalid URL:", err);
        return null;
    }
}

function processCrawlQueue(url, pageLinkGraph, crawlQueue, crawledPages) {
    crawledPages.add(url);

    for (const link of pageLinkGraph) {
        if (link.is_internal && !crawledPages.has(link.href)) crawlQueue.add(link.href);
    }
}

(async () => {
    const { page, browser } = await connect(realBrowserOption);

    const entryPoint = "https://the-website.com/";
    const domain = getDomainFromUrl(entryPoint);

    const linkGraph = {};
    const crawlQueue = new Set();
    const crawledPages = new Set();

    crawlQueue.add(entryPoint);
    
    while (crawlQueue.size > 0) {
        const currentUrl = crawlQueue.values().next().value;

        crawlQueue.delete(currentUrl);
        crawledPages.add(currentUrl);

        await page.goto(currentUrl, { 
            waitUntil: ['domcontentloaded', 'load', 'networkidle2']
        });

        await page.addStyleTag({
            content: `
            * {
                transition: none !important;
                animation: none !important;
            }
            `,
        });
    
        // await page.screenshot({
        //     path: `output/${btoa(currentUrl)}.jpg`,
        //     fullPage: true 
        // });

        console.log(`${currentUrl} screenshot taken`);
    
        // Using page.evaluate to define the logic in the browser context
        linkGraph[currentUrl] = await page.evaluate((domain) => {
            // Define the helper function to check if a link is internal
            const isInternalLink = (url, domain) => {
                const urlDomain = new URL(url).hostname ?? '';
                return urlDomain === domain || url.startsWith('/');
            };
        
            // Function to process the anchors
            const processAnchors = (anchors) => {
                return anchors.map(a => {
                    if (!a.href) return false;
        
                    return {
                        href: a.href,
                        text: a.innerText.trim(),
                        is_internal: isInternalLink(a.href, domain)
                    };
                });
            };
        
            const anchors = Array.from(document.querySelectorAll('a'));
            return processAnchors(anchors);
        }, domain);

        // For each internal link found, if it's not crawled yet, add it to the queue
        for (const linkObj of linkGraph[currentUrl]) {
            if (linkObj.is_internal) {
                const normalizedUrl = new URL(linkObj.href, currentUrl).toString();
                // Only add if we haven't crawled it yet
                if (!crawledPages.has(normalizedUrl) && !crawlQueue.has(normalizedUrl)) {
                    crawlQueue.add(normalizedUrl);
                }
            }
        }
    }
    
    await browser.close();

    fs.writeFileSync('output/linkGraph.json', JSON.stringify(linkGraph, null, 2));
})();