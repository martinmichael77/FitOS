import Link from "next/link";

const steps = [
  { number: "01", title: "Choose your activity", description: "Start a strength workout or record a run. You can plan your week later." },
  { number: "02", title: "Log the essentials", description: "Save sets, reps and weights—or running distance and time. Add notes only if useful." },
  { number: "03", title: "See your progress", description: "Your history keeps activities together, and Progress reveals trends over time." },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-white sm:px-10 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-800 pb-5">
          <Link href="/" className="text-2xl font-bold tracking-tight">FitOS<span className="text-emerald-400">.</span></Link>
          <Link href="/login" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:bg-slate-800">Sign in</Link>
        </header>
        <section className="grid gap-10 py-16 sm:py-24 md:grid-cols-[1.2fr_0.8fr] md:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">Your training, made simple</p>
            <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">Less setup.<span className="block text-emerald-400">More training.</span></h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-400">FitOS brings strength workouts, running and progress into one place—without asking you to configure everything before you begin.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300">Get started<span className="ml-2" aria-hidden="true">→</span></Link>
              <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:bg-slate-900">See how it works</a>
            </div>
            <p className="mt-4 text-sm text-slate-500">Start with one activity. Planning is optional.</p>
          </div>
          <aside className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Your simple routine</p><div className="mt-5 space-y-4">{steps.map((step) => <div key={step.number} className="flex gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 font-bold text-emerald-400">{step.number}</span><div><h2 className="font-semibold">{step.title}</h2><p className="mt-1 text-sm leading-6 text-slate-400">{step.description}</p></div></div>)}</div></aside>
        </section>
        <section id="how-it-works" className="border-t border-slate-800 py-10">
          <div className="max-w-2xl"><h2 className="text-2xl font-bold sm:text-3xl">You don’t need to set up everything on day one.</h2><p className="mt-3 leading-7 text-slate-400">Create a workout template when you’re ready to repeat a strength routine. Log a run directly. Use the planner only if scheduling helps you. Your dashboard points you to the next useful action.</p></div>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-2xl" aria-hidden="true">🏋️</p><h3 className="mt-3 font-semibold">Strength</h3><p className="mt-2 text-sm leading-6 text-slate-400">Reuse templates and record each set as you train.</p></article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-2xl" aria-hidden="true">🏃</p><h3 className="mt-3 font-semibold">Running</h3><p className="mt-2 text-sm leading-6 text-slate-400">Save distance, duration, run type and optional notes.</p></article>
            <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-2xl" aria-hidden="true">📈</p><h3 className="mt-3 font-semibold">Progress</h3><p className="mt-2 text-sm leading-6 text-slate-400">Review your weekly activity and trends as your log grows.</p></article>
          </div>
        </section>
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6 text-sm text-slate-500"><span>FitOS · Personal fitness tracking</span><Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">Open FitOS →</Link></footer>
      </div>
    </main>
  );
}
