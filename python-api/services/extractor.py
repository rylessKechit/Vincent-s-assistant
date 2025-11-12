"""
Service d'extraction CSV avancé avec Pandas - Version Corrigée
Parsing intelligent et détection automatique des types
"""

import pandas as pd
import numpy as np
import io
from typing import Dict, Any, List, Optional
from loguru import logger
import chardet

class CSVExtractor:
    """Extracteur CSV intelligent avec Pandas"""
    
    def __init__(self):
        self.ready = True
    
    def is_ready(self) -> bool:
        return self.ready
    
    async def extract_csv(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Extraction avancée d'un CSV avec détection automatique
        
        Returns:
            Dict contenant:
            - dataframe_data: Données du DataFrame sous forme de dict
            - metadata: Métadonnées d'extraction
            - column_types: Types détectés par colonne
            - sample_data: Échantillon des données
        """
        try:
            # 1. Détection de l'encodage
            encoding_result = chardet.detect(content)
            encoding = encoding_result.get('encoding', 'utf-8')
            logger.info(f"Encodage détecté: {encoding}")
            
            # 2. Conversion en string
            csv_string = content.decode(encoding)
            
            # 3. Détection automatique du séparateur
            separator = self._detect_separator(csv_string)
            logger.info(f"Séparateur détecté: '{separator}'")
            
            # 4. Parsing avec Pandas (configuration optimisée)
            df = pd.read_csv(
                io.StringIO(csv_string),
                sep=separator,
                encoding=encoding,
                # Optimisations pour performance
                low_memory=False,
                # Détection automatique des types
                infer_datetime_format=True,
                parse_dates=True,
                # Gestion des valeurs manquantes
                na_values=['', ' ', 'NA', 'N/A', 'NULL', 'null', '-', 'Exit Employee'],
                keep_default_na=True
            )
            
            logger.info(f"DataFrame créé: {df.shape[0]} lignes × {df.shape[1]} colonnes")
            
            # 5. Nettoyage et optimisation
            df = self._clean_dataframe(df)
            
            # 6. Détection intelligente des types de colonnes
            column_types = self._detect_column_types(df)
            
            # 7. Optimisation des types pour performance
            df = self._optimize_dtypes(df, column_types)
            
            # 8. Génération des métadonnées
            metadata = self._generate_metadata(df, filename, encoding, separator)
            
            # 9. Échantillon pour preview
            sample_data = self._generate_sample(df)
            
            # 10. Convertir le DataFrame en format sérialisable
            dataframe_data = self._serialize_dataframe(df)
            
            return {
                "success": True,
                "dataframe_data": dataframe_data,  # ✅ Sérialisable
                "metadata": metadata,
                "column_types": column_types,
                "sample_data": sample_data
            }
            
        except Exception as e:
            logger.error(f"Erreur extraction CSV: {str(e)}")
            raise Exception(f"Impossible d'extraire le CSV: {str(e)}")
    
    def _serialize_dataframe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Convertit le DataFrame en format sérialisable JSON"""
        try:
            # Remplacer NaN par None pour JSON
            df_clean = df.replace({np.nan: None})
            
            return {
                "columns": list(df.columns),
                "data": df_clean.to_dict('records'),  # Liste de dict pour chaque ligne
                "shape": {"rows": len(df), "columns": len(df.columns)},
                "dtypes": df.dtypes.astype(str).to_dict()
            }
        except Exception as e:
            logger.error(f"Erreur sérialisation DataFrame: {str(e)}")
            return {
                "columns": [],
                "data": [],
                "shape": {"rows": 0, "columns": 0},
                "dtypes": {},
                "error": str(e)
            }
    
    def _detect_separator(self, csv_string: str) -> str:
        """Détection automatique du séparateur CSV"""
        lines = csv_string.split('\n')[:5]  # Analyser les 5 premières lignes
        
        separators = [',', ';', '\t', '|']
        scores = {}
        
        for sep in separators:
            scores[sep] = 0
            for line in lines:
                if line.strip():
                    parts = line.split(sep)
                    if len(parts) > 1:
                        scores[sep] += len(parts)
        
        # Retourner le séparateur avec le meilleur score
        best_sep = max(scores, key=scores.get) if scores else ','
        return best_sep
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Nettoyage et préparation du DataFrame"""
        # Supprimer les lignes complètement vides
        df = df.dropna(how='all')
        
        # Nettoyer les noms de colonnes
        df.columns = df.columns.astype(str).str.strip()
        
        # Supprimer les colonnes vides
        df = df.dropna(axis=1, how='all')
        
        # Nettoyer les cellules texte (espaces)
        string_columns = df.select_dtypes(include=['object']).columns
        df[string_columns] = df[string_columns].apply(lambda x: x.astype(str).str.strip())
        
        return df
    
    def _detect_column_types(self, df: pd.DataFrame) -> Dict[str, str]:
        """Détection intelligente des types de colonnes"""
        column_types = {}
        
        for column in df.columns:
            series = df[column].dropna()
            
            if len(series) == 0:
                column_types[column] = 'empty'
                continue
            
            # Vérifier si c'est un ID (patterns spécifiques SIXT)
            if self._is_id_column(column, series):
                column_types[column] = 'id'
            # Vérifier si c'est une devise/montant
            elif self._is_currency_column(column, series):
                column_types[column] = 'currency'
            # Vérifier si c'est un pourcentage
            elif self._is_percentage_column(column, series):
                column_types[column] = 'percentage'
            # Vérifier si c'est un nombre entier
            elif self._is_integer_column(series):
                column_types[column] = 'integer'
            # Vérifier si c'est un nombre décimal
            elif self._is_float_column(series):
                column_types[column] = 'float'
            # Vérifier si c'est une date
            elif self._is_date_column(series):
                column_types[column] = 'date'
            # Vérifier si c'est catégoriel
            elif self._is_categorical_column(series):
                column_types[column] = 'categorical'
            else:
                column_types[column] = 'text'
        
        return column_types
    
    def _is_id_column(self, column_name: str, series: pd.Series) -> bool:
        """Détecte si c'est une colonne d'identifiant"""
        # Patterns SIXT pour les IDs agents
        id_patterns = ['agent', 'id', 'employee']
        name_lower = column_name.lower()
        
        # Vérifier le nom
        if any(pattern in name_lower for pattern in id_patterns):
            return True
        
        # Vérifier le format des valeurs (ex: 9000100914 - Sean Boucart)
        sample_values = series.head(10).astype(str)
        id_format_count = sum(1 for val in sample_values if ' - ' in val and val.split(' - ')[0].isdigit())
        
        return id_format_count / len(sample_values) > 0.5
    
    def _is_currency_column(self, column_name: str, series: pd.Series) -> bool:
        """Détecte si c'est une colonne de devise"""
        # Patterns pour devises
        currency_patterns = ['revenue', 'package ir', 'montant', 'price', 'cost']
        name_lower = column_name.lower()
        
        if any(pattern in name_lower for pattern in currency_patterns):
            return True
        
        # Vérifier le format (ex: 79,621.85 ou "79,621.85")
        sample_values = series.head(20).astype(str)
        currency_format_count = 0
        
        for val in sample_values:
            val_clean = val.replace(',', '').replace('"', '').strip()
            try:
                float(val_clean)
                currency_format_count += 1
            except:
                pass
        
        return currency_format_count / len(sample_values) > 0.7
    
    def _is_percentage_column(self, column_name: str, series: pd.Series) -> bool:
        """Détecte si c'est une colonne de pourcentage"""
        name_lower = column_name.lower()
        
        # Vérifier le nom
        if '%' in column_name or 'share' in name_lower or 'rate' in name_lower:
            return True
        
        # Vérifier le format des valeurs
        sample_values = series.head(10).astype(str)
        percentage_count = sum(1 for val in sample_values if '%' in val)
        
        return percentage_count / len(sample_values) > 0.5
    
    def _is_integer_column(self, series: pd.Series) -> bool:
        """Détecte si c'est une colonne d'entiers"""
        try:
            # Tenter la conversion en entier
            numeric_series = pd.to_numeric(series, errors='coerce')
            
            # Vérifier si tous les nombres sont des entiers
            is_integer = numeric_series.dropna().apply(lambda x: x == int(x))
            return is_integer.all() and len(is_integer) > 0
        except:
            return False
    
    def _is_float_column(self, series: pd.Series) -> bool:
        """Détecte si c'est une colonne de nombres décimaux"""
        try:
            numeric_series = pd.to_numeric(series, errors='coerce')
            return not numeric_series.isna().all()
        except:
            return False
    
    def _is_date_column(self, series: pd.Series) -> bool:
        """Détecte si c'est une colonne de dates"""
        try:
            date_series = pd.to_datetime(series, errors='coerce', infer_datetime_format=True)
            valid_dates = date_series.dropna()
            return len(valid_dates) / len(series) > 0.7
        except:
            return False
    
    def _is_categorical_column(self, series: pd.Series) -> bool:
        """Détecte si c'est une colonne catégorielle"""
        unique_values = series.nunique()
        total_values = len(series)
        
        # Si moins de 20% de valeurs uniques, c'est probablement catégoriel
        return unique_values / total_values < 0.2 and unique_values < 50
    
    def _optimize_dtypes(self, df: pd.DataFrame, column_types: Dict[str, str]) -> pd.DataFrame:
        """Optimise les types de données pour performance"""
        df_optimized = df.copy()
        
        for column, dtype in column_types.items():
            try:
                if dtype == 'integer':
                    df_optimized[column] = pd.to_numeric(df_optimized[column], errors='coerce').astype('Int64')
                elif dtype == 'float':
                    df_optimized[column] = pd.to_numeric(df_optimized[column], errors='coerce')
                elif dtype == 'currency':
                    # Nettoyer et convertir en float
                    df_optimized[column] = df_optimized[column].astype(str).str.replace(',', '').str.replace('"', '')
                    df_optimized[column] = pd.to_numeric(df_optimized[column], errors='coerce')
                elif dtype == 'percentage':
                    # Convertir les pourcentages en décimaux
                    df_optimized[column] = df_optimized[column].astype(str).str.replace('%', '')
                    df_optimized[column] = pd.to_numeric(df_optimized[column], errors='coerce') / 100
                elif dtype == 'categorical':
                    df_optimized[column] = df_optimized[column].astype('category')
                elif dtype == 'date':
                    df_optimized[column] = pd.to_datetime(df_optimized[column], errors='coerce')
            except Exception as e:
                logger.warning(f"Impossible d'optimiser la colonne {column}: {e}")
        
        return df_optimized
    
    def _generate_metadata(self, df: pd.DataFrame, filename: str, encoding: str, separator: str) -> Dict[str, Any]:
        """Génère les métadonnées d'extraction"""
        return {
            "filename": filename,
            "encoding": encoding,
            "separator": separator,
            "shape": {
                "rows": int(len(df)),  # Convertir en int natif Python
                "columns": int(len(df.columns))
            },
            "memory_usage": int(df.memory_usage(deep=True).sum()),
            "columns": list(df.columns),
            "null_counts": {k: int(v) for k, v in df.isnull().sum().to_dict().items()},
            "data_types": {k: str(v) for k, v in df.dtypes.to_dict().items()}
        }
    
    def _generate_sample(self, df: pd.DataFrame, n_rows: int = 5) -> Dict[str, Any]:
        """Génère un échantillon des données"""
        # Remplacer NaN par None pour JSON
        df_clean = df.replace({np.nan: None})
        
        return {
            "head": df_clean.head(n_rows).to_dict('records'),
            "tail": df_clean.tail(n_rows).to_dict('records'),
            "random_sample": df_clean.sample(min(n_rows, len(df))).to_dict('records') if len(df) > 0 else []
        }