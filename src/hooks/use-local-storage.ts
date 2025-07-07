"use client";

import { useState, useEffect, useCallback } from "react";

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((val: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // This effect runs only on the client
    let initialValue: T;
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue !== null) {
        initialValue = JSON.parse(storedValue);
      } else {
        initialValue = defaultValue;
        // Don't set item here, let the setter handle it to avoid race conditions
      }
    } catch (error) {
      console.error(`Error reading from localStorage key “${key}”:`, error);
      initialValue = defaultValue;
    }
    setValue(initialValue);
    setIsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setStoredValue = useCallback(
    (newValue: T | ((val: T) => T)) => {
      // Use functional update for both state and localStorage
      setValue((currentValue) => {
        try {
          const valueToStore =
            newValue instanceof Function ? newValue(currentValue) : newValue;
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          return valueToStore;
        } catch (error) {
          console.error(`Error setting localStorage key “${key}”:`, error);
          // Return currentValue on error to avoid breaking the app state
          return currentValue;
        }
      });
    },
    [key]
  );

  return [value, setStoredValue, isLoaded];
}
