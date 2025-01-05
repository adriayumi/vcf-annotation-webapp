#!/usr/bin/env sh

alias dcurl='curl -LJZf --retry 10 --retry-max-time 10'

set -x

dcurl https://s3.amazonaws.com/biodata/collections/GRCh37/seq/GRCh37.fa > GRCh37.fa
dcurl https://s3.amazonaws.com/biodata/collections/hg38/seq/hg38.fa > hg38.fa
dcurl https://storage.googleapis.com/broad-public-datasets/funcotator/funcotator_dataSources.v1.8.hg38.20230908s/dbsnp/hg38/hg38_All_20180418.vcf.gz > hg38.dbsnp151.vcf.gz
dcurl https://ftp.ebi.ac.uk/pub/databases/gencode/Gencode_human/release_47/gencode.v47.basic.annotation.gff3.gz | gzip -dc > gencode.v47.basic.annotation.gff3
dcurl https://ftp.ncbi.nih.gov/snp/population_frequency/archive/release_3/freq.vcf.gz > alfa3.vcf.gz
