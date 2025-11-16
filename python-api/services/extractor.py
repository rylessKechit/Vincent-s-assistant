"""
Service d'extraction de données CSV universel
Gère automatiquement tous types de CSV avec détection intelligente
"""

import pandas as pd
import numpy as np
import io
import csv
import re
from typing import Dict, Any, List, Optional, Tuple
from loguru import logger
import chardet
from pathlib import Path

class CSVExtractor:
    """Extracteur CSV universel - compatible tous types de fichiers"""
    
    def __init__(self):
        self.ready = True
        # Patterns pour détecter différents formats
        self.date_patterns = [
            r'\d{4}-\d{2}-\d{2}',  # 2023-01-01
            r'\d{2}/\d{2}/\d{4}',  # 01/01/2023
            r'\d{2}\.\d{2}\.\d{4}', # 01.01.2023
            r'\d{2}-\d{2}-\d{4}',  # 01-01-2023
        ]
        
        # Valeurs considérées comme manquantes
        self.na_values = [
            '', 'nan', 'NaN', 'null', 'NULL', 'None', 'NONE',
            '-', '/', ' ', 'N/A', 'n/a', 'NA', 'na',
            '#N/A', '#NULL!', '#VALUE!', '#DIV/0!', '#NAME?',
            'undefined', 'UNDEFINED', '?', '??', '???'
        ]
    
    def is_ready(self) -> bool:
        return self.ready
    
    async def extract_csv(self, content: bytes, filename: str) -> Dict[str, Any]:
        """
        Extraction CSV universelle - compatible tous types de fichiers
        
        Args:
            content: Contenu du fichier en bytes
            filename: Nom du fichier
            
        Returns:
            Dict avec les données extraites et métadonnées
        """
        
        try:
            logger.info(f"🔍 Début extraction universelle: {filename}")
            
            # 1. Détection de l'encodage
            encoding = self._detect_encoding(content)
            logger.info(f"📝 Encodage détecté: {encoding}")
            
            # 2. Décodage du contenu
            text_content = content.decode(encoding)
            
            # 3. Détection du séparateur et des paramètres CSV
            csv_params = self._detect_csv_parameters(text_content)
            logger.info(f"⚙️ Paramètres CSV: {csv_params}")
            
            # 4. Lecture du CSV avec paramètres optimaux
            df = self._read_csv_smart(content, encoding, csv_params)
            logger.info(f"📊 DataFrame créé: {df.shape[0]} lignes, {df.shape[1]} colonnes")
            
            # 5. Nettoyage et normalisation
            df = self._clean_and_normalize_dataframe(df)
            logger.info(f"🧹 DataFrame nettoyé: {df.shape[0]} lignes, {df.shape[1]} colonnes")
            
            # 6. Détection et conversion automatique des types
            df, type_info = self._auto_detect_and_convert_types(df)
            logger.info(f"🔄 Types détectés: {len(type_info)} colonnes")
            
            # 7. Gestion intelligente des valeurs manquantes
            df = self._handle_missing_values_smart(df)
            
            # 8. Génération des métadonnées enrichies
            metadata = self._generate_rich_metadata(df, filename, encoding, csv_params, type_info)
            
            # 9. Préparation des données pour JSON
            dataframe_data = self._prepare_dataframe_for_json(df)
            
            # 10. Échantillon de données pour vérification
            sample_data = self._generate_sample_data(df)
            
            logger.info(f"✅ Extraction réussie - {metadata['shape']['rows']} lignes analysées")
            
            return {
                'success': True,
                'dataframe_data': dataframe_data,
                'metadata': metadata,
                'sample_data': sample_data,
                'extraction_info': {
                    'encoding': encoding,
                    'csv_params': csv_params,
                    'type_conversions': type_info,
                    'data_quality': self._assess_data_quality(df)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur extraction CSV: {str(e)}")
            return {
                'success': False,
                'error': f"Erreur extraction: {str(e)}",
                'filename': filename
            }
    
    def _detect_encoding(self, content: bytes) -> str:
        """Détection intelligente de l'encodage"""
        try:
            # Détecter l'encodage avec chardet
            detection = chardet.detect(content)
            encoding = detection.get('encoding', 'utf-8')
            confidence = detection.get('confidence', 0)
            
            # Fallback si confiance faible
            if confidence < 0.7:
                # Tester les encodages courants
                for test_encoding in ['utf-8', 'iso-8859-1', 'cp1252', 'utf-16']:
                    try:
                        content.decode(test_encoding)
                        return test_encoding
                    except:
                        continue
            
            return encoding.lower()
        except:
            return 'utf-8'
    
    def _detect_csv_parameters(self, text_content: str) -> Dict[str, Any]:
        """Détection automatique des paramètres CSV"""
        
        # Prendre un échantillon pour l'analyse
        sample = '\n'.join(text_content.split('\n')[:10])
        
        params = {
            'delimiter': ',',
            'quotechar': '"',
            'quoting': csv.QUOTE_MINIMAL,
            'skipinitialspace': True
        }
        
        try:
            # Utiliser csv.Sniffer pour détecter le dialecte
            sniffer = csv.Sniffer()
            dialect = sniffer.sniff(sample, delimiters=',;\t|')
            
            params['delimiter'] = dialect.delimiter
            params['quotechar'] = dialect.quotechar
            params['quoting'] = dialect.quoting
            
        except Exception as e:
            logger.warning(f"Sniffer failed, using defaults: {e}")
            
            # Détection manuelle du délimiteur
            delimiters = [',', ';', '\t', '|']
            delimiter_counts = {}
            
            for delim in delimiters:
                count = sample.count(delim)
                if count > 0:
                    delimiter_counts[delim] = count
            
            if delimiter_counts:
                params['delimiter'] = max(delimiter_counts.items(), key=lambda x: x[1])[0]
        
        return params
    
    def _read_csv_smart(self, content: bytes, encoding: str, csv_params: Dict[str, Any]) -> pd.DataFrame:
        """Lecture CSV intelligente avec gestion d'erreurs"""
        
        try:
            # Première tentative avec les paramètres détectés
            df = pd.read_csv(
                io.BytesIO(content),
                encoding=encoding,
                delimiter=csv_params['delimiter'],
                quotechar=csv_params['quotechar'],
                na_values=self.na_values,
                keep_default_na=True,
                dtype=str,  # Tout en string pour commencer
                skipinitialspace=csv_params.get('skipinitialspace', True),
                on_bad_lines='warn'
            )
            
            return df
            
        except Exception as e:
            logger.warning(f"Lecture CSV échouée avec paramètres détectés: {e}")
            
            # Fallback avec paramètres par défaut
            try:
                df = pd.read_csv(
                    io.BytesIO(content),
                    encoding=encoding,
                    delimiter=',',
                    na_values=self.na_values,
                    keep_default_na=True,
                    dtype=str,
                    on_bad_lines='skip'
                )
                return df
            except Exception as e2:
                logger.error(f"Lecture CSV fallback échouée: {e2}")
                raise e2
    
    def _clean_and_normalize_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Nettoyage et normalisation du DataFrame"""
        
        # 1. Nettoyer les noms de colonnes
        df.columns = df.columns.str.strip()  # Supprimer les espaces
        df.columns = df.columns.str.replace('"', '')  # Supprimer les guillemets
        df.columns = df.columns.str.replace('\n', ' ')  # Remplacer retours à la ligne
        
        # 2. Supprimer les lignes complètement vides
        df = df.dropna(how='all')
        
        # 3. Supprimer les colonnes complètement vides
        df = df.dropna(axis=1, how='all')
        
        # 4. Nettoyer les valeurs string
        for col in df.columns:
            if df[col].dtype == 'object':
                df[col] = df[col].astype(str).str.strip()
                df[col] = df[col].replace('nan', np.nan)
        
        # 5. Réinitialiser l'index
        df = df.reset_index(drop=True)
        
        return df
    
    def _auto_detect_and_convert_types(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Dict]]:
        """Détection automatique et conversion des types de données"""
        
        type_info = {}
        df_converted = df.copy()
        
        for col in df.columns:
            col_info = {
                'original_type': 'string',
                'detected_type': 'string',
                'conversion_success': False,
                'special_format': None
            }
            
            # Échantillon non-null pour analyse
            sample = df[col].dropna()
            if len(sample) == 0:
                type_info[col] = col_info
                continue
                
            # 1. Détecter les pourcentages
            if self._is_percentage_column(sample):
                col_info['detected_type'] = 'percentage'
                col_info['special_format'] = 'percentage'
                # Garder en string mais marquer comme pourcentage
                
            # 2. Détecter les monnaies
            elif self._is_currency_column(sample):
                col_info['detected_type'] = 'currency'
                col_info['special_format'] = 'currency'
                # Convertir en numérique
                df_converted[col] = self._convert_currency_to_numeric(df[col])
                col_info['conversion_success'] = True
                
            # 3. Détecter les nombres
            elif self._is_numeric_column(sample):
                col_info['detected_type'] = 'numeric'
                try:
                    df_converted[col] = pd.to_numeric(df[col], errors='coerce')
                    col_info['conversion_success'] = True
                except:
                    pass
                    
            # 4. Détecter les dates
            elif self._is_date_column(sample):
                col_info['detected_type'] = 'datetime'
                try:
                    df_converted[col] = pd.to_datetime(df[col], errors='coerce')
                    col_info['conversion_success'] = True
                except:
                    pass
                    
            # 5. Détecter les booléens
            elif self._is_boolean_column(sample):
                col_info['detected_type'] = 'boolean'
                try:
                    df_converted[col] = df[col].map({'True': True, 'False': False, '1': True, '0': False})
                    col_info['conversion_success'] = True
                except:
                    pass
            
            # 6. Reste en string
            else:
                col_info['detected_type'] = 'string'
                # Détecter des formats spéciaux
                if self._is_identifier_column(sample):
                    col_info['special_format'] = 'identifier'
                elif self._is_category_column(sample):
                    col_info['special_format'] = 'category'
            
            type_info[col] = col_info
        
        return df_converted, type_info
    
    def _is_percentage_column(self, series: pd.Series) -> bool:
        """Détecte si une colonne contient des pourcentages"""
        sample_str = series.astype(str).str.lower()
        percent_count = sample_str.str.contains('%|percent|pct').sum()
        return percent_count / len(series) > 0.5
    
    def _is_currency_column(self, series: pd.Series) -> bool:
        """Détecte si une colonne contient des montants"""
        sample_str = series.astype(str)
        currency_pattern = r'[$€£¥]|USD|EUR|CHF|GBP'
        currency_count = sample_str.str.contains(currency_pattern, case=False).sum()
        return currency_count / len(series) > 0.3
    
    def _is_numeric_column(self, series: pd.Series) -> bool:
        """Détecte si une colonne est numérique"""
        numeric_count = 0
        for val in series.head(min(100, len(series))):
            try:
                # Nettoyer et tester conversion
                cleaned = str(val).replace(',', '').replace(' ', '').replace('€', '').replace('$', '')
                float(cleaned)
                numeric_count += 1
            except:
                pass
        
        return numeric_count / min(100, len(series)) > 0.8
    
    def _is_date_column(self, series: pd.Series) -> bool:
        """Détecte si une colonne contient des dates"""
        sample_str = series.astype(str)
        date_count = 0
        
        for pattern in self.date_patterns:
            date_count += sample_str.str.contains(pattern).sum()
        
        return date_count / len(series) > 0.7
    
    def _is_boolean_column(self, series: pd.Series) -> bool:
        """Détecte si une colonne contient des booléens"""
        sample_str = series.astype(str).str.lower()
        bool_values = {'true', 'false', '1', '0', 'yes', 'no', 'y', 'n', 'oui', 'non'}
        bool_count = sample_str.isin(bool_values).sum()
        return bool_count / len(series) > 0.8
    
    def _is_identifier_column(self, series: pd.Series) -> bool:
        """Détecte si une colonne contient des identifiants"""
        # Vérifie si c'est majoritairement unique et contient des patterns d'ID
        uniqueness = series.nunique() / len(series)
        sample_str = series.astype(str)
        
        id_patterns = [r'\d{3,}', r'[A-Z]{2,}\d+', r'\d+[A-Z]+', r'[A-Z]+\d+[A-Z]+']
        pattern_matches = sum(sample_str.str.contains(pattern).any() for pattern in id_patterns)
        
        return uniqueness > 0.9 or pattern_matches >= 2
    
    def _is_category_column(self, series: pd.Series) -> bool:
        """Détecte si une colonne est catégorielle"""
        unique_ratio = series.nunique() / len(series)
        return unique_ratio < 0.5 and series.nunique() < 50
    
    def _convert_currency_to_numeric(self, series: pd.Series) -> pd.Series:
        """Convertit une série de montants en numérique"""
        return series.astype(str).str.replace(r'[$€£¥,]', '', regex=True).str.replace(' ', '').apply(
            lambda x: pd.to_numeric(x, errors='coerce')
        )
    
    def _handle_missing_values_smart(self, df: pd.DataFrame) -> pd.DataFrame:
        """Gestion intelligente des valeurs manquantes"""
        
        df_handled = df.copy()
        
        for col in df.columns:
            missing_count = df[col].isnull().sum()
            total_count = len(df)
            missing_ratio = missing_count / total_count
            
            # Si plus de 90% de valeurs manquantes, marquer la colonne
            if missing_ratio > 0.9:
                logger.warning(f"Colonne '{col}' a {missing_ratio:.1%} de valeurs manquantes")
                continue
            
            # Détecter le type de colonne pour le remplissage intelligent
            col_lower = col.lower()
            
            # Identifiants : remplacer par "Inconnu_N"
            if any(keyword in col_lower for keyword in ['id', 'branch', 'agent', 'code', 'ref', 'name', 'entity']):
                mask = df_handled[col].isnull()
                if mask.any():
                    df_handled.loc[mask, col] = [f"Inconnu_{col}_{i}" for i in range(mask.sum())]
            
            # Numérique : garder NaN (sera géré dans l'analyse)
            elif df_handled[col].dtype in ['float64', 'int64']:
                pass  # Garder les NaN pour l'analyse statistique
            
            # Catégories : remplacer par "Non spécifié"
            elif df_handled[col].dtype == 'object':
                df_handled[col] = df_handled[col].fillna("Non spécifié")
        
        return df_handled
    
    def _generate_rich_metadata(self, df: pd.DataFrame, filename: str, encoding: str, 
                              csv_params: Dict[str, Any], type_info: Dict[str, Dict]) -> Dict[str, Any]:
        """Génération de métadonnées enrichies"""
        
        return {
            'filename': filename,
            'shape': {
                'rows': int(len(df)),
                'columns': int(len(df.columns))
            },
            'columns': df.columns.tolist(),
            'data_types': {col: info['detected_type'] for col, info in type_info.items()},
            'special_formats': {col: info['special_format'] for col, info in type_info.items() if info['special_format']},
            'missing_data': {col: int(df[col].isnull().sum()) for col in df.columns},
            'file_info': {
                'encoding': encoding,
                'delimiter': csv_params['delimiter'],
                'size_bytes': None,  # Sera rempli par l'appelant
                'estimated_size_mb': round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2)
            },
            'column_stats': self._generate_column_stats(df),
            'data_quality_summary': self._generate_quality_summary(df)
        }
    
    def _generate_column_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Statistiques par colonne"""
        stats = {}
        
        for col in df.columns:
            col_stats = {
                'non_null_count': int(df[col].count()),
                'null_count': int(df[col].isnull().sum()),
                'unique_count': int(df[col].nunique()),
                'duplicate_count': int(df[col].duplicated().sum())
            }
            
            if df[col].dtype in ['float64', 'int64']:
                col_stats.update({
                    'mean': float(df[col].mean()) if df[col].count() > 0 else None,
                    'median': float(df[col].median()) if df[col].count() > 0 else None,
                    'std': float(df[col].std()) if df[col].count() > 1 else None,
                    'min': float(df[col].min()) if df[col].count() > 0 else None,
                    'max': float(df[col].max()) if df[col].count() > 0 else None
                })
            
            stats[col] = col_stats
        
        return stats
    
    def _generate_quality_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Résumé de la qualité des données"""
        total_cells = df.shape[0] * df.shape[1]
        missing_cells = df.isnull().sum().sum()
        
        return {
            'completeness_ratio': float(1 - missing_cells / total_cells) if total_cells > 0 else 0,
            'total_cells': int(total_cells),
            'missing_cells': int(missing_cells),
            'empty_rows': int(df.isnull().all(axis=1).sum()),
            'empty_columns': int(df.isnull().all().sum()),
            'duplicate_rows': int(df.duplicated().sum())
        }
    
    def _prepare_dataframe_for_json(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Préparation du DataFrame pour sérialisation JSON"""
        
        # Convertir les types pandas pour JSON
        df_json = df.copy()
        
        for col in df_json.columns:
            if df_json[col].dtype == 'datetime64[ns]':
                df_json[col] = df_json[col].dt.strftime('%Y-%m-%d')
            elif df_json[col].dtype in ['float64', 'int64']:
                # Remplacer NaN par None pour JSON
                df_json[col] = df_json[col].where(pd.notnull(df_json[col]), None)
        
        return {
            'data': df_json.to_dict('records'),
            'columns': df.columns.tolist(),
            'dtypes': {col: str(df[col].dtype) for col in df.columns}
        }
    
    def _generate_sample_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Génération d'un échantillon de données"""
        
        sample_size = min(5, len(df))
        
        return {
            'head': df.head(sample_size).to_dict('records'),
            'tail': df.tail(sample_size).to_dict('records') if len(df) > sample_size else None,
            'random_sample': df.sample(min(3, len(df))).to_dict('records') if len(df) > 0 else []
        }
    
    def _assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Évaluation de la qualité des données"""
        
        total_cells = df.shape[0] * df.shape[1]
        if total_cells == 0:
            return {'overall_score': 0, 'issues': ['DataFrame vide']}
        
        missing_cells = df.isnull().sum().sum()
        completeness = 1 - (missing_cells / total_cells)
        
        # Calcul du score de qualité
        quality_score = completeness * 100
        
        issues = []
        if completeness < 0.9:
            issues.append(f"Taux de complétude faible: {completeness:.1%}")
        
        if df.duplicated().sum() > 0:
            issues.append(f"{df.duplicated().sum()} lignes dupliquées détectées")
        
        return {
            'overall_score': round(quality_score, 1),
            'completeness': round(completeness * 100, 1),
            'issues': issues,
            'recommendations': self._generate_quality_recommendations(df)
        }
    
    def _generate_quality_recommendations(self, df: pd.DataFrame) -> List[str]:
        """Recommandations pour améliorer la qualité"""
        recommendations = []
        
        # Vérifier les colonnes avec beaucoup de valeurs manquantes
        for col in df.columns:
            missing_ratio = df[col].isnull().sum() / len(df)
            if missing_ratio > 0.5:
                recommendations.append(f"Colonne '{col}': {missing_ratio:.1%} de valeurs manquantes - Vérifier la source")
        
        # Vérifier les doublons
        if df.duplicated().sum() > 0:
            recommendations.append("Supprimer ou investiguer les lignes dupliquées")
        
        # Vérifier la cohérence des types
        for col in df.columns:
            if df[col].dtype == 'object':
                sample = df[col].dropna().astype(str)
                if len(sample) > 0:
                    mixed_types = False
                    numeric_count = 0
                    for val in sample.head(20):
                        try:
                            float(str(val).replace(',', ''))
                            numeric_count += 1
                        except:
                            pass
                    
                    if 0.3 < numeric_count / len(sample.head(20)) < 0.9:
                        recommendations.append(f"Colonne '{col}': Types de données mixtes détectés")
        
        if not recommendations:
            recommendations.append("Qualité des données satisfaisante")
        
        return recommendations