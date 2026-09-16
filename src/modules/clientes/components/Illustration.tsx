import type { ImageKey } from '../types';

/* Ilustrações estáticas (substituem fotografias nesta fase). */

function windows(x0: number, y0: number, cols: number, rows: number, dx: number, dy: number, w: number, h: number, fill: string): string {
  let s = '';
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      s += `<rect x="${x0 + c * dx}" y="${y0 + r * dy}" width="${w}" height="${h}" fill="${fill}" stroke="#fff" stroke-width="2.5"/>`;
    }
  }
  return s;
}

const ART: Record<ImageKey, string> = {
  facade:
    '<rect width="320" height="200" fill="#d8e7f1"/>' +
    `<rect x="0" y="46" width="62" height="160" fill="#c7d6c2"/>${windows(10, 62, 2, 4, 26, 34, 14, 22, '#7b8f8a')}` +
    `<rect x="258" y="36" width="62" height="170" fill="#e7cbb4"/>${windows(268, 52, 2, 4, 26, 34, 14, 22, '#8b7a6c')}` +
    '<rect x="62" y="18" width="196" height="190" fill="#efe6d6"/><rect x="56" y="12" width="208" height="10" fill="#d6c7ad"/>' +
    windows(80, 36, 4, 4, 46, 40, 24, 30, '#55697b') +
    '<rect x="74" y="70" width="176" height="3" fill="#3b4148"/><rect x="74" y="110" width="176" height="3" fill="#3b4148"/>' +
    '<rect x="146" y="168" width="28" height="40" fill="#6d4c35"/>',
  facade2:
    '<rect width="320" height="200" fill="#dfeaf2"/>' +
    `<rect x="0" y="30" width="70" height="170" fill="#9fb8cc"/>${windows(12, 46, 2, 4, 28, 36, 16, 24, '#e9eef2')}` +
    '<rect x="70" y="14" width="180" height="190" fill="#f1ddd2"/><rect x="64" y="8" width="192" height="10" fill="#d9bfb0"/>' +
    windows(90, 34, 3, 4, 56, 40, 28, 30, '#5d6c78') +
    '<rect x="84" y="68" width="152" height="3" fill="#353b41"/><rect x="84" y="148" width="152" height="3" fill="#353b41"/>' +
    `<rect x="250" y="44" width="70" height="160" fill="#efe9dc"/>${windows(262, 60, 2, 4, 28, 34, 16, 22, '#8a8f93')}` +
    '<rect x="146" y="168" width="28" height="36" fill="#4b5a3f"/>',
  house:
    '<rect width="320" height="200" fill="#cfe5f2"/><circle cx="262" cy="42" r="16" fill="#fbeab5"/>' +
    '<rect y="118" width="320" height="40" fill="#79b3d3"/><rect y="150" width="320" height="50" fill="#eadcbc"/>' +
    '<polygon points="80,78 165,36 250,78" fill="#c9774f"/><rect x="92" y="76" width="146" height="82" fill="#fbfaf6"/>' +
    '<rect x="110" y="94" width="30" height="26" fill="#6ea4c2" stroke="#fff" stroke-width="3"/><rect x="190" y="94" width="30" height="26" fill="#6ea4c2" stroke="#fff" stroke-width="3"/>' +
    '<rect x="152" y="112" width="26" height="46" fill="#5f7f94"/><rect x="92" y="150" width="146" height="4" fill="#d7cfbf"/>',
  living:
    '<rect width="320" height="200" fill="#ede8df"/><rect y="152" width="320" height="48" fill="#cdb697"/>' +
    '<rect x="26" y="26" width="92" height="104" fill="#f7fbfd" stroke="#fff" stroke-width="6"/><path d="M72 26v104M26 78h92" stroke="#ddd6cb" stroke-width="3"/>' +
    '<rect x="150" y="104" width="142" height="50" rx="9" fill="#9aa3a8"/><rect x="158" y="92" width="58" height="30" rx="7" fill="#b3bbbf"/><rect x="224" y="92" width="58" height="30" rx="7" fill="#b3bbbf"/>' +
    '<rect x="248" y="40" width="36" height="46" fill="#cfd8d3" stroke="#fff" stroke-width="3"/>' +
    '<ellipse cx="120" cy="178" rx="80" ry="12" fill="#bfa987"/><rect x="128" y="36" width="4" height="70" fill="#8e877c"/><path d="M116 36h28l-6 14h-16z" fill="#f3e6cc"/>',
  bedroom:
    '<rect width="320" height="200" fill="#eee8df"/><rect y="160" width="320" height="40" fill="#c9b293"/>' +
    '<rect x="244" y="18" width="60" height="118" fill="#f6f9fb" stroke="#fff" stroke-width="5"/><rect x="236" y="14" width="18" height="130" fill="#d4c7b3"/><rect x="298" y="14" width="18" height="130" fill="#d4c7b3"/>' +
    '<rect x="70" y="72" width="150" height="46" rx="4" fill="#d7c2a2"/><rect x="60" y="112" width="170" height="52" rx="4" fill="#ffffff" stroke="#e2dbd0"/>' +
    '<rect x="80" y="100" width="56" height="20" rx="6" fill="#f7f4ee" stroke="#e2dbd0"/><rect x="152" y="100" width="56" height="20" rx="6" fill="#f7f4ee" stroke="#e2dbd0"/>' +
    '<rect x="60" y="138" width="170" height="26" fill="#b9c9bd"/><rect x="24" y="126" width="30" height="36" fill="#bda27f"/><path d="M30 104h18l-4 22h-10z" fill="#f2e3c5"/>',
};

export const IMAGE_KEYS = Object.keys(ART) as ImageKey[];

export function Illustration({ image, className = '' }: { image: ImageKey; className?: string }) {
  return (
    <span className={`block overflow-hidden bg-slate-100 ${className}`}>
      {/* Conteúdo estático definido acima (sem dados do utilizador). */}
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className="block h-full w-full" dangerouslySetInnerHTML={{ __html: ART[image] }} />
    </span>
  );
}
