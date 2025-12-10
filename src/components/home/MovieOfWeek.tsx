import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { getCurrentMatinee } from "@/app/actions/marketing";
import { getTMDBBlurDataURL } from "@/lib/utils/blur-placeholder";

export async function MovieOfWeek() {
  const matinee = await getCurrentMatinee();

  if (!matinee) {
    // Fallback placeholder if no matinee is set
    return (
      <Card className="p-0 overflow-hidden relative group h-[400px] flex flex-col border-0">
        <div className="absolute inset-0 z-0">
          <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900" />
        </div>
        <div className="relative z-10 p-6 flex flex-col h-full justify-between text-white">
          <div>
            <div className="uppercase tracking-wider text-xs font-bold mb-2 bg-black/30 w-fit px-2 py-1 rounded">
              <span style={{ fontFamily: "var(--font-brand)" }} className="text-[var(--primary)]">
                BackRow
              </span>{" "}
              Matinee
            </div>
            <h2 className="text-2xl sm:text-4xl font-black leading-tight">No Movie Selected</h2>
            <p className="mt-4 text-sm opacity-90">Check back soon for our featured new release!</p>
          </div>
        </div>
      </Card>
    );
  }

  const { movie } = matinee;
  const posterUrl =
    movie.poster_url || "https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg";
  const genres = movie.genres?.slice(0, 2).join(", ") || "Movie";

  return (
    <Card className="p-0 overflow-hidden relative group h-[400px] flex flex-col border-0">
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900" />
        <Image
          src={posterUrl}
          alt={movie.title}
          fill
          className="object-cover opacity-50 group-hover:opacity-40 transition-opacity"
          sizes="(max-width: 768px) 100vw, 50vw"
          placeholder="blur"
          blurDataURL={getTMDBBlurDataURL()}
        />
      </div>
      <div className="relative z-10 p-6 flex flex-col h-full justify-between text-white">
        <div>
          <div className="uppercase tracking-wider text-xs font-bold mb-2 bg-black/30 w-fit px-2 py-1 rounded">
            <span style={{ fontFamily: "var(--font-brand)" }} className="text-[var(--primary)]">
              BackRow
            </span>{" "}
            Matinee
          </div>
          <h2 className="text-2xl sm:text-4xl font-black leading-tight">{movie.title}</h2>
          <div className="flex items-center gap-2 mt-2 text-sm opacity-90">
            {movie.year && (
              <>
                <span>{movie.year}</span>
                <span>•</span>
              </>
            )}
            <span>{genres}</span>
            {movie.director && (
              <>
                <span>•</span>
                <span>{movie.director}</span>
              </>
            )}
          </div>
        </div>
        <div>
          {matinee.curator_note && (
            <p className="mb-4 line-clamp-2 text-sm opacity-90">{matinee.curator_note}</p>
          )}
          <div className="flex gap-3">
            <Link
              href={`/movies/${matinee.tmdb_id}`}
              className="inline-block bg-white text-black px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors"
            >
              View Movie
            </Link>
            <Link
              href="/club/backrow-matinee"
              className="inline-block bg-white/20 text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-white/30 transition-colors border border-white/30"
            >
              Join Matinee Club
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}
