export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center p-6">
        <h1 className="text-3xl font-bold">Page not found</h1>
        <p className="mt-2 text-white/70">The page you are looking for does not exist.</p>
        <a href="/" className="mt-4 inline-block underline text-white/80 hover:text-white">Go home</a>
      </div>
    </main>
  );
}


