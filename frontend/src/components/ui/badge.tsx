export function Badge({ children, variant='default' }: { children:any, variant?: 'default'|'green'|'orange'|'gray' }) {
  const map: any = { default: 'bg-[#0f3b5f] text-white', green: 'bg-green-100 text-green-800', orange: 'bg-orange-100 text-orange-800', gray: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${map[variant]}`}>{children}</span>;
}
