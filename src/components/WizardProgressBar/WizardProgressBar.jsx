import React from 'react';
import './WizardProgressBar.css'; 

/**
 * @component WizardProgressBar
 * @description Displays a visual progress bar for a multi-step wizard.
 * @param {object} props - The component's props.
 * @param {number} props.currentStep - The current active step received from parent (e.g., 1, 2, 3, 4).
 * @param {number} props.totalSteps - The total number of steps in the wizard (e.g., 3).
 * @returns {React.ReactElement | null} The progress bar component or null if invalid props.
 */
export default function WizardProgressBar({ currentStep, totalSteps }) {
  console.log('WizardProgressBar received props:', { currentStep, totalSteps });

  // Basic validation:
  // totalSteps must be positive.
  if (totalSteps <= 0) return null;
  // currentStep from parent is expected to be between 0 and totalSteps + 1 (for completion screen).
  // Allow currentStep = 0 for an initial state.
  if (currentStep < 0 || currentStep > totalSteps + 1) {
    if (currentStep !== 0) return null;
  }

  let effectiveStepForDisplay;
  let progressPercentage;

  if (currentStep === 0) {
    // Special initial state ( before step 1 is truly active)
    effectiveStepForDisplay = 0;
    progressPercentage = 5; // Initial small fill
  } else if (currentStep === 1) {
    // User is on the first actual step
    effectiveStepForDisplay = 0; // Display "Step 0 of X"
    progressPercentage = 5;      // Maintain initial small fill
  } else if (currentStep === totalSteps + 1) {
    // This is the completion screen (e.g., parent is on its Step 4, totalSteps is 3)
    // The wizard has completed all 'totalSteps'.
    effectiveStepForDisplay = totalSteps; // Display "Step X of X" (e.g., "Step 3 of 3")
    progressPercentage = 100;             // Bar is full
  } else {
    // Intermediate steps (currentStep is 2, 3, ..., up to totalSteps)
    // Example: currentStep = 2, totalSteps = 3. User is ON step 2. 1 step completed. Display "Step 1 of 3".
    // Example: currentStep = 3, totalSteps = 3. User is ON step 3. 2 steps completed. Display "Step 2 of 3".
    effectiveStepForDisplay = currentStep - 1;
    // Progress is based on how many steps are *completed* out of total main steps.
    progressPercentage = ((currentStep - 1) / totalSteps) * 100;
  }

  // Ensure progressPercentage is within bounds [0, 100]
  progressPercentage = Math.max(0, Math.min(100, progressPercentage));

  return (
    <div className="wizard-progress-bar-container">
      <div
        className="wizard-progress-bar-fill"
        style={{ width: `${progressPercentage}%` }}
        role="progressbar"
        aria-valuenow={effectiveStepForDisplay}
        aria-valuemin="0"
        aria-valuemax={totalSteps}
        aria-label={`Step ${effectiveStepForDisplay} of ${totalSteps}`}
      >
      </div>
      <span className="wizard-progress-bar-text">
        {/* Step {effectiveStepForDisplay} of {totalSteps} */} 
      </span>
    </div>
  );
} 