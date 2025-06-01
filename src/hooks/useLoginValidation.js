import { useState } from 'react';

export const useLoginValidation = () => {
  const [errors, setErrors] = useState({});
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


  const validate = (values) => {
    let newErrors = {};

    if (!values.email || !values.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(values.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!values.password || !values.password.trim()) {
      newErrors.password = 'Password is required';
    }


    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return { validate, errors };
}; 