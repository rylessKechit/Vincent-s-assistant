"""
API Python pour l'analyse de données intelligente
Version corrigée pour éliminer les problèmes de sérialisation
"""

import os
import sys
import time
from typing import Dict, Any, List, Union
from contextlib import asynccontextmanager

# Configuration des logs en premier
from loguru import logger
logger.remove()
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger.add(sys.stdout, level=log_level)

# Imports FastAPI
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Imports des services
from services.extractor import CSVExtractor
from services.analyzer import DataAnalyzer
from services.classifier import QueryClassifier
from services.quality import QualityChecker

# Models Pydantic pour validation
class QueryRequest(BaseModel):
    question: str
    available_columns: List[str]
    context: Dict[str, Any] = {}

class AggregationRequest(BaseModel):
    question: str
    dataframe_data: Dict[str, Any]
    aggregation_type: str = "smart"

class ExtractionResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    processing_time_ms: float
    error: str = None

class ClassificationResponse(BaseModel):
    type: str
    confidence: float
    relevant_columns: List[str]
    suggested_strategy: str
    processing_time_ms: float

class AggregationResponse(BaseModel):
    success: bool
    aggregations: Dict[str, Any]
    processing_time_ms: float
    error: str = None

# Initialisation des services
extractor = CSVExtractor()
analyzer = DataAnalyzer()
classifier = QueryClassifier()
quality_checker = QualityChecker()

# Lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Démarrage de l'API Python...")
    
    # Initialisation des services
    await classifier.load_models()
    
    logger.success("✅ API Python prête !")
    yield
    logger.info("🛑 Arrêt de l'API Python")

# Application FastAPI
app = FastAPI(
    title="AI-Assistant Python API",
    description="API d'analyse de données intelligente avec ML",
    version="1.0.0",
    lifespan=lifespan
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier les domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Vérification de la santé de l'API"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "extractor": extractor.is_ready(),
            "analyzer": analyzer.is_ready(),
            "classifier": classifier.is_ready(),
            "quality_checker": quality_checker.is_ready()
        }
    }

@app.post("/extract", response_model=ExtractionResponse)
async def extract_and_analyze(file: UploadFile = File(...)):
    """
    Extraction et analyse complète d'un fichier CSV
    """
    start_time = time.time()
    
    try:
        # Validation du fichier
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="Seuls les fichiers CSV sont supportés")
        
        if file.size and file.size > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 50MB)")
        
        # Lecture du contenu
        content = await file.read()
        logger.info(f"Fichier reçu: {file.filename} ({len(content)} bytes)")
        
        # 1. Extraction CSV
        logger.info("📊 Début extraction CSV...")
        extraction_result = await extractor.extract_csv(content, file.filename)
        
        if not extraction_result.get('success', False):
            error_msg = "Erreur lors de l'extraction CSV"
            logger.error(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Vérifier que dataframe_data existe
        if 'dataframe_data' not in extraction_result:
            error_msg = "Données DataFrame manquantes dans l'extraction"
            logger.error(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
        dataframe_data = extraction_result['dataframe_data']
        metadata = extraction_result.get('metadata', {})
        
        # 2. Analyse des données (utiliser dataframe_data au lieu du DataFrame brut)
        logger.info("🧠 Début analyse des données...")
        analysis_result = await analyzer.analyze_dataframe(dataframe_data, metadata)
        
        # 3. Détection des patterns métier
        logger.info("🎯 Détection patterns métier...")
        business_patterns = await analyzer.detect_business_patterns(dataframe_data)
        
        # 4. Vérification de la qualité
        logger.info("✅ Vérification qualité...")
        quality_result = await quality_checker.check_quality(dataframe_data, metadata)
        
        # 5. Génération des recommandations
        logger.info("💡 Génération recommandations...")
        recommendations = await analyzer.generate_recommendations(dataframe_data, business_patterns)
        
        processing_time = (time.time() - start_time) * 1000
        
        # Construire la réponse finale (tout en format JSON-safe)
        response_data = {
            "extraction": extraction_result,
            "analysis": analysis_result,
            "quality": quality_result,
            "business_patterns": business_patterns,
            "recommendations": recommendations
        }
        
        logger.success(f"✅ Analyse terminée en {processing_time:.0f}ms")
        
        return ExtractionResponse(
            success=True,
            data=response_data,
            processing_time_ms=processing_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        error_msg = f"Erreur lors du traitement: {str(e)}"
        logger.error(error_msg)
        
        return ExtractionResponse(
            success=False,
            data={},
            processing_time_ms=processing_time,
            error=error_msg
        )

@app.post("/classify", response_model=ClassificationResponse)
async def classify_question(request: QueryRequest):
    """
    Classification intelligente d'une question
    """
    start_time = time.time()
    
    try:
        result = await classifier.classify_question(
            request.question,
            request.available_columns,
            request.context
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return ClassificationResponse(
            type=result['type'],
            confidence=result['confidence'],
            relevant_columns=result['relevant_columns'],
            suggested_strategy=result['suggested_strategy'],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        logger.error(f"Erreur classification: {str(e)}")
        
        # Fallback classification
        return ClassificationResponse(
            type="semantic",
            confidence=0.5,
            relevant_columns=[],
            suggested_strategy="Classification par défaut (erreur)",
            processing_time_ms=processing_time
        )

@app.post("/aggregate", response_model=AggregationResponse)
async def compute_aggregations(request: AggregationRequest):
    """
    Calcul d'agrégations intelligentes
    """
    start_time = time.time()
    
    try:
        aggregations = await analyzer.compute_smart_aggregations(
            request.dataframe_data,
            request.question,
            request.aggregation_type
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        return AggregationResponse(
            success=True,
            aggregations=aggregations,
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        error_msg = f"Erreur agrégations: {str(e)}"
        logger.error(error_msg)
        
        return AggregationResponse(
            success=False,
            aggregations={},
            processing_time_ms=processing_time,
            error=error_msg
        )

@app.get("/status")
async def get_status():
    """Statut détaillé de l'API"""
    return {
        "status": "running",
        "version": "1.0.0",
        "uptime": time.time(),
        "endpoints": {
            "/health": "Vérification santé",
            "/extract": "Extraction et analyse CSV",
            "/classify": "Classification de questions",
            "/aggregate": "Calculs d'agrégations"
        }
    }

# Gestion des erreurs globales
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Erreur non gérée: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Erreur interne du serveur",
            "detail": str(exc)
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )