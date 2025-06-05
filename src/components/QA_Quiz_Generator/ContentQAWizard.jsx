/**
 * ContentQAWizard.jsx
 *
 * This component implements a multi-step wizard for generating Question & Answer
 * pairs from user-provided text content or PDF files (PDF processing TBD).
 * It guides the user through content input, Q&A generation (via OpenAI),
 * review/editing, and finally, saving the quiz.
 *
 * Key Dependencies:
 * - React (useState, useEffect, useRef, useCallback)
 * - Framer Motion (for animations)
 * - React Router (useNavigate for navigation)
 * - AuthContext (useAuth for user data)
 * - WizardProgressBar (for visual step indication)
 * - useOpenAIGeneration (custom hook for AI interaction)
 * - useWindowSize (custom hook for responsive design)
 * - CSS Modules (./ContentQAWizard.module.css for component-specific styles)
 */
import styles from "./ContentQAWizard.module.css";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import WizardProgressBar from "../WizardProgressBar/WizardProgressBar";
import { useOpenAIGeneration } from "../../hooks/useOpenAiGenerationAPI";
import useWindowSize from "../../hooks/useWindowSize";

const MOBILE_BREAKPOINT = 768; // Define a breakpoint for mobile screens

const step2PanelVariants = {
  hidden: { opacity: 0, scale: 0.95 }, // initial appearance
  visible: {
    // For when it's fully visible and potentially resizing (though size snaps now)
    opacity: 1,
    scale: 1,
    // flexBasis will be set directly in the animate prop for snapping
  },
  exit: {
    //  crucial for when Step 2 leaves
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.3, ease: "easeIn" }, // Defines how it fades/scales out
  },
};

const step1Variants = {
  initial: { width: "100%", opacity: 1 },
  shrunken: { width: "40%", opacity: 1 },
  hidden: { width: "0%", opacity: 0, transition: { duration: 0.3 } }, // For when it slides out
};

const step2Variants = {
  hidden: { width: "0%", opacity: 0, scale: 0.95 },
  visible: { width: "60%", opacity: 1, scale: 1 },
  full: { width: "100%", opacity: 1, scale: 1 }, // For when Step 1 is hidden
};

// Define a simple style for the success message if not using CSS modules for it
const successMessageStyle = {
  color: "green",
  marginTop: "10px",
  padding: "10px",
  border: "1px solid green",
  borderRadius: "4px",
  backgroundColor: "#e6ffed",
};

