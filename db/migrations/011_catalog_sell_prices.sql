CREATE TEMP TABLE tmp_catalog_products (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    image_url TEXT,
    sku TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO tmp_catalog_products (slug, name, category, description, price, image_url, sku, stock_quantity, active) VALUES
    ('ghk-cu', 'GHK-CU', 'Repair', 'Research-grade peptide reagent for controlled laboratory workflows.', 45.00, NULL, 'GHK-CU', 0, TRUE),
    ('glutathione', 'Glutathione', 'Metabolic', 'Research-grade peptide reagent for controlled laboratory workflows.', 65.00, NULL, 'GLUTATHIONE', 0, TRUE),
    ('hcg', 'HCG', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 82.00, NULL, 'HCG', 0, TRUE),
    ('ipamorelin', 'Ipamorelin', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 75.00, NULL, 'IPAMORELIN', 0, TRUE),
    ('igf-1-lr3', 'Igf-1-lr3', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 85.00, NULL, 'IGF-1-LR3', 0, TRUE),
    ('klow', 'KLOW', 'Recovery', 'Research-grade peptide reagent for controlled laboratory workflows.', 130.00, NULL, 'KLOW', 0, TRUE),
    ('kpv', 'KPV', 'Recovery', 'Research-grade peptide reagent for controlled laboratory workflows.', 50.00, NULL, 'KPV', 0, TRUE),
    ('mots-c', 'MOTS-C', 'Cellular', 'Research-grade peptide reagent for controlled laboratory workflows.', 65.00, NULL, 'MOTS-C', 0, TRUE),
    ('mt1', 'MT1', 'Neuro', 'Research-grade peptide reagent for controlled laboratory workflows.', 35.00, NULL, 'MT1', 0, TRUE),
    ('mt2', 'MT2', 'Neuro', 'Research-grade peptide reagent for controlled laboratory workflows.', 40.00, NULL, 'MT2', 0, TRUE),
    ('nad-plus', 'NAD+', 'Cellular', 'Research-grade peptide reagent for controlled laboratory workflows.', 75.00, NULL, 'NAD-PLUS', 0, TRUE),
    ('reta', 'Reta', 'Metabolic', 'Research-grade peptide reagent for controlled laboratory workflows.', 80.00, NULL, 'RETA', 0, TRUE),
    ('sermorelin-acetate', 'Sermorelin acetate', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 125.00, NULL, 'SERMORELIN', 0, TRUE),
    ('selank', 'Selank', 'Neuro', 'Research-grade peptide reagent for controlled laboratory workflows.', 50.00, NULL, 'SELANK', 0, TRUE),
    ('semax', 'Semax', 'Neuro', 'Research-grade peptide reagent for controlled laboratory workflows.', 50.00, NULL, 'SEMAX', 0, TRUE),
    ('ss-31', 'Ss-31', 'Cellular', 'Research-grade peptide reagent for controlled laboratory workflows.', 110.00, NULL, 'SS-31', 0, TRUE),
    ('thymosin-alpha-1', 'Thymosin alpha 1', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 70.00, NULL, 'THYMOSIN-A1', 0, TRUE),
    ('tb500', 'Tb500', 'Recovery', 'Research-grade peptide reagent for controlled laboratory workflows.', 70.00, NULL, 'TB500', 0, TRUE),
    ('tesamorelin', 'Tesamorelin', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 90.00, NULL, 'TESAMORELIN', 0, TRUE),
    ('adamax', 'Adamax', 'Neuro', 'Research-grade peptide reagent for controlled laboratory workflows.', 75.00, NULL, 'ADAMAX', 0, TRUE),
    ('aod9604', 'Aod9604', 'Metabolic', 'Research-grade peptide reagent for controlled laboratory workflows.', 80.00, NULL, 'AOD9604', 0, TRUE),
    ('ahk-cu', 'Ahk-cu', 'Repair', 'Research-grade peptide reagent for controlled laboratory workflows.', 50.00, NULL, 'AHK-CU', 0, TRUE),
    ('5-amino-1mq', '5-amino-1mq', 'Metabolic', 'Research-grade peptide reagent for controlled laboratory workflows.', 100.00, NULL, '5-AMINO-1MQ', 0, TRUE),
    ('bpc-157', 'Bpc 157', 'Recovery', 'Research-grade peptide reagent for controlled laboratory workflows.', 70.00, NULL, 'BPC-157', 0, TRUE),
    ('bpc-tb500', 'Bpc 10mg + tb500 10mg', 'Recovery', 'Research-grade peptide reagent for controlled laboratory workflows.', 115.00, NULL, 'BPC-TB500', 0, TRUE),
    ('sterile-water', 'Sterile water 10ml', 'Support', 'Laboratory diluent for controlled preparation workflows.', 26.00, NULL, 'STERILE-WATER-10ML', 0, TRUE),
    ('cagrilinitide', 'Cagrilinitide', 'Metabolic', 'Research-grade peptide reagent for controlled laboratory workflows.', 125.00, NULL, 'CAGRILINITIDE', 0, TRUE),
    ('cjc-1295-no-dac', 'Cjc 1295 no DAC', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 100.00, NULL, 'CJC-1295-NO-DAC', 0, TRUE),
    ('cjc1295-no-dac-ipa', 'Cjc1295 no dac + ipa', 'Growth', 'Research-grade peptide reagent for controlled laboratory workflows.', 90.00, NULL, 'CJC1295-NO-DAC-IPA', 0, TRUE),
    ('dsip', 'DSIP', 'Neuro', 'Research-grade peptide reagent for controlled laboratory workflows.', 75.00, NULL, 'DSIP', 0, TRUE),
    ('epithalon', 'Epithalon', 'Cellular', 'Research-grade peptide reagent for controlled laboratory workflows.', 35.00, NULL, 'EPITHALON', 0, TRUE),
    ('tirzepitide', 'Tirzepitide', 'Metabolic', 'Research-grade peptide reagent for controlled laboratory workflows.', 140.00, NULL, 'TIRZEPITIDE', 0, TRUE);

INSERT INTO products (slug, name, category, description, price, image_url, sku, stock_quantity, active)
SELECT slug, name, category, description, price, image_url, sku, stock_quantity, active
FROM tmp_catalog_products
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    image_url = EXCLUDED.image_url,
    sku = EXCLUDED.sku,
    stock_quantity = EXCLUDED.stock_quantity,
    active = EXCLUDED.active,
    updated_at = CURRENT_TIMESTAMP;

CREATE TEMP TABLE tmp_catalog_variants (
    product_slug TEXT NOT NULL,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (product_slug, name)
);

INSERT INTO tmp_catalog_variants (product_slug, name, price, stock_quantity, active) VALUES
    ('ghk-cu', '100mg', 80.00, 0, TRUE),
    ('ghk-cu', '50mg', 45.00, 0, TRUE),
    ('glutathione', '1500mg', 110.00, 0, TRUE),
    ('glutathione', '600mg', 65.00, 0, TRUE),
    ('reta', '10mg', 80.00, 0, TRUE),
    ('reta', '20mg', 150.00, 0, TRUE),
    ('reta', '30mg', 210.00, 0, TRUE),
    ('tesamorelin', '10mg', 90.00, 0, TRUE),
    ('tesamorelin', '20mg', 175.00, 0, TRUE);

UPDATE products p
SET price = v.min_price,
    updated_at = CURRENT_TIMESTAMP
FROM (
    SELECT product_slug, MIN(price) AS min_price
    FROM tmp_catalog_variants
    GROUP BY product_slug
) v
WHERE p.slug = v.product_slug;

UPDATE product_variants pv
SET price = tv.price,
    stock_quantity = tv.stock_quantity,
    active = tv.active,
    updated_at = CURRENT_TIMESTAMP
FROM products p
JOIN tmp_catalog_variants tv ON tv.product_slug = p.slug
WHERE pv.product_id = p.id
  AND pv.name = tv.name;

INSERT INTO product_variants (product_id, name, price, stock_quantity, active)
SELECT p.id, tv.name, tv.price, tv.stock_quantity, tv.active
FROM products p
JOIN tmp_catalog_variants tv ON tv.product_slug = p.slug
WHERE NOT EXISTS (
    SELECT 1
    FROM product_variants pv
    WHERE pv.product_id = p.id
      AND pv.name = tv.name
);

UPDATE product_variants pv
SET active = FALSE,
    updated_at = CURRENT_TIMESTAMP
FROM products p
JOIN tmp_catalog_products tcp ON tcp.slug = p.slug
WHERE pv.product_id = p.id
  AND NOT EXISTS (
      SELECT 1
      FROM tmp_catalog_variants tv
      WHERE tv.product_slug = p.slug
        AND tv.name = pv.name
  );

DROP TABLE tmp_catalog_variants;
DROP TABLE tmp_catalog_products;