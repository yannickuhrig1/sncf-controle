import { useEffect, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'form_draft_';

export function useFormPersistence<T>(
  formKey: string,
  formData: T,
  setFormData: (data: T) => void,
  initialData: T
) {
  const storageKey = `${STORAGE_KEY_PREFIX}${formKey}`;

  // Load saved data on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
      }
    } catch (e) {
      console.warn('Failed to load form draft:', e);
    }
  }, [storageKey, setFormData]);

  // Save data on change (debounced via effect)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(formData));
      } catch (e) {
        console.warn('Failed to save form draft:', e);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData, storageKey]);

  // Clear saved data
  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setFormData(initialData);
    } catch (e) {
      console.warn('Failed to clear form draft:', e);
    }
  }, [storageKey, setFormData, initialData]);

  // Check if there's a saved draft
  const hasDraft = useCallback(() => {
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  }, [storageKey]);

  return { clearDraft, hasDraft };
}
