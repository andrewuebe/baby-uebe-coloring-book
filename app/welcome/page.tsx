export const dynamic = 'force-dynamic';

export default function Welcome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <WelcomeForm searchParamsPromise={searchParams} />
  );
}

async function WelcomeForm({ searchParamsPromise }: { searchParamsPromise: Promise<{ error?: string }> }) {
  const params = await searchParamsPromise;
  const error = params.error;
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action="/api/welcome" method="POST" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="font-serif text-2xl">Welcome!</h1>
        <p className="text-sm text-inksoft">Enter the party passcode to join the coloring book.</p>
        <input
          name="passcode"
          type="password"
          autoFocus
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          placeholder="Party passcode"
        />
        {error ? <p className="text-sm text-red-600">That code didn&apos;t work. Try again.</p> : null}
        <button className="w-full rounded-lg bg-ink py-2 font-semibold text-cream">Enter</button>
      </form>
    </main>
  );
}
