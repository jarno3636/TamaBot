// app/not-found.tsx
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] grid place-items-center px-6 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-white/70 mb-6">
          The page you’re looking for doesn’t exist or has moved.
        </p>
        <a href="/" className="btn-pill btn-pill--blue">Back to Home</a>
      </div>
    </main>
  );
}
