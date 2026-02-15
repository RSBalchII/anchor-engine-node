
import { gotScraping } from 'got-scraping';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { NOTEBOOK_DIR } from '../../config/paths.js';

const PLUGINS_DIR = path.join(NOTEBOOK_DIR, 'plugins');

// Ensure staging directories exist
const ARTICLES_DIR = path.join(PLUGINS_DIR, 'articles');
const PAPERS_DIR = path.join(PLUGINS_DIR, 'research-papers');

// Robust Headers


if (!fs.existsSync(ARTICLES_DIR)) fs.mkdirSync(ARTICLES_DIR, { recursive: true });
if (!fs.existsSync(PAPERS_DIR)) fs.mkdirSync(PAPERS_DIR, { recursive: true });

const turndownService = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced'
});

// Remove script tags, styles, etc.
turndownService.remove(['script', 'style', 'noscript', 'iframe', 'nav', 'footer', 'header']);

interface ResearchResult {
    success: boolean;
    filePath?: string;
    title?: string;
    error?: string;
}

export async function fetchAndProcess(url: string, category: 'article' | 'paper' = 'article'): Promise<ResearchResult> {
    try {
        console.log(`[Research] Fetching: ${url}`);

        const response = await gotScraping(url, { timeout: { request: 10000 } });

        const html = response.body;
        const $ = cheerio.load(html);

        // Extract Metadata
        const title = $('title').text().trim() || 'Untitled Page';
        const metaDesc = $('meta[name="description"]').attr('content') || '';

        // Cleanup DOM
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('header').remove();
        $('footer').remove();
        $('.ad').remove();
        $('.advertisement').remove();
        $('.sidebar').remove();

        // Target main content if possible
        let contentHtml = $('main').html() || $('article').html() || $('body').html() || '';

        // Convert
        const markdown = turndownService.turndown(contentHtml);

        // Frontmatter
        const fileContent = `# ${title}
> **Source**: ${url}
> **Date**: ${new Date().toISOString()}
> **Description**: ${metaDesc}

---

${markdown}
`;

        // Filename
        const safeTitle = title.replace(/[^a-zA-Z0-9-_]/g, '_').substring(0, 50);
        const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
        const filename = `${safeTitle}_${hash}.md`;

        // Save
        const targetDir = category === 'paper' ? PAPERS_DIR : ARTICLES_DIR;
        const filePath = path.join(targetDir, filename);

        await fs.promises.writeFile(filePath, fileContent, 'utf8');
        console.log(`[Research] Saved to: ${filePath}`);

        return { success: true, filePath, title };

    } catch (e: any) {
        console.error(`[Research] Failed: ${e.message}`);
        return { success: false, error: e.message };
    }
}

export interface WebSearchResult {
    title: string;
    link: string;
    snippet: string;
}

export async function searchWeb(query: string): Promise<WebSearchResult[]> {
    try {
        console.log(`[Research] Searching Web: "${query}"`);
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        const response = await gotScraping(searchUrl);

        const $ = cheerio.load(response.body);
        const results: WebSearchResult[] = [];

        $('.result').each((_i, element) => {
            const titleElement = $(element).find('.result__a');
            const snippetElement = $(element).find('.result__snippet');

            const title = titleElement.text().trim();
            const link = titleElement.attr('href');
            const snippet = snippetElement.text().trim();

            if (title && link && !link.includes('duckduckgo.com/y.js')) {
                // DuckDuckGo usually has internal redirects, we might get the raw link or the redirect.
                // Ideally we decode it if it's a diffbot or similar proxy, but usually for HTML version it's direct or simple.
                // Actually DDG HTML links are typically relative redirects `/l/?uddg=...`
                // We should try to extract the real URL if possible, or use the redirect.
                // Let's decode the uddg param if present.
                let realLink = link;
                try {
                    if (link.includes('uddg=')) {
                        const match = link.match(/uddg=([^&]+)/);
                        if (match && match[1]) {
                            realLink = decodeURIComponent(match[1]);
                        }
                    }
                } catch (e) { /* ignore */ }

                results.push({ title, link: realLink, snippet });
            }
        });

        console.log(`[Research] Found ${results.length} results.`);
        return results.slice(0, 10); // Top 10

    } catch (e: any) {
        console.error(`[Research] Search failed: ${e.message}`);
        return [];
    }
}
