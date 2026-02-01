import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  success?: boolean;
  showValidation?: boolean;
  touched?: boolean;
}

const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ className, label, error, success, showValidation = true, touched = true, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const hasError = touched && error;
    const hasSuccess = touched && success && !error;

    return (
      <div className="space-y-1.5">
        {label && (
          <Label 
            htmlFor={inputId}
            className={cn(
              hasError && "text-destructive",
              hasSuccess && "text-green-600 dark:text-green-500"
            )}
          >
            {label}
          </Label>
        )}
        <div className="relative">
          <Input
            id={inputId}
            ref={ref}
            className={cn(
              "transition-colors duration-200",
              hasError && "border-destructive focus-visible:ring-destructive/50 pr-10",
              hasSuccess && "border-green-500 focus-visible:ring-green-500/50 pr-10",
              className
            )}
            {...props}
          />
          {showValidation && (
            <AnimatePresence>
              {hasError && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <AlertCircle className="h-4 w-4 text-destructive" />
                </motion.div>
              )}
              {hasSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
        <AnimatePresence>
          {hasError && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-destructive flex items-center gap-1"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

ValidatedInput.displayName = "ValidatedInput";

export { ValidatedInput };
