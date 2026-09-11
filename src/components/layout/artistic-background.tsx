
'use client';

export default function ArtisticBackground() {
  return (
    <div className="fixed inset-0 -z-10 h-full w-full bg-gradient-to-br from-[hsl(260,25%,8%)] via-[hsl(260,25%,12%)] to-[hsl(260,25%,6%)] overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[hsl(var(--primary))] opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[hsl(260,25%,25%)] opacity-20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[hsl(var(--primary))] opacity-5 rounded-full blur-3xl"></div>
        
        <div className="absolute inset-0 opacity-10">
          <div className="grid grid-cols-12 gap-4 h-full">
            {Array.from({ length: 144 }).map((_, i) => (
              <div key={i} className="border-r border-b border-[hsl(260,25%,22%)]"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
