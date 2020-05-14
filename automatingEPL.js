let puppeteer = require("puppeteer");
let fs=require("fs");

let credFile=process.argv[2];
let team=process.argv[3];
let Info=[];

(async function () {
    try {
        let browser = await puppeteer.launch({
            headless: false,
            args: ["--start-maximized", "--disable-notifications"],
            defaultViewport: null
        })

        let credentials=await fs.promises.readFile(credFile);
        let {
            url,
            username,
            password,
            phoneno
        }=JSON.parse(credentials);

        let pages=await browser.pages();
        let page=pages[0];
        await page.goto(url,{waitUntil:"networkidle2",timeout:60000});
          
        //****************************Signing in ***************************8*/
        
        await page.waitForSelector(".ism-form__group");
        let signInForm=await page.$$(".ism-form__group");
        // console.log(signInForm.length);
        await page.type(".ism-form__group input[type=email]",username,{delay:100});
        await page.type(".ism-form__group input[type=password]",password,{delay:100});
        await Promise.all([page.click(".ism-form__group button[type=submit]"),page.waitForNavigation({timeout:60000, waitUntil:["domcontentloaded","networkidle2"]})]);        

        //*******************************handling cookies *********************/
        await page.waitForSelector(".js-cookies-notice.cookies-notice",{visible:true});
        // await page.waitForSelector(".js-cookies-notice.cookies-notice .btn-primary.cookies-notice-accept",{visible:true});
        await page.click(".js-cookies-notice.cookies-notice .btn-primary.cookies-notice-accept");

        //******************clicking on fixtures *************************//
        let listTabs=await page.$$(".showMoreEnabled li")
        let fixtureButton=listTabs[1];
        await Promise.all( [fixtureButton.click({delay:100}),page.waitForNavigation({timeout:60000,waitUntil:"networkidle2"})]);

        //*******************clicking on filter ***************************//
        await page.waitForSelector(".matchList");
        let filterbutton=await page.$(".dropDown.mobile div[role=button]");
        await filterbutton.click();
        await page.waitForSelector(".dropDown.mobile .current");

        //*******************selecting favorite team *************************//
        await page.waitForSelector("ul[data-dropdown-list=teams] li");
        let teams=await page.$$("ul[data-dropdown-list=teams] li");
        // console.log(teams.length);
        await choose(page,teams);
        await page.waitForSelector(".fixtures .fixtures__matches-list");

        //********************creating table ********************************//
        await page.waitForSelector(".matchList")
        let matchList=await page.$$(".matchList .matchFixtureContainer");
        // console.log(matchList.length);
        await createTable(page,matchList);
        console.log();
        console.log("TBC : To Be Confirmed")
        console.log();
        console.table(Info);
        //***********************setting reminder *************************//
        // await setReminder(page,team,phoneno);

        //****************************MatchInfo *****************************//
        await page.waitForSelector(".matchList .matchFixtureContainer .overview .icn.arrow-right");
        let arrowButton=await page.$(".matchList .matchFixtureContainer .overview .icn.arrow-right");
        await Promise.all([ arrowButton.click(),page.waitForNavigation({timeout:60000,waitUntil:["domcontentloaded","networkidle2"]})]);
        await page.waitForSelector(".wrapper.col-12 .statsSection.season-stats");
        await page.screenshot({path:"fixtureInfo.png", fullPage: true});

        await browser.close();
    } catch (err) {
        console.log(err);
    }
})()

//***************choosing fvrt team*********************//
async function choose(page,teams){
    for(let i=0;i<teams.length;i++){
        let text = await (await teams[i].getProperty('textContent')).jsonValue();
        if(text==team){
            await Promise.all([teams[i].click(),page.waitForNavigation({timeout:60000, waitUntil:["domcontentloaded","networkidle2"]})]);
            return;
        }
    }
}

//***********************setting reminder*********************//
async function setReminder(page,team,phoneno){
    await page.waitForSelector(".fixtureExtras .generateFixturesCalendar.icon-button.icon-button--hidden");
    let reminderButton=await page.$(".fixtureExtras .generateFixturesCalendar.icon-button.icon-button--hidden");
    await reminderButton.click();
}

//*************************creating matchlist *************************//
async function createTable(page,matchList){
    for(let i=0;i<matchList.length;i++){
        let teams=await matchList[i].$$(".overview .teams .team ");
        let team1=await teams[0].$(".teamName .shortname");
        let team2=await teams[1].$(".teamName .shortname");
        let teamname1=await (await team1.getProperty("textContent")).jsonValue();
        let teamname2=await (await team2.getProperty("textContent")).jsonValue();
        let teamname=teamname1+" vs "+teamname2;
        let dateElement=await matchList[i].$(" .overview .teams time");
        let date=await (await dateElement.getProperty("textContent")).jsonValue();
        let venueElement=await matchList[i].$(" .overview .stadiumName");
        let venue=await (await venueElement.getProperty("textContent")).jsonValue();
        let obj={
            TEAMS:teamname,
            DATE:date,
            VENUE:venue    
        }
        Info.push(obj);
    }
}
