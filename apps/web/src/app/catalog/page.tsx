import type { MediaSummary, PageMeta } from "@cinestesia/shared";
import Link from "next/link";
import { getCatalog } from "@/lib/api";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Catálogo — Cinestesia",
};

interface CatalogPageProps {
  searchParams: Promise<{ page?: string }>;
}

function parsePage(raw?: string): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const page = parsePage((await searchParams).page);

  let items: MediaSummary[] = [];
  let meta: PageMeta | null = null;
  let loadError: string | null = null;

  try {
    const result = await getCatalog(page);
    items = result.items;
    meta = result.meta;
  } catch (error) {
    console.error("No se pudo cargar el catálogo:", error);
    loadError = "No se pudo cargar el contenido desde el servidor.";
  }

  const totalPages = meta ? Math.max(1, Math.ceil(meta.total / meta.limit)) : 1;
  const outOfRange = !loadError && meta !== null && items.length === 0 && page > 1;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">
            Inicio
          </Link>
        </p>
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-semibold">Catálogo</h1>
          {meta ? (
            <span className="text-sm text-neutral-500">
              {meta.total} {meta.total === 1 ? "título" : "títulos"}
            </span>
          ) : null}
        </div>
      </header>

      {loadError ? (
        <p
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950 p-4 text-red-200"
        >
          {loadError}
        </p>
      ) : outOfRange ? (
        <div className="flex flex-col gap-3">
          <p className="text-neutral-400">
            La página {page} no existe.
          </p>
          <Link
            href="/catalog"
            className="w-fit rounded-lg border border-neutral-800 px-4 py-2 text-sm transition-colors hover:border-neutral-600 hover:bg-neutral-900"
          >
            Ir al inicio del catálogo
          </Link>
        </div>
      ) : items.length === 0 ? (
        <p className="text-neutral-500">No hay contenido disponible.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/media/${item.id}`}
                className="flex h-full flex-col gap-3 rounded-lg border border-neutral-800 p-4 transition-colors hover:border-neutral-600 hover:bg-neutral-900"
              >
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt={`Póster de ${item.title}`}
                    className="aspect-[2/3] w-full rounded-md object-cover bg-neutral-900"
                  />
                ) : null}
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

      {meta && totalPages > 1 && !loadError ? (
        <nav
          aria-label="Paginación"
          className="flex items-center justify-between gap-4 border-t border-neutral-800 pt-4"
        >
          {page > 1 ? (
            <Link
              href={`/catalog?page=${page - 1}`}
              className="rounded-lg border border-neutral-800 px-4 py-2 text-sm transition-colors hover:border-neutral-600 hover:bg-neutral-900"
            >
              ← Anterior
            </Link>
          ) : (
            <span aria-hidden className="px-4 py-2 text-sm text-neutral-700">
              ← Anterior
            </span>
          )}

          <span className="text-sm text-neutral-500">
            Página {meta.page} de {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/catalog?page=${page + 1}`}
              className="rounded-lg border border-neutral-800 px-4 py-2 text-sm transition-colors hover:border-neutral-600 hover:bg-neutral-900"
            >
              Siguiente →
            </Link>
          ) : (
            <span aria-hidden className="px-4 py-2 text-sm text-neutral-700">
              Siguiente →
            </span>
          )}
        </nav>
      ) : null}
    </main>
  );
}
