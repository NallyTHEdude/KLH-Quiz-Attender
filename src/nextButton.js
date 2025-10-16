import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { aiResponse } from "./aiConfig.js";

dotenv.config({
  path: "../.env",
});

(async () => {
  const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
  const page = await browser.newPage();

  const url = process.env.LMS_URL;
  const username = process.env.LMS_USERNAME;
  const password = process.env.LMS_PASSWORD;

  console.log("[DEBUG] Navigating to login page...");
  await page.goto(url);

  // login
  console.log("[DEBUG] Logging in...");
  await page.type("#username", username);
  await page.type("#password", password);
  await Promise.all([
    page.click("#loginbtn"),
    page.waitForNavigation({ waitUntil: "networkidle0" }),
  ]);

  console.log("[DEBUG] Logged in. Starting question collection...");

  // ------------------ PASS 1: Collect Questions ------------------
  const questionsAndAnswers = {};
  while (true) {
    const current = await page.$$eval(".qtext", (questionNodes) => {
      const result = {};
      questionNodes.forEach((qNode) => {
        const questionText = qNode.innerText.trim();
        const answerDiv = qNode.closest(".formulation")?.querySelector(".answer");
        let options = [];
        if (answerDiv) {
          const inputs = answerDiv.querySelectorAll("input");
          options = Array.from(inputs).map((input) => {
            const parentDiv = input.closest("div");
            return parentDiv ? parentDiv.textContent.trim() : "";
          });
        }
        result[questionText] = options;
      });
      return result;
    });

    Object.assign(questionsAndAnswers, current);
    console.log("[DEBUG] Collected questions so far:", Object.keys(questionsAndAnswers).length);

    // Navigation
    const nextButton = await page.$('input#mod_quiz-next-nav[value="Next page"]');
    const finishButton = await page.$('input#mod_quiz-next-nav[value="Finish attempt ..."]');

    if (nextButton) {
      console.log("[DEBUG] Clicking Next page...");
      await Promise.all([
        nextButton.click(),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
      ]);
    } else if (finishButton) {
      console.log("[DEBUG] Finish attempt button found. Done collecting.");
      break;
    } else {
      console.log("[DEBUG] No navigation button found. Exiting loop.");
      break;
    }
  }

  console.log("[DEBUG] Sending questions to AI model...");
  const inputJsonForModel = JSON.stringify(questionsAndAnswers, null, 2);
  const response = await aiResponse(inputJsonForModel);
  console.log("[DEBUG] Model response:", response);

  // ------------------ PASS 2: Answer Questions ------------------
  console.log("[DEBUG] Restarting quiz from Q1...");
  await page.goto(url);

  let qIndex = 1;
  while (true) {
    const qText = await page.$eval(".qtext", (el) => el.innerText.trim());
    console.log(`[DEBUG] Answering Q${qIndex}:`, qText);

    const options = await page.$$eval(".answer div", (divs) =>
      divs.map((d) => d.innerText.trim())
    );

    const correctIndices = response[qIndex.toString()] || [];
    console.log(`[DEBUG] Correct indices for Q${qIndex}:`, correctIndices);

    for (const idx of correctIndices) {
      const selector = `.answer div:nth-child(${idx + 1}) input`;
      console.log(`[DEBUG] Clicking option index ${idx} -> selector: ${selector}`);
      await page.click(selector);
    }

    // Navigation
    const nextButton = await page.$('input#mod_quiz-next-nav[value="Next page"]');
    const finishButton = await page.$('input#mod_quiz-next-nav[value="Finish attempt ..."]');

    if (nextButton) {
      console.log("[DEBUG] Clicking Next page...");
      await Promise.all([
        nextButton.click(),
        page.waitForNavigation({ waitUntil: "networkidle0" }),
      ]);
      qIndex++;
    } else if (finishButton) {
      console.log("[DEBUG] Reached Finish attempt. Stopping answering loop.");
      break;
    } else {
      console.log("[DEBUG] No navigation button found while answering. Exiting.");
      break;
    }
  }

  console.log("[DEBUG] Automation complete.");
  // await browser.close();
})();
