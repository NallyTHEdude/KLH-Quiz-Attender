# <u>**KL-LMS Quiz Automation**</u>

This project automates quiz attempts on the KL University LMS platform using two different JavaScript files, depending on the quiz format.

---

## <u>**Available Scripts**</u>

### 1. nextButton.js
Use this script **if your quiz has a "Next" button** between questions.  
Example flow:  
Question → Answer → Next → … → Submit

### 2. noNextButton.js
Use this script **if your quiz allows scrolling through all questions** and then submitting directly.  
Example flow:  
Scroll through all → Answer → Submit

---

## <u>**Setup Instructions**</u>

1. Rename the file `.env.example` to `.env`.
2. Open the `.env` file and fill in the following fields:
   - **LMS_USERNAME** → Your LMS username  
   - **LMS_PASSWORD** → Your LMS password  
   - **LMS_URL** → The link generated after clicking the "Attempt Quiz" button  
   - **GEMINI_API_KEY** → Your Google Gemini API key (Model: `gemini-2.5-flash`)
3. Save the `.env` file.

---

## <u>**Running the Automation**</u>

### For quizzes with a Next button
```bash
npm run next
