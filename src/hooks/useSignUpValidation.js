import { useState } from "react";

// Hook: useSignUpValidation
// Description: Custom hook for validating sign-up form data.
// Returns: An object containing the validate function and errors object.
export const useSignUpValidation = () => {
  const [errors, setErrors] = useState({});
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*\W)(?!.*\s).{8,}$/;

  const validate = (values) => {
    let newErros = {};

    if (!values.firstname.trim()) {
      newErros.firstname = "First name is required";
    }
    if (!values.lastname.trim()) {
      newErros.lastname = "Last name is required";
    }
    if (!values.email.trim()) {
      newErros.email = "Email is required";
    } else if (!emailRegex.test(values.email.trim())) {
      newErros.email = "Please enter a valid email address";
    }

    if (!values.password.trim()) {
      newErros.password = "Password is required";
    } else if (values.password.trim().length < 8) {
      newErros.password = "Password must be minimum 8 characters";
    } else if (!passwordRegex.test(values.password.trim())) {
      newErros.password =
        "Password must include an uppercase, lowercase, number, and a special character";
    } else if (values.password.trim() !== values.confirmPassword.trim()) {
      newErros.password = "Passwords do not match";
      newErros.confirmPassword = "Passwords do not match";
    }

    if (!values.confirmPassword.trim()) {
      newErros.confirmPassword = "Password must be confirmed";
    }

    setErrors(newErros);
    return Object.keys(newErros).length === 0;
  };

  return { validate, errors };
};
