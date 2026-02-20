import SongViewClient from "@/modules/spiewnik/components/SongViewClient";

type Params = { songId: string } | Promise<{ songId: string }>;

export default async function SongPage({ params }: { params: Params }) {
  const { songId } = await Promise.resolve(params);
  return <SongViewClient songId={songId} />;
}
