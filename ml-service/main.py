"""
CIIRS (Circular Industrial & Institutional Resource Sharing) - Optimization & Matching Engine
==============================================================================================
Standalone Operations Research (OR) microservice for optimal two-sided bipartite matching
between waste suppliers/listings and circular economy recycling startups.

Architectural Overview:
-----------------------
Rather than relying on non-deterministic Large Language Models (LLMs) with high latency,
variable costs, and hallucinations, this microservice formulates supplier-to-buyer matching
as a classical Maximum Weight Bipartite Matching problem solved via the Kuhn-Munkres
(Hungarian) algorithm / modified Jonker-Volgenant shortest augmenting path method implemented
in `scipy.optimize.linear_sum_assignment`.

Key Mathematical Components:
----------------------------
1. Distance Metric:
   Calculates great-circle surface distance between geographic coordinates (lat, lng) using
   the Haversine formula (Earth mean radius R = 6,371 km).
   
2. Pairwise Objective / Score Function S(i, j):
   S(i, j) = Base_Compatibility(i, j) - Distance_Penalty(i, j) - Capacity_Penalty(i, j)
   - Base Compatibility: High positive utility if startup j explicitly requires wasteType i.
     Heavily penalized with a prohibitive negative weight if incompatible.
   - Distance Penalty: Linear transportation penalty proportional to transit distance (km).
   - Capacity Penalty: Penalty incurred when listing quantity (kg) exceeds startup intake capacity.

3. Global Welfare Optimization:
   Maximizes total societal compatibility sum(S(i, pi(i))) by transforming to a cost matrix:
   Cost(i, j) = -S(i, j)
   and solving:
   min sum(Cost(i, pi(i))) subject to one-to-one assignment constraints.
   
4. Threshold Pruning:
   The Hungarian algorithm enforces min(|Listings|, |Startups|) assignments even when
   pairings are fundamentally unviable. Infeasible pairings (e.g., mismatching materials,
   prohibitive transit distances, negative utility) are eliminated via a minimum score cutoff.
"""

import os
import math
from typing import Dict, List, Optional
import numpy as np
import pandas as pd
import joblib
from scipy.optimize import linear_sum_assignment
from pydantic import BaseModel, Field
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="CIIRS Matching & Optimization Microservice",
    description="Operations Research bipartite matching and allocation engine for B2B waste exchange.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Scoring Constants & Hyperparameters
# ---------------------------------------------------------------------------
BASE_MATCH_SCORE: float = 100.0          # Base score awarded when waste types match
INCOMPATIBLE_PENALTY: float = 2000.0     # Severe penalty for mismatched material categories
DISTANCE_PENALTY_PER_KM: float = 0.5     # Utility deduction per km of transit (e.g. 50km = 25 pts)
CAPACITY_EXCESS_BASE_PENALTY: float = 20.0 # Base penalty if quantity exceeds capacity
CAPACITY_EXCESS_SCALE_PENALTY: float = 40.0 # Scaled penalty relative to percentage of capacity excess
MIN_SCORE_THRESHOLD: float = 25.0        # Minimum score required for an assignment to be viable


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class Listing(BaseModel):
    """
    Waste listing supplied by an institution, enterprise, or community entity.
    """
    id: str = Field(..., description="Unique identifier for the waste listing")
    wasteType: str = Field(..., description="Category of waste (e.g., 'plastic', 'organic', 'electronic')")
    quantityKg: float = Field(..., gt=0, description="Available quantity of waste in kilograms")
    grade: Optional[str] = Field(None, description="Quality grade of the material (e.g., 'A', 'B', 'C')")
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate of the pickup location")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate of the pickup location")


class Startup(BaseModel):
    """
    Recycling/upcycling startup or processing facility seeking feedstock.
    """
    id: str = Field(..., description="Unique identifier for the recycling startup")
    wasteTypesNeeded: List[str] = Field(
        ..., description="List of accepted waste material types"
    )
    lat: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate of processing plant/facility")
    lng: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate of processing plant/facility")
    capacityKg: float = Field(..., gt=0, description="Intake capacity limit in kilograms")


class MatchRequest(BaseModel):
    """
    Input payload containing lists of candidate listings and purchasing startups.
    """
    listings: List[Listing] = Field(..., description="Active waste supply listings to match")
    startups: List[Startup] = Field(..., description="Active buyer/startup profiles available for matching")


class Assignment(BaseModel):
    """
    A single globally optimized pairing between a listing and a startup.
    """
    listingId: str = Field(..., description="Matched listing identifier")
    startupId: str = Field(..., description="Matched startup identifier")
    score: float = Field(..., description="Computed compatibility score (higher is better)")


