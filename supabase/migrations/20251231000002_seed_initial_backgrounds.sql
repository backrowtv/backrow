-- Seed initial background images for site pages
-- These use local files that already exist in public/images/backgrounds/

-- Home page: Once Upon a Time in Hollywood (2019)
INSERT INTO public.background_images (
  entity_type,
  entity_id,
  image_url,
  height_preset,
  opacity,
  object_position,
  credit_title,
  credit_year,
  credit_studio,
  credit_actor,
  is_active
) VALUES (
  'site_page',
  '/',
  '/images/backgrounds/home-background.jpg',
  'compact',
  0.80,
  'center center',
  'Once Upon a Time in Hollywood',
  2019,
  'Sony Pictures',
  'Leonardo DiCaprio',
  true
) ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  height_preset = EXCLUDED.height_preset,
  opacity = EXCLUDED.opacity,
  object_position = EXCLUDED.object_position,
  credit_title = EXCLUDED.credit_title,
  credit_year = EXCLUDED.credit_year,
  credit_studio = EXCLUDED.credit_studio,
  credit_actor = EXCLUDED.credit_actor,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- FAQ page: Batman Forever (1995) - Jim Carrey as The Riddler
INSERT INTO public.background_images (
  entity_type,
  entity_id,
  image_url,
  height_preset,
  opacity,
  object_position,
  credit_title,
  credit_year,
  credit_studio,
  credit_actor,
  is_active
) VALUES (
  'site_page',
  '/faq',
  '/images/backgrounds/riddler-faq.jpg',
  'tall',
  0.40,
  'center center',
  'Batman Forever',
  1995,
  'Warner Bros.',
  'Jim Carrey',
  true
) ON CONFLICT (entity_type, entity_id) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  height_preset = EXCLUDED.height_preset,
  opacity = EXCLUDED.opacity,
  object_position = EXCLUDED.object_position,
  credit_title = EXCLUDED.credit_title,
  credit_year = EXCLUDED.credit_year,
  credit_studio = EXCLUDED.credit_studio,
  credit_actor = EXCLUDED.credit_actor,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

