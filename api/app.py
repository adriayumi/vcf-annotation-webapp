from enum import Enum
from typing import Optional

from fastapi import Depends, FastAPI, Query
from sqlalchemy import func
from sqlmodel import Field, Relationship, Session, SQLModel, create_engine, select


class NotNullFilter(str, Enum):
    all = "all"
    only = "only"


class ChromosomeFilter(str, Enum):
    all = "all"
    chr1 = "chr1"
    chr2 = "chr2"
    chr3 = "chr3"
    chr4 = "chr4"
    chr5 = "chr5"
    chr6 = "chr6"
    chr7 = "chr7"
    chr8 = "chr8"
    chr9 = "chr9"
    chr10 = "chr10"
    chr11 = "chr11"
    chr12 = "chr12"
    chr13 = "chr13"
    chr14 = "chr14"
    chr15 = "chr15"
    chr16 = "chr16"
    chr17 = "chr17"
    chr18 = "chr18"
    chr19 = "chr19"
    chr20 = "chr20"
    chr21 = "chr21"
    chr22 = "chr22"
    chrX = "chrX"


CHROMOSOME_LIST = [
    "chr1",
    "chr2",
    "chr3",
    "chr4",
    "chr5",
    "chr6",
    "chr7",
    "chr8",
    "chr9",
    "chr10",
    "chr11",
    "chr12",
    "chr13",
    "chr14",
    "chr15",
    "chr16",
    "chr17",
    "chr18",
    "chr19",
    "chr20",
    "chr21",
    "chr22",
    "chrX",
]


class VariantBase(SQLModel, table=True):
    __tablename__ = "variants"
    dbsnp: Optional[str]
    chromosome: str
    pos: int
    ref: str
    alt: str
    qual: float
    filter: str
    gt: str
    dp: int
    ad: str
    chromosome_position: str = Field(primary_key=True)
    genes: Optional[list["GeneBase"]] = Relationship(back_populates="variant")
    alfa: Optional["AlfaBase"] = Relationship()


class VariantWithoutRelationships(SQLModel):
    dbsnp: Optional[str]
    chromosome: str
    pos: int
    ref: str
    alt: str
    filter: str
    gt: str
    dp: int
    ad: str


class Variant(VariantWithoutRelationships):
    genes: list["Gene"] = None
    alfa: Optional["Alfa"] = None

    class Config:
        json_encoders = {
            list: lambda v: [gene.gene for gene in v]
            if v and hasattr(v[0], "gene")
            else v
        }


class GeneBase(SQLModel, table=True):
    __tablename__ = "genes"
    gene: str
    chromosome_position: str = Field(foreign_key="variants.chromosome_position")
    id: int = Field(default=None, primary_key=True)
    variant: "VariantBase" = Relationship(back_populates="genes")


class Gene(SQLModel):
    gene: str


class AlfaBase(SQLModel, table=True):
    __tablename__ = "alfa"
    dbsnp: str = Field(primary_key=True, foreign_key="variants.dbsnp")
    total: float
    african: float
    african_american: float
    african_others: float
    asian: float
    east_asian: float
    south_asian: float
    other_asian: float
    european: float
    latin_american_1: float
    latin_american_2: float
    other: float


class Alfa(SQLModel):
    total: float
    african: float
    african_american: float
    african_others: float
    asian: float
    east_asian: float
    south_asian: float
    other_asian: float
    european: float
    latin_american_1: float
    latin_american_2: float
    other: float


sqlite_file_name = "NIST.dbsnp151.snpeff.alfa3.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=True, connect_args=connect_args)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


app = FastAPI()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


