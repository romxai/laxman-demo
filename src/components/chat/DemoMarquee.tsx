"use client";

export function DemoMarquee() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-r opacity-80 from-blue-600 via-purple-600 to-blue-600 border-y border-gray-700">
      <div className="animate-marquee whitespace-nowrap py-2 px-4 text-center text-sm font-medium text-white">
        <span className="inline-block mr-8">
          ⚠️ This is a demo product - Results are not an indication of final
          product ⚠️
        </span>
        <span className="inline-block mr-8">
          ⚠️ This is a demo product - Results are not an indication of final
          product ⚠️
        </span>
        <span className="inline-block mr-8">
          ⚠️ This is a demo product - Results are not an indication of final
          product ⚠️
        </span>
        <span className="inline-block mr-8">
          ⚠️ This is a demo product - Results are not an indication of final
          product ⚠️
        </span>
        <span className="inline-block mr-8">
          ⚠️ This is a demo product - Results are not an indication of final
          product ⚠️
        </span>
      </div>

      {/* Gradient overlays for smooth edges */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-blue-600 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-blue-600 to-transparent pointer-events-none z-10" />
    </div>
  );
}
