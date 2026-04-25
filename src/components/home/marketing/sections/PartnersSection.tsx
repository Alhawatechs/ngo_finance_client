'use client'

import Image from 'next/image'
import { partnerLogos } from '../constants'

export function PartnersSection() {
  const loopLogos = [...partnerLogos, ...partnerLogos]

  return (
    <section className="border-y border-slate-200 bg-white py-10">
      <div className="mx-auto max-w-6xl px-5">
        <div className="overflow-hidden       bg-slate-50/40 py-4">
          <div className="partners-track flex w-max items-center gap-10 px-6">
            {loopLogos.map((logo, idx) => (
              <div key={`${logo}-${idx}`} className="flex h-14 w-36 items-center justify-center rounded-lg p-2">
                <Image
                  src={`/assets/partners/${logo}.svg`}
                  alt={logo}
                  width={112}
                  height={36}
                  className="h-8 w-auto object-contain opacity-80 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .partners-track {
          animation: partners-marquee 45s linear infinite;
          will-change: transform;
        }
        .partners-track:hover {
          animation-play-state: paused;
        }
        @keyframes partners-marquee {
          from {
            transform: translate3d(0, 0, 0);
          }
          to {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </section>
  )
}
