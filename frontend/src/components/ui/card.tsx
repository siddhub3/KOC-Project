import * as React from 'react';
export function Card({ className='', ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div className={`bg-white rounded-xl border shadow-sm ${className}`} {...p} />; }
export function CardHeader({ className='', ...p }: any) { return <div className={`p-5 border-b ${className}`} {...p} />; }
export function CardTitle({ className='', ...p }: any) { return <h3 className={`font-semibold text-lg ${className}`} {...p} />; }
export function CardContent({ className='', ...p }: any) { return <div className={`p-5 ${className}`} {...p} />; }
