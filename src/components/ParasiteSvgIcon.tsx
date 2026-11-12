import React from 'react';

interface ParasiteSvgIconProps {
  classId: number;
  size?: number;
}

/**
 * High-detail microscopic vector illustration for each of the 8 Phase A target intestinal parasites.
 */
export const ParasiteSvgIcon: React.FC<ParasiteSvgIconProps> = ({ classId, size = 64 }) => {
  switch (classId) {
    case 0: // Ascaris lumbricoides (mammillated oval egg)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#fdf5e4" stroke="#dfd0b2" strokeWidth="1.5" />
          <ellipse cx="40" cy="40" rx="26" ry="20" fill="#8b4c18" stroke="#522907" strokeWidth="2.5" strokeDasharray="4 2" />
          <ellipse cx="40" cy="40" rx="22" ry="16" fill="#a86224" stroke="#5c300a" strokeWidth="1.5" />
          <ellipse cx="40" cy="40" rx="14" ry="11" fill="#c9843b" />
          <circle cx="36" cy="38" r="2" fill="#6e3b10" />
          <circle cx="44" cy="42" r="2.2" fill="#6e3b10" />
        </svg>
      );
    case 1: // Trichuris trichiura (barrel-shaped with bipolar plugs)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#f4f6f0" stroke="#d5ddd0" strokeWidth="1.5" />
          <ellipse cx="13" cy="40" rx="5" ry="4.5" fill="#f7f1dc" stroke="#6b4415" strokeWidth="1.8" />
          <ellipse cx="67" cy="40" rx="5" ry="4.5" fill="#f7f1dc" stroke="#6b4415" strokeWidth="1.8" />
          <ellipse cx="40" cy="40" rx="25" ry="13.5" fill="#9c5a1a" stroke="#4f2905" strokeWidth="2.2" />
          <ellipse cx="40" cy="40" rx="18" ry="9" fill="#c48337" />
        </svg>
      );
    case 2: // Ancylostoma / Hookworm (thin hyaline shell + morula)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#f3f5f1" stroke="#d3dbd0" strokeWidth="1.5" />
          <ellipse cx="40" cy="40" rx="25" ry="18" fill="#eaeee6" stroke="#535e4f" strokeWidth="2" />
          <circle cx="33" cy="35" r="6.5" fill="#9ca690" stroke="#5e6955" strokeWidth="1.3" />
          <circle cx="46" cy="35" r="6.5" fill="#9ca690" stroke="#5e6955" strokeWidth="1.3" />
          <circle cx="34" cy="45" r="6.5" fill="#9ca690" stroke="#5e6955" strokeWidth="1.3" />
          <circle cx="46" cy="45" r="6.5" fill="#9ca690" stroke="#5e6955" strokeWidth="1.3" />
          <circle cx="40" cy="40" r="6" fill="#aab39e" stroke="#5e6955" strokeWidth="1.3" />
        </svg>
      );
    case 3: // Enterobius vermicularis (asymmetrical D-shaped pinworm egg)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#f5f6f2" stroke="#d8ded2" strokeWidth="1.5" />
          <path
            d="M15 34 Q40 31 65 34 C67 52 13 52 15 34 Z"
            fill="#eef1ea"
            stroke="#556052"
            strokeWidth="2.2"
          />
          <path
            d="M24 39 Q40 48 56 38"
            stroke="#7d8875"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </svg>
      );
    case 4: // Taenia spp. (spherical radially striated embryophore)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#fcf3db" stroke="#e0cfa6" strokeWidth="1.5" />
          <circle cx="40" cy="40" r="21" fill="#5e3411" stroke="#2d1705" strokeWidth="5" strokeDasharray="2 2" />
          <circle cx="40" cy="40" r="14" fill="#a46c35" />
          <line x1="35" y1="36" x2="38" y2="41" stroke="#3d1e05" strokeWidth="1.5" />
          <line x1="40" y1="35" x2="40" y2="41" stroke="#3d1e05" strokeWidth="1.5" />
          <line x1="45" y1="36" x2="42" y2="41" stroke="#3d1e05" strokeWidth="1.5" />
        </svg>
      );
    case 5: // Giardia intestinalis (oval cyst with nuclei & axonemes)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#e6f1ec" stroke="#c0d8ce" strokeWidth="1.5" />
          <ellipse cx="40" cy="40" rx="22" ry="15" transform="rotate(-10 40 40)" fill="#629082" stroke="#264a40" strokeWidth="2.2" />
          <circle cx="32" cy="36" r="3" fill="#7a1c32" />
          <circle cx="33" cy="44" r="3" fill="#7a1c32" />
          <line x1="26" y1="41" x2="54" y2="38" stroke="#7a1c32" strokeWidth="1.8" />
          <path d="M42 36 Q46 40 42 44" stroke="#7a1c32" strokeWidth="2" />
        </svg>
      );
    case 6: // Entamoeba histolytica (4 nuclei + blunt cigar chromatoid)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#e6f1ec" stroke="#c0d8ce" strokeWidth="1.5" />
          <circle cx="40" cy="40" r="21" fill="#6b998b" stroke="#2c5449" strokeWidth="2.2" />
          <circle cx="33" cy="33" r="4" stroke="#75192e" strokeWidth="1.4" />
          <circle cx="33" cy="33" r="1.2" fill="#75192e" />
          <circle cx="47" cy="33" r="4" stroke="#75192e" strokeWidth="1.4" />
          <circle cx="47" cy="33" r="1.2" fill="#75192e" />
          <circle cx="33" cy="47" r="4" stroke="#75192e" strokeWidth="1.4" />
          <circle cx="33" cy="47" r="1.2" fill="#75192e" />
          <circle cx="47" cy="47" r="4" stroke="#75192e" strokeWidth="1.4" />
          <circle cx="47" cy="47" r="1.2" fill="#75192e" />
          <line x1="33" y1="40" x2="47" y2="39" stroke="#82162e" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    default: // Class 7: Entamoeba coli (up to 8 nuclei with eccentric karyosomes)
      return (
        <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="37" fill="#fcf3db" stroke="#e0cfa6" strokeWidth="1.5" />
          <circle cx="40" cy="40" r="23" fill="#ba8a45" stroke="#593b12" strokeWidth="2.2" />
          {[
            [31, 30],
            [41, 28],
            [50, 32],
            [28, 40],
            [40, 39],
            [51, 42],
            [33, 50],
            [45, 50],
          ].map(([nx, ny], i) => (
            <g key={i}>
              <circle cx={nx} cy={ny} r="3.2" stroke="#4a2c09" strokeWidth="1.2" />
              <circle cx={nx + 1} cy={ny - 0.8} r="1" fill="#4a2c09" />
            </g>
          ))}
        </svg>
      );
  }
};
