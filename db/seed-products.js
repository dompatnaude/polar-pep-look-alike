const { getDb } = require('./connection');

const DEFAULT_IMAGE = 'assets/products/default-product.png';
const DEFAULT_INVENTORY = 100;

const SEED_PRODUCTS = [
  { id: 'ghkcu_100_50', name: 'GHK-CU', tag: 'REPAIR SUPPORT', color: '#fdeef4;color:#db2777', category: 'Repair', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['100mg', '50mg'] },
  { id: 'glutathione_1500_600', name: 'Glutathione', tag: 'METABOLIC SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Metabolic', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['1500mg', '600mg'] },
  { id: 'hcg_5000iu', name: 'HCG', tag: 'GROWTH SUPPORT', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['5000iu'] },
  { id: 'ipamorelin_10', name: 'Ipamorelin', tag: 'GROWTH SUPPORT', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'igf1lr3_1', name: 'Igf-1-lr3', tag: 'GROWTH SUPPORT', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['1mg'] },
  { id: 'klow_80', name: 'KLOW', tag: 'RECOVERY BLEND', color: '#e8fbef;color:#16a34a', category: 'Recovery', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['80mg'] },
  { id: 'kpv_10', name: 'KPV', tag: 'RECOVERY SUPPORT', color: '#e8fbef;color:#16a34a', category: 'Recovery', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'motsc_10', name: 'MOTS-C', tag: 'CELLULAR SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Cellular', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'mt1_10', name: 'MT1', tag: 'NEURO SUPPORT', color: '#fdeef4;color:#db2777', category: 'Neuro', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'mt2_10', name: 'MT2', tag: 'NEURO SUPPORT', color: '#fdeef4;color:#db2777', category: 'Neuro', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'nad_500', name: 'NAD+', tag: 'CELLULAR SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Cellular', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['500mg'] },
  { id: 'reta_10_20_30', name: 'GLP-3RT', tag: 'METABOLIC SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Metabolic', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg', '20mg', '30mg'] },
  { id: 'sermorelin_10', name: 'Sermorelin acetate', tag: 'GROWTH SUPPORT', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'selank_10', name: 'Selank', tag: 'NEURO SUPPORT', color: '#fdeef4;color:#db2777', category: 'Neuro', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'semax_10', name: 'Semax', tag: 'NEURO SUPPORT', color: '#fdeef4;color:#db2777', category: 'Neuro', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'ss31_10', name: 'Ss-31', tag: 'CELLULAR SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Cellular', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'thymosin_a1_5', name: 'Thymosin alpha 1', tag: 'GROWTH SUPPORT', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['5mg'] },
  { id: 'tb500_10', name: 'Tb500', tag: 'RECOVERY SUPPORT', color: '#e8fbef;color:#16a34a', category: 'Recovery', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'tesamorelin_10', name: 'Tesamorelin', tag: 'GROWTH SUPPORT', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'adamax_10', name: 'Adamax', tag: 'NEURO SUPPORT', color: '#fdeef4;color:#db2777', category: 'Neuro', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'aod9604_10', name: 'Aod9604', tag: 'METABOLIC SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Metabolic', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'ahkcu_50', name: 'Ahk-cu', tag: 'REPAIR SUPPORT', color: '#fdeef4;color:#db2777', category: 'Repair', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['50mg'] },
  { id: '5amino1mq', name: '5-amino-1mq', tag: 'METABOLIC SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Metabolic', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['1mq'] },
  { id: 'bpc157_10', name: 'Bpc 157', tag: 'RECOVERY SUPPORT', color: '#e8fbef;color:#16a34a', category: 'Recovery', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'bpc_tb500_10_10', name: 'Bpc + tb500', tag: 'RECOVERY BLEND', color: '#e8fbef;color:#16a34a', category: 'Recovery', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg+10mg'] },
  { id: 'cagrilinitide_10', name: 'Cagrilinitide', tag: 'METABOLIC SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Metabolic', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'cjc1295_nodac_10', name: 'Cjc 1295 no DAC', tag: 'GROWTH SUPPORT', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'cjc1295_ipa_5', name: 'Cjc1295 no dac + ipa', tag: 'GROWTH BLEND', color: '#fff4e5;color:#d97706', category: 'Growth', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['5mg'] },
  { id: 'dsip_10', name: 'DSIP', tag: 'NEURO SUPPORT', color: '#fdeef4;color:#db2777', category: 'Neuro', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'epithalon_10', name: 'Epithalon', tag: 'CELLULAR SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Cellular', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] },
  { id: 'tirzepitide_10', name: 'Tirzepitide', tag: 'METABOLIC SUPPORT', color: '#eef1fc;color:#2f43e0', category: 'Metabolic', description: 'Research-grade peptide reagent for controlled laboratory workflows.', price: 100.0, dosages: ['10mg'] }
];

async function seedProducts() {
  const db = await getDb();
  let inserted = 0;

  for (const product of SEED_PRODUCTS) {
    const existing = await db.get('SELECT id FROM products WHERE id = ?;', product.id);
    if (existing) continue;

    await db.run(
      `
      INSERT INTO products (id, name, description, price, image, inventory, category, tag, color, dosages)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      product.id,
      product.name,
      product.description,
      product.price,
      product.image || DEFAULT_IMAGE,
      Number.isFinite(product.inventory) ? product.inventory : DEFAULT_INVENTORY,
      product.category || '',
      product.tag || '',
      product.color || '',
      JSON.stringify(product.dosages || [])
    );
    inserted += 1;
  }

  return { total: SEED_PRODUCTS.length, inserted };
}

async function ensureAdminUser() {
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!adminEmail) return { promoted: false };

  const db = await getDb();
  const result = await db.run('UPDATE users SET is_admin = 1 WHERE email = ?;', adminEmail);
  return { promoted: (result.changes || 0) > 0, email: adminEmail };
}

module.exports = { seedProducts, ensureAdminUser, SEED_PRODUCTS };
