"""
Service d'extraction CSV avancé avec Pandas - Version RENFORCÉE
Parsing intelligent, détection automatique et validation stricte
"""

import pandas as pd
import numpy as np
import io
from typing import Dict, Any, List, Optional, Tuple
from loguru import logger
import chardet
import json

class CSVExtractor:
    """Extracteur CSV intelligent avec validation renforcée"""
    
    def __init__(self):
        self.ready = True
        self.max_detection_lines = 10  # Lignes pour détection automatique
        self.supported_encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
        
        logger.info("🔧 CSVExtractor initialisé")
    
    def is_ready(self) -> bool:
        return self.ready
    
    async def extract_csv(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Extraction avancée d'un CSV avec validation stricte
        
        Args:
            content: Contenu binaire du fichier
            filename: Nom du fichier
        
        Returns:
            Dict contenant:
            - success: bool
            - dataframe_data: Données sérialisables
            - metadata: Métadonnées d'extraction
            - column_types: Types détectés
            - sample_data: Échantillon
            - error: Message d'erreur si échec
        """
        try:
            logger.info(f"🚀 Début extraction CSV: {filename}")
            
            # ÉTAPE 1: Validation du contenu
            if not content or len(content) == 0:
                raise ValueError("Contenu de fichier vide")
            
            if len(content) < 10:
                raise ValueError("Fichier trop petit pour être un CSV valide")
            
            # ÉTAPE 2: Détection d'encodage robuste
            encoding = self._detect_encoding_robust(content)
            logger.info(f"✅ Encodage détecté: {encoding}")
            
            # ÉTAPE 3: Conversion en string avec gestion d'erreurs
            try:
                csv_string = content.decode(encoding)
            except UnicodeDecodeError as e:
                logger.warning(f"Erreur décodage {encoding}, essai avec 'latin1'")
                csv_string = content.decode('latin1', errors='replace')
                encoding = 'latin1'
            
            # ÉTAPE 4: Validation du contenu CSV
            self._validate_csv_content(csv_string)
            
            # ÉTAPE 5: Détection automatique du séparateur
            separator = self._detect_separator_robust(csv_string)
            logger.info(f"✅ Séparateur détecté: '{separator}'")
            
            # ÉTAPE 6: Parsing Pandas avec gestion d'erreurs
            df = self._parse_with_pandas(csv_string, separator, encoding)
            
            # ÉTAPE 7: Validation du DataFrame
            self._validate_dataframe(df)
            
            logger.info(f"✅ DataFrame créé: {df.shape[0]} lignes × {df.shape[1]} colonnes")
            
            # ÉTAPE 8: Nettoyage et optimisation
            df_cleaned = self._clean_dataframe(df)
            
            # ÉTAPE 9: Détection intelligente des types
            column_types = self._detect_column_types_robust(df_cleaned)
            
            # ÉTAPE 10: Optimisation des types pour performance
            df_optimized = self._optimize_dtypes_safe(df_cleaned, column_types)
            
            # ÉTAPE 11: Génération des métadonnées
            metadata = self._generate_metadata_robust(df_optimized, filename, encoding, separator)
            
            # ÉTAPE 12: Échantillon pour preview
            sample_data = self._generate_sample_safe(df_optimized)
            
            # ÉTAPE 13: Sérialisation sécurisée
            dataframe_data = self._serialize_dataframe_safe(df_optimized)
            
            # ÉTAPE 14: Validation finale
            self._validate_final_result(dataframe_data, metadata, sample_data)
            
            logger.success(f"🎉 Extraction CSV réussie pour {filename}")
            
            return {
                "success": True,
                "dataframe_data": dataframe_data,
                "metadata": metadata,
                "column_types": column_types,
                "sample_data": sample_data,
                "error": None
            }
            
        except Exception as e:
            error_msg = f"Erreur extraction CSV {filename}: {str(e)}"
            logger.error(f"❌ {error_msg}")
            
            return {
                "success": False,
                "dataframe_data": {},
                "metadata": {},
                "column_types": {},
                "sample_data": {},
                "error": error_msg
            }
    
    def _detect_encoding_robust(self, content: bytes) -> str:
        """Détection d'encodage robuste avec fallbacks"""
        try:
            # Essayer chardet d'abord
            detection = chardet.detect(content[:10000])  # Premier 10KB
            if detection and detection.get('encoding'):
                encoding = detection['encoding']
                confidence = detection.get('confidence', 0)
                
                if confidence > 0.7:
                    logger.info(f"Encodage chardet: {encoding} (confidence: {confidence:.2f})")
                    return encoding
            
            # Fallback: essayer les encodages courants
            for encoding in self.supported_encodings:
                try:
                    content.decode(encoding)
                    logger.info(f"Encodage fallback trouvé: {encoding}")
                    return encoding
                except UnicodeDecodeError:
                    continue
            
            # Dernier recours
            logger.warning("Utilisation encodage par défaut: utf-8")
            return 'utf-8'
            
        except Exception as e:
            logger.error(f"Erreur détection encodage: {str(e)}")
            return 'utf-8'
    
    def _validate_csv_content(self, csv_string: str) -> None:
        """Validation du contenu CSV"""
        if not csv_string or csv_string.strip() == '':
            raise ValueError("Contenu CSV vide après décodage")
        
        lines = csv_string.strip().split('\n')
        if len(lines) < 2:
            raise ValueError("CSV doit avoir au moins un header et une ligne de données")
        
        # Vérifier qu'il y a des séparateurs potentiels
        potential_seps = [',', ';', '\t', '|']
        has_separator = any(sep in csv_string[:1000] for sep in potential_seps)
        
        if not has_separator:
            raise ValueError("Aucun séparateur CSV standard détecté")
    
    def _detect_separator_robust(self, csv_string: str) -> str:
        """Détection robuste du séparateur CSV"""
        lines = csv_string.split('\n')[:self.max_detection_lines]
        valid_lines = [line.strip() for line in lines if line.strip()]
        
        if not valid_lines:
            raise ValueError("Aucune ligne valide trouvée pour détection séparateur")
        
        separators = [',', ';', '\t', '|']
        scores = {}
        
        for sep in separators:
            scores[sep] = 0
            columns_counts = []
            
            for line in valid_lines:
                if line:
                    parts = line.split(sep)
                    if len(parts) > 1:
                        scores[sep] += len(parts)
                        columns_counts.append(len(parts))
            
            # Bonus si nombre de colonnes cohérent
            if columns_counts and len(set(columns_counts)) <= 2:  # Max 2 tailles différentes
                scores[sep] *= 2
        
        if not scores or max(scores.values()) == 0:
            logger.warning("Aucun séparateur détecté, utilisation de ','")
            return ','
        
        best_sep = max(scores, key=scores.get)
        logger.info(f"Meilleur séparateur: '{best_sep}' (score: {scores[best_sep]})")
        
        return best_sep
    
    def _parse_with_pandas(self, csv_string: str, separator: str, encoding: str) -> pd.DataFrame:
        """Parsing Pandas avec gestion d'erreurs robuste"""
        try:
            # Configuration de base
            parse_config = {
                'sep': separator,
                'encoding': encoding,
                'low_memory': False,
                'na_values': ['', ' ', 'NA', 'N/A', 'NULL', 'null', '-', 'Exit Employee'],
                'keep_default_na': True,
                'skip_blank_lines': True
            }
            
            # Première tentative
            df = pd.read_csv(io.StringIO(csv_string), **parse_config)
            
            return df
            
        except pd.errors.EmptyDataError:
            raise ValueError("Fichier CSV vide")
        
        except pd.errors.ParserError as e:
            logger.warning(f"Erreur parsing CSV, tentative avec engine python: {str(e)}")
            
            # Deuxième tentative avec engine python
            try:
                parse_config['engine'] = 'python'
                df = pd.read_csv(io.StringIO(csv_string), **parse_config)
                return df
            except Exception as e2:
                raise ValueError(f"Impossible de parser le CSV: {str(e2)}")
        
        except Exception as e:
            raise ValueError(f"Erreur lecture CSV: {str(e)}")
    
    def _validate_dataframe(self, df: pd.DataFrame) -> None:
        """Validation du DataFrame créé"""
        if df is None:
            raise ValueError("DataFrame est None")
        
        if df.empty:
            raise ValueError("DataFrame est vide")
        
        if len(df.columns) == 0:
            raise ValueError("DataFrame n'a aucune colonne")
        
        if len(df) == 0:
            raise ValueError("DataFrame n'a aucune ligne")
        
        logger.success(f"✅ DataFrame validé: {df.shape}")
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Nettoyage intelligent du DataFrame"""
        try:
            # Copie pour ne pas modifier l'original
            df_clean = df.copy()
            
            # Nettoyer les noms de colonnes
            df_clean.columns = [
                str(col).strip().replace('\n', ' ').replace('\r', '')
                for col in df_clean.columns
            ]
            
            # Supprimer les colonnes entièrement vides
            df_clean = df_clean.dropna(axis=1, how='all')
            
            # Supprimer les lignes entièrement vides
            df_clean = df_clean.dropna(axis=0, how='all')
            
            # Reset index
            df_clean = df_clean.reset_index(drop=True)
            
            logger.info(f"DataFrame nettoyé: {df_clean.shape}")
            return df_clean
            
        except Exception as e:
            logger.error(f"Erreur nettoyage DataFrame: {str(e)}")
            return df
    
    def _detect_column_types_robust(self, df: pd.DataFrame) -> Dict[str, str]:
        """Détection robuste des types de colonnes"""
        column_types = {}
        
        for col in df.columns:
            try:
                series = df[col].dropna()
                
                if len(series) == 0:
                    column_types[col] = 'empty'
                    continue
                
                # Test numérique
                if pd.api.types.is_numeric_dtype(series):
                    if series.dtype in ['int64', 'int32']:
                        column_types[col] = 'integer'
                    else:
                        column_types[col] = 'float'
                    continue
                
                # Test de conversion numérique
                try:
                    pd.to_numeric(series.head(100))
                    column_types[col] = 'numeric'
                    continue
                except:
                    pass
                
                # Test datetime
                try:
                    pd.to_datetime(series.head(10))
                    column_types[col] = 'datetime'
                    continue
                except:
                    pass
                
                # Test boolean
                unique_vals = series.unique()
                if len(unique_vals) <= 2 and all(str(v).lower() in ['true', 'false', '1', '0', 'yes', 'no'] for v in unique_vals):
                    column_types[col] = 'boolean'
                    continue
                
                # Par défaut: text
                column_types[col] = 'text'
                
            except Exception as e:
                logger.warning(f"Erreur détection type pour {col}: {str(e)}")
                column_types[col] = 'text'
        
        logger.info(f"Types détectés: {column_types}")
        return column_types
    
    def _optimize_dtypes_safe(self, df: pd.DataFrame, column_types: Dict[str, str]) -> pd.DataFrame:
        """Optimisation sécurisée des types DataFrame"""
        try:
            df_opt = df.copy()
            
            for col, col_type in column_types.items():
                if col not in df_opt.columns:
                    continue
                
                try:
                    if col_type == 'integer':
                        df_opt[col] = pd.to_numeric(df_opt[col], errors='coerce').astype('Int64')
                    elif col_type == 'float' or col_type == 'numeric':
                        df_opt[col] = pd.to_numeric(df_opt[col], errors='coerce')
                    elif col_type == 'datetime':
                        df_opt[col] = pd.to_datetime(df_opt[col], errors='coerce')
                    elif col_type == 'boolean':
                        df_opt[col] = df_opt[col].astype('boolean')
                    else:
                        df_opt[col] = df_opt[col].astype('string')
                        
                except Exception as e:
                    logger.warning(f"Impossible d'optimiser type pour {col}: {str(e)}")
            
            return df_opt
            
        except Exception as e:
            logger.error(f"Erreur optimisation types: {str(e)}")
            return df
    
    def _generate_metadata_robust(self, df: pd.DataFrame, filename: str, encoding: str, separator: str) -> Dict[str, Any]:
        """Génération robuste des métadonnées"""
        try:
            return {
                "filename": filename,
                "encoding": encoding,
                "separator": separator,
                "shape": {
                    "rows": int(len(df)),
                    "columns": int(len(df.columns))
                },
                "columns": list(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "memory_usage": int(df.memory_usage(deep=True).sum()),
                "null_counts": df.isnull().sum().to_dict(),
                "extraction_timestamp": pd.Timestamp.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Erreur génération métadonnées: {str(e)}")
            return {
                "filename": filename,
                "encoding": encoding,
                "separator": separator,
                "shape": {"rows": 0, "columns": 0},
                "columns": [],
                "error": str(e)
            }
    
    def _generate_sample_safe(self, df: pd.DataFrame, n_rows: int = 5) -> Dict[str, Any]:
        """Génération sécurisée d'un échantillon"""
        try:
            if len(df) == 0:
                return {"head": [], "tail": [], "random": []}
            
            sample_size = min(n_rows, len(df))
            
            # Échantillon début
            head_data = df.head(sample_size).fillna('').to_dict('records')
            
            # Échantillon fin (si assez de données)
            tail_data = df.tail(sample_size).fillna('').to_dict('records') if len(df) > sample_size else []
            
            # Échantillon aléatoire (si assez de données)
            random_data = df.sample(min(sample_size, len(df))).fillna('').to_dict('records') if len(df) > sample_size else []
            
            return {
                "head": head_data,
                "tail": tail_data,
                "random": random_data
            }
            
        except Exception as e:
            logger.error(f"Erreur génération échantillon: {str(e)}")
            return {"head": [], "tail": [], "random": [], "error": str(e)}
    
    def _serialize_dataframe_safe(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Sérialisation ultra-sécurisée du DataFrame"""
        try:
            # Remplacer tous les NaN/NaT par None
            df_clean = df.copy()
            
            # Gestion spéciale pour différents types
            for col in df_clean.columns:
                dtype_str = str(df_clean[col].dtype)
                
                if 'datetime' in dtype_str:
                    # Convertir datetime en string ISO
                    df_clean[col] = df_clean[col].dt.strftime('%Y-%m-%d %H:%M:%S')
                elif 'Int64' in dtype_str or 'Float64' in dtype_str:
                    # Gérer les types nullable pandas
                    df_clean[col] = df_clean[col].astype('object')
                
            # Remplacer NaN par None pour JSON
            df_clean = df_clean.replace({pd.NaT: None, np.nan: None})
            
            # Convertir en format sérialisable
            result = {
                "columns": list(df_clean.columns),
                "data": df_clean.to_dict('records'),
                "shape": {
                    "rows": int(len(df_clean)), 
                    "columns": int(len(df_clean.columns))
                },
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()}
            }
            
            # Test de sérialisation JSON
            json.dumps(result, default=str)
            
            logger.success("✅ Sérialisation DataFrame réussie")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur sérialisation DataFrame: {str(e)}")
            
            # Fallback minimal
            return {
                "columns": list(df.columns) if hasattr(df, 'columns') else [],
                "data": [],
                "shape": {"rows": 0, "columns": 0},
                "dtypes": {},
                "error": f"Erreur sérialisation: {str(e)}"
            }
    
    def _validate_final_result(self, dataframe_data: Dict[str, Any], metadata: Dict[str, Any], sample_data: Dict[str, Any]) -> None:
        """Validation finale du résultat d'extraction"""
        # Validation dataframe_data
        if not dataframe_data or not isinstance(dataframe_data, dict):
            raise ValueError("dataframe_data invalide")
        
        if not dataframe_data.get('columns'):
            raise ValueError("Colonnes manquantes dans dataframe_data")
        
        if not isinstance(dataframe_data.get('data'), list):
            raise ValueError("Données manquantes dans dataframe_data")
        
        # Validation metadata
        if not metadata or not isinstance(metadata, dict):
            raise ValueError("Metadata invalides")
        
        if not metadata.get('shape') or not isinstance(metadata['shape'], dict):
            raise ValueError("Shape manquante dans metadata")
        
        # Validation sample_data
        if not isinstance(sample_data, dict):
            raise ValueError("Sample_data invalides")
        
        logger.success("✅ Validation finale réussie")