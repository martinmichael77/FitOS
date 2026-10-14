import Link from "next/link";

const features = [
  {
    title: "Strength training",
    description: "Record exercises, sets, reps and weights.",
  },
  {
    title: "Running",
    description: "Track distance, duration and average pace.",
  },
  {
    title: "Progress",
    description: "Review performance and activity trends.",
  },
  {
    title: "Training planner",
    description: "Plan your upcoming workouts and runs.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white sm:px-10">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            FitOS<span className="text-emerald-400">.</span>
          </Link>

          <span className="rounded-full border border-slate-700 px-3 py-1 text-sm text-slate-300">
            Personal fitness
          </span>
        </header>

        <section className="py-20 sm:py-28">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Your fitness, organized
          </p>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Train consistently.
            <br />
            Measure your progress.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            One place to track your strength workouts, running sessions
            and fitness progress over time.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#features"
              className="rounded-lg bg-emerald-400 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
            >
              Explore features
            </a>

            <span className="rounded-lg border border-slate-700 px-5 py-3 text-slate-300">
              MVP in development
            </span>
          </div>
        </section>

        <section id="features" className="grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6"
            >
              <h2 className="text-xl font-semibold">{feature.title}</h2>
              <p className="mt-2 leading-6 text-slate-400">
                {feature.description}
              </p>
            </article>
          ))}
        </section>

        <footer className="mt-16 border-t border-slate-800 pt-6 text-sm text-slate-500">
          FitOS · Personal fitness tracking
        </footer>
      </div>
    </main>
  );
}