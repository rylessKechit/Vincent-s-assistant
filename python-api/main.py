"""
API Python pour l'analyse de données intelligente
Version RENFORCÉE avec validation stricte - Compatible 100% avec l'existant
"""

import os
import sys
import time
from typing import Dict, Any, List, Union, Optional
from contextlib import asynccontextmanager

# Configuration des logs en premier
from loguru import logger
logger.remove()
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logger.add(sys.stdout, level=log_level, format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | {message}")

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

# Models Pydantic pour validation (IDENTIQUES à l'existant)
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
    error: Optional[str] = None

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
    error: Optional[str] = None

# Initialisation des services
extractor = CSVExtractor()
analyzer = DataAnalyzer()
classifier = QueryClassifier()
quality_checker = QualityChecker()

# Fonction de validation renforcée
def validate_extraction_result(extraction_result: Dict[str, Any], step: str) -> None:
    """Validation stricte des résultats d'extraction"""
    if not extraction_result:
        raise ValueError(f"Résultat d'extraction vide à l'étape: {step}")
    
    if not extraction_result.get('success', False):
        error_msg = extraction_result.get('error', 'Erreur inconnue')
        raise ValueError(f"Échec extraction à l'étape {step}: {error_msg}")
    
    if 'dataframe_data' not in extraction_result:
        raise ValueError(f"dataframe_data manquant à l'étape: {step}")
    
    dataframe_data = extraction_result['dataframe_data']
    if not dataframe_data or not isinstance(dataframe_data, dict):
        raise ValueError(f"dataframe_data invalide à l'étape: {step}")
    
    if not dataframe_data.get('data') or not dataframe_data.get('columns'):
        raise ValueError(f"Données DataFrame incomplètes à l'étape: {step}")
    
    logger.success(f"✅ Validation réussie: {step}")

def validate_analysis_result(analysis_result: Dict[str, Any], step: str) -> None:
    """Validation des résultats d'analyse"""
    if not analysis_result or not isinstance(analysis_result, dict):
        raise ValueError(f"Résultat d'analyse invalide à l'étape: {step}")
    
    logger.success(f"✅ Validation analyse réussie: {step}")

# Lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Démarrage de l'API Python RENFORCÉE...")
    
    try:
        # Vérification des services
        if not extractor.is_ready():
            raise Exception("Service Extractor non prêt")
        
        if not analyzer.is_ready():
            raise Exception("Service Analyzer non prêt")
        
        if not quality_checker.is_ready():
            raise Exception("Service QualityChecker non prêt")
        
        # Initialisation des modèles
        await classifier.load_models()
        
        logger.success("✅ API Python RENFORCÉE prête et opérationnelle!")
        
    except Exception as e:
        logger.error(f"❌ Erreur initialisation: {str(e)}")
        raise
    
    yield
    
    logger.info("🛑 Arrêt de l'API Python")

# Application FastAPI
app = FastAPI(
    title="AI-Assistant Python API RENFORCÉE",
    description="API d'analyse de données intelligente avec ML - Version robuste",
    version="1.1.0",
    lifespan=lifespan
)

# Configuration CORS (identique)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier les domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Vérification de la santé de l'API - RENFORCÉE"""
    try:
        services_status = {
            "extractor": extractor.is_ready(),
            "analyzer": analyzer.is_ready(),
            "classifier": classifier.is_ready(),
            "quality_checker": quality_checker.is_ready()
        }
        
        all_healthy = all(services_status.values())
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": time.time(),
            "services": services_status,
            "version": "1.1.0-renforcée"
        }
        
    except Exception as e:
        logger.error(f"Erreur health check: {str(e)}")
        return {
            "status": "unhealthy",
            "timestamp": time.time(),
            "error": str(e)
        }

