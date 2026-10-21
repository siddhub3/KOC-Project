import * as React from 'react';
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className='', ...p }, ref) => <input ref={ref} className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3b5f] ${className}`} {...p} />);
Input.displayName='Input';
