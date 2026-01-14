import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, description, error, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[#1d1d1f]">
            {label}
            {props.required && <span className="text-[#FF3B30] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-xl border transition-all duration-200
            bg-white text-[#1d1d1f] placeholder:text-[#86868b]
            focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent
            ${error 
              ? 'border-[#FF3B30] focus:ring-[#FF3B30]' 
              : 'border-[#d2d2d7] hover:border-[#86868b]'
            }
            ${className}
          `}
          {...props}
        />
        {description && !error && (
          <p className="text-xs text-[#86868b] font-medium">{description}</p>
        )}
        {error && (
          <p className="text-xs text-[#FF3B30] font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
