"""
API Python FastAPI pour AI-Assistant
Extraction, analyse et compréhension avancée des données
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
from loguru import logger
import sys
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Configuration des logs
logger.remove()
logger.add(sys.stdout, level=os.getenv("LOG_LEVEL", "INFO"))

# Import des services locaux
from services.extractor import CSVExtractor
from services.analyzer import DataAnalyzer
from services.classifier import QueryClassifier
from utils.data_quality import DataQualityAssessor

# Configuration de l'application
app = FastAPI(
    title="AI-Assistant Data API",
    description="API Python spécialisée pour l'extraction et l'analyse de données",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles Pydantic
class AnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    processing_time_ms: float
    error: Optional[str] = None

class QueryClassificationRequest(BaseModel):
    question: str
    available_columns: List[str]
    context: Optional[Dict[str, Any]] = None

class QueryClassificationResponse(BaseModel):
    type: str  # "numeric", "semantic", "hybrid"
    confidence: float
    relevant_columns: List[str]
    suggested_strategy: str
    processing_time_ms: float

# Instances des services (initialisées au démarrage)
extractor = CSVExtractor()
analyzer = DataAnalyzer()
classifier = QueryClassifier()
quality_assessor = DataQualityAssessor()

@app.on_event("startup")
async def startup_event():
    """Initialisation des services au démarrage"""
    logger.info("🚀 Démarrage de l'API Python...")
    
    # Charger les modèles ML pré-entraînés
    await classifier.load_models()
    
    logger.info("✅ API Python prête !")

@app.get("/")
async def root():
    """Point d'entrée de l'API"""
    return {
        "message": "🐍 API Python AI-Assistant",
        "version": "1.0.0",
        "status": "operational",
        "services": ["extraction", "analysis", "classification"]
    }

@app.get("/health")
async def health_check():
    """Vérification de santé de l'API"""
    return {
        "status": "healthy",
        "python_version": sys.version,
        "pandas_version": pd.__version__,
        "numpy_version": np.__version__,
        "services_ready": {
            "extractor": extractor.is_ready(),
            "analyzer": analyzer.is_ready(), 
            "classifier": classifier.is_ready()
        }
    }

@app.post("/extract", response_model=AnalysisResponse)
async def extract_and_analyze_file(
    file: UploadFile = File(..., description="Fichier à analyser (CSV priorité)")
):
    """
    Extraction et analyse avancée d'un fichier
    
    Processus:
    1. Parsing intelligent avec Pandas
    2. Détection automatique des types de colonnes
    3. Analyse de qualité des données
    4. Calcul d'agrégations avancées
    5. Détection de patterns métier
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(f"📁 Analyse du fichier: {file.filename}")
        
        # Validation de base
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(
                status_code=400, 
                detail="Seuls les fichiers CSV sont supportés actuellement"
            )
        
        if file.size > int(os.getenv("MAX_FILE_SIZE", 52428800)):
            raise HTTPException(
                status_code=413,
                detail="Fichier trop volumineux (max 50MB)"
            )
        
        # Lire le contenu du fichier
        content = await file.read()
        
        # 1. Extraction avec Pandas
        logger.info("🔄 Extraction avec Pandas...")
        extraction_result = await extractor.extract_csv(content, file.filename)
        
        # 2. Analyse avancée
        logger.info("🔄 Analyse statistique...")
        analysis_result = await analyzer.analyze_dataframe(
            extraction_result["dataframe"],
            extraction_result["metadata"]
        )
        
        # 3. Évaluation qualité
        logger.info("🔄 Évaluation qualité...")
        quality_score = await quality_assessor.assess_quality(
            extraction_result["dataframe"]
        )
        
        # 4. Détection patterns métier (spécialisé SIXT)
        logger.info("🔄 Détection patterns métier...")
        business_patterns = await analyzer.detect_business_patterns(
            extraction_result["dataframe"]
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        response_data = {
            "extraction": extraction_result,
            "analysis": analysis_result,
            "quality": quality_score,
            "business_patterns": business_patterns,
            "recommendations": await analyzer.generate_recommendations(
                extraction_result["dataframe"], business_patterns
            )
        }
        
        logger.success(f"✅ Analyse terminée en {processing_time:.0f}ms")
        
        return AnalysisResponse(
            success=True,
            data=response_data,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        logger.error(f"❌ Erreur analyse: {str(e)}")
        
        return AnalysisResponse(
            success=False,
            data={},
            processing_time_ms=processing_time,
            error=str(e)
        )

@app.post("/classify", response_model=QueryClassificationResponse)
async def classify_query(request: QueryClassificationRequest):
    """
    Classification intelligente des questions avec ML
    
    Détermine:
    - Type: numeric, semantic, hybrid
    - Colonnes pertinentes
    - Stratégie de réponse optimale
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(f"🧠 Classification: {request.question[:50]}...")
        
        classification_result = await classifier.classify_question(
            question=request.question,
            available_columns=request.available_columns,
            context=request.context or {}
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return QueryClassificationResponse(
            **classification_result,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        logger.error(f"❌ Erreur classification: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/aggregate")
async def compute_advanced_aggregations(
    question: str,
    dataframe_data: Dict[str, Any],
    aggregation_type: str = "smart"
):
    """
    Calculs d'agrégations avancées basées sur la question
    
    Types:
    - smart: Détection automatique des agrégations pertinentes
    - statistical: Analyses statistiques poussées
    - business: Métriques métier spécialisées
    """
    import time
    start_time = time.time()
    
    try:
        logger.info(f"📊 Agrégations {aggregation_type} pour: {question[:50]}...")
        
        # Reconstituer le DataFrame depuis les données
        df = pd.DataFrame(dataframe_data)
        
        # Calculs d'agrégations intelligentes
        aggregations = await analyzer.compute_smart_aggregations(
            dataframe=df,
            question=question,
            aggregation_type=aggregation_type
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "aggregations": aggregations,
            "processing_time_ms": processing_time
        }
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        logger.error(f"❌ Erreur agrégations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000)),
        reload=os.getenv("DEBUG", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )