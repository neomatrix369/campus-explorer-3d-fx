import { CampusBuilding, CampusProfile, PathwaySegment, UniversityProfile } from '../data/campusData';
import { getBuildingAggregateMetrics } from './campusLogic';

/**
 * Generates a genuine, standards-compliant Vector PDF (%PDF-1.4) architectural layout map
 * of the active university campus, complete with road network, pedestrian pathways,
 * building footprint polygons, short codes, 3.5m/floor height extrusions, and 24/7 quiet metrics.
 */
export function buildCampusVectorPdfBytes(
  university: UniversityProfile,
  campus: CampusProfile,
  buildings: CampusBuilding[],
  pathways: PathwaySegment[]
): Uint8Array {
  const pageW = 842; // A4 Landscape width in pt
  const pageH = 595; // A4 Landscape height in pt

  const mapX = 40;
  const mapY = 55;
  const mapW = 500;
  const mapH = 470;
  const centerX = mapX + mapW / 2;
  const centerY = mapY + mapH / 2;
  const scale = 7.5; // 1 world meter = 7.5 PDF points

  const toPdfX = (wx: number) => Number((centerX + wx * scale).toFixed(2));
  const toPdfY = (wz: number) => Number((centerY - wz * scale).toFixed(2));

  const esc = (text: string) =>
    text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, ' ');

  const ops: string[] = [];

  // 1. Dark Slate Architectural Blueprint Background
  ops.push('0.06 0.09 0.15 rg');
  ops.push(`0 0 ${pageW} ${pageH} re f`);

  // 2. Map Viewport Frame & Parkland Background
  ops.push('0.10 0.16 0.14 rg');
  ops.push(`${mapX} ${mapY} ${mapW} ${mapH} re f`);
  ops.push('0.22 0.74 0.97 RG 1.2 w');
  ops.push(`${mapX} ${mapY} ${mapW} ${mapH} re S`);

  // 3. CAD Coordinate Grid (every 10m)
  ops.push('0.18 0.26 0.24 RG 0.4 w');
  for (let m = -30; m <= 30; m += 10) {
    const gx = toPdfX(m);
    const gy = toPdfY(m);
    ops.push(`${gx} ${mapY} m ${gx} ${mapY + mapH} l S`);
    ops.push(`${mapX} ${gy} m ${mapX + mapW} ${gy} l S`);
  }

  // 4. Arterial Roadways (Gower St / Strand / Exhibition Rd / Kingsway)
  ops.push('0.22 0.26 0.32 RG 14 w');
  // North-South Avenue
  ops.push(`${toPdfX(-26)} ${mapY} m ${toPdfX(-26)} ${mapY + mapH} l S`);
  ops.push(`${toPdfX(26)} ${mapY} m ${toPdfX(26)} ${mapY + mapH} l S`);
  // East-West Thoroughfare
  ops.push(`${mapX} ${toPdfY(-22)} m ${mapX + mapW} ${toPdfY(-22)} l S`);
  ops.push(`${mapX} ${toPdfY(24)} m ${mapX + mapW} ${toPdfY(24)} l S`);

  // Road Center Dashed Markings
  ops.push('[4 4] 0 d 0.75 0.82 0.90 RG 0.8 w');
  ops.push(`${toPdfX(-26)} ${mapY} m ${toPdfX(-26)} ${mapY + mapH} l S`);
  ops.push(`${toPdfX(26)} ${mapY} m ${toPdfX(26)} ${mapY + mapH} l S`);
  ops.push(`${mapX} ${toPdfY(-22)} m ${mapX + mapW} ${toPdfY(-22)} l S`);
  ops.push('[] 0 d');

  // 5. Pedestrian Pathways Connecting Buildings
  ops.push('0.82 0.86 0.92 RG 3.5 w');
  pathways.forEach((path) => {
    if (path.points.length < 2) return;
    const [first, ...rest] = path.points;
    ops.push(`${toPdfX(first[0])} ${toPdfY(first[2])} m`);
    rest.forEach((pt) => {
      ops.push(`${toPdfX(pt[0])} ${toPdfY(pt[2])} l`);
    });
    ops.push('S');
  });

  // 6. Building Footprints, Extrusion Specs & Short Codes
  buildings.forEach((b) => {
    const [bx, , bz] = b.position;
    const [w, h, d] = b.dimensions;
    const rx = toPdfX(bx - w / 2);
    const ry = toPdfY(bz + d / 2);
    const rw = Number((w * scale).toFixed(2));
    const rh = Number((d * scale).toFixed(2));

    // Building polygon fill & stroke
    if (b.open24Hours) {
      ops.push('0.08 0.38 0.56 rg 0.22 0.74 0.97 RG 1.6 w');
    } else {
      ops.push('0.18 0.24 0.36 rg 0.65 0.72 0.85 RG 1.3 w');
    }
    ops.push(`${rx} ${ry} ${rw} ${rh} re B`);

    // Short code label inside footprint
    ops.push('BT /F1 9 Tf 1 1 1 rg');
    ops.push(`${ (rx + 5).toFixed(1) } ${ (ry + rh / 2 + 2).toFixed(1) } Td (${esc(b.shortCode)}) Tj ET`);
    ops.push('BT /F1 6.5 Tf 0.75 0.90 1 rg');
    ops.push(`${ (rx + 5).toFixed(1) } ${ (ry + rh / 2 - 7).toFixed(1) } Td (${h}m / ${b.floors.length}F) Tj ET`);
  });

  // 7. Header Title Block
  ops.push('BT /F1 14 Tf 1 1 1 rg');
  ops.push(`40 558 Td (${esc(university.name)} - ${esc(campus.name)}) Tj ET`);
  ops.push('BT /F1 8.5 Tf 0.56 0.78 0.96 rg');
  ops.push(
    `40 542 Td (CAD / Vector 3D Extrusion Layout  |  Location: ${esc(campus.locationLabel)}  |  Datum: ${campus.baseAslMeters}m ASL) Tj ET`
  );

  // 8. Right-Hand Legend & Building Schedule Table
  const legX = 560;
  ops.push('0.09 0.13 0.22 rg 0.22 0.30 0.44 RG 1 w');
  ops.push(`${legX} ${mapY} 245 ${mapH} re B`);

  ops.push('BT /F1 11 Tf 1 1 1 rg');
  ops.push(`${legX + 12} ${mapY + mapH - 24} Td (BUILDING SCHEDULE & 3D SPECS) Tj ET`);

  let rowY = mapY + mapH - 48;
  buildings.forEach((b, idx) => {
    const metrics = getBuildingAggregateMetrics(b);
    ops.push('BT /F1 8.5 Tf 0.22 0.74 0.97 rg');
    ops.push(
      `${legX + 12} ${rowY} Td (${idx + 1}. [${esc(b.shortCode)}] ${esc(b.name.slice(0, 28))}) Tj ET`
    );
    rowY -= 12;
    ops.push('BT /F1 7.5 Tf 0.80 0.85 0.92 rg');
    ops.push(
      `${legX + 18} ${rowY} Td (Footprint: ${b.dimensions[0]}x${b.dimensions[2]}m | Height: ${b.dimensions[1]}m | ${b.open24Hours ? '24/7 Open' : 'Day/Eve'}) Tj ET`
    );
    rowY -= 11;
    ops.push('BT /F1 7.5 Tf 0.40 0.88 0.65 rg');
    ops.push(
      `${legX + 18} ${rowY} Td (Open Seats: ${metrics.availableSeats} | Quietest Floor: ${metrics.minNoiseDba} dBA) Tj ET`
    );
    rowY -= 18;
  });

  // Footer note
  ops.push('BT /F1 7.5 Tf 0.60 0.68 0.80 rg');
  ops.push(
    `40 28 Td (Generated by CampusExplorer 3D FX Vector Pipeline - Ready for 2D Polygon to 3.5m/Floor 3D Extrusion) Tj ET`
  );

  const contentStream = ops.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function triggerCampusPdfDownload(
  university: UniversityProfile,
  campus: CampusProfile,
  buildings: CampusBuilding[],
  pathways: PathwaySegment[]
): string {
  const bytes = buildCampusVectorPdfBytes(university, campus, buildings, pathways);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const filename = `${campus.id}-vector-layout-map.pdf`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return filename;
}
