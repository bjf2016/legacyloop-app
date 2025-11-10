import AudioUpload from '@/components/AudioUpload';

export default function EntryPage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Entry #</h1>
      <AudioUpload />
    </main>
  );
}
