import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { aiResponse } from "./aiConfig.js";

dotenv.config({ path: "./.env" });
console.log("[DEBUG] ENV loaded. LMS_URL =", process.env.LMS_URL);


(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  const url = process.env.LMS_URL;
  const username = process.env.LMS_USERNAME;
  const password = process.env.LMS_PASSWORD;

  console.log("[DEBUG] Navigating to login page...");
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 100000,
  });

  // LOGIN
  console.log("[DEBUG] Logging in...");
  await page.type("#username", username);
  await page.type("#password", password);
  await Promise.all([
    page.click("#loginbtn"),
    page.waitForNavigation({ waitUntil: "networkidle0" }),
  ]);

  console.log("[DEBUG] Logged in. Collecting questions...");

  //Collect all questions
  const questionsAndAnswers = await page.$$eval(".qtext", (questionNodes) => {
    const result = {};
    questionNodes.forEach((qNode, index) => {
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
      result[index + 1] = { questionText, options };
    });
    return result;
  });

  console.log(
    "[DEBUG] Total questions collected:",
    Object.keys(questionsAndAnswers).length
  );

  console.log("[DEBUG] Sending questions to AI model...");
  const inputJsonForModel = JSON.stringify(questionsAndAnswers, null, 2);
  const response = await aiResponse(inputJsonForModel);
  console.log("[DEBUG] Model response:", response);

  // Answer Questions
  console.log("[DEBUG] Answering questions on same page...");

  for (
    let qIndex = 1;
    qIndex <= Object.keys(questionsAndAnswers).length;
    qIndex++
  ) {
    console.log(
      `[DEBUG] Answering Q${qIndex}: ${questionsAndAnswers[qIndex].questionText}`
    );

    const correctIndices = response[qIndex.toString()] || [];
    console.log(`[DEBUG] Correct indices for Q${qIndex}:`, correctIndices);

    for (const idx of correctIndices) {
      const selector = `.que:nth-of-type(${qIndex}) .answer div:nth-child(${
        idx + 1
      }) input`;
      console.log(
        `[DEBUG] Clicking option index ${idx} -> selector: ${selector}`
      );
      try {
        await page.click(selector);
      } catch (err) {
        console.warn(
          `[WARN] Could not click option ${idx} for Q${qIndex}:`,
          err.message
        );
      }
    }
  }

  console.log("[DEBUG] All answers filled. Finish attempt button is ready.");
  // await page.click('input#mod_quiz-next-nav[value="Finish attempt ..."]');
  // await browser.close();
})();
