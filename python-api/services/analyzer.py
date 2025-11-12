# services/analyzer.py
import pandas as pd
from typing import Dict, Any

class DataAnalyzer:
    def __init__(self):
        self.ready = True
    
    def is_ready(self) -> bool:
        return self.ready
    
    async def analyze_dataframe(self, df: pd.DataFrame, metadata: Dict) -> Dict[str, Any]:
        return {
            "basic_stats": df.describe().to_dict(),
            "correlations": df.corr().to_dict() if df.select_dtypes(include=['number']).shape[1] > 1 else {},
            "null_analysis": df.isnull().sum().to_dict()
        }
    
    async def detect_business_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        patterns = {}
        
        # Détecter les agents Exit Employee
        if any('agent' in col.lower() for col in df.columns):
            agent_col = [col for col in df.columns if 'agent' in col.lower()][0]
            exit_employees = df[df[agent_col].astype(str).str.contains('Exit Employee', na=False)]
            patterns['exit_employees'] = {
                'count': len(exit_employees),
                'percentage': len(exit_employees) / len(df) * 100
            }
        
        return patterns
    
    async def generate_recommendations(self, df: pd.DataFrame, patterns: Dict) -> Dict[str, Any]:
        return {
            "data_quality": "Bon" if df.isnull().sum().sum() < len(df) * 0.1 else "Attention aux valeurs manquantes",
            "size": "Approprié" if len(df) < 10000 else "Gros dataset - optimiser les requêtes"
        }
    
    async def compute_smart_aggregations(self, dataframe: pd.DataFrame, question: str, aggregation_type: str) -> Dict:
        # Agrégations intelligentes basées sur la question
        numeric_cols = dataframe.select_dtypes(include=['number']).columns
        
        if 'total' in question.lower() and len(numeric_cols) > 0:
            return {col: dataframe[col].sum() for col in numeric_cols}
        elif 'moyenne' in question.lower() and len(numeric_cols) > 0:
            return {col: dataframe[col].mean() for col in numeric_cols}
        else:
            return {"message": "Agrégations de base", "shape": dataframe.shape}