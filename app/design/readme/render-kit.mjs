import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const here=path.dirname(fileURLToPath(import.meta.url));
const app=path.resolve(here,'../..');
const out=path.join(app,'public/readme');
await mkdir(out,{recursive:true});
const mascots=(await readFile(path.join(app,'public/brand/mascots-cutout.png'))).toString('base64');
const bold=(await readFile(path.join(app,'public/fonts/inter-700.ttf'))).toString('base64');
const extra=(await readFile(path.join(app,'public/fonts/inter-800.ttf'))).toString('base64');
const regular=(await readFile(path.join(app,'public/fonts/inter-400.ttf'))).toString('base64');
const fonts=`<style>@font-face{font-family:Inter;src:url(data:font/ttf;base64,${regular}) format('truetype');font-weight:400}@font-face{font-family:Inter;src:url(data:font/ttf;base64,${bold}) format('truetype');font-weight:700}@font-face{font-family:Inter;src:url(data:font/ttf;base64,${extra}) format('truetype');font-weight:800}text{font-family:Inter,Arial,sans-serif}</style>`;
const open=(w,h,title,desc)=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="title desc"><title id="title">${title}</title><desc id="desc">${desc}</desc><defs>${fonts}</defs>`;
const header=open(1320,500,'Fox.ai — Better listings. A smarter next round.','A learning loop for small marketplace sellers. Lo the partner, Fox the creative and Spark the analyst accompany a workflow grounded in real product photos, competitors and sales.')+`
<rect width="1320" height="500" rx="24" fill="#E7EFFF"/>
<circle cx="1174" cy="241" r="236" fill="#DDE9FF"/>
<circle cx="1174" cy="241" r="194" fill="none" stroke="#CEDFFF"/>
<g transform="translate(45 36) scale(1.1)"><path d="M10 25c-8-3-4-15 4-12 4 2 4 12 9 14 9 4 15-8 8-13-6-5-10 3-13 8" stroke="#3269E8" stroke-width="4.5" stroke-linecap="round" fill="none"/></g>
<text x="99" y="70" font-size="31" font-weight="700" fill="#18304D" letter-spacing="-1.5">Fox.ai</text><circle cx="267" cy="65" r="3" fill="#FFBB67"/>
<text x="1272" y="63" text-anchor="end" font-size="12" font-weight="700" fill="#667B98" letter-spacing="1.5">CAL HACKS 13 / WORKING DEMO</text>
<text x="48" y="175" font-size="61" font-weight="800" fill="#18304D" letter-spacing="-2.7">Better listings.</text>
<text x="48" y="248" font-size="61" font-weight="800" fill="#3269E8" letter-spacing="-2.7">A smarter next round.</text>
<text x="48" y="303" font-size="21" fill="#667B98">A learning loop for small marketplace sellers.</text>
<text x="48" y="335" font-size="21" fill="#667B98">Grounded in their products, competitors and sales.</text>
<circle cx="52" cy="389" r="4" fill="#1D9983"/>
<text x="67" y="394" font-size="15" font-weight="700" fill="#147A67">AI proposes. The seller decides. The loop learns.</text>
<svg x="704" y="116" width="568" height="266" viewBox="40 210 1465 665"><image x="0" y="0" width="1531" height="1027" xlink:href="data:image/png;base64,${mascots}"/></svg>
<text x="788" y="403" text-anchor="middle" font-size="11" font-weight="700" letter-spacing=".6" fill="#3269E8">LO · THE PARTNER</text>
<text x="993" y="403" text-anchor="middle" font-size="11" font-weight="700" letter-spacing=".6" fill="#A97131">FOX · THE CREATIVE</text>
<text x="1187" y="403" text-anchor="middle" font-size="11" font-weight="700" letter-spacing=".6" fill="#3269E8">SPARK · THE ANALYST</text>
<line x1="48" y1="438" x2="1272" y2="438" stroke="#CCDDF7"/>
<text x="48" y="471" font-size="13" fill="#667B98">Real competitor research</text><circle cx="229" cy="467" r="2" fill="#3269E8"/>
<text x="248" y="471" font-size="13" fill="#667B98">Product-referenced covers</text><circle cx="440" cy="467" r="2" fill="#3269E8"/>
<text x="459" y="471" font-size="13" fill="#667B98">Git-versioned learning</text>
</svg>`;
const loop=open(1320,236,'Fox.ai: product, review, learning','Lo: start with a real product. Fox: review the possibilities and choose what to keep. Spark: sales evidence updates the playbook and informs the next round.')+`
<rect x=".5" y=".5" width="1319" height="235" rx="20" fill="white" stroke="#E3E8F2"/>
<line x1="446" y1="36" x2="446" y2="200" stroke="#E3E8F2"/><line x1="884" y1="36" x2="884" y2="200" stroke="#E3E8F2"/>
<rect x="36" y="31" width="87" height="28" rx="8" fill="#E7EFFF"/><text x="48" y="50" font-size="12" font-weight="700" fill="#3269E8" letter-spacing="1">01 / LO</text>
<text x="36" y="104" font-size="24" font-weight="700" letter-spacing="-.7" fill="#18304D">Start with a real product.</text>
<text x="36" y="144" font-size="17" fill="#667B98">A real photo, seller context and</text><text x="36" y="171" font-size="17" fill="#667B98">comparable marketplace listings.</text>
<rect x="474" y="31" width="98" height="28" rx="8" fill="#FFF0DC"/><text x="486" y="50" font-size="12" font-weight="700" fill="#A97131" letter-spacing="1">02 / FOX</text>
<text x="474" y="104" font-size="24" font-weight="700" letter-spacing="-.7" fill="#18304D">Review the possibilities.</text>
<text x="474" y="144" font-size="17" fill="#667B98">Different covers, copy and approaches.</text><text x="474" y="171" font-size="17" fill="#667B98">The seller chooses what to keep.</text>
<rect x="912" y="31" width="115" height="28" rx="8" fill="#E4F5F1"/><text x="924" y="50" font-size="12" font-weight="700" fill="#147A67" letter-spacing="1">03 / SPARK</text>
<text x="912" y="104" font-size="24" font-weight="700" letter-spacing="-.7" fill="#18304D">Learn. Then loop.</text>
<text x="912" y="144" font-size="17" fill="#667B98">Sales evidence updates the playbook</text><text x="912" y="171" font-size="17" fill="#667B98">and informs the next round.</text>
</svg>`;
await writeFile(path.join(out,'header.svg'),header);await writeFile(path.join(out,'loop.svg'),loop);
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({deviceScaleFactor:1});
for(const [name,height] of [['header',500],['loop',236]]){await page.setViewportSize({width:1320,height});await page.goto('file://'+path.join(out,`${name}.svg`));await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,`${name}.png`),omitBackground:true});}
await browser.close();
const screenshot=path.join(app,'.design-preview/01-lancamento-desktop.png');
try{await copyFile(screenshot,path.join(out,'product.png'));}catch{}
console.log('README kit: header.svg/png, loop.svg/png and product.png in app/public/readme/.');
