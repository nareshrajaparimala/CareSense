import Link from 'next/link';

export default function Landing() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">CareSense</h1>
        <p className="mt-3 text-xl text-muted-foreground">AI that watches between doctor visits.</p>
      </div>
      <p className="max-w-2xl text-lg text-muted-foreground">
        Personal baseline learning. 72-hour predictive alerts. Explainable AI for chronic patients,
        their families, and doctors.
      </p>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
        >
          Get Started
        </Link>
      </div>
    </main>
  );
}
