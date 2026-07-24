const CATEGORY_CODES = {
  'Plug Gauge': 'PG',
  'Ring Gauge': 'RG',
  'Vernier Caliper': 'VC',
  'Micrometer': 'MC',
  'Height Gauge': 'HG',
  'Bore Gauge': 'BG',
  'Dial Gauge': 'DG',
  'Master Gauge': 'MG',
  'Thread Gauge': 'TG',
  'Air Gauge': 'AG',
  'Torque Wrench': 'TW',
  'Surface Plate': 'SP',
  'Custom Fixture': 'CF',
  'Digital Instrument': 'DI'
};

let seqCounter = 144;

export function generateGaugeId(categoryName) {
  const code = CATEGORY_CODES[categoryName] || 'GG';
  const year = new Date().getFullYear();
  seqCounter += 1;
  const sequence = String(seqCounter).padStart(5, '0');
  return `GLMS-${code}-${year}-${sequence}`;
}
