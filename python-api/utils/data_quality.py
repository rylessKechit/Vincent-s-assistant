# utils/data_quality.py
from typing import Any, Dict
import pandas as pd


class DataQualityAssessor:
    async def assess_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        total_cells = df.shape[0] * df.shape[1]
        null_cells = df.isnull().sum().sum()
        
        completeness = 1 - (null_cells / total_cells)
        
        return {
            "overall_score": round(completeness * 100, 2),
            "completeness": round(completeness * 100, 2),
            "null_percentage": round((null_cells / total_cells) * 100, 2),
            "recommendations": [
                "Données complètes" if completeness > 0.95 else "Vérifier les valeurs manquantes",
                f"Dataset de {df.shape[0]} lignes analysé avec succès"
            ]
        }