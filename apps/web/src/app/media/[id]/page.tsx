import { notFound } from "next/navigation";
import Link from "next/link";
import { Player } from "@/components/player";
import { ApiRequestError, getMedia, getPlayback } from "@/lib/api";

export const dynamic = "force-dynamic";

interface MediaPageProps {
  params: Promise<{ id: string }>;
}

export default async function MediaPage({ params }: MediaPageProps) {
  const { id } = await params;

  let media;
  let playback;

  try {
    [media, playback] = await Promise.all([getMedia(id), getPlayback(id)]);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }
    console.error("No se pudo cargar el contenido:", error);
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-4 p-8">
        <p
          role="alert"
          className="rounded-lg border border-red-900 bg-red-950 p-4 text-red-200"
        >
          No se pudo cargar el contenido desde el servidor.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">
            Inicio
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">{media.title}</h1>
        <p className="text-neutral-400">
          {media.type}
          {media.releaseYear ? ` · ${media.releaseYear}` : ""}
        </p>
      </header>

      <Player src={playback.playbackUrl} title={media.title} />

      {media.synopsis ? (
        <p className="leading-relaxed text-neutral-300">{media.synopsis}</p>
      ) : null}
    </main>
  );
}
