import type {
  MediaDetail,
  SeasonEpisodes,
  SeasonSummary,
} from "@cinestesia/shared";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Player } from "@/components/player";
import { ApiRequestError, getMedia, getPlayback, getSeason } from "@/lib/api";

export const dynamic = "force-dynamic";

interface MediaPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ season?: string }>;
}

const TYPE_LABELS: Record<MediaDetail["type"], string> = {
  MOVIE: "Película",
  SERIES: "Serie",
  DOCUMENTARY: "Documental",
  SHORT: "Cortometraje",
  CONCERT: "Concierto",
  CLIP: "Clip",
  SPECIAL: "Especial",
  OTHER: "Otro",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  PUBLISHED: "Publicado",
  ARCHIVED: "Archivado",
};

const PRODUCTION_LABELS: Record<string, string> = {
  UPCOMING: "Próximamente",
  ONGOING: "En emisión",
  ENDED: "Finalizada",
  UNKNOWN: "Estado desconocido",
};

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  return `${minutes} min`;
}

function parseSeason(raw?: string): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

export default async function MediaPage({ params, searchParams }: MediaPageProps) {
  const { id } = await params;
  const { season } = await searchParams;

  let media: MediaDetail;

  try {
    media = await getMedia(id);
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

  const isSeries = media.type === "SERIES";
  const seasons = media.seasons ?? [];
  const firstSeason: SeasonSummary | null = seasons[0] ?? null;

  let selectedSeason: SeasonSummary | null = null;
  let seasonEpisodes: SeasonEpisodes | null = null;
  let episodesError = false;

  if (isSeries && firstSeason) {
    const requested = parseSeason(season);
    selectedSeason =
      (requested !== null
        ? seasons.find((candidate) => candidate.number === requested)
        : null) ?? firstSeason;

    try {
      seasonEpisodes = await getSeason(media.id, selectedSeason.number);
    } catch (error) {
      console.error("No se pudieron cargar los episodios:", error);
      episodesError = true;
    }
  }

  let playbackUrl: string | null = null;
  if (!isSeries) {
    try {
      playbackUrl = (await getPlayback(media.id)).playbackUrl;
    } catch (error) {
      console.error("Sin fuente de reproducción:", error);
    }
  }

  const metaLine = [
    TYPE_LABELS[media.type] ?? media.type,
    media.releaseYear ?? media.releaseDate,
    media.runtimeSeconds ? formatDuration(media.runtimeSeconds) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-3">
        <p className="text-sm text-neutral-500">
          <Link href="/" className="hover:text-neutral-300">
            Inicio
          </Link>
          <span aria-hidden> / </span>
          <Link href="/catalog" className="hover:text-neutral-300">
            Catálogo
          </Link>
        </p>
        <h1 className="text-3xl font-semibold">{media.title}</h1>
        <p className="text-neutral-400">{metaLine}</p>

        {media.genres && media.genres.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label="Géneros">
            {media.genres.map((genre) => (
              <li
                key={genre}
                className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300"
              >
                {genre}
              </li>
            ))}
          </ul>
        ) : null}

        {media.status || media.productionStatus ? (
          <ul className="flex flex-wrap gap-2">
            {media.status ? (
              <li className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                {STATUS_LABELS[media.status] ?? media.status}
              </li>
            ) : null}
            {media.productionStatus ? (
              <li className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-300">
                {PRODUCTION_LABELS[media.productionStatus] ??
                  media.productionStatus}
              </li>
            ) : null}
          </ul>
        ) : null}
      </header>

      {media.posterUrl || media.backdropUrl ? (
        <img
          src={media.posterUrl ?? media.backdropUrl ?? undefined}
          alt={`Imagen de ${media.title}`}
          className="w-full max-w-sm rounded-lg object-cover"
        />
      ) : null}

      {!isSeries ? (
        playbackUrl ? (
          <Player src={playbackUrl} title={media.title} />
        ) : (
          <div className="rounded-lg border border-neutral-800 p-4 text-neutral-400">
            Este contenido no tiene una fuente de reproducción disponible.
          </div>
        )
      ) : null}

      {media.synopsis ? (
        <p className="leading-relaxed text-neutral-300">{media.synopsis}</p>
      ) : null}

      {isSeries && firstSeason ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-medium text-neutral-200">Episodios</h2>

          <nav aria-label="Temporadas" className="flex flex-wrap gap-2">
            {seasons.map((candidate) => {
              const isActive = selectedSeason?.number === candidate.number;
              return (
                <Link
                  key={candidate.id}
                  href={`/media/${media.id}?season=${candidate.number}`}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-lg border px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-neutral-500 bg-neutral-900 text-neutral-100"
                      : "border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:bg-neutral-900"
                  }`}
                >
                  Temporada {candidate.number}
                  <span className="ml-2 text-xs text-neutral-500">
                    {candidate.episodesCount}{" "}
                    {candidate.episodesCount === 1 ? "ep." : "eps."}
                  </span>
                </Link>
              );
            })}
          </nav>

          {episodesError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-900 bg-red-950 p-4 text-red-200"
            >
              No se pudieron cargar los episodios.
            </p>
          ) : !seasonEpisodes || seasonEpisodes.episodes.length === 0 ? (
            <p className="text-neutral-500">
              Esta temporada no tiene episodios registrados.
            </p>
          ) : (
            <ol className="flex flex-col gap-3">
              {seasonEpisodes.episodes.map((episode) => (
                <li
                  key={episode.id}
                  className="flex items-baseline justify-between gap-4 rounded-lg border border-neutral-800 p-4"
                >
                  <span>
                    <span className="mr-3 text-neutral-500">
                      {episode.number}
                    </span>
                    <span className="font-medium">{episode.title}</span>
                  </span>
                  <span className="shrink-0 text-sm text-neutral-500">
                    {episode.durationSeconds
                      ? formatDuration(episode.durationSeconds)
                      : ""}
                    {episode.airDate ? ` · ${episode.airDate}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ) : null}
    </main>
  );
}
