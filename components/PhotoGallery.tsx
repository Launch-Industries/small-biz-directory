'use client'

import { useState } from 'react'
import Image from 'next/image'

// Main image + thumbnail strip. Click a thumb to swap the hero.
export function PhotoGallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0)
  if (images.length === 0) return null

  return (
    <div>
      <div className="relative w-full h-80 rounded-lg overflow-hidden bg-ink-100">
        <Image src={images[active]} alt={alt} fill className="object-cover" priority />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={url}
              onClick={() => setActive(i)}
              className={`relative w-20 h-20 shrink-0 rounded overflow-hidden ring-2 transition ${
                i === active ? 'ring-li-teal' : 'ring-transparent hover:ring-ink-300'
              }`}
              aria-label={`Photo ${i + 1} of ${images.length}`}
            >
              <Image src={url} alt={`${alt} ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
