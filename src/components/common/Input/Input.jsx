import { forwardRef } from 'react';
import './Input.css';

const Input = forwardRef(function Input({
    label,
    type = 'text',
    placeholder,
    value,
    onChange,
    error,
    helperText,
    size = 'md',
    disabled = false,
    required = false,
    readOnly = false,
    prefix,
    suffix,
    className = '',
    ...props
}, ref) {
    return (
        <div className={`input-wrapper ${error ? 'input-error' : ''} ${className}`}>
            {label && (
                <label className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}
            <div className={`input-container input-${size}`}>
                {prefix && <span className="input-prefix">{prefix}</span>}
                <input
                    ref={ref}
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    readOnly={readOnly}
                    className="input-field"
                    {...props}
                />
                {suffix && <span className="input-suffix">{suffix}</span>}
            </div>
            {(error || helperText) && (
                <span className={`input-helper ${error ? 'input-helper-error' : ''}`}>
                    {error || helperText}
                </span>
            )}
        </div>
    );
});

export default Input;