export default function OpenAIQAWizard() {
  // ----- Step control -----
  const [step, setStep] = useState(1);
  const totalWizardSteps = 3;

  // Step 1: User inputs
  const [contentText, setContentText] = useState("");
  const [gradeLevel, setGradeLevel] = useState(7);
  const [questionCount, setQuestionCount] = useState(5);
  const [language, setLanguage] = useState("en");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfFileName, setPdfFileName] = useState("");

  // Step 2: Returned Q&A Data
  const [qaData, setQaData] = useState([]);

  // Loading & errors
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Step 2: Scrolling
  const questionsContainerRef = useRef(null);
  const prevQaDataLengthRef = useRef(qaData.length);
  const manualAddScrollRef = useRef(false);
  const [editingItemId, setEditingItemId] = useState(null);

  // Step 2: Full-width mode
  const [isReviewModeActive, setIsReviewModeActive] = useState(false);
  const [isStep1ExitingForReview, setIsStep1ExitingForReview] = useState(false);

  // Step 3: Quiz Title & Description
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDescription, setQuizDescription] = useState("");

  // ----- Flags to handle sequential transitions -----
  const [pendingReview, setPendingReview] = useState(false);
  const [pendingBackToStep2, setPendingBackToStep2] = useState(false);
  const [pendingStep3, setPendingStep3] = useState(false);
  const [pendingStep4, setPendingStep4] = useState(false);
  const isResettingToStep1Ref = useRef(false);

  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { width: windowWidth } = useWindowSize(); // Get window width

  const { generateQuestions, isGenerating, saveQuiz, isSavingQuiz } =
    useOpenAIGeneration();

  const fileInputRef = useRef(null);

  // Determine if mobile view is active - MOVED UP
  const isMobile = windowWidth ? windowWidth < MOBILE_BREAKPOINT : false;

  // --- Animation control refs ---
  const isComingFromStep1Ref = useRef(false);
  const isReturningToDualViewRef = useRef(false);
  const isReturningToReviewFromStep3Ref = useRef(false);

  // Define animation durations and delays
  const STEP1_LAYOUT_DURATION = 0.3; // ADD THIS CONSTANT DEFINITION

  //
  // ------------------- Animation Variants -------------------
  //

  // Q&A items
  const qaItemVariants = {
    hidden: { opacity: 0, height: 0, y: 20, marginBottom: 0 },
    visible: {
      opacity: 1,
      height: "auto",
      y: 0,
      marginBottom: "var(--space-md, 1rem)",
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      height: 0,
      y: -10,
      marginBottom: 0,
      scale: 0.95,
      transition: { duration: 0.25, ease: "easeIn" },
    },
  };

  // Q&A list container
  const listWrapperVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.07,
      },
    },
    exit: { opacity: 1 },
  };

  //
  // ------------------- Step Handlers -------------------
  //

  async function handleGenerate() {
    if (!contentText && !pdfFile) {
      setError("Please paste text or upload a PDF to generate questions.");
      return;
    }
    if (pdfFile) {
      setError("PDF processing is not yet implemented. Please paste text.");
      return;
    }
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
      setError("OpenAI API key is missing. Check your .env file.");
      return;
    }

    isComingFromStep1Ref.current = true; // Flag that we are transitioning from Step 1
    isReturningToDualViewRef.current = false; // Not returning from full review

    setIsLoading(true);
    setError("");
    setQaData([]);
    setStep(2);
    setIsReviewModeActive(false);

    try {
      const newQaDataFromAI = await generateQuestions({
        contentText,
        questionCount,
        gradeLevel,
        language,
      });
      // Map AI response to local state structure
      setQaData(
        newQaDataFromAI.map((item) => ({
          id: item.id,
          text: item.text || "",
          // Assuming options[0] is wrong, options[1] is correct as per instructions
          // Or, if correct_answer is provided, use that to determine.
          // For now, let's stick to the simpler options[0]/options[1] mapping
          // and ensure correct_answer from AI is used if available.
          wrongAnswer:
            item.options && item.options.length > 0
              ? (item.options[0] === item.correct_answer
                  ? item.options[1]
                  : item.options[0]) || ""
              : "",
          correctAnswer:
            item.correct_answer ||
            (item.options && item.options.length > 1 ? item.options[1] : ""),
          note: item.note || "",
        }))
      );
    } catch (err) {
      console.error("Error generating Q&A:", err);
      setError(
        err.message || "An unexpected error occurred while generating Q&A."
      );
    } finally {
      setIsLoading(false);
      // isComingFromStep1Ref will be reset by Step 2's animation onComplete
    }
  }

  // Add Q&A
  function handleAddQA() {
    const newId = `temp-${Date.now()}`;
    manualAddScrollRef.current = true;
    setQaData((prev) => [
      ...prev,
      {
        id: newId,
        text: "",
        correctAnswer: "",
        wrongAnswer: "",
        note: "",
        isNew: true,
      },
    ]);
  }

  // Scroll if new Q&A added
  useEffect(() => {
    if (
      manualAddScrollRef.current &&
      questionsContainerRef.current &&
      qaData.length > prevQaDataLengthRef.current
    ) {
      const container = questionsContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      });
      manualAddScrollRef.current = false;
    }
    prevQaDataLengthRef.current = qaData.length;
  }, [qaData]);

  // Delete Q&A
  function handleDeleteQA(idToDelete) {
    setQaData((prev) => prev.filter((item) => item.id !== idToDelete));
  }

  // "Back & Edit Content" - Modified Logic
  function handleBackToStep1() {
    setError("");
    if (isReviewModeActive) {
      // If in full review mode, exit review mode, stay visually on step 2 (dual view)
      isReturningToDualViewRef.current = true; // Flag for Step 1's layout animation delay
      isComingFromStep1Ref.current = false; // Not coming from Step 1 generate flow

      setIsReviewModeActive(false);
      setIsStep1ExitingForReview(false);
      if (step !== 2) {
        setStep(2);
      }
    } else {
      // If already in dual view, go back to step 1
      isComingFromStep1Ref.current = false;
      isReturningToDualViewRef.current = false;
      setStep(1);
    }
  }

  // "Review Q&A" or "Finalize" - Ensure flags are set correctly
  function handleReviewOrFinalize() {
    setError("");
    isComingFromStep1Ref.current = false; // Reset if leaving dual view
    isReturningToDualViewRef.current = false; // Reset if leaving dual view

    if (isReviewModeActive) {
      setPendingStep3(true);
      setStep(0);
    } else {
      setPendingReview(true);
      setIsStep1ExitingForReview(true);
    }
  }

  // "Back" from Step 3 to Step 2 - Ensure flags are set correctly
  function handleBackToStep2() {
    setError(""); // Clear errors
    setPendingBackToStep2(true); // Flag intention to return to Step 2
    setStep(0); // Trigger exit animation for Step 3
    // note: Step 3's onExitComplete will set step = 2 and isReviewModeActive = true
  }

  // Save Quiz (from Step 3)
  async function handleSaveQuizAndProceed() {
    // Validate quiz title
    if (!quizTitle.trim()) {
      setError("Quiz title is required.");
      setSuccessMessage("");
      const titleInput = document.getElementById("quiz-title");
      if (titleInput) {
        titleInput.focus();
      }
      return;
    }

    // Filter out incomplete question cards from qaData
    const validQaData = qaData.filter((item) => {
      const text = item.text?.trim();
      const correctAnswer = item.correctAnswer?.trim();
      const wrongAnswer = item.wrongAnswer?.trim();

      // Basic validation: question text and correct answer are always required
      if (!text || !correctAnswer) {
        return false;
      }

      // Check if it's intended to be a True/False question based on answer content
      const isPotentiallyTrueFalse =
        (correctAnswer.toLowerCase() === "true" &&
          wrongAnswer?.toLowerCase() === "false") ||
        (correctAnswer.toLowerCase() === "false" &&
          wrongAnswer?.toLowerCase() === "true");

      // If not True/False, a wrong answer is also required for MCQ options
      if (!isPotentiallyTrueFalse && !wrongAnswer) {
        return false;
      }
      return true; // Card is valid
    });

    // Makes sure there´s at least one valid question to save
    if (validQaData.length === 0) {
      setError(
        "Please add at least one question with all required fields (question, correct answer, and a second option for MCQs)."
      );
      setSuccessMessage("");
      return;
    }

    // Optional: Log if some incomplete cards were filtered out
    if (validQaData.length < qaData.length) {
      console.warn("Some incomplete question cards were not saved.");
    }

    // Ensure user is authenticated
    if (!currentUser) {
      setError("You must be logged in to save a quiz.");
      setSuccessMessage("");
      // Potentially redirect to login or show login modal
      return;
    }

    // Map valid Q&A data to the structure expected by Firebase
    const questions = validQaData.map((item) => {
      const correctAnswerInput = item.correctAnswer.trim();
      const wrongAnswerInput = item.wrongAnswer?.trim();
      const questionText = item.text.trim();
      const noteText = item.note?.trim();
      const questionPayload = {
        text: questionText,
        note: noteText || "", // Include note if present
      };

      // Determine if the question is True/False for correct data typing
      const isTrueFalseType =
        (correctAnswerInput.toLowerCase() === "true" &&
          wrongAnswerInput?.toLowerCase() === "false") ||
        (correctAnswerInput.toLowerCase() === "false" &&
          wrongAnswerInput?.toLowerCase() === "true");

      if (isTrueFalseType) {
        // Save correct_answer as boolean for True/False questions
        questionPayload.correct_answer =
          correctAnswerInput.toLowerCase() === "true";
        // No 'options' array for True/False questions
      } else {
        // For MCQs, save correct_answer as string and provide options array
        questionPayload.correct_answer = correctAnswerInput;
        questionPayload.options = [correctAnswerInput, wrongAnswerInput];
      }
      return questionPayload;
    });

    // Prepare the core details of the quiz to be saved
    const quizCoreDetails = {
      description: quizDescription.trim() || `${quizTitle.trim()}`,
      language: language,
      gradeLevel: gradeLevel,
      questions: questions, // Array of valid, formatted questions
      user_generated: true, // Flag as user-generated content
      userId: currentUser?.uid || null, // Store user's Firebase UID
      userFullName: currentUser?.displayName || "Anonymous", // Store user's display name
      createdAt: Date.now(), // Timestamp of creation
      quizTitle: quizTitle.trim(),
    };

    console.log("Quiz details to be saved:", quizCoreDetails);

    try {
      // Call the hook function to save the quiz to Firebase
      const result = await saveQuiz(quizTitle.trim(), quizCoreDetails);

      console.log("Quiz saved successfully via hook:", result);
      setError(""); // Ensure any previous error is cleared before proceeding
      setSuccessMessage(""); // Ensure any previous success message (from other ops) is cleared
      setPendingStep4(true); // Flag to proceed to the next step/view
      setStep(0); // Trigger animation/transition
    } catch (err) {
      console.error("Error saving quiz via hook: ", err);
      setError(`Failed to save quiz: ${err.message || "Unknown error"}`);
      setSuccessMessage(""); // Clear any success message if an error occurs
    }
  }

  //
  // ------------------- Render Functions for Steps -------------------
  //

  // Step 1 UI
  function renderStep1({ handleGoToReviewMode }) {
    return (
      <div className={styles.GeneratorFormContainer}>
        {/* Wrap form elements (excluding the button) in a scrollable div */}
        <div className={styles.step1FormContentScrollable}>
          <h2 className={styles.StepTitle }>Step 1: </h2>
          <h3 className={styles.StepSubtTitle }>Provide Content &amp; Settings</h3>
          {!import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.DEV && (
            <p className={styles.apiKeyWarning}>
              <strong>Warning:</strong> API key not set in .env file.
            </p>
          )}

          {/* Number of Questions & Grade Level */}
          <div className={styles.inputRow}>
            <div className={styles.inputGroup}>
              <label
                htmlFor="question-count"
                className={`${styles.wizardLabel} ${styles.darkText}`}
              >
                Number of Questions:
              </label>
              <input
                id="question-count"
                className={styles.wizardInput}
                type="number"
                min="1"
                max="20"
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(Math.max(1, Number(e.target.value)))
                }
                disabled={isLoading || isGenerating} // Disable during generation too
              />
            </div>
            <div className={styles.inputGroup}>
              <label
                htmlFor="grade-level"
                className={`${styles.wizardLabel} ${styles.darkText}`}
              >
                Grade Level:
              </label>
              <input
                id="grade-level"
                className={styles.wizardInput}
                type="number"
                min="1"
                max="12"
                value={gradeLevel}
                onChange={(e) => setGradeLevel(Number(e.target.value))}
                disabled={isLoading || isGenerating} // Disable during generation too
              />
            </div>
          </div>

          {/* Language Selection Dropdown */}
          <div className={styles.inputGroup}>
            <label
              htmlFor="language-select"
              className={`${styles.wizardLabel} ${styles.darkText}`}
            >
              Language for Questions:
            </label>
            <select
              id="language-select"
              className={styles.wizardSelect}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isLoading || isGenerating}
            >
              <option value="en">English</option>
              <option value="es">Español (Spanish)</option>
              <option value="fr">Français (French)</option>
              <option value="de">Deutsch (German)</option>
              <option value="no">Norsk (Norwegian)</option>
              <option value="sv">Svenska (Swedish)</option>
              <option value="da">Dansk (Danish)</option>
              <option value="nl">Nederlands (Dutch)</option>
              <option value="it">Italiano (Italian)</option>
              <option value="pt">Português (Portuguese)</option>
              <option value="ja">日本語 (Japanese)</option>
              <option value="ko">한국어 (Korean)</option>
              <option value="zh">中文 (Chinese)</option>
              {/* Add more languages as needed */}
            </select>
          </div>

          {/* Source Material Textarea */}
          <div className={styles.inputGroup}>
            <label
              htmlFor="source-text"
              className={`${styles.wizardLabel} ${styles.darkText}`}
            >
              Source Material:
            </label>
            <textarea
              id="source-text"
              className={styles.wizardTextarea}
              rows={isMobile ? 1 : 2}
              placeholder="Paste your text here..."
              value={contentText}
              onChange={(e) => setContentText(e.target.value)}
              disabled={isLoading || isGenerating} // Disable during generation too
            />
          </div>

          <p className={styles.orSeparator}>OR</p>

          {/* PDF Upload */}
          <div className={styles.inputGroup}>
            <label
              htmlFor="pdf-upload"
              className={`${styles.wizardLabel} ${styles.darkText}`}
            >
              Upload PDF (Extraction not implemented):
            </label>
            <input
              id="pdf-upload"
              className={styles.wizardInput}
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setPdfFile(file);
                  // Basic validation example
                  if (file.type !== "application/pdf") {
                    setError("Please upload a valid PDF file.");
                    setPdfFile(null); // Clear invalid file
                    e.target.value = null; // Reset file input visually
                  } else if (file.size > 10 * 1024 * 1024) {
                    // Example: 10MB limit
                    setError("PDF file size exceeds the limit (10MB).");
                    setPdfFile(null);
                    e.target.value = null;
                  } else {
                    setError("PDF processing/extraction is not yet implemented."); // Keep this message
                  }
                } else {
                  setPdfFile(null);
                  setError(""); // Clear error if file is deselected
                }
              }}
              disabled // Keep disabled as functionality isn't ready
            />
            {pdfFile && (
              <p className={styles.fileNameDisplay}>
                Selected file: {pdfFile.name}
              </p>
            )}
          </div>

          {/* Error Display */}
          {error && <div className={styles.stepErrorMessage}>{error}</div>}
        </div> {/* End of scrollable content area */}

        {/* Generate Button Container */}
        <div className={styles.generateButtonContainer}>
          <button
            type="button"
            className={`${styles.wizardButton} ${styles.primary} ${styles.fullWidth}`}
            onClick={handleGenerate}
            disabled={(!contentText && !pdfFile) || isLoading || isGenerating}
          >
            {isGenerating ? (
              <>
                <span
                  className={styles.spinnerSmall}
                  role="status"
                  aria-hidden="true"
                ></span>
                Generating...
              </>
            ) : (
              "Generate Q&A"
            )}
          </button>
        </div>
      </div>
    );
  }

  // Step 2 UI
  function renderStep2() {
    const showLoadingOrMessage =
      isGenerating || isLoading || error || qaData.length === 0;

    return (
      <div className={styles.QuestionAnswerContainer}>
        <h2 className={styles.StepTitle}>Step 2:</h2>
        <h3 className={styles.StepSubtTitle}>Review & Edit Q&A</h3>

        {!error && !isGenerating && !isLoading && (
          <div className={styles.addQaButtonContainer}>
            <button
              type="button"
              onClick={handleAddQA}
              className={`${styles.wizardButton} ${styles.addQuestionButton}`}
              disabled={isLoading}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
                style={{ marginRight: "var(--space-1)" }}
              >
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
              </svg>
              Add Q&A
            </button>
          </div>
        )}

        <div
          ref={questionsContainerRef}
          className={styles.qaListScrollContainer}
        >
          {isGenerating || isLoading ? (
            <div className={styles.loadingPlaceholder}>
              <div className={styles.spinner} />
              <p>Generating Q&A, please wait...</p>
            </div>
          ) : error ? (
            <div className={styles.loadingPlaceholder}>
              <p className={styles.errorMessage}>{error}</p>
            </div>
          ) : qaData.length === 0 ? (
            <div className={styles.loadingPlaceholder}>
              <p>
                No questions generated yet. Click "Add Question" or adjust
                settings.
              </p>
            </div>
          ) : (
            <motion.div
              variants={listWrapperVariants}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence initial={false}>
                {qaData.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    className={styles.qaBlock}
                    variants={qaItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                  >
                    <button
                      type="button"
                      className={styles.qaDeleteButton}
                      onClick={() => handleDeleteQA(item.id)}
                      aria-label="Delete question and answer"
                    >
                      <svg
                        width="6"
                        height="6"
                        viewBox="0 0 10 10"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={styles.qaDeleteIcon}
                      >
                        <path
                          d="M1 1L9 9M1 9L9 1"
                          stroke="white"
                          strokeWidth="1.85"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <label
                      htmlFor={`q-text-${item.id}`}
                      className={`${styles.wizardLabelTitle} ${styles.darkText}`}
                    >
                      <strong>Question {idx + 1}:</strong>
                    </label>
                    <input
                      id={`q-text-${item.id}`}
                      className={styles.qaInput}
                      type="text"
                      value={item.text || ""}
                      onChange={(e) => {
                        const updated = qaData.map((d) =>
                          d.id === item.id
                            ? { ...d, text: e.target.value, isNew: false }
                            : d
                        );
                        setQaData(updated);
                      }}
                      placeholder="Enter question text"
                    />

                    <label
                      htmlFor={`q-correct-${item.id}`}
                      className={`${styles.wizardLabelTitle} ${styles.darkText}`}
                      style={{ marginTop: "var(--space-sm, 0.5rem)" }}
                    >
                      <strong>Correct Answer:</strong>
                    </label>
                    <input
                      id={`q-correct-${item.id}`}
                      className={styles.qaInput}
                      type="text"
                      value={item.correctAnswer || ""}
                      onChange={(e) => {
                        const updated = qaData.map((d) =>
                          d.id === item.id
                            ? {
                                ...d,
                                correctAnswer: e.target.value,
                                isNew: false,
                              }
                            : d
                        );
                        setQaData(updated);
                      }}
                      placeholder="Enter the correct answer option"
                    />

                    <label
                      htmlFor={`q-wrong-${item.id}`}
                      className={`${styles.wizardLabelTitle} ${styles.darkText}`}
                      style={{ marginTop: "var(--space-sm, 0.5rem)" }}
                    >
                      <strong>False Answer:</strong>
                    </label>
                    <input
                      id={`q-wrong-${item.id}`}
                      className={styles.qaInput}
                      type="text"
                      value={item.wrongAnswer || ""}
                      onChange={(e) => {
                        const updated = qaData.map((d) =>
                          d.id === item.id
                            ? {
                                ...d,
                                wrongAnswer: e.target.value,
                                isNew: false,
                              }
                            : d
                        );
                        setQaData(updated);
                      }}
                      placeholder="Enter the incorrect answer option"
                    />

                    <label
                      htmlFor={`q-note-${item.id}`}
                      className={`${styles.wizardLabelTitle} ${styles.darkText}`}
                      style={{ marginTop: "var(--space-sm, 0.5rem)" }}
                    >
                      <strong>Note / Explanation:</strong>
                    </label>
                    <textarea
                      id={`q-note-${item.id}`}
                      className={styles.qaInput}
                      value={item.note || ""}
                      rows="2"
                      onChange={(e) => {
                        const updated = qaData.map((d) =>
                          d.id === item.id
                            ? { ...d, note: e.target.value, isNew: false }
                            : d
                        );
                        setQaData(updated);
                      }}
                      placeholder="Short explanation for incorrect answer"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

        {!isGenerating && !isLoading && !error && qaData.length > 0 && (
          <div className={styles.stepNavigationButtons}>
            <button
              type="button"
              className={`${styles.wizardButton} ${styles.secondary}`}
              onClick={handleBackToStep1}
            >
              Back & Edit Content
            </button>
            <button
              type="button"
              className={`${styles.wizardButton} ${styles.primary}`}
              onClick={handleReviewOrFinalize}
              disabled={qaData.length === 0 && !isLoading}
            >
              {isReviewModeActive ? "Finalize" : "Review Q&A"}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Step 3 UI
  function renderStep3() {
    return (
      <>
        <h2 className={styles.StepTitle}>Step 3: </h2>
        <h3 className={styles.StepSubtTitle}>Add Quiz Details</h3>
        {error && <p className={styles.stepErrorMessage}>{error}</p>}
        <div>
          <label
            htmlFor="quiz-title"
            className={`${styles.wizardLabel} ${styles.darkText}`}
          >
            Quiz Title:
          </label>
          <input
            id="quiz-title" // Changed from quiz-title-input to match handleSaveQuizAndProceed
            type="text"
            className={styles.wizardInput}
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
            placeholder="e.g., Chapter 5 Review"
          />
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label
            htmlFor="quiz-description"
            className={`${styles.wizardLabel} ${styles.darkText}`}
          >
            Description (Optional):
          </label>
          <textarea
            id="quiz-description"
            className={styles.wizardTextarea}
            value={quizDescription}
            onChange={(e) => setQuizDescription(e.target.value)}
            rows="4"
            placeholder="A brief summary of the quiz content..."
          />
        </div>
        <div className={styles.stepNavigationButtons}>
          <button
            type="button"
            className={`${styles.wizardButton} ${styles.secondary}`}
            onClick={handleBackToStep2}
            disabled={isSavingQuiz}
          >
            Back
          </button>
          <button
            type="button"
            className={`${styles.wizardButton} ${styles.primary}`}
            onClick={handleSaveQuizAndProceed}
            disabled={isSavingQuiz || !quizTitle.trim()}
          >
            {isSavingQuiz ? (
              <span
                className={styles.spinnerSmall}
                role="status"
                aria-busy="true"
              ></span>
            ) : (
              "Save Quiz & Proceed"
            )}
          </button>
        </div>
      </>
    );
  }

  // Step 4 UI
  function renderStep4() {
    return (
      <>
        {successMessage && ( /* This condition is unlikely to be met now for quiz save */
          <p style={successMessageStyle} role="alert">
            {successMessage}
          </p>
        )}
        <div className={styles.step4Message}>🎉🎉</div>
        <div className={styles.step4Message}>Your quiz has been saved!</div>

        <div className={styles.FinalStepButtonsContainer}>
          <button
            type="button"
            className={`${styles.wizardButton} ${styles.primary} ${styles.step4Button}`}
            onClick={() => navigate("/quiz-modules")}
          >
            View Library
          </button>
          <button
            type="button"
            className={`${styles.wizardButton} ${styles.secondary} ${styles.step4Button}`}
            onClick={() => {
              isResettingToStep1Ref.current = true;
              setSuccessMessage("");
              setStep(0);
            }}
          >
            Create Another Quiz
          </button>
        </div>
      </>
    );
  }

  //
  // ------------------- Main Render -------------------
  //

  /* ------------------------------------------------------------------
   * Helper : translate internal wizard step -> progress-bar "step"
   *  wizardStep : 1-4  ➜  progressStep : 0-3  (totalWizardSteps = 3)
   * -----------------------------------------------------------------*/
  function mapWizardStepToProgressStep(currentWizardStep) {
    if (currentWizardStep === 0) {
      // Intermediate animation step
      if (pendingStep3) return 2; // Moving from 2 to 3, show 2 as complete
      if (pendingBackToStep2) return 3; // Moving from 3 to 2, show 3 as current
      if (pendingStep4) return 3; // Moving from 3 to 4, show 3 as complete
      return step > 1 ? step - 1 : 0; // Default based on actual step if 0 is for transition
    }
    if (currentWizardStep >= 1 && currentWizardStep <= totalWizardSteps) {
      return currentWizardStep; // Steps 1, 2, 3 map directly
    }
    if (currentWizardStep === totalWizardSteps + 1) {
      // Step 4 (completion)
      return totalWizardSteps; // Show all main steps as complete
    }
    return 0; // Default or initial state
  }
  const displayStepForProgressBar = mapWizardStepToProgressStep(step);

  // Add console logs for debugging layout
  console.log("[Layout Debug] windowWidth:", windowWidth);
  console.log("[Layout Debug] isMobile:", isMobile);
  console.log("[Layout Debug] step:", step);
  console.log("[Layout Debug] isReviewModeActive:", isReviewModeActive);

  // Helper variable to detect if Step 1 is appearing specifically for the dual-view mode
  const isEnteringDualViewFromReview = step === 2 && !isReviewModeActive;

  // Define flex basis for Step 1 and Step 2 panels
  const step1FlexBasisTarget =
    step === 1 && !isReviewModeActive
      ? "100%"
      : step === 2 && !isReviewModeActive && !isMobile
      ? "40%"
      : step === 2 && !isReviewModeActive && isMobile
      ? "100%"
      : "0%";

  const step2FlexBasis =
    step === 2 && isReviewModeActive
      ? "100%"
      : step === 2 && !isReviewModeActive && !isMobile
      ? "60%"
      : step === 2 && !isReviewModeActive && isMobile
      ? "100%"
      : "0%";

  // Determine animation origin for Step 2 based on mode
  const step2OriginX =
    isMobile ? 0.5 : isReviewModeActive ? 0.5 : 0;

  // Calculate delays based on transition type
  const step1LayoutDelay =
    isReturningToDualViewRef.current && step === 2 && !isReviewModeActive
      ? 0.15
      : 0;
  const step1OpacityScaleDelay =
    isReturningToDualViewRef.current && step === 2 && !isReviewModeActive
      ? 0.1
      : 0;

  // Duration for Step 2 layout (flex-basis AND position) animation
  const step2LayoutDuration =
    isComingFromStep1Ref.current &&
    step === 2 &&
    !isReviewModeActive &&
    !isMobile
      ? STEP1_LAYOUT_DURATION
      : isReturningToDualViewRef.current && step === 2 && !isReviewModeActive
      ? 0.3
      : 0.3; // Default duration

  // Duration for Step 2 opacity/scale animations
  const step2OpacityScaleDuration =
    isComingFromStep1Ref.current &&
    step === 2 &&
    !isReviewModeActive &&
    !isMobile
      ? 0.3
      : isReturningToDualViewRef.current && step === 2 && !isReviewModeActive
      ? 0.25
      : 0.3; // Default duration

  // Delay for Step 2 layout animation
  const step2LayoutDelay =
    isComingFromStep1Ref.current &&
    step === 2 &&
    !isReviewModeActive &&
    !isMobile
      ? STEP1_LAYOUT_DURATION
      : isReturningToDualViewRef.current && step === 2 && !isReviewModeActive
      ? 0.05
      : 0; // Default no delay

  // Delay for Step 2 opacity/scale animations
  const step2OpacityScaleDelay =
    isComingFromStep1Ref.current &&
    step === 2 &&
    !isReviewModeActive &&
    !isMobile
      ? STEP1_LAYOUT_DURATION
      : isReturningToDualViewRef.current && step === 2 && !isReviewModeActive
      ? 0.1
      : 0; // Default no delay

  // Animation complete handler for Step 2
  const handleStep2AnimationComplete = useCallback(() => {
    if (isComingFromStep1Ref.current) {
      isComingFromStep1Ref.current = false;
    }
    if (isReturningToDualViewRef.current) {
      isReturningToDualViewRef.current = false;
    }
    if (isReturningToReviewFromStep3Ref.current) {
      isReturningToReviewFromStep3Ref.current = false; // Reset the flag
    }
  }, []); // Dependencies will be managed by useCallback if they change

  // Determines the layout animation duration for Step 2 - THIS IS A KEY PART !
  const currentStep2LayoutAnimDuration = isReturningToReviewFromStep3Ref.current
    ? 0.01
    : step2LayoutDuration;

  return (
    <div className={styles.OuterContainer}>
      {/* Wizard Progress Bar */}
      <AnimatePresence>
        {((step >= 1 && step <= totalWizardSteps + 1) ||
          (step === 0 &&
            (pendingStep3 || pendingBackToStep2 || pendingStep4))) && (
          <motion.div
            key="wizard-progress-bar-wrapper"
            layout
            initial={{ opacity: 0, y: 0 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { duration: 0.3, ease: "easeOut" },
            }}
            exit={{
              opacity: 0,
              y: -10,
              transition: { duration: 0.2, ease: "easeIn" },
            }}
          >
            <WizardProgressBar
              currentStep={displayStepForProgressBar}
              totalSteps={totalWizardSteps}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className={styles.wizardStepsPanelsContainer}
        style={{
          flexDirection:
            isMobile && step === 2 && !isReviewModeActive ? "column" : "row",
        }}
      >
        {/* STEP 1 PANEL (Content Input) */}
        <AnimatePresence
          onExitComplete={() => {
            if (pendingReview) {
              setIsReviewModeActive(true);
              setPendingReview(false);
              setIsStep1ExitingForReview(false);
              if (step !== 2) setStep(2);
            }
          }}
        >
          {(step === 1 ||
            (step === 2 &&
              !isReviewModeActive &&
              !isStep1ExitingForReview)) && (
            <motion.div
              key="step1-panel"
              className={styles.GeneratorStep1}
              layout="position" //Prevents layout from being used for the animation and avoids stretching
              initial={{
                opacity:
                  isReturningToDualViewRef.current &&
                  step === 2 &&
                  !isReviewModeActive
                    ? 0
                    : step === 1 && !isReviewModeActive
                    ? 0
                    : 1,
                scale:
                  isReturningToDualViewRef.current &&
                  step === 2 &&
                  !isReviewModeActive
                    ? 0.95
                    : step === 1 && !isReviewModeActive
                    ? 0.95
                    : 1,
                flexBasis:
                  isReturningToDualViewRef.current &&
                  step === 2 &&
                  !isReviewModeActive
                    ? "0%"
                    : step1FlexBasisTarget,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                flexBasis: step1FlexBasisTarget,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                transition: {
                  opacity: { duration: 0.3, ease: "easeIn" },
                  scale: { duration: 0.3, ease: "easeIn" },
                },
              }}
              transition={{
                opacity: {
                  duration: 0.35,
                  ease: "easeOut",
                  delay: step1OpacityScaleDelay,
                },
                scale: {
                  duration: 0.35,
                  ease: "easeOut",
                  delay: step1OpacityScaleDelay,
                },
                layout: {
                  duration: STEP1_LAYOUT_DURATION,
                  ease: [0.4, 0, 0.2, 1],
                  delay: step1LayoutDelay,
                },
              }}
              style={{
                originX: 0.5,
                originY: 0.5
              }}
            >
              {renderStep1({ handleGoToReviewMode: handleReviewOrFinalize })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 2 PANEL (Q&A Review) */}
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            if (pendingStep3) {
              setStep(3);
              setIsReviewModeActive(false); // Ensure review mode is off for step 3
              setPendingStep3(false);
            }
          }}
        >
          {step === 2 && (
            <motion.div
              key="step2-panel"
              className={styles.GeneratorStep2}
              layout
              initial={step2PanelVariants.hidden}
              animate={{
                opacity: 1,
                scale: 1,
                flexBasis: step2FlexBasis,
                originX: step2OriginX,
                originY: 0.5
              }}
              exit={step2PanelVariants.exit}
              transition={{
                opacity: {
                  duration: step2OpacityScaleDuration,
                  ease: "easeOut",
                  delay: step2OpacityScaleDelay,
                },
                scale: {
                  duration: step2OpacityScaleDuration,
                  ease: "easeOut",
                  delay: step2OpacityScaleDelay,
                },
                layout: {
                  duration: step2LayoutDuration,
                  ease: "easeInOut",
                  delay: step2LayoutDelay,
                },
              }}
              onAnimationComplete={handleStep2AnimationComplete}
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {renderStep2()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 3 final. */}
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            if (pendingStep4) {
              setStep(4);
              setPendingStep4(false);
            }
            if (pendingBackToStep2) {
              isReturningToReviewFromStep3Ref.current = true; // SET THE FLAG HERE
              setStep(2); // Show Step 2
              setIsReviewModeActive(true); // Activate review mode for full width
              setPendingBackToStep2(false);
            }
          }}
        >
          {step === 3 && (
            <motion.div
              key="step3-panel"
              className={styles.GeneratorStep3}
              initial={{ opacity: 0, scale: 0.95, originX: 0.5, originY: 0.5 }}
              animate={{
                opacity: 1,
                scale: 1,
                originX: 0.5,
                originY: 0.5,
                transition: { duration: 0.35, ease: "easeOut" },
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                originX: 0.5,
                originY: 0.5,
                transition: { duration: 0.25, ease: "easeIn" },
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1, // Ensure it tries to take full space
                minHeight: 0,
              }}
            >
              {renderStep3()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* STEP 4 success screen. */}
        <AnimatePresence
          mode="wait"
          onExitComplete={() => {
            if (isResettingToStep1Ref.current) {
              // Perform all state resets first
              setContentText("");
              setPdfFile(null);
              setPdfFileName("");
              setQuestionCount(15);
              setGradeLevel(7);
              setLanguage("en");
              setQaData([]);
              setError("");
              // successMessage is already cleared
              setIsLoading(false);
              setEditingItemId(null);
              setIsReviewModeActive(false);
              setIsStep1ExitingForReview(false);

              setQuizTitle("");
              setQuizDescription("");

              setPendingReview(false);
              setPendingBackToStep2(false);
              setPendingStep3(false);
              setPendingStep4(false);

              isComingFromStep1Ref.current = false;
              isReturningToDualViewRef.current = false;
              isReturningToReviewFromStep3Ref.current = false;

              // Introduce a small delay before showing Step 1
              setTimeout(() => {
                setStep(1); // Now, transition to Step 1
                isResettingToStep1Ref.current = false; // Reset the flag after step change
              }, 50); // 50ms delay, adjust if needed (e.g., 30-100ms)
            }
          }}
        >
          {step === 4 && (
            <motion.div
              key="step4-panel"
              className={styles.GeneratorStep4}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: 1,
                scale: 1,
                transition: { duration: 0.35, ease: "easeOut" },
              }}
              exit={{
                opacity: 0,
                scale: 0.95,
                transition: { duration: 0.25, ease: "easeIn" },
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                textAlign: "center",
                minHeight: 0,
              }}
            >
              {renderStep4()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>{" "}
      {/* END of wizard-steps-panels-container */}
      {/* Display global error or success messages if not handled within steps */}
      {error && step !== 4 && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      {successMessage && step !== 4 && <p style={successMessageStyle}>{successMessage}</p>}
    </div> // END of OuterContainer
  );
}
