"use client";

import { useEffect, useMemo, useState } from "react";

type PodcastEpisode = {
  id: string;
  title: string;
  description: string | null;
  episodeUrl: string | null;
  audioUrl: string | null;
  duration: string | null;
  publishedAt: string | null;
};

const EPISODE_BATCH_SIZE = 5;

function formatPodcastDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function filterPodcastEpisodes(episodes: PodcastEpisode[], searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  if (!normalizedSearch) {
    return episodes;
  }

  return episodes.filter((episode) => {
    const title = episode.title.toLowerCase();
    const description = (episode.description ?? "").toLowerCase();
    return title.includes(normalizedSearch) || description.includes(normalizedSearch);
  });
}

export function RabbiDeskPodcastList() {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(EPISODE_BATCH_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    let isDisposed = false;

    const loadEpisodes = async () => {
      setIsLoading(true);
      setIsUnavailable(false);

      try {
        const response = await fetch("/api/podcast-episodes?limit=60", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("podcast-feed-unavailable");
        }

        const payload = (await response.json()) as { episodes: PodcastEpisode[] };
        if (isDisposed) {
          return;
        }

        setEpisodes(payload.episodes);
      } catch {
        if (!isDisposed) {
          setIsUnavailable(true);
        }
      } finally {
        if (!isDisposed) {
          setIsLoading(false);
        }
      }
    };

    void loadEpisodes();

    return () => {
      isDisposed = true;
    };
  }, []);

  const filteredEpisodes = useMemo(
    () => filterPodcastEpisodes(episodes, searchTerm),
    [episodes, searchTerm],
  );

  const visibleEpisodes = filteredEpisodes.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredEpisodes.length;

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setVisibleCount(EPISODE_BATCH_SIZE);
  };

  if (isLoading) {
    return <p className="rabbi-podcast__empty">Loading podcast episodes...</p>;
  }

  if (isUnavailable) {
    return (
      <div className="rabbi-podcast__error">
        <p className="rabbi-podcast__empty">Podcasts are temporarily unavailable.</p>
        <a href="https://www.mekorhabracha.org/from-the-rabbi-s-desk" target="_blank" rel="noreferrer noopener">
          Open on mekorhabracha.org
        </a>
      </div>
    );
  }

  return (
    <section className="rabbi-podcast" aria-label="Podcast episodes">
      <label className="rabbi-podcast__search">
        <span className="rabbi-podcast__search-label">Search</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => handleSearch(event.target.value)}
          placeholder="Search podcast..."
          aria-label="Search podcast episodes"
        />
      </label>

      <div className="rabbi-podcast__list">
        {visibleEpisodes.length === 0 ? (
          <p className="rabbi-podcast__empty">No podcast episodes matched your search.</p>
        ) : (
          visibleEpisodes.map((episode) => {
            const dateText = formatPodcastDate(episode.publishedAt);

            return (
              <article key={episode.id} className="rabbi-podcast__episode">
                <header className="rabbi-podcast__episode-header">
                  <h2>{episode.title}</h2>
                  <p>{[dateText, episode.duration].filter(Boolean).join(" | ")}</p>
                </header>

                {episode.description ? <p className="rabbi-podcast__episode-description">{episode.description}</p> : null}

                <div className="rabbi-podcast__episode-actions">
                  {episode.audioUrl ? <audio controls preload="none" src={episode.audioUrl} /> : null}
                  {episode.episodeUrl ? (
                    <a href={episode.episodeUrl} target="_blank" rel="noreferrer noopener">
                      Open Episode
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {canLoadMore ? (
        <button type="button" className="rabbi-podcast__load-more" onClick={() => setVisibleCount((value) => value + EPISODE_BATCH_SIZE)}>
          Load More
        </button>
      ) : null}
    </section>
  );
}
