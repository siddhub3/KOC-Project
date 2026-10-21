import * as React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function Button({ className, variant='default', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'outline'|'ghost'|'destructive'|'secondary' }) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium px-4 py-2 disabled:opacity-50 transition";
  const variants: any = { default: "bg-[#0f3b5f] text-white hover:bg-[#123a5a]", outline: "border bg-white hover:bg-gray-50", ghost: "hover:bg-gray-100", secondary: "bg-orange-500 text-white hover:bg-orange-600", destructive: "bg-red-600 text-white hover:bg-red-700" };
  return <button className={twMerge(clsx(base, variants[variant], className))} {...props} />;
}
