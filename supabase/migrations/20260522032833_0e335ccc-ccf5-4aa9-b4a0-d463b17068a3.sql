UPDATE public.feed_sources
SET active = false,
    last_fetch_error = 'Auto-deactivated: rss.app endpoint dead (404)'
WHERE name IN ('Jugando Pelota Dura','Molusco','Benjamín Torres Gotay','Jay Fonseca');