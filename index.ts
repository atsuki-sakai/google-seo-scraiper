
import puppeteer from "puppeteer"
import { createObjectCsvWriter } from 'csv-writer'

process.setMaxListeners(5);

async function sleep(delaySec: number) {
  return new Promise(resolve => setTimeout(resolve, delaySec * 1000));
}

// 検索したいキーワードを検索したいキーワードを入力
const query = "CBDリキッド"

const main = async () => {

 const browser = await puppeteer.launch();

    // 検索結果の１ページ目に表示されるサイトののリンク取得するための関数
    const getLinks = async (query: string, pageIndex: number = 0) => {
        const page = await browser.newPage();
        await page.goto(`https://www.google.com/search?q=${query}&rlz=1C5CHFA_enJP970JP970&sxsrf=APwXEdcCTmGY-z5Rxu05AK7GZSkcmxKcIw:1681175186008&ei=krI0ZMETw7Laug_QnojoBw&start=${pageIndex}&sa=N&ved=2ahUKEwjBpJHO0aD-AhVDmVYBHVAPAn04FBDy0wN6BAgdEAQ&biw=1920&bih=969&dpr=1`, { timeout: 20000, waitUntil: "domcontentloaded" });
        const links =
            await page.evaluate(() => {
                const linkElem = Array.from(document.querySelectorAll('.MjjYud'))
                return linkElem.map((elem) => ({ url: elem.querySelector("a").href}))
            })
        await page.close();
        return links;
    };
  // 各URLのタイトルを取得するための関数
    const getTitle = async (url: string) => {
        await sleep(0.2)
        const page = await browser.newPage();
        await page.goto(url, {timeout: 100000, waitUntil: "domcontentloaded"});
        const title = await page.title();
        await page.close();
        return title;
    };
    // 各URLのデスクリプションを取得するための関数
    const getDescription = async (url: string) => {
        await sleep(0.2)
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.goto(url, {timeout: 100000, waitUntil: "domcontentloaded"});
        const description = await page.evaluate(() => {
            const descriptionElement = document.querySelector('head meta[name="description"]');
            return descriptionElement ? descriptionElement.getAttribute('content') : null;
        });
        await browser.close();
        return description
    };

    const links = await getLinks(query)
    const titles = await Promise.all(links.map((link) => getTitle(link.url)));
    const descriptions = await Promise.all(links.map((link) => getDescription(link.url)))

    // linksとtitle,descの配列の長さは同一
    const data = links.map((_, index) => {
        return {
            title: titles[index],
            desc: descriptions[index]
        }
    })

    const csvWriter = createObjectCsvWriter({
        path: 'output.csv',
        header: [{id: "title", title: "title"}, {id: "desc", title: "desc"}],
    })
    await csvWriter.writeRecords(data && data).then(() => {
        console.log('scriping is completed.')
    })

    await browser.close()
}

main()