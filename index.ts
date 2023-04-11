
import puppeteer from "puppeteer"
import { createObjectCsvWriter } from 'csv-writer'
import { setInterval } from "timers/promises";

process.setMaxListeners(30);

async function sleep(delaySec: number) {
  return new Promise(resolve => setTimeout(resolve, delaySec * 1000));
}

const main = async () => {
    console.log('scriping start.')

    const browser = await puppeteer.launch();

    // 検索結果の１ページ目に表示されるサイトののリンク取得するための関数
    const getChromeLinks = async (url: string): Promise<any> => {
        const page = await browser.newPage();
            await page.goto(url);
            const links =  await page.evaluate(() => {
                const linkElem = Array.from(document.querySelectorAll('.MjjYud'))
                return linkElem.map((elem) => ({ url: elem.querySelector("a")?.href ?? "" }))
            })
        console.log('links completed.')
        await page.close();
        return links;
    };

    // 各URLのタイトルを取得するための関数
    const getTitle = async (url: string ) => {
        await sleep(0.2)
        const page = await browser.newPage();
        try {
            await page.goto(url, {timeout: 100000, waitUntil: "domcontentloaded"});
            const title = await page.title();
            await page.close();
            return title;
        } catch (e) {
            await page.close();
            return "";
        }
    };
    // 各URLのデスクリプションを取得するための関数
    const getDescription = async (url: string) => {
        await sleep(0.2)
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        try {
            await page.goto(url, {timeout: 100000, waitUntil: "domcontentloaded"});
            const description = await page.evaluate(() => {
                const descriptionElement = document.querySelector('head meta[name="description"]');
                return descriptionElement ? descriptionElement.getAttribute('content') : null;
            });
            await browser.close();
            return description
        } catch (e) {
            await browser.close();
            await page.close();
            return "";
        }
    };

    const makeQuery = (query: string, pageIndex: number): { url: string }[] => {
        let result: {url: string}[] = []
        for (let index = 0; index < pageIndex; index++) {
            result.push({ url: `https://www.google.com/search?q=${query}&rlz=1C5CHFA_enJP970JP970&sxsrf=APwXEdcCTmGY-z5Rxu05AK7GZSkcmxKcIw:1681175186008&ei=krI0ZMETw7Laug_QnojoBw&start=${index === 0 ? 0 : `${index}0`}&sa=N&ved=2ahUKEwjBpJHO0aD-AhVDmVYBHVAPAn04FBDy0wN6BAgdEAQ&biw=1920&bih=969&dpr=1` });
        }
        return result
    }


    //###############################//
    // 検索したいキーワードとページ数を入力("keyword, fetchLength")//
    const urls = makeQuery("篠山　黒枝豆", 3)//
    //###############################//

    const links = await Promise.all(urls.map((url: { url: string }) => getChromeLinks(url.url)))
    let result: {url: string}[] = []
    links.map((urlList: {url:string}[]) => {
        result = [...result, ...urlList]
    })
    const titles = await Promise.all(result.map((link) => getTitle(link.url ?? "")));
    const descriptions = await Promise.all(result.map((link: { url: string }) => getDescription(link.url ?? "")));
    //linksとtitle,descの配列の長さは同一
    const data = result.map((_: any, index: number) => {
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