const { connect } = require('../lib/cjs/index.js');

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
    // Define some ranges for "non-standard" desktop sizes.
    // For example, we might pick widths between 1100 and 1920 and heights between 600 and 1080.
    // Feel free to adjust these ranges based on your definition of "non-standard."
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

(async () => {
    const { page, browser } = await connect(realBrowserOption);
    await page.goto("https://bot-detector.rebrowser.net/");
    await page.screenshot({
        path: 'output/bot-analysis.jpg',
        fullPage: true 
    });

    console.log("screenshot taken");
    
    await browser.close();
})();