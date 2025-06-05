import { useState } from 'react';
import { ref, set, serverTimestamp } from 'firebase/database';
import { realtimeDB } from '../services/firebaseConfig';
import { useAuth } from '../contexts/AuthContext';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export function useOpenAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { currentUser } = useAuth();

  async function generateQuestions({
    contentText,
    questionCount,
    gradeLevel,
    language,
  }) {
    if (!OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing. Please check your environment configuration.");
    }
    if (!contentText) {
      throw new Error("Source material (contentText) is required to generate questions.");
    }


    setIsGenerating(true);

    try {
      const gradeSpecificTargeting = gradeLevel
        ? `\nShould be targeted for an audience of grade ${gradeLevel}.`
        : '';

      const userPrompt = `
Given the following text:

"${contentText}"

Generate EXACTLY ${questionCount} quiz questions as JSON in the language ${language}. Each question must have:
- "text": The question string.
- "options": An array of exactly 2 distinct string answers (e.g., ["True", "False"], ["Paris", "London"]).
- "correct_answer": Must be exactly one string from the "options" array.
- "note": A short explanation (string) that is shown if the user answers incorrectly.${gradeSpecificTargeting}

The questions, options, correct_answer, and notes MUST be in ${language}.

Examples of options can be; Yes/No, A/B, ["Cause", "Effect"], ["More likely", "Less likely"], ["Before X", "After X"], ["Primary reason", "Secondary reason"],["Year X", "Year Y"],["Name X", "Name Y"], etc. Just make sure they are not the same and not too long.
Example questions:
- What is the capital of France? ["Paris", "London"]
- Who wrote "1984"? ["George Orwell", "Aldous Huxley"]
- What is the main ingredient in guacamole? ["Avocado", "Tomato"]
- What is the capital of France? ["Paris", "London"]
- Who wrote "1984"? ["George Orwell", "Aldous Huxley"]
- What is the main ingredient in guacamole? ["Avocado", "Tomato"]

Ensure variations of options are used, not just yes/no for all questions.

Expected output:
Your entire response MUST be a single valid JSON object.
This JSON object must have a top-level key named "questions".
The value of "questions" MUST be an ARRAY of question objects.
Each question object in the "questions" array MUST have the following keys: "text", "options", "correct_answer", and "note".
The "options" key within each question object MUST be an ARRAY of exactly two strings.

Example of the exact JSON structure:
{
  "questions": [
    {
      "text": "What is the capital of France?",
      "options": ["Paris", "London"],
      "correct_answer": "Paris",
      "note": "Paris is the capital and largest city of France."
    },
    {
      "text": "Is the Earth flat?",
      "options": ["True", "False"],
      "correct_answer": "False",
      "note": "Scientific evidence overwhelmingly shows the Earth is an oblate spheroid."
    },
    {
      "text": "Is water a compound?",
      "options": ["True", "False"],
      "correct_answer": "True",
      "note": "Water (H2O) is a compound made of hydrogen and oxygen atoms."
    },
        {
      "text": "When did Norrway Sign its declaration of independance??",
      "options": ["1814", "1808"],
      "correct_answer": "True",
      "note": "1814 was the year"
    }
    // ... more question objects if questionCount > 4
  ]
}

Your entire response MUST be a single valid JSON object with a top-level "questions" array that contains exactly ${questionCount} objects. No extra keys or text outside this JSON structure.
`;

      const messages = [
        {
          role: "system",
          content:
            "You output the requested quiz questions in a single JSON object with a 'questions' array only, where each question has 'text', 'options' (an array of 2 strings), 'correct_answer' (one of the options), and 'note'.",
        },
        { role: "user", content: userPrompt },
      ];

      const body = JSON.stringify({
        model: "gpt-4-turbo-2024-04-09", // Using the GPT-4 turbo for speed and consistency in counting desired questions count, contra other models
        messages,
        temperature: 0.52, // Decides how creative/hallucinogenic the AI output is
        max_tokens: Math.min(350 * questionCount + 100, 4096),  // Limits the output to models max tokens
        response_format: { type: "json_object" }, // Enforce JSON output
      });

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body,
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error?.message ||
            `API request failed with status ${response.status}`
        );
      }
      if (!data.choices?.[0]?.message?.content) {
        throw new Error("Invalid AI response: no content.");
      }

      let textResponse = data.choices[0].message.content;
      // This replacements may not be necesssary if the "response_format: { type: "json_object" }"" works reliably
      textResponse = textResponse.replace(/```[^]*?```/g, (m) =>
        m.replace(/```/g, "")
      );
      textResponse = textResponse.replace(/```/g, "");
      textResponse = textResponse.replace(/^json\s*\n/, "");

      let rootJsonObject;
      try {
        rootJsonObject = JSON.parse(textResponse);
      } catch (err) {
        console.error("Raw AI response after fence removal:", textResponse);
        throw new Error("Failed to parse AI JSON. Possibly not valid JSON output.");
      }

      if (!rootJsonObject.questions || !Array.isArray(rootJsonObject.questions)) {
        console.error("Parsed AI response:", rootJsonObject);
        throw new Error("AI JSON missing valid 'questions' array or is not an array.");
      }

      const qaWithIds = rootJsonObject.questions.map((q, index) => ({
        ...q,
        id: `q-${Date.now()}-${index}`, // Unique ID 
      }));
      
      return qaWithIds;

    } catch (err) {
      // Log the error for debugging, then re-throw to be caught by the component
      console.error("Error in generateQuestions hook:", err);
      throw err; // Re-throw the error to be handled by the calling component
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveQuiz(quizTitle, quizDetails) {
    if (!currentUser) {
      const authError = "User not authenticated. Please log in.";
      console.error(authError);
      setSaveError(authError);
      throw new Error(authError);
    }
    if (!quizTitle || typeof quizTitle !== 'string' || quizTitle.trim() === '') {
      const titleError = "Quiz title cannot be empty.";
      console.error(titleError);
      setSaveError(titleError);
      throw new Error(titleError);
    }

    setIsSavingQuiz(true);
    setSaveError(null);
    setSaveSuccess(false);
    const quizId = quizTitle.trim().replace(/[.#$[\]]/g, '_'); //Trim, Remove & Changes un-authorised characters that firebase doesn't like
    const quizPath = `user_topics/${quizId}`;

    const dataToSave = {
      title: quizTitle.trim(),
      description: quizDetails.description || "",
      language: quizDetails.language || "en",
      questions: quizDetails.questions || [],
      user_generated: quizDetails.user_generated === true,
      userId: currentUser.uid,
      userFullName: currentUser.displayName || "Anonymous",
      createdAt: serverTimestamp(),
    };

    try {
      console.log("[useOpenAIGeneration] Size of data to save:", JSON.stringify(dataToSave)?.length);
      await set(ref(realtimeDB, quizPath), dataToSave);
      console.log("Quiz saved successfully to RTDB:", quizPath, dataToSave);
      setIsSavingQuiz(false);
      setSaveSuccess(true);
      return { success: true, path: quizPath, id: quizId, data: dataToSave };
    } catch (error) {
      console.error("RTDB save error:", error);
      setSaveError(`RTDB save failed: ${error.message}`);
      setIsSavingQuiz(false);
      throw new Error(`RTDB save failed: ${error.message}`);
    }
  }

  return { generateQuestions, isGenerating, saveQuiz, isSavingQuiz, saveError, saveSuccess };
} 