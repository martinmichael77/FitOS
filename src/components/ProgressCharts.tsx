"use client";

import { useState } from "react";

type Point = { label: string; value: number };
type ExerciseTrend = { name: string; points: Point[] };

export function ChartCard({ title, subtitle, points, suffix = "" }: { title: string; subtitle: string; points: Point[]; suffix?: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 560, h = 160, l = 36, r = 12, t = 12, b = 30, iw = w-l-r, ih = h-t-b;
  const bw = Math.min(28, (iw / Math.max(1, points.length)) * .55);
  return <article className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900 p-5">
    <h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-400">{subtitle}</p>
    {!points.length ? <p className="py-10 text-center text-sm text-slate-500">Log more activity to see your trend.</p> : <>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={title} className="mt-4 h-auto w-full">
        {[0,.5,1].map((f)=><g key={f}><line x1={l} y1={t+ih*f} x2={w-r} y2={t+ih*f} stroke="#334155" strokeDasharray="3 4"/><text x={l-6} y={t+ih*f+4} fill="#94a3b8" fontSize="10" textAnchor="end">{Math.round(max*(1-f))}{suffix}</text></g>)}
        {points.map((p,i)=>{const slot=iw/points.length,x=l+slot*i+slot/2,bh=p.value/max*ih;return <g key={p.label+i}><rect x={x-bw/2} y={t+ih-bh} width={bw} height={Math.max(2,bh)} rx="4" fill="#34d399" opacity={p.value === 0 ? 0.25 : 0.9}/><text x={x} y={h-8} fill="#94a3b8" fontSize="10" textAnchor="middle">{p.label}</text></g>})}
      </svg><div className="flex justify-between text-xs text-slate-500"><span>{points[0].label}</span><span>Latest: {points[points.length-1].value.toFixed(1)}{suffix}</span></div>
    </>}
  </article>;
}

export function ExerciseProgressChart({ trends }: { trends: ExerciseTrend[] }) {
  const [selected,setSelected]=useState(0); const trend=trends[selected]; const points=trend?.points??[];
  const max=Math.max(1,...points.map(p=>p.value)); const w=560,h=190,l=42,r=16,t=14,b=32,iw=w-l-r,ih=h-t-b;
  const coords=points.map((p,i)=>({...p,x:l+(points.length<=1?iw/2:i/(points.length-1)*iw),y:t+ih-p.value/max*ih}));
  const path=coords.map((p,i)=>`${i?"L":"M"} ${p.x} ${p.y}`).join(" ");
  return <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Strength progression</h3><p className="mt-1 text-sm text-slate-400">Best recorded weight per exercise, by week.</p></div>
    {!!trends.length&&<label><span className="sr-only">Choose exercise</span><select value={selected} onChange={e=>setSelected(Number(e.target.value))} className="max-w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm">{trends.map((x,i)=><option key={x.name} value={i}>{x.name}</option>)}</select></label>}</div>
    {!trend||!points.length?<p className="py-12 text-center text-sm text-slate-500">Complete workouts with recorded weights to see strength trends.</p>:<>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Strength progression for ${trend.name}`} className="mt-4 h-auto w-full">
      {[0,.5,1].map(f=><g key={f}><line x1={l} y1={t+ih*f} x2={w-r} y2={t+ih*f} stroke="#334155" strokeDasharray="3 4"/><text x={l-7} y={t+ih*f+4} fill="#94a3b8" fontSize="10" textAnchor="end">{Math.round(max*(1-f))} kg</text></g>)}
      {coords.length>1&&<path d={path} fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
      {coords.map(p=><g key={p.label}><circle cx={p.x} cy={p.y} r="4" fill="#34d399"/><text x={p.x} y={h-10} fill="#94a3b8" fontSize="10" textAnchor="middle">{p.label}</text></g>)}</svg>
      <p className="text-sm text-slate-400">Latest best weight: <strong className="text-slate-100">{points[points.length-1].value} kg</strong></p>
    </>}
  </article>;
}
