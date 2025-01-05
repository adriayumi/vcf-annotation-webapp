#!/usr/bin/env bash

sqlite3 ${snakemake_output} 2> ${snakemake_log[stderr]} <<SQL

CREATE TABLE variants (
    dbsnp TEXT,
    chromosome TEXT,
    pos INTEGER,
    ref TEXT,
    alt TEXT,
    qual REAL,
    filter TEXT,
    gt TEXT,
    dp INTEGER,
    ad TEXT
);
CREATE TABLE genes (
    chromosome TEXT,
    pos INTEGER,
    gene TEXT
);
CREATE TABLE alfa (
    ID TEXT,
    SAMN10492695_AN INTEGER,
    SAMN10492695_AC INTEGER,
    SAMN10492696_AN INTEGER,
    SAMN10492696_AC INTEGER,
    SAMN10492697_AN INTEGER,
    SAMN10492697_AC INTEGER,
    SAMN10492698_AN INTEGER,
    SAMN10492698_AC INTEGER,
    SAMN10492699_AN INTEGER,
    SAMN10492699_AC INTEGER,
    SAMN10492700_AN INTEGER,
    SAMN10492700_AC INTEGER,
    SAMN10492701_AN INTEGER,
    SAMN10492701_AC INTEGER,
    SAMN10492702_AN INTEGER,
    SAMN10492702_AC INTEGER,
    SAMN11605645_AN INTEGER,
    SAMN11605645_AC INTEGER,
    SAMN10492703_AN INTEGER,
    SAMN10492703_AC INTEGER,
    SAMN10492704_AN INTEGER,
    SAMN10492704_AC INTEGER,
    SAMN10492705_AN INTEGER,
    SAMN10492705_AC INTEGER
);

# Import the TSV data into the tables
.headers on
.mode tabs
.import ${snakemake_input[variants_tsv]} variants
.import ${snakemake_input[genes_tsv]} genes
.import ${snakemake_input[alfa_tsv]} alfa

# Delete the first row of each table, as this is corresponds to the header
# If the tables were imported directly, datatypes (INTEGER, TEXT, etc.)
# would not be inferred from the first row
DELETE FROM genes WHERE rowid = 1;
DELETE FROM variants WHERE rowid = 1;
DELETE FROM alfa WHERE rowid = 1;

# Set the values of the dbsnp column to NULL if the value is '.'
UPDATE variants SET dbsnp = NULL WHERE dbsnp = '.';

# Add a column to the variants and genes tables that combines the chromosome
# and position. This is so that the `variants` and `genes` tables have a
# common column.
ALTER TABLE variants ADD COLUMN chromosome_position TEXT;
UPDATE variants SET chromosome_position = chromosome || ':' || pos;
ALTER TABLE genes ADD COLUMN chromosome_position TEXT;
UPDATE genes SET chromosome_position = chromosome || ':' || pos;

# Add an ID column to the genes table. This serves as a unique identifier for each
# row in the table.
ALTER TABLE genes ADD COLUMN id INTEGER;
UPDATE genes SET id = rowid;

# In the `alfa` table, calculate the relative allele frequency for each
# sample and drop the original allele count and allele number columns.
CREATE TABLE alfa_relative (
    dbsnp TEXT,
    european REAL,
    african_others REAL,
    east_asian REAL,
    african_american REAL,
    latin_american_1 REAL,
    latin_american_2 REAL,
    other_asian REAL,
    south_asian REAL,
    other REAL,
    african REAL,
    asian REAL,
    total REAL
);
INSERT INTO alfa_relative SELECT
    ID AS dbsnp,
    CASE WHEN SAMN10492695_AN = 0 THEN 0 ELSE CAST(SAMN10492695_AC AS REAL) / SAMN10492695_AN END AS european,
    CASE WHEN SAMN10492696_AN = 0 THEN 0 ELSE CAST(SAMN10492696_AC AS REAL) / SAMN10492696_AN END AS african_others,
    CASE WHEN SAMN10492697_AN = 0 THEN 0 ELSE CAST(SAMN10492697_AC AS REAL) / SAMN10492697_AN END AS east_asian,
    CASE WHEN SAMN10492698_AN = 0 THEN 0 ELSE CAST(SAMN10492698_AC AS REAL) / SAMN10492698_AN END AS african_american,
    CASE WHEN SAMN10492699_AN = 0 THEN 0 ELSE CAST(SAMN10492699_AC AS REAL) / SAMN10492699_AN END AS latin_american_1,
    CASE WHEN SAMN10492700_AN = 0 THEN 0 ELSE CAST(SAMN10492700_AC AS REAL) / SAMN10492700_AN END AS latin_american_2,
    CASE WHEN SAMN10492701_AN = 0 THEN 0 ELSE CAST(SAMN10492701_AC AS REAL) / SAMN10492701_AN END AS other_asian,
    CASE WHEN SAMN10492702_AN = 0 THEN 0 ELSE CAST(SAMN10492702_AC AS REAL) / SAMN10492702_AN END AS south_asian,
    CASE WHEN SAMN11605645_AN = 0 THEN 0 ELSE CAST(SAMN11605645_AC AS REAL) / SAMN11605645_AN END AS other,
    CASE WHEN SAMN10492703_AN = 0 THEN 0 ELSE CAST(SAMN10492703_AC AS REAL) / SAMN10492703_AN END AS african,
    CASE WHEN SAMN10492704_AN = 0 THEN 0 ELSE CAST(SAMN10492704_AC AS REAL) / SAMN10492704_AN END AS asian,
    CASE WHEN SAMN10492705_AN = 0 THEN 0 ELSE CAST(SAMN10492705_AC AS REAL) / SAMN10492705_AN END AS total
FROM alfa;
DROP TABLE alfa;
ALTER TABLE alfa_relative RENAME TO alfa;
SQL