class MatchResponse(BaseModel):
    """
    Optimal assignment output filtered by minimum viability threshold.
    """
    assignments: List[Assignment] = Field(..., description="List of globally optimal matched pairs")


class PricePredictionRequest(BaseModel):
    """
    Input payload for waste price-per-kg prediction.
    """
    wasteType: str = Field(
        ...,
        description="Category of waste (e.g., 'organic-flowers', 'food-waste', 'plastic', 'textile', 'e-waste', 'paper', 'metal')",
    )
    quantityKg: float = Field(..., gt=0, description="Quantity of waste available in kilograms")
    grade: str = Field(..., description="Quality grade: 'A', 'B', or 'C'")
    contaminationLevel: str = Field(
        ..., description="Contamination rating: 'none', 'low', 'medium', or 'high'"
    )


class PricePredictionResponse(BaseModel):
    """
    Price prediction output containing the predicted price-per-kg and model feature importances.
    """
    predictedPricePerKg: float = Field(..., description="Predicted price in INR per kg")
    featureImportances: Dict[str, float] = Field(
        ..., description="Relative feature importances extracted from the trained Random Forest model"
    )


# ---------------------------------------------------------------------------
# Core Operations Research & Geodesic Algorithms
# ---------------------------------------------------------------------------
def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes the great-circle geodesic distance between two points on the Earth's surface
    using the Haversine trigonometric formula.

    Formula:
        a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
        c = 2 * atan2(√a, √(1−a))
        d = R * c
    Where:
        φ = latitude in radians, λ = longitude in radians, R = Earth radius (6,371 km).
    """
    R = 6371.0  # Earth's radius in kilometers

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # Clamp to [0.0, 1.0] to safeguard against floating-point precision domain errors
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def compute_pair_score(listing: Listing, startup: Startup) -> float:
    """
    Evaluates multi-objective utility for assigning a specific waste listing to a startup.

    Objective components:
    1. Material Compatibility:
       - Match found: Base score of +100.
       - Match absent: Heavily penalized (-2000) to ensure the optimization solver
         strictly avoids pairing incompatible material streams.
    2. Distance Decay:
       - Linear decay based on Haversine travel distance. Minimizes logistics costs,
         haulage carbon emissions, and transit delays.
    3. Capacity Constraints:
       - If listing quantity exceeds the startup's capacity, a tiered penalty is applied
         (base deduction + proportional excess penalty).
    4. Material Grade Quality Bonus (Optional refinement):
       - High grade materials receive a minor positive bonus to prioritize prime streams.
    """
    # Normalize strings for robust matching
    listing_type = listing.wasteType.strip().lower()
    accepted_types = {w.strip().lower() for w in startup.wasteTypesNeeded}

    is_compatible = listing_type in accepted_types

    if not is_compatible:
        # Material incompatibility is an immediate disqualifier
        return -INCOMPATIBLE_PENALTY

    # 1. Base compatibility score with grade adjustment
    score = BASE_MATCH_SCORE
    if listing.grade:
        grade_upper = listing.grade.strip().upper()
        if grade_upper == "A":
            score += 10.0
        elif grade_upper == "B":
            score += 5.0

    # 2. Haversine distance penalty
    distance_km = calculate_haversine_distance_km(
        listing.lat, listing.lng, startup.lat, startup.lng
    )
    distance_penalty = distance_km * DISTANCE_PENALTY_PER_KM
    score -= distance_penalty

    # 3. Capacity overload penalty
    if listing.quantityKg > startup.capacityKg:
        excess_kg = listing.quantityKg - startup.capacityKg
        excess_ratio = excess_kg / startup.capacityKg
        capacity_penalty = (
            CAPACITY_EXCESS_BASE_PENALTY
            + (excess_ratio * CAPACITY_EXCESS_SCALE_PENALTY)
        )
        score -= capacity_penalty

    return score


# ---------------------------------------------------------------------------
# Machine Learning Model & Preprocessor Artifacts (Loaded at Startup)
# ---------------------------------------------------------------------------
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE_PATH = os.path.join(_BASE_DIR, "model.pkl")
ENCODER_FILE_PATH = os.path.join(_BASE_DIR, "encoder.pkl")

CATEGORICAL_FEATURES = ["wasteType", "grade", "contaminationLevel"]
NUMERICAL_FEATURES = ["quantityKg"]

model = None
encoder = None
feature_importances: Dict[str, float] = {}

if os.path.exists(MODEL_FILE_PATH) and os.path.exists(ENCODER_FILE_PATH):
    try:
        model = joblib.load(MODEL_FILE_PATH)
        encoder = joblib.load(ENCODER_FILE_PATH)
        cat_feature_names = encoder.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
        all_feature_names = cat_feature_names + NUMERICAL_FEATURES
        feature_importances = {
            name: round(float(imp), 4)
            for name, imp in zip(all_feature_names, model.feature_importances_)
        }
    except Exception as err:
        print(f"[Warning] Failed to load ML artifacts: {err}")


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------
@app.get("/health", status_code=status.HTTP_200_OK, tags=["Monitoring"])
def health_check():
    """
    Liveness and health probe for containerized environments (e.g. Render, Railway, K8s).
    """
    return {
        "status": "healthy",
        "service": "ciirs-matching-service",
        "algorithm": "linear_sum_assignment_hungarian",
        "version": "1.0.0",
    }


@app.post(
    "/predict-price",
    response_model=PricePredictionResponse,
    status_code=status.HTTP_200_OK,
    tags=["Valuation"],
)
def predict_waste_price(request: PricePredictionRequest) -> PricePredictionResponse:
    """
    Accepts { wasteType, quantityKg, grade, contaminationLevel }, encodes the input
    identically to training, runs model.predict(), and returns:
    { predictedPricePerKg: number, featureImportances: {...} }
    """
    if model is None or encoder is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Valuation model artifacts not initialized. Please ensure model.pkl and encoder.pkl exist.",
        )

    clean_waste_type = request.wasteType.strip().lower()
    clean_grade = request.grade.strip().upper()
    clean_contamination = request.contaminationLevel.strip().lower()

    try:
        cat_df = pd.DataFrame(
            [
                {
                    "wasteType": clean_waste_type,
                    "grade": clean_grade,
                    "contaminationLevel": clean_contamination,
                }
            ]
        )
        encoded_cats = encoder.transform(cat_df)
        X = np.hstack([encoded_cats, np.array([[float(request.quantityKg)]])])
        predicted_price = float(model.predict(X)[0])

        return PricePredictionResponse(
            predictedPricePerKg=round(predicted_price, 2),
            featureImportances=feature_importances,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error evaluating price prediction: {str(exc)}",
        )


@app.post("/match", response_model=MatchResponse, status_code=status.HTTP_200_OK, tags=["Optimization"])
def match_listings_to_startups(request: MatchRequest) -> MatchResponse:
    """
    Calculates globally optimal 1-to-1 pairings between listings and startups using
    the Kuhn-Munkres (Hungarian) linear sum assignment algorithm.

    Process:
    1. Validate non-empty supply and demand sets.
    2. Construct an N x M pairwise compatibility score matrix where:
       N = len(listings), M = len(startups).
    3. Transform the maximization problem into a minimization cost matrix:
       Cost(i, j) = -Score(i, j).
    4. Invoke `scipy.optimize.linear_sum_assignment(Cost)` to compute the global
       bipartite matching that maximizes aggregate compatibility.
    5. Filter out infeasible/forced assignments falling below `MIN_SCORE_THRESHOLD`
       to ensure no incompatible or economically non-viable trades are generated.
    """
    listings = request.listings
    startups = request.startups

    # Boundary conditions: if either supply or demand is empty, no pairings can be formed
    if not listings or not startups:
        return MatchResponse(assignments=[])

    num_listings = len(listings)
    num_startups = len(startups)

    # Construct the score matrix of shape (N, M)
    score_matrix = np.zeros((num_listings, num_startups), dtype=np.float64)

    for i in range(num_listings):
        for j in range(num_startups):
            score_matrix[i, j] = compute_pair_score(listings[i], startups[j])

    # Convert maximization problem to cost minimization for linear_sum_assignment:
    # min sum(Cost) <=> max sum(Score)
    cost_matrix = -score_matrix

    # Solve global maximum bipartite matching
    # row_ind corresponds to listing index, col_ind corresponds to assigned startup index
    row_ind, col_ind = linear_sum_assignment(cost_matrix)

    # Filter assignments by threshold to prune artificial/forced matches
    valid_assignments: List[Assignment] = []
    for r, c in zip(row_ind, col_ind):
        pair_score = float(score_matrix[r, c])
        if pair_score >= MIN_SCORE_THRESHOLD:
            valid_assignments.append(
                Assignment(
                    listingId=listings[r].id,
                    startupId=startups[c].id,
                    score=round(pair_score, 2),
                )
            )

    return MatchResponse(assignments=valid_assignments)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
