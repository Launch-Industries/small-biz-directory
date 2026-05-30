import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase-server';
import { Nav } from '@/components/Nav';
import type { Business } from '@/types/business';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default async function MapPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('businesses')
    .select('id, slug, name, category_name, neighborhood, city, latitude, longitude')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);

  return (
    <>
      <Nav />
      <div className="h-[calc(100vh-56px)]">
        <MapView businesses={(data ?? []) as Business[]} />
      </div>
    </>
  );
}
