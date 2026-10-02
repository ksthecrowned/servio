-- French display names for data the dashboard shows as-is.
--
-- Template names are product labels shown to owners (slugs, used in code,
-- do not change). Branches created by onboarding without a name were
-- called 'Main Branch'; owners cannot rename a branch from the dashboard
-- yet, so rename that default rather than leave it in English forever.

update templates set name = case slug
  when 'minimal' then 'Minimaliste'
  when 'classic' then 'Classique'
  when 'modern' then 'Moderne'
  when 'luxury' then 'Luxe'
  when 'premium-dark' then 'Premium sombre'
  when 'cafe' then 'Café'
  when 'local' then 'Local / Congo'
  when 'fast-food' then 'Restauration rapide'
  when 'coffee' then 'Coffee shop'
  when 'fine-dining' then 'Gastronomique'
  when 'editorial' then 'Éditorial'
  else name
end;

update branches set name = 'Succursale principale'
where slug = 'main' and name = 'Main Branch';