@app.post("/extract", response_model=ExtractionResponse)
async def extract_and_analyze(file: UploadFile = File(...)):
    """
    Extraction et analyse complète d'un fichier CSV - VERSION RENFORCÉE
    Compatible 100% avec l'existant mais avec validation stricte
    """
    start_time = time.time()
    
    try:
        # ÉTAPE 1: Validation du fichier (renforcée)
        logger.info(f"📥 Validation du fichier: {file.filename}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nom de fichier manquant")
        
        if not file.filename.lower().endswith('.csv'):
            raise HTTPException(status_code=400, detail="Seuls les fichiers CSV sont supportés")
        
        if file.size is None:
            raise HTTPException(status_code=400, detail="Taille de fichier indéterminée")
        
        if file.size == 0:
            raise HTTPException(status_code=400, detail="Fichier vide")
            
        if file.size > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(status_code=400, detail="Fichier trop volumineux (max 50MB)")
        
        # ÉTAPE 2: Lecture du contenu (avec validation)
        logger.info(f"📖 Lecture du contenu: {file.filename} ({file.size} bytes)")
        
        content = await file.read()
        if not content:
            raise HTTPException(status_code=400, detail="Contenu de fichier vide après lecture")
        
        logger.info(f"✅ Contenu lu: {len(content)} bytes")
        
        # ÉTAPE 3: Extraction CSV (avec validation stricte)
        logger.info("📊 Début extraction CSV...")
        
        extraction_result = await extractor.extract_csv(content, file.filename)
        
        # VALIDATION STRICTE de l'extraction
        validate_extraction_result(extraction_result, "Extraction CSV")
        
        dataframe_data = extraction_result['dataframe_data']
        metadata = extraction_result.get('metadata', {})
        
        logger.info(f"✅ Extraction réussie: {dataframe_data['shape']['rows']} lignes × {dataframe_data['shape']['columns']} colonnes")
        
        # ÉTAPE 4: Analyse des données (avec validation)
        logger.info("🧠 Début analyse des données...")
        
        analysis_result = await analyzer.analyze_dataframe(dataframe_data, metadata)
        validate_analysis_result(analysis_result, "Analyse données")
        
        # ÉTAPE 5: Détection des patterns métier (avec validation)
        logger.info("🎯 Détection patterns métier...")
        
        business_patterns = await analyzer.detect_business_patterns(dataframe_data)
        validate_analysis_result(business_patterns, "Détection patterns")
        
        # ÉTAPE 6: Vérification de la qualité (avec validation)
        logger.info("✅ Vérification qualité...")
        
        quality_result = await quality_checker.check_quality(dataframe_data, metadata)
        validate_analysis_result(quality_result, "Vérification qualité")
        
        # ÉTAPE 7: Génération des recommandations (avec validation)
        logger.info("💡 Génération recommandations...")
        
        recommendations = await analyzer.generate_recommendations(dataframe_data, business_patterns)
        if not isinstance(recommendations, list):
            logger.warning("Recommandations non-liste, conversion en liste")
            recommendations = [str(recommendations)] if recommendations else []
        
        processing_time = (time.time() - start_time) * 1000
        
        # ÉTAPE 8: Construction de la réponse finale (avec validation JSON)
        logger.info("📦 Construction réponse finale...")
        
        response_data = {
            "extraction": extraction_result,
            "analysis": analysis_result,
            "quality": quality_result,
            "business_patterns": business_patterns,
            "recommendations": recommendations
        }
        
        # VALIDATION FINALE: Vérifier que la réponse est sérialisable JSON
        try:
            import json
            json.dumps(response_data)
            logger.success("✅ Validation JSON réussie")
        except Exception as json_error:
            logger.error(f"❌ Erreur sérialisation JSON: {str(json_error)}")
            raise HTTPException(status_code=500, detail="Erreur sérialisation des résultats")
        
        logger.success(f"🎉 Analyse complète terminée en {processing_time:.0f}ms")
        
        return ExtractionResponse(
            success=True,
            data=response_data,
            processing_time_ms=processing_time,
            error=None
        )
        
    except HTTPException:
        # Re-lever les HTTPException (erreurs client)
        raise
    
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        error_msg = f"Erreur lors du traitement: {str(e)}"
        logger.error(f"❌ {error_msg}")
        
        return ExtractionResponse(
            success=False,
            data={},
            processing_time_ms=processing_time,
            error=error_msg
        )

@app.post("/classify", response_model=ClassificationResponse)
async def classify_question(request: QueryRequest):
    """
    Classification intelligente d'une question - COMPATIBLE
    """
    start_time = time.time()
    
    try:
        logger.info(f"🧠 Classification question: {request.question[:50]}...")
        
        result = await classifier.classify_question(
            request.question,
            request.available_columns,
            request.context
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.success(f"✅ Classification réussie: {result['type']} (confidence: {result['confidence']:.2f})")
        
        return ClassificationResponse(
            type=result['type'],
            confidence=result['confidence'],
            relevant_columns=result['relevant_columns'],
            suggested_strategy=result['suggested_strategy'],
            processing_time_ms=processing_time
        )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        logger.error(f"❌ Erreur classification: {str(e)}")
        
        # Fallback classification (comme avant)
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
    Calcul d'agrégations intelligentes - COMPATIBLE
    """
    start_time = time.time()
    
    try:
        logger.info(f"📊 Calcul agrégations pour: {request.question[:50]}...")
        
        aggregations = await analyzer.compute_smart_aggregations(
            request.dataframe_data,
            request.question,
            request.aggregation_type
        )
        
        processing_time = (time.time() - start_time) * 1000
        
        logger.success(f"✅ Agrégations calculées en {processing_time:.0f}ms")
        
        return AggregationResponse(
            success=True,
            aggregations=aggregations,
            processing_time_ms=processing_time,
            error=None
        )
        
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        error_msg = f"Erreur agrégations: {str(e)}"
        logger.error(f"❌ {error_msg}")
        
        return AggregationResponse(
            success=False,
            aggregations={},
            processing_time_ms=processing_time,
            error=error_msg
        )

@app.get("/status")
async def get_status():
    """Statut détaillé de l'API - RENFORCÉ"""
    try:
        uptime = time.time()
        
        # Vérification rapide des services
        services_health = {
            "extractor": extractor.is_ready(),
            "analyzer": analyzer.is_ready(),
            "classifier": classifier.is_ready(),
            "quality_checker": quality_checker.is_ready()
        }
        
        return {
            "status": "running",
            "version": "1.1.0-renforcée",
            "uptime": uptime,
            "services_health": services_health,
            "endpoints": {
                "/health": "Vérification santé renforcée",
                "/extract": "Extraction et analyse CSV avec validation stricte",
                "/classify": "Classification de questions",
                "/aggregate": "Calculs d'agrégations"
            }
        }
        
    except Exception as e:
        logger.error(f"Erreur status: {str(e)}")
        return {
            "status": "error",
            "error": str(e)
        }

# Gestion des erreurs globales (RENFORCÉE)
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"❌ Erreur non gérée: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Erreur interne du serveur",
            "detail": str(exc),
            "timestamp": time.time()
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