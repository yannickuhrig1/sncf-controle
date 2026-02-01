import { useState, useMemo, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any, allValues: Record<string, any>) => string | null;
}

export interface ValidationRules {
  [field: string]: ValidationRule;
}

export interface ValidationErrors {
  [field: string]: string | null;
}

export interface UseFormValidationOptions {
  rules: ValidationRules;
  validateOnChange?: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
  values: T,
  options: UseFormValidationOptions
) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { rules, validateOnChange = true } = options;

  // Validate a single field
  const validateField = useCallback((field: string, value: any): string | null => {
    const rule = rules[field];
    if (!rule) return null;

    // Required check
    if (rule.required) {
      if (value === null || value === undefined || value === '') {
        return 'Ce champ est requis';
      }
      if (typeof value === 'number' && value <= 0 && rule.min === undefined) {
        return 'Ce champ est requis';
      }
    }

    // Min/Max for numbers
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        return `La valeur minimum est ${rule.min}`;
      }
      if (rule.max !== undefined && value > rule.max) {
        return `La valeur maximum est ${rule.max}`;
      }
    }

    // Min/Max length for strings
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        return `Minimum ${rule.minLength} caractères`;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        return `Maximum ${rule.maxLength} caractères`;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        return 'Format invalide';
      }
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value, values);
    }

    return null;
  }, [rules, values]);

  // Validate all fields
  const errors = useMemo((): ValidationErrors => {
    const result: ValidationErrors = {};
    
    for (const field of Object.keys(rules)) {
      const error = validateField(field, values[field]);
      if (error) {
        result[field] = error;
      }
    }
    
    return result;
  }, [rules, values, validateField]);

  // Get visible errors (only for touched fields if validateOnChange is false)
  const visibleErrors = useMemo((): ValidationErrors => {
    if (validateOnChange) {
      return errors;
    }
    
    const result: ValidationErrors = {};
    for (const field of Object.keys(touched)) {
      if (touched[field] && errors[field]) {
        result[field] = errors[field];
      }
    }
    return result;
  }, [errors, touched, validateOnChange]);

  // Check if form is valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Mark field as touched
  const touchField = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  // Mark all fields as touched
  const touchAll = useCallback(() => {
    const allTouched: Record<string, boolean> = {};
    for (const field of Object.keys(rules)) {
      allTouched[field] = true;
    }
    setTouched(allTouched);
  }, [rules]);

  // Reset touched state
  const resetTouched = useCallback(() => {
    setTouched({});
  }, []);

  // Get error for a specific field
  const getFieldError = useCallback((field: string): string | null => {
    if (validateOnChange) {
      return errors[field] || null;
    }
    return touched[field] ? (errors[field] || null) : null;
  }, [errors, touched, validateOnChange]);

  // Check if a field has an error
  const hasFieldError = useCallback((field: string): boolean => {
    return getFieldError(field) !== null;
  }, [getFieldError]);

  return {
    errors,
    visibleErrors,
    isValid,
    touched,
    touchField,
    touchAll,
    resetTouched,
    getFieldError,
    hasFieldError,
    validateField,
  };
}
