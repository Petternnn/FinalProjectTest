import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useImageUpload } from "../../../hooks/useImageUpload"; // Adjust path if necessary
import { db, auth as firebaseAuth } from "../../../services/firebaseConfig"; // Import db and auth
import { doc, updateDoc, serverTimestamp } from "firebase/firestore"; // Import Firestore functions
import { updateProfile as updateFirebaseAuthProfile } from "firebase/auth"; // Import Firebase Auth updateProfile
import styles from "./ProfilePanel.module.css";
import DefaultAvatar from "../../../assets/default-avatar.png"; // Add a default avatar image

export default function ProfilePanel() {
  const { currentUser, updateUserContext } = useAuth(); // Assuming updateUserContext can refresh currentUser
  const {
    uploadImage,
    isUploading,
    uploadError: imageUploadError,
  } = useImageUpload();

  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const fileInputRef = useRef(null);

  // Store original values for cancellation
  const [originalFirstName, setOriginalFirstName] = useState("");
  const [originalLastName, setOriginalLastName] = useState("");
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");

  //state to track if user intends to remove the existing picture
  const [intendToRemovePicture, setIntendToRemovePicture] = useState(false);

  // Effect to initialize form fields and preview URL from currentUser
  useEffect(() => {
    if (currentUser) {
      const currentDisplayName = currentUser.displayName || "";
      const nameParts = currentDisplayName.split(" ") || [];
      const currentFirstName = nameParts[0] || "";
      const currentLastName = nameParts.slice(1).join(" ") || "";
      const currentProfilePic = currentUser.profilePictureUrl || DefaultAvatar;

      setFirstName(currentFirstName);
      setOriginalFirstName(currentFirstName);
      setLastName(currentLastName);
      setOriginalLastName(currentLastName);
      setPreviewUrl(currentProfilePic);
      setOriginalPreviewUrl(currentProfilePic);
      setIntendToRemovePicture(false);
    } else {
      setFirstName("");
      setOriginalFirstName("");
      setLastName("");
      setOriginalLastName("");
      setPreviewUrl(DefaultAvatar);
      setOriginalPreviewUrl(DefaultAvatar);
      setIntendToRemovePicture(false);
    }
  }, [currentUser]);

  const handleToggleEditMode = () => {
    setIsEditMode((prev) => !prev);
    setFormError("");
    setFormSuccess("");
    if (isEditMode) {
      // If toggling OFF edit mode (cancelling)
      // revert
      setFirstName(originalFirstName);
      setLastName(originalLastName);
      setPreviewUrl(originalPreviewUrl);
      setProfilePictureFile(null);
      setIntendToRemovePicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleImageChange = (event) => {
    setFormError("");
    setFormSuccess("");
    setIntendToRemovePicture(false);
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setProfilePictureFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setProfilePictureFile(null);
      setPreviewUrl(originalPreviewUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (file) {
        setFormError("Please select a valid image file (jpg, png).");
      }
    }
  };

  const handleRemoveImage = () => {
    setFormError("");
    setFormSuccess("");
    setProfilePictureFile(null);
    setPreviewUrl(DefaultAvatar);
    setIntendToRemovePicture(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!currentUser) {
      console.error("[ProfilePanel]: No current user found to save profile.");
      setFormError("User not found. Please log in again.");
      return;
    }

    // Basic validation for name fields
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("First name and last name cannot be empty.");
      return;
    }

    let newProfilePictureUrl;

    if (profilePictureFile) {
      try {
        const uploadedUrl = await uploadImage(profilePictureFile);
        if (uploadedUrl) {
          newProfilePictureUrl = uploadedUrl;
        } else {
          console.error(
            "[ProfilePanel]: Image upload failed, not updating profile picture URL."
          );
          setFormError(
            imageUploadError || "Image upload failed. Profile not saved."
          );
          return;
        }
      } catch (error) {
        console.error("[ProfilePanel]: Failed to upload image:", error);
        setFormError("Error uploading image. Profile not saved.");
        return;
      }
    } else if (intendToRemovePicture) {
      newProfilePictureUrl = null;
      console.log("[ProfilePanel]: User intends to remove profile picture.");
    } else {
      newProfilePictureUrl = currentUser.profilePictureUrl;
    }

    const updatedProfileData = {
      firstname: firstName.trim(),
      lastname: lastName.trim(),
      displayName: `${firstName.trim()} ${lastName.trim()}`,
      profilePictureUrl: newProfilePictureUrl,
      updatedAt: serverTimestamp(),
    };

    try {
      // 1. Update Firestore document
      const userDocRef = doc(db, "users", currentUser.uid);
      await updateDoc(userDocRef, updatedProfileData);
      console.log(
        "[ProfilePanel]: Firestore document updated for user:",
        currentUser.uid
      );

      // 2. Update Firebase Auth profile (displayName and photoURL)
      if (firebaseAuth.currentUser) {
        await updateFirebaseAuthProfile(firebaseAuth.currentUser, {
          displayName: updatedProfileData.displayName,
          photoURL: updatedProfileData.profilePictureUrl,
        });
        console.log("[ProfilePanel]: Firebase Auth profile updated.");
      } else {
        console.warn(
          "[ProfilePanel]: firebaseAuth.currentUser is not available for profile update."
        );
      }

      // 3. Update AuthContext
      if (updateUserContext) {
        const updatedUserForContext = {
          ...currentUser,
          ...updatedProfileData,
          profilePictureUrl: newProfilePictureUrl,
        };
        delete updatedUserForContext.updatedAt;
        updateUserContext(updatedUserForContext);
        console.log("[ProfilePanel]: AuthContext updated.");
      }

      setProfilePictureFile(null);
      setIntendToRemovePicture(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setFormSuccess("Profile saved successfully!");
      console.log("[ProfilePanel]: Profile saved successfully.");

      setOriginalFirstName(firstName.trim());
      setOriginalLastName(lastName.trim());

      setOriginalPreviewUrl(newProfilePictureUrl || DefaultAvatar); // Ensure newProfilePictureUrl is set correctly from upload or existing

      setIsEditMode(false);
    } catch (error) {
      console.error("[ProfilePanel]: Failed to save profile:", error);
      setFormError(`Failed to save profile: ${error.message}`);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={styles.panelContainer}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Profile</h2>
        <div className={styles.headerActions}>
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={handleToggleEditMode}
                className={`${styles.button} ${styles.cancelButtonAlt}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="profileForm"
                className={`${styles.button} ${styles.saveButton}`}
                disabled={
                  isUploading ||
                  (isEditMode &&
                    !profilePictureFile &&
                    !intendToRemovePicture &&
                    firstName === originalFirstName &&
                    lastName === originalLastName)
                }
              >
                {isUploading ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleToggleEditMode}
              className={`${styles.button} ${styles.editButton}`}
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>
      <p className={styles.panelSubtitle}>
        Manage your personal information and profile picture.
      </p>

      {currentUser ? (
        <form
          onSubmit={handleProfileSave}
          className={styles.profileForm}
          id="profileForm"
        >
          <div className={styles.profilePictureSection}>
            <img
              src={previewUrl || DefaultAvatar}
              alt="Profile Preview"
              className={styles.profilePicturePreview}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DefaultAvatar;
              }}
            />
            <input
              type="file"
              accept=".jpg, .jpeg, .png, .gif"
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: "none" }}
              aria-label="Profile picture upload"
            />
            {isEditMode && (
              <div className={styles.pictureActionsStacked}>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : "Change Photo"}
                </button>
                {!intendToRemovePicture &&
                  (profilePictureFile ||
                    (previewUrl && previewUrl !== DefaultAvatar)) && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className={`${styles.button} ${styles.buttonDangerOutline}`}
                      disabled={isUploading}
                    >
                      Remove
                    </button>
                  )}
              </div>
            )}
          </div>
          {isUploading && (
            <p className={styles.uploadStatus}>Uploading image...</p>
          )}
          {imageUploadError && !formError && (
            <p className={styles.errorMessage}>{imageUploadError}</p>
          )}

          <div className={styles.scrollableFormContent}>
            <div className={styles.profileInfo}>
              <div className={styles.fieldGroupRow}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="firstName" className={styles.label}>
                    First name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      setFormError("");
                      setFormSuccess("");
                    }}
                    className={isEditMode ? styles.input : styles.inputDisplay}
                    placeholder="Enter your first name"
                    disabled={!isEditMode || isUploading}
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label htmlFor="lastName" className={styles.label}>
                    Last name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setFormError("");
                      setFormSuccess("");
                    }}
                    className={isEditMode ? styles.input : styles.inputDisplay}
                    placeholder="Enter your last name"
                    disabled={!isEditMode || isUploading}
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <input
                  type="text"
                  id="email"
                  value={currentUser.email}
                  readOnly
                  className={styles.inputDisplay}
                />
              </div>

              <h3 className={styles.subHeading}>Account Information</h3>
              <div className={styles.fieldGroup}>
                <label htmlFor="uid" className={styles.label}>
                  UID
                </label>
                <input
                  type="text"
                  id="uid"
                  value={currentUser.uid}
                  readOnly
                  className={styles.inputDisplay}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label htmlFor="emailVerified" className={styles.label}>
                  Email Verified
                </label>
                <input
                  type="text"
                  id="emailVerified"
                  value={currentUser.emailVerified ? "Yes" : "No"}
                  readOnly
                  className={styles.inputDisplay}
                />
              </div>
            </div>

            {formError && (
              <p className={`${styles.errorMessage} ${styles.formMessage}`}>
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className={`${styles.successMessage} ${styles.formMessage}`}>
                {formSuccess}
              </p>
            )}
          </div>
        </form>
      ) : (
        <p>Loading user information...</p>
      )}
    </div>
  );
}
