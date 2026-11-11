// Rocks & Minerals identification gallery (Science Olympiad event).
// Each specimen is a tiny drawn picture (inline SVG, no image files) plus one clue to tell it apart.
// Pictures are simple illustrations built from color + texture, not photographs: use them to learn the look,
// then practice with real samples or the official event list.
(function () {
  // [id, name, kind, base color, accent color, texture, clue]
  const R = [
    // ---- Minerals ----
    ['quartz', 'Quartz', 'mineral', '#e8e4dc', '#ffffff', 'crystals', 'Glassy, six-sided crystals; hardness 7 scratches glass.'],
    ['calcite', 'Calcite', 'mineral', '#f1ead6', '#ffffff', 'cubes', 'Fizzes in weak acid; breaks into slanted blocks; hardness 3.'],
    ['fluorite', 'Fluorite', 'mineral', '#8f6fc9', '#c9b5ee', 'cubes', 'Cubes or octahedrons in purple or green; hardness 4.'],
    ['halite', 'Halite', 'mineral', '#f2f2f2', '#cfe3ff', 'cubes', 'Cubic crystals; tastes salty; dissolves in water.'],
    ['pyrite', 'Pyrite', 'mineral', '#c9a93a', '#f5e08a', 'cubes', "Brassy cubes with striations; \"fool's gold\"; streak is greenish-black."],
    ['galena', 'Galena', 'mineral', '#6c7077', '#aab0b8', 'cubes', 'Heavy, shiny gray cubes; streak is lead-gray.'],
    ['magnetite', 'Magnetite', 'mineral', '#2c2f33', '#5a6068', 'octa', 'Black, metallic and magnetic.'],
    ['hematite', 'Hematite', 'mineral', '#5a3b3b', '#9b4a3c', 'smooth', 'Silver-gray or red-brown; streak is always red-brown.'],
    ['graphite', 'Graphite', 'mineral', '#3b3d41', '#80848c', 'flakes', 'Soft, greasy gray; marks paper (hardness 1 to 2).'],
    ['talc', 'Talc', 'mineral', '#d9e6d6', '#f2f8ef', 'smooth', 'Softest mineral (hardness 1); soapy feel; scratched by a fingernail.'],
    ['gypsum', 'Gypsum', 'mineral', '#f3efe6', '#ffffff', 'flakes', 'Hardness 2: scratched by a fingernail; white streak.'],
    ['muscovite', 'Muscovite', 'mineral', '#e6dcc3', '#fff7de', 'flakes', 'Clear to silvery sheets that peel off (mica).'],
    ['biotite', 'Biotite', 'mineral', '#3a2c25', '#6e5546', 'flakes', 'Black or dark brown peelable sheets (mica).'],
    ['orthoclase', 'Orthoclase', 'mineral', '#e8b9a0', '#f7dccb', 'blocks', 'Pink or salmon feldspar; two cleavages at 90 degrees; hardness 6.'],
    ['plagioclase', 'Plagioclase', 'mineral', '#e9ecee', '#ffffff', 'blocks', 'White to gray feldspar with fine parallel lines (striations).'],
    ['hornblende', 'Hornblende (amphibole)', 'mineral', '#1f2a24', '#455a4d', 'crystals', 'Dark green-black, long blades; cleavage at 56 and 124 degrees.'],
    ['pyroxene', 'Pyroxene (augite)', 'mineral', '#2b3a2a', '#5a7355', 'blocks', 'Dark, stubby crystals; cleavage near 90 degrees.'],
    ['olivine', 'Olivine', 'mineral', '#8da63a', '#c3d86a', 'granular', 'Olive-green, glassy, sugary grains.'],
    ['garnet', 'Garnet', 'mineral', '#8a1f2b', '#c4475a', 'crystals', 'Deep red 12-sided crystals; no cleavage; hardness 6.5 to 7.5.'],
    ['malachite', 'Malachite', 'mineral', '#1f8a52', '#7fd6a2', 'bands', 'Bright green with swirled bands; fizzes in acid.'],
    ['azurite', 'Azurite', 'mineral', '#1f3f9a', '#6d8ee0', 'bumps', 'Deep azure blue; often next to green malachite.'],
    ['sulfur', 'Sulfur', 'mineral', '#e8d62a', '#fff27a', 'crystals', 'Bright yellow; brittle; smells like rotten eggs when scratched.'],
    ['chalcopyrite', 'Chalcopyrite', 'mineral', '#b8962f', '#7a5aa8', 'bumps', 'Brassy with a purple-blue tarnish; greenish-black streak.'],
    ['sphalerite', 'Sphalerite', 'mineral', '#6b4a2b', '#b98a4f', 'blocks', 'Resinous yellow-brown to black; rotten-egg smell; zinc ore.'],
    ['corundum', 'Corundum', 'mineral', '#b3524b', '#e08c85', 'crystals', 'Hardness 9: only diamond scratches it (ruby, sapphire).'],
    ['topaz', 'Topaz', 'mineral', '#e8c27a', '#fbe6b2', 'crystals', 'Hardness 8; one perfect cleavage; often pale yellow.'],
    ['beryl', 'Beryl', 'mineral', '#7ec9b0', '#c7f0e0', 'crystals', 'Six-sided green-blue crystals (emerald, aquamarine); hardness 7.5 to 8.'],
    ['tourmaline', 'Tourmaline', 'mineral', '#1e1f24', '#3d6a52', 'crystals', 'Black rods with lengthwise grooves and a rounded triangle cross-section.'],
    ['kaolinite', 'Kaolinite', 'mineral', '#efece6', '#ffffff', 'smooth', 'Soft white clay; earthy smell when wet.'],
    ['bauxite', 'Bauxite', 'mineral', '#b8714a', '#d9a07a', 'granular', 'Reddish earthy lumps; the main aluminum ore.'],
    ['dolomite', 'Dolomite', 'mineral', '#e6d3c1', '#f9ece0', 'cubes', 'Like calcite but fizzes only when powdered.'],
    ['apatite', 'Apatite', 'mineral', '#4a9a74', '#9ad6b6', 'crystals', 'Hardness 5: the one a knife blade barely scratches.'],
    ['chlorite', 'Chlorite', 'mineral', '#3c6a45', '#7fae86', 'flakes', 'Green, scaly flakes that bend but do not spring back.'],
    ['chromite', 'Chromite', 'mineral', '#25262a', '#4a4d55', 'granular', 'Black, metallic grains; brown streak; chromium ore.'],
    // ---- Igneous ----
    ['granite', 'Granite', 'igneous', '#d9a5a0', '#2b2b2b', 'speckle', 'Coarse pink and gray crystals with black flecks; light colored.'],
    ['diorite', 'Diorite', 'igneous', '#a8aaa8', '#1d1d1d', 'speckle', 'Coarse "salt and pepper" with little or no quartz.'],
    ['gabbro', 'Gabbro', 'igneous', '#3c4140', '#7d8683', 'speckle', 'Coarse, dark gray-green; the intrusive twin of basalt.'],
    ['peridotite', 'Peridotite', 'igneous', '#5f7d33', '#2a3a1a', 'granular', 'Olive-green coarse grains; mostly olivine.'],
    ['pegmatite', 'Pegmatite', 'igneous', '#e2b49a', '#f6f1e8', 'blocks', 'Giant interlocking crystals, often an inch or more across.'],
    ['basalt', 'Basalt', 'igneous', '#33363a', '#5a5e63', 'fine', 'Dark, fine-grained; may have small bubble holes.'],
    ['andesite', 'Andesite', 'igneous', '#8e8f94', '#c5c6ca', 'fine', 'Medium gray, fine-grained, sometimes with small crystals.'],
    ['rhyolite', 'Rhyolite', 'igneous', '#dba7a0', '#f2d8d2', 'fine', 'Light pink or tan, fine-grained; the extrusive twin of granite.'],
    ['obsidian', 'Obsidian', 'igneous', '#14161a', '#6b7d96', 'glassy', 'Black volcanic glass; curved (conchoidal) fracture.'],
    ['pumice', 'Pumice', 'igneous', '#d8d3c8', '#a9a397', 'holes', 'Light and full of holes; floats on water.'],
    ['scoria', 'Scoria', 'igneous', '#7a3d30', '#2e1a16', 'holes', 'Dark red-brown with many bubble holes; heavier than pumice.'],
    ['tuff', 'Tuff', 'igneous', '#c9b79a', '#9c8a6e', 'clasts', 'Squashed volcanic ash with bits of glass and rock.'],
    // ---- Sedimentary ----
    ['sandstone', 'Sandstone', 'sedimentary', '#d5a96b', '#ecc98e', 'layers', 'Gritty sand grains cemented together; often layered.'],
    ['conglomerate', 'Conglomerate', 'sedimentary', '#a9896a', '#6a5a4c', 'pebbles', 'Rounded pebbles cemented in finer material.'],
    ['breccia', 'Breccia', 'sedimentary', '#a59486', '#4f4640', 'shards', 'Sharp, angular pieces cemented together.'],
    ['shale', 'Shale', 'sedimentary', '#6a6e73', '#8d9298', 'layers', 'Dark, very fine, splits into thin flat sheets.'],
    ['limestone', 'Limestone', 'sedimentary', '#d9d3c1', '#ece7d8', 'fine', 'Fizzes in acid; made of calcite.'],
    ['fossil-limestone', 'Fossiliferous limestone', 'sedimentary', '#d4cbb2', '#8a7e63', 'fossil', 'Limestone with visible shells and fossils.'],
    ['coquina', 'Coquina', 'sedimentary', '#e3d6b4', '#a89868', 'shards', 'Loosely cemented broken seashells.'],
    ['chert', 'Chert', 'sedimentary', '#7a6f60', '#b0a48f', 'glassy', 'Dense, smooth quartz; curved fracture; harder than a knife (flint).'],
    ['dolostone', 'Dolostone', 'sedimentary', '#cfc2ab', '#e5dac6', 'fine', 'Looks like limestone; fizzes only when powdered.'],
    ['rock-salt', 'Rock salt', 'sedimentary', '#eeeeee', '#cfe3ff', 'cubes', 'Made of halite; salty taste.'],
    ['rock-gypsum', 'Rock gypsum', 'sedimentary', '#f1ede4', '#ffffff', 'fine', 'Soft white rock a fingernail scratches.'],
    ['coal', 'Bituminous coal', 'sedimentary', '#1b1c1f', '#4b4f56', 'layers', 'Black, dull to shiny, burns; formed from plants.'],
    // ---- Metamorphic ----
    ['gneiss', 'Gneiss', 'metamorphic', '#b9b4ae', '#2e2e2e', 'bands', 'Coarse light and dark bands (foliated).'],
    ['schist', 'Schist', 'metamorphic', '#7d7a80', '#d8d3dc', 'flakes', 'Shiny and sparkly with visible mica flakes.'],
    ['phyllite', 'Phyllite', 'metamorphic', '#5f6a6a', '#a9b6b4', 'layers', 'Between slate and schist; silky, wavy sheen.'],
    ['slate', 'Slate', 'metamorphic', '#4d5560', '#7a838f', 'layers', 'Very fine, splits into flat dull sheets; makes a "clink".'],
    ['marble', 'Marble', 'metamorphic', '#f1efec', '#9a9aa0', 'veins', 'Sparkly calcite crystals, often veined; fizzes in acid.'],
    ['quartzite', 'Quartzite', 'metamorphic', '#e4d8cb', '#fff8ef', 'granular', 'Very hard, glittery sandstone that breaks through the grains.'],
    ['hornfels', 'Hornfels', 'metamorphic', '#2d3033', '#5d6268', 'fine', 'Dark, dense and hard; no layering.'],
    ['anthracite', 'Anthracite', 'metamorphic', '#0f1012', '#53565c', 'glassy', 'Hard, shiny black coal that burns hot and clean.'],
    ['amphibolite', 'Amphibolite', 'metamorphic', '#2c3a33', '#d5d9d2', 'speckle', 'Dark with white flecks; mostly hornblende and plagioclase.'],
    ['serpentinite', 'Serpentinite', 'metamorphic', '#3f7a52', '#a6d1a5', 'veins', 'Waxy green, smooth, often with a snakeskin look.'],
    ['metaconglomerate', 'Metaconglomerate', 'metamorphic', '#8d7a68', '#4b4038', 'pebbles', 'Squashed, stretched pebbles in a hard layered rock.'],
  ];

  const KINDS = {
    mineral: { label: 'Minerals', emoji: '💎' },
    igneous: { label: 'Igneous rocks', emoji: '🌋' },
    sedimentary: { label: 'Sedimentary rocks', emoji: '🏖️' },
    metamorphic: { label: 'Metamorphic rocks', emoji: '🏔️' },
  };

  // Tiny seeded random numbers so each picture is always drawn the same way.
  function rng(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return () => { h += 0x6d2b79f5; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const f = (n) => Math.round(n * 10) / 10;

  // The outline of the chunk (a slightly lumpy rounded polygon), inside a 64 x 64 box.
  function outline(r) {
    const pts = [], n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3, rad = 22 + r() * 6;
      pts.push([32 + Math.cos(a) * rad, 33 + Math.sin(a) * (rad * 0.86)]);
    }
    return pts;
  }
  const path = (pts) => 'M' + pts.map((p) => f(p[0]) + ' ' + f(p[1])).join('L') + 'Z';

  function picture(id, base, accent, tex) {
    const r = rng(id), pts = outline(r), clip = 'c-' + id;
    let g = '';
    const dots = (n, rmin, rmax, col, op) => { for (let i = 0; i < n; i++) g += `<circle cx="${f(10 + r() * 44)}" cy="${f(10 + r() * 44)}" r="${f(rmin + r() * (rmax - rmin))}" fill="${col}" opacity="${op}"/>`; };
    const lines = (n, col, w, wavy) => { for (let i = 0; i < n; i++) { const y = 12 + (i + 0.5) * (42 / n) + (r() - 0.5) * 3; g += `<path d="M6 ${f(y)} Q 22 ${f(y + (wavy ? (r() - 0.5) * 8 : 0))} 34 ${f(y)} T 60 ${f(y + (wavy ? (r() - 0.5) * 6 : 0))}" stroke="${col}" stroke-width="${w}" fill="none" opacity=".75"/>`; } };
    const rects = (n, s, col, op, rot) => { for (let i = 0; i < n; i++) { const x = 11 + r() * 38, y = 11 + r() * 38, k = s * (0.7 + r() * 0.6), a = rot ? r() * 60 - 30 : 0; g += `<rect x="${f(x)}" y="${f(y)}" width="${f(k)}" height="${f(k)}" fill="${col}" opacity="${op}" transform="rotate(${f(a)} ${f(x + k / 2)} ${f(y + k / 2)})"/>`; } };
    switch (tex) {
      case 'speckle': dots(14, 1.2, 2.6, accent, 0.85); dots(7, 1.6, 3, '#ffffff', 0.35); break;
      case 'granular': dots(40, 0.8, 1.5, accent, 0.7); break;
      case 'fine': dots(26, 0.5, 0.9, accent, 0.55); break;
      case 'bands': lines(6, accent, 3.4, true); break;
      case 'layers': lines(7, accent, 1.8, false); break;
      case 'veins': g += `<path d="M10 24 Q 26 30 34 22 T 58 40" stroke="${accent}" stroke-width="1.6" fill="none"/><path d="M14 46 Q 30 38 42 48" stroke="${accent}" stroke-width="1.2" fill="none"/>`; break;
      case 'holes': for (let i = 0; i < 12; i++) g += `<ellipse cx="${f(12 + r() * 40)}" cy="${f(13 + r() * 38)}" rx="${f(1.4 + r() * 2.4)}" ry="${f(1.2 + r() * 2)}" fill="${accent}" opacity=".8"/>`; break;
      case 'cubes': rects(5, 12, accent, 0.55, false); rects(4, 8, '#000', 0.14, false); break;
      case 'blocks': rects(7, 10, accent, 0.5, true); break;
      case 'octa': for (let i = 0; i < 4; i++) { const x = 16 + r() * 30, y = 16 + r() * 28; g += `<path d="M${f(x)} ${f(y - 6)}L${f(x + 5)} ${f(y)}L${f(x)} ${f(y + 6)}L${f(x - 5)} ${f(y)}Z" fill="${accent}" opacity=".6"/>`; } break;
      case 'crystals': for (let i = 0; i < 6; i++) { const x = 14 + r() * 34, w = 4 + r() * 3, h = 12 + r() * 10, y = 14 + r() * 24; g += `<path d="M${f(x)} ${f(y + h)}L${f(x)} ${f(y + 3)}L${f(x + w / 2)} ${f(y)}L${f(x + w)} ${f(y + 3)}L${f(x + w)} ${f(y + h)}Z" fill="${accent}" opacity=".65" stroke="#000" stroke-opacity=".18" stroke-width=".6"/>`; } break;
      case 'flakes': for (let i = 0; i < 16; i++) { const x = 10 + r() * 42, y = 10 + r() * 42, a = r() * 180; g += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(2.6 + r() * 2)}" ry="1" fill="${accent}" opacity=".8" transform="rotate(${f(a)} ${f(x)} ${f(y)})"/>`; } break;
      case 'bumps': for (let i = 0; i < 10; i++) g += `<circle cx="${f(12 + r() * 40)}" cy="${f(13 + r() * 38)}" r="${f(3 + r() * 3)}" fill="${accent}" opacity=".6"/>`; break;
      case 'pebbles': for (let i = 0; i < 9; i++) g += `<ellipse cx="${f(12 + r() * 40)}" cy="${f(13 + r() * 38)}" rx="${f(3 + r() * 3)}" ry="${f(2.4 + r() * 2.6)}" fill="${accent}" opacity=".75" stroke="#000" stroke-opacity=".2" stroke-width=".6"/>`; break;
      case 'shards': for (let i = 0; i < 9; i++) { const x = 11 + r() * 38, y = 11 + r() * 38; g += `<path d="M${f(x)} ${f(y)}l${f(3 + r() * 6)} ${f(r() * 3)}l${f(-r() * 4)} ${f(3 + r() * 5)}Z" fill="${accent}" opacity=".75"/>`; } break;
      case 'clasts': dots(10, 1.5, 3, accent, 0.6); dots(14, 0.5, 1, '#ffffff', 0.4); break;
      case 'fossil': g += `<path d="M20 34 a8 8 0 0 1 16 0 z" fill="${accent}" opacity=".85"/><path d="M24 34 v-6 M28 34 v-8 M32 34 v-6" stroke="${base}" stroke-width=".9"/><path d="M38 24 q4 -5 8 0 q-2 6 -8 0z" fill="${accent}" opacity=".8"/>`; dots(10, 0.5, 0.9, accent, 0.5); break;
      case 'glassy': g += `<path d="M18 22 Q 24 16 34 18" stroke="${accent}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".85"/><circle cx="40" cy="42" r="1.6" fill="${accent}" opacity=".6"/>`; break;
      default: g += `<ellipse cx="26" cy="24" rx="9" ry="5" fill="${accent}" opacity=".35"/>`;
    }
    return `<svg class="rock-pic" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true" focusable="false"><defs><clipPath id="${clip}"><path d="${path(pts)}"/></clipPath></defs><ellipse cx="32" cy="57" rx="20" ry="3" fill="#000" opacity=".12"/><path d="${path(pts)}" fill="${base}"/><g clip-path="url(#${clip})">${g}<ellipse cx="24" cy="22" rx="14" ry="8" fill="#fff" opacity=".13"/><ellipse cx="40" cy="48" rx="18" ry="9" fill="#000" opacity=".12"/></g><path d="${path(pts)}" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  }

  window.PF_ROCKS = {
    KINDS,
    LIST: R.map((x) => ({ id: x[0], name: x[1], kind: x[2], clue: x[6], svg: picture(x[0], x[3], x[4], x[5]) })),
  };
})();
