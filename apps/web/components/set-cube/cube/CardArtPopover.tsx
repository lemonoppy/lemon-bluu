import { useState } from 'react';

import Image from 'next/image';
import { createPortal } from 'react-dom';

import { getCardFaceImageUris } from '@/lib/set-cube/scryfall';
import type { ScryfallCard } from '@/lib/set-cube/types';

interface Props {
  card: ScryfallCard;
  children: React.ReactNode;
  wrapperClassName?: string;
}

const CARD_W = 260;
const CARD_H = 363;

export default function CardArtPopover({ card, children, wrapperClassName }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const faceUris = getCardFaceImageUris(card);

  // Only show on devices that support true hover (not touch screens).
  const canHover =
    typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches;

  function updatePos(e: React.MouseEvent) {
    if (!canHover) return;
    const faceCount = faceUris.length || 1;
    const totalW = CARD_W * faceCount + (faceCount - 1) * 4; // 4px gap between faces
    const offset = 14;
    const x =
      e.clientX + offset + totalW > window.innerWidth
        ? e.clientX - offset - totalW
        : e.clientX + offset;
    const y =
      e.clientY + offset + CARD_H > window.innerHeight
        ? e.clientY - offset - CARD_H
        : e.clientY + offset;
    setPos({ x, y });
  }

  function hidePopover() {
    setPos(null);
  }

  const popover = pos && faceUris.length > 0 && (
    <span
      className="pointer-events-none flex gap-1"
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
      }}
    >
      {faceUris.map((uri, i) => (
        <span
          key={i}
          className="block rounded-lg overflow-hidden shadow-2xl border border-border"
          style={{ width: CARD_W, height: CARD_H, flexShrink: 0 }}
        >
          <Image
            src={uri}
            alt={i === 0 ? card.name : `${card.name} (back)`}
            width={CARD_W}
            height={CARD_H}
            className="block"
            unoptimized
          />
        </span>
      ))}
    </span>
  );

  return (
    <span
      className={wrapperClassName ?? 'inline-block'}
      onMouseEnter={updatePos}
      onMouseMove={updatePos}
      onMouseLeave={hidePopover}
    >
      {children}
      {typeof window !== 'undefined' && popover && createPortal(popover, document.body)}
    </span>
  );
}
