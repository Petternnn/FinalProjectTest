import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { sendEmailVerification, updateProfile } from "firebase/auth"; // Import sendEmailVerification and updateProfile
import { auth, db } from "../../services/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore"; 
import styles from "./SignUp.module.css";
import { useSignUpValidation } from "../../hooks/useSignUpValidation"; 

// Component: SignUp
// Description: Component for new user registration.
// Handles email/password creation, role selection, Firestore user document creation, and email verification.

export default function SignUp() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { validate, errors: validationErrors } = useSignUpValidation(); 
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [submitError, setSubmitError] = useState(""); 
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
    if (submitError) setSubmitError("");
  };

  const handleSignUpSubmit = async () => {
    console.log("[SignUp] Attempting sign-up with formData:", formData);
    setSubmitError("");

    // Validate form data using the hook
    if (!validate(formData)) {
      console.warn("[SignUp] Validation failed by hook:", validationErrors);
      return;
    }

    if (!formData.role) {
      setSubmitError("Please select your role.");
      console.warn("[SignUp] Validation failed: Role not selected.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signUp(formData.email, formData.password);
      console.log(
        "[SignUp] Firebase Auth user created:",
        userCredential.user.uid
      );

      if (userCredential && userCredential.user) {
        const user = userCredential.user;
        const userDocData = {
          uid: user.uid,
          firstname: formData.firstname,
          lastname: formData.lastname,
          email: user.email,
          role: formData.role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          emailVerified: user.emailVerified,
        };
        console.log(
          "[SignUp] Preparing to set Firestore document for user:",
          user.uid,
          "with data:",
          userDocData
        );
        await setDoc(doc(db, "users", user.uid), userDocData);
        console.log(
          "[SignUp] Firestore document created/updated for user:",
          user.uid
        );

        if (!user.emailVerified) {
          console.log("[SignUp] Sending verification email to:", user.email);
          await sendEmailVerification(user);
          console.log("[SignUp] Verification email sent.");
          navigate("/verify-email");
        } else {
          console.log(
            "[SignUp] Email already verified. Navigating to dashboard."
          );
          navigate("/dashboard");
        }

        // Update user's displayName in Firebase Auth
        await updateProfile(user, {
          displayName: `${formData.firstname} ${formData.lastname}`,
        });
      } else {
        throw new Error("User creation failed, user object not found.");
      }
    } catch (error) {
      console.error("[SignUp] Sign-up process failed:", error);
      setSubmitError(
        error.message || "Failed to create account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFormEventSubmit = async (e) => {
    e.preventDefault();
    await handleSignUpSubmit();
  };

  return (
    <div className={styles.container}>
      {/* Use onSubmit on the form element */}
      <form onSubmit={handleFormEventSubmit} className={styles.form}>
        <h2 className={styles.title}>Create Account</h2>

        <div className={styles.formFieldGroup}>
          <label htmlFor="firstname" className={styles.label}>
            First Name:
          </label>
          <input
            type="text"
            id="firstname"
            name="firstname"
            value={formData.firstname}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your first name"
            disabled={loading}
          />
          {validationErrors.firstname && (
            <p className={styles.error}>{validationErrors.firstname}</p>
          )}
        </div>

        <div className={styles.formFieldGroup}>
          <label htmlFor="lastname" className={styles.label}>
            Last Name:
          </label>
          <input
            type="text"
            id="lastname"
            name="lastname"
            value={formData.lastname}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your last name"
            disabled={loading}
          />
          {validationErrors.lastname && (
            <p className={styles.error}>{validationErrors.lastname}</p>
          )}
        </div>

        <div className={styles.formFieldGroup}>
          <label htmlFor="email" className={styles.label}>
            Email:
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Enter your email"
            disabled={loading}
          />
          {validationErrors.email && (
            <p className={styles.error}>{validationErrors.email}</p>
          )}
        </div>

        <div className={styles.formFieldGroup}>
          <label htmlFor="role" className={styles.label}>
            I am a/an:
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleInputChange}
            className={styles.select}
            disabled={loading}
          >
            <option value="" disabled>
              Select your role
            </option>
            <option value="educator">Educator</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div className={styles.formFieldGroup}>
          <label htmlFor="password" className={styles.label}>
            Password:
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Choose a password"
            disabled={loading}
          />
          {validationErrors.password && (
            <p className={styles.error}>{validationErrors.password}</p>
          )}
        </div>

        <div className={styles.formFieldGroup}>
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password:
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={styles.input}
            placeholder="Re-enter your password"
            disabled={loading}
          />
          {validationErrors.confirmPassword && (
            <p className={styles.error}>{validationErrors.confirmPassword}</p>
          )}
        </div>

        {/* Display submission errors */}
        {submitError && <p className={styles.error}>{submitError}</p>}

        <button
          type="submit"
          className={`${styles.button} ${loading ? styles.disabled : ""}`}
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>
      <p className={styles.loginText}>
        Already have an account?{" "}
        <Link to="/login" className={styles.loginLink}>
          Login
        </Link>
      </p>
    </div>
  );
}
