import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const outputPath = path.join(rootDir, 'public', 'car-brands-models.json');

const defaultRuntimeModules =
  'C:\\Users\\Omnix\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\.pnpm\\playwright@1.61.1\\node_modules';
const fallbackRuntimeModules = existsSync(defaultRuntimeModules)
    ? defaultRuntimeModules
    : path.join(
        'C:\\Users\\Omnix\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules',
      );
const runtimeModules = process.env.PLAYWRIGHT_NODE_MODULES ?? fallbackRuntimeModules;
const require = createRequire(path.join(runtimeModules, 'playwright', 'package.json'));
const { chromium } = require('playwright');

const sourceUrl = 'https://www.polovniautomobili.com/';
const modelApiBase = 'https://core.polovniautomobili.com/api/v1/models/active/brand';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getModelsUrl = (brand) =>
  `${modelApiBase}/${encodeURIComponent(brand)}/category/car/search-domain/detailed-search`;

const chromePath =
  process.env.PLAYWRIGHT_CHROME_PATH ??
  (existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : undefined);

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: process.env.HEADFUL !== '1',
});

try {
  const page = await browser.newPage({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  });

  await page.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#__NEXT_DATA__', { state: 'attached', timeout: 60000 });

  const brands = await page.evaluate(() => {
    const data = JSON.parse(document.getElementById('__NEXT_DATA__').textContent);
    return data.props.pageProps.commonData.brandsList;
  });

  const failures = [];
  const result = [];

  for (const brand of brands) {
    const response = await page.evaluate(async (url) => {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-type': 'application/json',
        },
      });
      const text = await res.text();
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type'),
        text,
      };
    }, getModelsUrl(brand.text));

    if (!response.ok) {
      failures.push({
        brand: brand.text,
        slug: brand.slug,
        status: response.status,
        bodyPreview: response.text.slice(0, 300),
      });
      result.push({ brand: brand.text, slug: brand.slug, models: [] });
      continue;
    }

    let payload;
    try {
      payload = JSON.parse(response.text);
    } catch {
      failures.push({
        brand: brand.text,
        slug: brand.slug,
        status: response.status,
        bodyPreview: response.text.slice(0, 300),
      });
      result.push({ brand: brand.text, slug: brand.slug, models: [] });
      continue;
    }

    result.push({
      brand: brand.text,
      slug: brand.slug,
      models: Array.isArray(payload.models) ? payload.models : [],
    });

    await delay(150);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      {
        source: sourceUrl,
        generatedAt: new Date().toISOString(),
        brands: result,
        failures,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const totalModels = result.reduce((sum, item) => sum + item.models.length, 0);
  console.log(
    JSON.stringify(
      {
        outputPath,
        brandCount: result.length,
        totalModels,
        failureCount: failures.length,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