@app.get("/n_variants/")
def get_n_variants(
    session: Session = Depends(get_session),
    dbsnp: NotNullFilter = NotNullFilter.all,
    gatk_pass: NotNullFilter = NotNullFilter.all,
    chromosome: ChromosomeFilter = ChromosomeFilter.all,
    min_dp: Optional[int] = None,
    min_pos: Optional[int] = None,
    max_pos: Optional[int] = None,
    min_total_alfa: Optional[float] = None,
    max_total_alfa: Optional[float] = None,
    min_latin_american_2_alfa: Optional[float] = None,
    max_latin_american_2_alfa: Optional[float] = None,
    min_east_asian_alfa: Optional[float] = None,
    max_east_asian_alfa: Optional[float] = None,
    gene: Optional[str] = None,
):
    query = session.query(VariantBase)

    # Apply dbsnp filter
    if dbsnp == NotNullFilter.only:
        query = query.filter(VariantBase.dbsnp.is_not(None))

    # Apply GATK filter
    if gatk_pass == NotNullFilter.only:
        query = query.filter(VariantBase.filter == "PASS")

    # Apply chromosome filter
    if chromosome != ChromosomeFilter.all:
        query = query.filter(VariantBase.chromosome == chromosome)
    else:
        query = query.filter(VariantBase.chromosome.in_(CHROMOSOME_LIST))

    # Apply depth filter
    if min_dp:
        query = query.filter(VariantBase.dp >= min_dp)

    # Apply position filters
    if min_pos:
        query = query.filter(VariantBase.pos >= min_pos)
    if max_pos:
        query = query.filter(VariantBase.pos <= max_pos)

    # Apply gene filter
    if gene:
        query = query.join(VariantBase.genes).filter(
            func.lower(GeneBase.gene) == gene.lower()
        )

    # Join AlfaBase if any of the allele frequency filters are applied
    if any(
        [
            min_total_alfa,
            max_total_alfa,
            min_latin_american_2_alfa,
            max_latin_american_2_alfa,
            min_east_asian_alfa,
            max_east_asian_alfa,
        ]
    ):
        query = query.join(AlfaBase)
        # Apply allele frequency filters
        if min_total_alfa:
            query = query.where(AlfaBase.total >= min_total_alfa)
        if max_total_alfa:
            query = query.where(AlfaBase.total <= max_total_alfa)
        if min_latin_american_2_alfa:
            query = query.where(AlfaBase.latin_american_2 >= min_latin_american_2_alfa)
        if max_latin_american_2_alfa:
            query = query.where(AlfaBase.latin_american_2 <= max_latin_american_2_alfa)
        if min_east_asian_alfa:
            query = query.where(AlfaBase.east_asian >= min_east_asian_alfa)
        if max_east_asian_alfa:
            query = query.where(AlfaBase.east_asian <= max_east_asian_alfa)

    return query.count()


@app.get("/variants/", response_model=list[Variant])
def get_variants(
    *,
    session: Session = Depends(get_session),
    dbsnp: NotNullFilter = NotNullFilter.all,
    gatk_pass: NotNullFilter = NotNullFilter.all,
    chromosome: ChromosomeFilter = ChromosomeFilter.all,
    min_dp: Optional[int] = None,
    min_pos: Optional[int] = None,
    max_pos: Optional[int] = None,
    min_total_alfa: Optional[float] = None,
    max_total_alfa: Optional[float] = None,
    min_latin_american_2_alfa: Optional[float] = None,
    max_latin_american_2_alfa: Optional[float] = None,
    min_east_asian_alfa: Optional[float] = None,
    max_east_asian_alfa: Optional[float] = None,
    gene: Optional[str] = None,
    offset: int = 0,
    limit: int = Query(default=10),
):
    statement = select(VariantBase)
    if dbsnp == NotNullFilter.only:
        statement = statement.where(VariantBase.dbsnp.is_not(None))
    if gatk_pass == NotNullFilter.only:
        statement = statement.where(VariantBase.filter == "PASS")
    if min_dp:
        statement = statement.where(VariantBase.dp >= min_dp)
    if min_pos:
        statement = statement.where(VariantBase.pos >= min_pos)
    if max_pos:
        statement = statement.where(VariantBase.pos <= max_pos)
    if chromosome != ChromosomeFilter.all:
        statement = statement.where(VariantBase.chromosome == chromosome)
    else:
        statement = statement.where(VariantBase.chromosome.in_(CHROMOSOME_LIST))
    if gene:
        statement = statement.join(VariantBase.genes).where(
            func.lower(GeneBase.gene) == gene.lower()
        )
    # Join AlfaBase if any of the allele frequency filters are applied
    if any(
        [
            min_total_alfa,
            max_total_alfa,
            min_latin_american_2_alfa,
            max_latin_american_2_alfa,
            min_east_asian_alfa,
            max_east_asian_alfa,
        ]
    ):
        statement = statement.join(AlfaBase)
        if min_total_alfa:
            statement = statement.where(AlfaBase.total >= min_total_alfa)
        if max_total_alfa:
            statement = statement.where(AlfaBase.total <= max_total_alfa)
        if min_latin_american_2_alfa:
            statement = statement.where(
                AlfaBase.latin_american_2 >= min_latin_american_2_alfa
            )
        if max_latin_american_2_alfa:
            statement = statement.where(
                AlfaBase.latin_american_2 <= max_latin_american_2_alfa
            )
        if min_east_asian_alfa:
            statement = statement.where(AlfaBase.east_asian >= min_east_asian_alfa)
        if max_east_asian_alfa:
            statement = statement.where(AlfaBase.east_asian <= max_east_asian_alfa)
    statement = statement.offset(offset).limit(limit)
    return session.exec(statement).all()
