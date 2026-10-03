import type { MediaSummary } from "@cinestesia/shared";
import Link from "next/link";
import { getFeatured } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let items: MediaSummary[] = [];
  let loadError: string | null = null;

  try {
    const featured = await getFeatured();
    items = featured.sections.flatMap((section) => section.items);
  } catch (error) {
    console.error("No se pudo cargar el catálogo destacado:", error);
    loadError = "No se pudo cargar el contenido desde el servidor.";
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-3xl font-semibold">Cinestesia</h1>
          <Link
            href="/catalog"
            className="rounded-lg border border-neutral-800 px-4 py-2 text-sm transition-colors hover:border-neutral-600 hover:bg-neutral-900"
          >
            Catálogo
          </Link>
        </div>
        <p className="text-neutral-400">
          v0.1.0-alpha — primer vertical slice.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium text-neutral-200">Destacados</h2>

        {loadError ? (
          <p
            role="alert"
            className="rounded-lg border border-red-900 bg-red-950 p-4 text-red-200"
          >
            {loadError}
          </p>
        ) : items.length === 0 ? (
          <p className="text-neutral-500">No hay contenido disponible.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/media/${item.id}`}
                  className="flex items-baseline justify-between rounded-lg border border-neutral-800 p-4 transition-colors hover:border-neutral-600 hover:bg-neutral-900"
                >
                  <span className="font-medium">{item.title}</span>
                  <span className="text-sm text-neutral-500">
                    {item.type}
                    {item.releaseYear ? ` · ${item.releaseYear}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
