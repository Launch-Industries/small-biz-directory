-- Upgrade Google (lh3.googleusercontent.com) business photos from the ~89px
-- thumbnails the Apify Google Maps scrape stored, to full resolution, by
-- rewriting the size suffix (=wNNN-hNN-k-no -> =w1600-h1200-k-no) on both
-- thumbnail_url and every element of image_urls. Aspect ratio is preserved by
-- Google's fit-within-box behavior.
--
-- Street View fallback URLs (streetviewpixels-pa.googleapis.com), used for
-- businesses with no uploaded photo, are intentionally left untouched: they are
-- expired/dead (403) and must be re-sourced separately. The app guards against
-- them via lib/images.ts (displayableImage), falling back to a placeholder.
update businesses
set
  thumbnail_url = regexp_replace(thumbnail_url, '=w\d+-h\d+-k-no', '=w1600-h1200-k-no'),
  image_urls = (
    select array_agg(
      case when u like '%googleusercontent%'
        then regexp_replace(u, '=w\d+-h\d+-k-no', '=w1600-h1200-k-no')
        else u end
      order by ord
    )
    from unnest(image_urls) with ordinality as t(u, ord)
  )
where thumbnail_url like '%googleusercontent%'
   or exists (select 1 from unnest(image_urls) u where u like '%googleusercontent%');
