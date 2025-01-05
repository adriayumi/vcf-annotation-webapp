import math
import os
from typing import ClassVar, Optional

import requests
from flask import Flask, jsonify, render_template, request
from pydantic import BaseModel


class Variant(BaseModel):
    id: int
    allele_repr: str
    locus_repr: str
    total_freq_repr: Optional[str]
    east_asian_freq_repr: Optional[str]
    south_asian_freq_repr: Optional[str]
    african_freq_repr: Optional[str]
    european_freq_repr: Optional[str]
    latin_american_2_freq_repr: Optional[str]
    dbsnp: Optional[str]
    chromosome: str
    pos: int
    ref: str
    alt: str
    filter: str
    gt: str
    dp: int
    ad: str
    genes: Optional[list[str]]
    alfa: Optional[dict[str, float | str]]

    _counter: ClassVar[int] = 0

    def __init__(self, **data):
        Variant._counter += 1
        super().__init__(
            id=Variant._counter,
            allele_repr=f"{data['ref']}→{data['alt']}",
            locus_repr=f"{data['chromosome']}: {data['pos']}",
            total_freq_repr=f"{data['alfa']['total']:.2%}" if data["alfa"] else None,
            east_asian_freq_repr=f"{data['alfa']['east_asian']:.2%}"
            if data["alfa"]
            else None,
            south_asian_freq_repr=f"{data['alfa']['south_asian']:.2%}"
            if data["alfa"]
            else None,
            african_freq_repr=f"{data['alfa']['african']:.2%}"
            if data["alfa"]
            else None,
            european_freq_repr=f"{data['alfa']['european']:.2%}"
            if data["alfa"]
            else None,
            latin_american_2_freq_repr=f"{data['alfa']['latin_american_2']:.2%}"
            if data["alfa"]
            else None,
            **data,
        )


class PaginatedVariantResponse(BaseModel):
    items: list[Variant]
    total: int
    page: int
    per_page: int
    total_pages: int


app = Flask(__name__)

API_BASE_URL = f"http://{os.environ['API_HOST']}:{os.environ['API_PORT']}"


def fetch_variant_data(
    min_dp: int = 0,
    chromosome: str = "",
    min_pos: Optional[int] = None,
    max_pos: Optional[int] = None,
    min_total_alfa=None,
    max_total_alfa=None,
    min_latin_american_2_alfa=None,
    max_latin_american_2_alfa=None,
    min_east_asian_alfa=None,
    max_east_asian_alfa=None,
    is_dbsnp: int = 0,
    gatk_pass: int = 0,
    gene: str = "",
    page: int = 1,
    per_page: int = 10,
):
    try:
        params = {
            "limit": per_page,
            "offset": per_page * (page - 1),
            "min_pos": min_pos,
            "max_pos": max_pos,
            "min_total_alfa": min_total_alfa,
            "max_total_alfa": max_total_alfa,
            "min_latin_american_2_alfa": min_latin_american_2_alfa,
            "max_latin_american_2_alfa": max_latin_american_2_alfa,
            "min_east_asian_alfa": min_east_asian_alfa,
            "max_east_asian_alfa": max_east_asian_alfa,
            "gene": gene,
            "min_dp": min_dp,
        }

        if gatk_pass:
            params["gatk_pass"] = "only"
        if is_dbsnp:
            params["dbsnp"] = "only"
        if chromosome:
            params["chromosome"] = chromosome

        # get the data from the API total count
        total_items = requests.get(f"{API_BASE_URL}/n_variants/", params=params).json()
        # Make request for page data
        data_response = requests.get(f"{API_BASE_URL}/variants/", params=params)
        data_response.raise_for_status()
        raw_data = data_response.json()

        # Parse data into Variant objects
        variants = [Variant(**item) for item in raw_data]
        return variants, total_items, None

    except requests.RequestException as e:
        return [], None, f"API request failed: {str(e)}"
    except ValueError as e:
        return [], None, f"Data validation error: {str(e)}"
    except Exception as e:
        return [], None, f"Unexpected error: {str(e)}"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/data")
def get_data():
    # Get query parameters
    min_dp = request.args.get("min_dp", type=int, default=0)
    chromosome = request.args.get("chromosome", type=str, default="")
    min_pos = request.args.get("min_pos", type=int, default=None)
    max_pos = request.args.get("max_pos", type=int, default=None)
    min_total_alfa = request.args.get("min_total_alfa", type=float, default=None)
    max_total_alfa = request.args.get("max_total_alfa", type=float, default=None)
    min_latin_american_2_alfa = request.args.get(
        "min_latin_american_2_alfa", type=float, default=None
    )
    max_latin_american_2_alfa = request.args.get(
        "max_latin_american_2_alfa", type=float, default=None
    )
    min_east_asian_alfa = request.args.get(
        "min_east_asian_alfa", type=float, default=None
    )
    max_east_asian_alfa = request.args.get(
        "max_east_asian_alfa", type=float, default=None
    )
    gatk_pass = request.args.get("gatk_pass", type=int, default=0)
    is_dbsnp = request.args.get("is_dbsnp", type=int, default=0)
    gene = request.args.get("gene", type=str, default="")
    page = request.args.get("page", type=int, default=1)
    per_page = request.args.get("per_page", type=int, default=10)

    # Fetch and process data
    variants, total_items, error = fetch_variant_data(
        min_dp=min_dp,
        chromosome=chromosome,
        min_pos=min_pos,
        max_pos=max_pos,
        min_total_alfa=min_total_alfa,
        max_total_alfa=max_total_alfa,
        min_latin_american_2_alfa=min_latin_american_2_alfa,
        max_latin_american_2_alfa=max_latin_american_2_alfa,
        min_east_asian_alfa=min_east_asian_alfa,
        max_east_asian_alfa=max_east_asian_alfa,
        gatk_pass=gatk_pass,
        is_dbsnp=is_dbsnp,
        gene=gene,
        page=page,
        per_page=per_page,
    )

    if error:
        return jsonify({"error": error}), 500

    total_pages = math.ceil(total_items / per_page)

    try:
        response = PaginatedVariantResponse(
            items=variants,
            total=total_items,
            page=page,
            per_page=per_page,
            total_pages=total_pages,
        )
        return jsonify(response.model_dump())
    except Exception as e:
        return jsonify({"error": f"Response creation error: {str(e)}"}), 400


if __name__ == "__main__":
    app.run(debug=True)
