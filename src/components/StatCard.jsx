export default function StatCard({ eyebrow, value, suffix, tone = 'navy', footnote }) {
  const toneMap = {
    navy: 'text-navy-900',
    ice: 'text-ice-600',
    amber: 'text-amber-500',
    rust: 'text-rust-500',
  }
  return (
    <div className="card p-5 flex flex-col gap-2">
      <span className="label-eyebrow">{eyebrow}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`num text-[28px] font-semibold leading-none ${toneMap[tone]}`}>{value}</span>
        {suffix && <span className="text-sm text-slate-450">{suffix}</span>}
      </div>
      {footnote && <span className="text-xs text-slate-450">{footnote}</span>}
    </div>
  )
}
