import OpenAIApi from "openai";
import dotenv from "dotenv";

dotenv.config();

console.log("OpenAI API Key:", process.env.OPENAI_API_KEY ? "Loaded" : "Not Found");

const openai = new OpenAIApi({
    apiKey: process.env.OPENAI_API_KEY,
});

export const generateSkillQuestions = async (skillsArray) => {
    // Create a prompt with the array of skills passed as input
    const textprompt = `
    You are an expert in generating quiz questions based on the skills provided. The list of skills is as follows:

    ${JSON.stringify(skillsArray)}

    For each skill, generate at least five multiple-choice quiz questions. Each question should have the following format:
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "answer": "Correct answer"
    }

    Ensure that the output is **only** in the following **JSON format**:

    {
      
        "Skill Name": [
          {
            "question": "Question text",
            "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
            "answer": "Correct answer"
          },
          ...
        ]
      
    }

    Do not provide any explanation or extra text, only return the JSON data.
    `;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // You can change this to the version you prefer (e.g., gpt-4o-mini if needed)
            messages: [{ role: "user", content: textprompt }],
        });

        const content = response.choices[0]?.message?.content;

        console.log("Content received from OpenAI:", content);

        if (!content) {
            throw new Error("No content received from OpenAI.");
        }

        // Clean and extract JSON data from the response
        try {
            let cleanedJsonString = removeJsonSyntax(content);
            console.log("Cleaned JSON String:", cleanedJsonString);

            // Parse JSON safely
            const parsedJson = JSON.parse(cleanedJsonString);
            return parsedJson;
        } catch (parseError) {
            console.error("Error parsing JSON:", content);
            throw new Error("Failed to parse JSON data from OpenAI response.");
        }
    } catch (error) {
        console.error("Error:", error.message || error);

        if (error.response) {
            console.error("OpenAI API Error:", error.response.status, error.response.data);
        }

        return { error: error.message || "Failed to generate skill questions. Please try again later." };
    }
};

// Utility function to clean up JSON syntax from the OpenAI response
function removeJsonSyntax(jsonString) {
    if (jsonString.startsWith('```json') && jsonString.endsWith('```')) {
        // Remove the JSON syntax lines
        jsonString = jsonString.slice(8, -3).trim();
    }
    return jsonString;
}


