import { Suspense } from 'react';
import { InterviewPage } from '../src/components/InterviewPage';

export default function Home() {
  return (
    <main>
      <Suspense fallback={<div className="p-8 text-white bg-black min-h-screen">Loading...</div>}>
        <InterviewPage />
      </Suspense>
    </main>
  );
}