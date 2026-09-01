/**
 * HMPP media embed helper.
 * Public-only: consumes song IDs + public media metadata, never participant data.
 */

export function createMediaEmbed(media, options = {}) {
  if (!media || !media.embed_url) return null;

  const iframe = document.createElement("iframe");
  iframe.src = media.embed_url;
  iframe.title = `${media.title} — ${media.artist}`;
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.borderRadius = "12px";
  iframe.allowFullscreen = true;

  if (media.provider === "spotify") {
    iframe.height = String(options.spotifyHeight || 152);
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  } else if (media.provider === "youtube") {
    iframe.height = String(options.youtubeHeight || 180);
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
  }

  return iframe;
}

export async function loadMediaManifest(url = "./data/2026/public/media.json") {
  const response = await fetch(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`Unable to load media manifest: ${response.status}`);
  const payload = await response.json();
  return new Map(payload.media.map(item => [item.song_id, item]));
}

export function mountMediaPlayer(container, media, options = {}) {
  if (!container) return false;
  const iframe = createMediaEmbed(media, options);
  container.replaceChildren();
  if (!iframe) return false;
  container.appendChild(iframe);
  return true;
}
