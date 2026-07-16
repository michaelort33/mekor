"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";

import styles from "@/components/kosher/kosher-map-embed.module.css";
import { getKosherMapLocation, type KosherMapLocation } from "@/lib/kosher/map-locations";
import type { ManagedKosherPlace } from "@/lib/kosher/store";

type KosherMapEmbedProps = {
  places: ManagedKosherPlace[];
};

type MarkerRecord = {
  marker: google.maps.marker.AdvancedMarkerElement;
  position: KosherMapLocation;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
const KOSHER_FALLBACK_IMAGE_SRC =
  "https://wxacuvlwlalejd25.public.blob.vercel-storage.com/mekor/fcd909c6286c1cb51d76acc1726731f3ca21d3d5-fallback-food.svg";
const PHILADELPHIA_CENTER = { lat: 39.9526, lng: -75.1652 };
let mapsLoaderConfigured = false;

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function configureMapsLoader() {
  if (mapsLoaderConfigured) {
    return;
  }

  setOptions({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
  });
  mapsLoaderConfigured = true;
}

function createPreview(place: ManagedKosherPlace) {
  const preview = document.createElement("article");
  preview.className = styles.preview;

  const image = document.createElement("img");
  image.className = styles.previewImage;
  image.src = place.heroImage || KOSHER_FALLBACK_IMAGE_SRC;
  image.alt = "";
  image.loading = "lazy";
  preview.append(image);

  const body = document.createElement("div");
  body.className = styles.previewBody;

  const neighborhood = document.createElement("span");
  neighborhood.className = styles.previewNeighborhood;
  neighborhood.textContent = place.neighborhoodLabel;

  const title = document.createElement("h3");
  title.className = styles.previewTitle;
  title.textContent = place.title;

  const address = document.createElement("p");
  address.className = styles.previewAddress;
  address.textContent = place.address || "Open the listing for location details.";

  const link = document.createElement("a");
  link.className = styles.previewLink;
  link.href = place.path;
  link.textContent = "View restaurant";

  body.append(neighborhood, title, address, link);
  preview.append(body);
  return preview;
}

function offsetOverlappingLocation(location: KosherMapLocation, index: number, count: number) {
  if (count === 1) {
    return location;
  }

  const angle = (Math.PI * 2 * index) / count;
  const radius = 0.00008;
  return {
    lat: location.lat + Math.cos(angle) * radius,
    lng: location.lng + Math.sin(angle) * radius,
  };
}

export function KosherMapEmbed({ places }: KosherMapEmbedProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const focusPlaceRef = useRef<(path: string) => void>(() => undefined);
  const [query, setQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [mapState, setMapState] = useState<"loading" | "ready" | "error">(
    GOOGLE_MAPS_API_KEY ? "loading" : "error",
  );

  const mappedPlaces = useMemo(
    () => places.filter((place) => Boolean(getKosherMapLocation(place.path))),
    [places],
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapElementRef.current) {
      return;
    }

    let disposed = false;
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      if (!disposed) {
        setMapState("error");
      }
    };

    async function initializeMap() {
      configureMapsLoader();

      const [{ Map, InfoWindow }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
        importLibrary("maps"),
        importLibrary("marker"),
      ]);

      if (disposed || !mapElementRef.current) {
        return;
      }

      const map = new Map(mapElementRef.current, {
        center: PHILADELPHIA_CENTER,
        zoom: 10,
        mapId: "DEMO_MAP_ID",
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: "cooperative",
      });
      const infoWindow = new InfoWindow();
      const bounds = new google.maps.LatLngBounds();
      const markerRecords = new globalThis.Map<string, MarkerRecord>();
      const groups = new globalThis.Map<string, ManagedKosherPlace[]>();

      for (const place of mappedPlaces) {
        const location = getKosherMapLocation(place.path);
        if (!location) {
          continue;
        }

        const key = `${location.lat},${location.lng}`;
        const group = groups.get(key) ?? [];
        group.push(place);
        groups.set(key, group);
        bounds.extend(location);
      }

      function openPreview(place: ManagedKosherPlace, marker: google.maps.marker.AdvancedMarkerElement) {
        infoWindow.setContent(createPreview(place));
        infoWindow.open({ anchor: marker, map, shouldFocus: false });
      }

      for (const group of groups.values()) {
        const location = getKosherMapLocation(group[0]?.path ?? "");
        if (!location) {
          continue;
        }

        group.forEach((place, index) => {
          const position = offsetOverlappingLocation(location, index, group.length);
          const pin = new PinElement({
            background: "#8a5a2f",
            borderColor: "#5f3c20",
            glyphColor: "#fffdfa",
            scale: 0.92,
          });
          const marker = new AdvancedMarkerElement({
            map,
            position,
            title: place.title,
            gmpClickable: true,
          });
          marker.append(pin);
          marker.addEventListener("gmp-click", () => openPreview(place, marker));
          markerRecords.set(place.path, { marker, position });
        });
      }

      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, 44);
      }

      mapRef.current = map;
      infoWindowRef.current = infoWindow;
      markersRef.current = markerRecords;
      focusPlaceRef.current = (path) => {
        const record = markerRecords.get(path);
        const place = mappedPlaces.find((candidate) => candidate.path === path);
        if (!record || !place) {
          return;
        }

        map.panTo(record.position);
        map.setZoom(15);
        openPreview(place, record.marker);
      };
      setMapState("ready");
    }

    initializeMap().catch(() => {
      if (!disposed) {
        setMapState("error");
      }
    });

    return () => {
      disposed = true;
      window.gm_authFailure = previousAuthFailure;
      infoWindowRef.current?.close();
      for (const { marker } of markersRef.current.values()) {
        marker.map = null;
      }
      mapRef.current = null;
      infoWindowRef.current = null;
      markersRef.current = new globalThis.Map();
      focusPlaceRef.current = () => undefined;
    };
  }, [mappedPlaces]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mapState !== "ready") {
      return;
    }

    const searchValue = normalizeSearch(query);
    if (!searchValue) {
      setSearchMessage("Enter a restaurant name, neighborhood, or address.");
      return;
    }

    const match = mappedPlaces.find((place) => {
      const searchable = [place.title, place.address, place.neighborhoodLabel, ...place.tags]
        .join(" ")
        .toLowerCase();
      return searchable.includes(searchValue);
    });

    if (!match) {
      setSearchMessage("No matching restaurant found.");
      return;
    }

    setQuery(match.title);
    setSearchMessage(`Showing ${match.title}.`);
    focusPlaceRef.current(match.path);
  }

  return (
    <section className={styles.root} aria-label="Kosher restaurant map">
      <div className={styles.mapFrame}>
        <div ref={mapElementRef} className={styles.map} data-testid="kosher-google-map" />

        {mapState !== "error" ? (
          <form className={styles.search} onSubmit={handleSearch}>
            <label htmlFor="kosher-map-search" className={styles.srOnly}>
              Search restaurants on the map
            </label>
            <input
              id="kosher-map-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search restaurants"
              list="kosher-map-restaurants"
              autoComplete="off"
              disabled={mapState !== "ready"}
            />
            <datalist id="kosher-map-restaurants">
              {mappedPlaces.map((place) => (
                <option key={place.path} value={place.title}>
                  {place.address || place.neighborhoodLabel}
                </option>
              ))}
            </datalist>
            <button type="submit" disabled={mapState !== "ready"}>
              Search
            </button>
            <span className={styles.srOnly} aria-live="polite">
              {searchMessage}
            </span>
          </form>
        ) : null}

        {mapState === "loading" ? (
          <p className={styles.loading} role="status">
            Loading restaurant map...
          </p>
        ) : null}

        {mapState === "error" ? (
          <div className={styles.fallback} role="alert">
            <strong>The interactive map could not load.</strong>
            <p>You can still browse every kosher listing in the directory above.</p>
            <div className={styles.fallbackLinks}>
              <Link href="/center-city#directory">All listings</Link>
              <Link href="/center-city?neighborhood=main-line-manyunk#directory">Main Line / Manyunk</Link>
              <Link href="/center-city?neighborhood=old-yorkroad-northeast#directory">
                Old York Road / Northeast
              </Link>
              <Link href="/center-city?neighborhood=cherry-hill#directory">Cherry Hill</Link>
            </div>
          </div>
        ) : null}
      </div>
      <p className={styles.locationCount}>{mappedPlaces.length} kosher locations shown</p>
    </section>
  );
}

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}
