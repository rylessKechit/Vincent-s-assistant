# services/classifier.py
from typing import Any, Dict


class QueryClassifier:
    def __init__(self):
        self.ready = True
    
    def is_ready(self) -> bool:
        return self.ready
    
    async def load_models(self):
        # Placeholder pour charger des modèles ML
        pass
    
    async def classify_question(self, question: str, available_columns: list, context: dict) -> Dict[str, Any]:
        # Classification simple basée sur des mots-clés
        question_lower = question.lower()
        
        numeric_keywords = ['total', 'somme', 'moyenne', 'maximum', 'minimum', 'top', 'combien']
        semantic_keywords = ['qui', 'analyse', 'compare', 'explique', 'tendance']
        
        if any(keyword in question_lower for keyword in numeric_keywords):
            query_type = 'numeric'
            confidence = 0.8
        elif any(keyword in question_lower for keyword in semantic_keywords):
            query_type = 'semantic'
            confidence = 0.7
        else:
            query_type = 'hybrid'
            confidence = 0.6
        
        # Identifier les colonnes pertinentes
        relevant_columns = []
        for col in available_columns:
            if any(word in col.lower() for word in question_lower.split()):
                relevant_columns.append(col)
        
        return {
            'type': query_type,
            'confidence': confidence,
            'relevant_columns': relevant_columns[:3],  # Max 3 colonnes
            'suggested_strategy': f"Utiliser une approche {query_type} avec focus sur {len(relevant_columns)} colonnes"
        }