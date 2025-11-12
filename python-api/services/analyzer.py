"""
Service d'analyse de données avancé - Version Complète
Calculs statistiques, détection patterns, agrégations intelligentes
Compatible avec la sérialisation FastAPI
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from loguru import logger
import re

class DataAnalyzer:
    """Analyseur de données intelligent pour datasets métier"""
    
    def __init__(self):
        self.ready = True
        self.sixt_patterns = {
            'agent_patterns': r'^\d{7,10}\s*-\s*.+',
            'exit_employee': r'Exit Employee',
            'currency_patterns': [r'\d+,\d+\.\d+', r'"\d+,\d+\.\d+"'],
            'percentage_patterns': [r'\d+\.\d+%', r'\d+%']
        }
    
    def is_ready(self) -> bool:
        return self.ready
    
    def _get_dataframe(self, df_input: Any) -> pd.DataFrame:
        """Utilitaire pour reconstituer le DataFrame depuis différents formats"""
        if isinstance(df_input, dict):
            if 'data' in df_input and 'columns' in df_input:
                # Format sérialisé par notre extracteur
                return pd.DataFrame(df_input['data'])
            elif 'data' in df_input:
                # Format simple
                return pd.DataFrame(df_input['data'])
            else:
                # Dict direct
                return pd.DataFrame(df_input)
        elif isinstance(df_input, pd.DataFrame):
            return df_input
        else:
            logger.warning(f"Format DataFrame inconnu: {type(df_input)}")
            return pd.DataFrame()
    
    async def analyze_dataframe(self, df_input: Any, metadata: Dict) -> Dict[str, Any]:
        """
        Analyse complète d'un DataFrame
        
        Args:
            df_input: DataFrame ou données sérialisées
            metadata: Métadonnées d'extraction
            
        Returns:
            Dict contenant toutes les analyses statistiques
        """
        try:
            df = self._get_dataframe(df_input)
            
            if df.empty:
                return {"error": "DataFrame vide", "basic_stats": {}}
            
            analysis = {
                'basic_stats': self._compute_basic_stats(df),
                'correlations': self._compute_correlations(df),
                'null_analysis': self._analyze_missing_values(df),
                'distribution_analysis': self._analyze_distributions(df),
                'outliers': self._detect_outliers(df),
                'column_insights': self._analyze_columns_insights(df)
            }
            
            logger.info(f"Analyse complète terminée pour {df.shape[0]}x{df.shape[1]} dataset")
            return analysis
            
        except Exception as e:
            logger.error(f"Erreur analyse DataFrame: {str(e)}")
            return {"error": str(e), "basic_stats": {}, "correlations": {}}
    
    async def detect_business_patterns(self, df_input: Any) -> Dict[str, Any]:
        """
        Détection de patterns métier spécifiques (SIXT, performance, etc.)
        """
        try:
            df = self._get_dataframe(df_input)
            patterns = {}
            
            if df.empty:
                return {"error": "DataFrame vide"}
            
            # 1. Détection agents et performances
            patterns.update(self._detect_agent_patterns(df))
            
            # 2. Détection métriques financières
            patterns.update(self._detect_financial_patterns(df))
            
            # 3. Détection patterns temporels
            patterns.update(self._detect_temporal_patterns(df))
            
            # 4. Détection segments de performance
            patterns.update(self._detect_performance_segments(df))
            
            logger.success(f"Détecté {len(patterns)} patterns métier")
            return patterns
            
        except Exception as e:
            logger.error(f"Erreur détection patterns: {str(e)}")
            return {"error": str(e)}
    
    async def generate_recommendations(self, df_input: Any, patterns: Dict) -> List[str]:
        """
        Génère des recommandations intelligentes basées sur l'analyse
        """
        recommendations = []
        
        try:
            df = self._get_dataframe(df_input)
            
            if df.empty:
                return ["❌ DataFrame vide - impossible de générer des recommandations"]
            
            # Qualité des données
            null_percentage = df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) * 100
            
            if null_percentage > 10:
                recommendations.append(f"⚠️ {null_percentage:.1f}% de valeurs manquantes détectées")
            else:
                recommendations.append("✅ Excellente qualité des données")
            
            # Taille du dataset
            if df.shape[0] > 10000:
                recommendations.append("📊 Gros dataset - considérer la pagination pour les requêtes")
            elif df.shape[0] < 50:
                recommendations.append("📈 Petit dataset - analyses statistiques limitées")
            else:
                recommendations.append("🎯 Taille de dataset optimale pour l'analyse")
            
            # Recommandations métier
            if 'exit_employees' in patterns:
                exit_count = patterns['exit_employees'].get('count', 0)
                if exit_count > 0:
                    recommendations.append(f"👥 {exit_count} Exit Employees détectés - filtrer pour analyses actives")
            
            # Recommandations performance
            if 'performance_segments' in patterns:
                segments = patterns['performance_segments']
                if 'high_performers' in segments:
                    recommendations.append("🏆 Analyser les stratégies des top performers")
            
            # Recommandations colonnes numériques
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                recommendations.append(f"📈 {len(numeric_cols)} colonnes numériques disponibles pour analyses")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Erreur génération recommandations: {str(e)}")
            return ["❌ Erreur génération recommandations"]
    
    async def compute_smart_aggregations(self, dataframe: Any, question: str, aggregation_type: str) -> Dict:
        """
        Calculs d'agrégations intelligentes basées sur la question
        """
        try:
            df = self._get_dataframe(dataframe)
            question_lower = question.lower()
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            
            aggregations = {}
            
            # Agrégations basées sur la question
            if any(keyword in question_lower for keyword in ['total', 'somme']):
                if len(numeric_cols) > 0:
                    aggregations['totals'] = {col: float(df[col].sum()) for col in numeric_cols}
            
            if any(keyword in question_lower for keyword in ['moyenne', 'average', 'mean']):
                if len(numeric_cols) > 0:
                    aggregations['averages'] = {col: float(df[col].mean()) for col in numeric_cols}
            
            if any(keyword in question_lower for keyword in ['top', 'meilleur', 'best']):
                aggregations['top_values'] = self._get_top_performers(df, question_lower)
            
            if any(keyword in question_lower for keyword in ['agent', 'performer']):
                aggregations['by_agent'] = self._aggregate_by_agent(df)
            
            if any(keyword in question_lower for keyword in ['mois', 'month', 'période']):
                aggregations['temporal'] = self._aggregate_temporal(df)
            
            # Agrégations avancées selon le type
            if aggregation_type == 'statistical':
                aggregations['statistics'] = self._compute_advanced_statistics(df)
            elif aggregation_type == 'business':
                aggregations['business_metrics'] = self._compute_business_metrics(df)
            
            return aggregations
            
        except Exception as e:
            logger.error(f"Erreur agrégations intelligentes: {str(e)}")
            return {"error": str(e)}
    
    def _compute_basic_stats(self, df: pd.DataFrame) -> Dict:
        """Statistiques de base"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.empty:
            return {"message": "Aucune colonne numérique"}
        
        # Remplacer les valeurs NaN/inf par None pour JSON
        stats_raw = numeric_df.describe()
        stats = {}
        
        for col in stats_raw.columns:
            stats[col] = {}
            for stat_name in stats_raw.index:
                value = stats_raw.loc[stat_name, col]
                if pd.isna(value) or np.isinf(value):
                    stats[col][stat_name] = None
                else:
                    stats[col][stat_name] = float(value)
            
            # Ajouter des métriques personnalisées
            series = numeric_df[col].dropna()
            if len(series) > 0:
                stats[col]['variance'] = float(series.var()) if not pd.isna(series.var()) else None
                stats[col]['median'] = float(series.median()) if not pd.isna(series.median()) else None
                stats[col]['zero_count'] = int((series == 0).sum())
        
        return stats
    
    def _compute_correlations(self, df: pd.DataFrame) -> Dict:
        """Analyse des corrélations"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        if numeric_df.shape[1] < 2:
            return {"message": "Pas assez de colonnes numériques pour les corrélations"}
        
        corr_matrix = numeric_df.corr()
        
        # Remplacer NaN par None pour JSON
        corr_clean = corr_matrix.replace({np.nan: None})
        
        # Identifier les corrélations fortes
        strong_correlations = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_val = corr_matrix.iloc[i, j]
                if not pd.isna(corr_val) and abs(corr_val) > 0.7:
                    strong_correlations.append({
                        'col1': corr_matrix.columns[i],
                        'col2': corr_matrix.columns[j],
                        'correlation': float(corr_val)
                    })
        
        return {
            'correlation_matrix': corr_clean.to_dict(),
            'strong_correlations': strong_correlations
        }
    
    def _analyze_missing_values(self, df: pd.DataFrame) -> Dict:
        """Analyse des valeurs manquantes"""
        null_counts = df.isnull().sum()
        null_percentages = (null_counts / len(df)) * 100
        
        problematic_columns = {k: float(v) for k, v in null_percentages[null_percentages > 20].to_dict().items()}
        
        return {
            'null_counts': {k: int(v) for k, v in null_counts.to_dict().items()},
            'null_percentages': {k: float(v) for k, v in null_percentages.to_dict().items()},
            'problematic_columns': problematic_columns,
            'total_null_percentage': float((df.isnull().sum().sum() / (df.shape[0] * df.shape[1])) * 100)
        }
    
    def _analyze_distributions(self, df: pd.DataFrame) -> Dict:
        """Analyse des distributions"""
        numeric_df = df.select_dtypes(include=[np.number])
        distributions = {}
        
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            if len(series) > 1:
                skew_val = series.skew()
                kurt_val = series.kurtosis()
                
                distributions[col] = {
                    'skewness': float(skew_val) if not pd.isna(skew_val) else None,
                    'kurtosis': float(kurt_val) if not pd.isna(kurt_val) else None,
                    'unique_values': int(series.nunique()),
                    'unique_ratio': float(series.nunique() / len(series))
                }
        
        return distributions
    
    def _detect_outliers(self, df: pd.DataFrame) -> Dict:
        """Détection des outliers avec méthode IQR"""
        numeric_df = df.select_dtypes(include=[np.number])
        outliers = {}
        
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            if len(series) > 4:  # Minimum pour IQR
                Q1 = series.quantile(0.25)
                Q3 = series.quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outlier_mask = (series < lower_bound) | (series > upper_bound)
                outlier_count = outlier_mask.sum()
                
                outliers[col] = {
                    'count': int(outlier_count),
                    'percentage': float(outlier_count / len(series) * 100),
                    'lower_bound': float(lower_bound),
                    'upper_bound': float(upper_bound)
                }
        
        return outliers
    
    def _analyze_columns_insights(self, df: pd.DataFrame) -> Dict:
        """Insights spécifiques par colonne"""
        insights = {}
        
        for col in df.columns:
            series = df[col].dropna()
            col_insights = {
                'type': str(df[col].dtype),
                'unique_count': int(series.nunique()),
                'most_frequent': str(series.mode().iloc[0]) if len(series.mode()) > 0 else None
            }
            
            # Insights spécifiques selon le type
            if df[col].dtype in ['object', 'string']:
                avg_len = series.astype(str).str.len().mean()
                max_len = series.astype(str).str.len().max()
                col_insights['avg_length'] = float(avg_len) if not pd.isna(avg_len) else None
                col_insights['max_length'] = int(max_len) if not pd.isna(max_len) else None
            
            insights[col] = col_insights
        
        return insights
    
    def _detect_agent_patterns(self, df: pd.DataFrame) -> Dict:
        """Détection patterns agents SIXT"""
        patterns = {}
        
        # Identifier la colonne agent
        agent_col = None
        for col in df.columns:
            if 'agent' in col.lower():
                agent_col = col
                break
        
        if agent_col:
            agent_series = df[agent_col].astype(str)
            
            # Exit Employees
            exit_mask = agent_series.str.contains('Exit Employee', na=False, case=False)
            exit_employees = df[exit_mask]
            
            patterns['exit_employees'] = {
                'count': int(len(exit_employees)),
                'percentage': float(len(exit_employees) / len(df) * 100),
                'list': exit_employees[agent_col].astype(str).tolist()[:10]
            }
            
            # Active agents
            active_agents = df[~exit_mask]
            patterns['active_agents'] = {
                'count': int(len(active_agents)),
                'percentage': float(len(active_agents) / len(df) * 100)
            }
        
        return patterns
    
    def _detect_financial_patterns(self, df: pd.DataFrame) -> Dict:
        """Détection patterns financiers"""
        patterns = {}
        
        # Identifier colonnes financières
        financial_cols = []
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['revenue', 'package', 'ir', 'montant', 'price']):
                financial_cols.append(col)
        
        if financial_cols:
            patterns['financial_metrics'] = {}
            for col in financial_cols:
                # Nettoyer les données pour conversion numérique
                try:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    
                    if not numeric_series.isna().all():
                        patterns['financial_metrics'][col] = {
                            'total': float(numeric_series.sum()),
                            'average': float(numeric_series.mean()),
                            'max': float(numeric_series.max()),
                            'min': float(numeric_series.min()),
                            'zero_values': int((numeric_series == 0).sum())
                        }
                except Exception as e:
                    logger.warning(f"Erreur analyse colonne financière {col}: {e}")
        
        return patterns
    
    def _detect_temporal_patterns(self, df: pd.DataFrame) -> Dict:
        """Détection patterns temporels"""
        patterns = {}
        
        # Identifier colonnes temporelles
        date_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
        potential_date_cols = [col for col in df.columns if any(keyword in col.lower() 
                              for keyword in ['month', 'date', 'period', 'mois'])]
        
        if len(date_cols) > 0 or len(potential_date_cols) > 0:
            patterns['temporal_data'] = {
                'date_columns': date_cols,
                'potential_date_columns': potential_date_cols,
                'has_temporal_data': True
            }
        
        return patterns
    
    def _detect_performance_segments(self, df: pd.DataFrame) -> Dict:
        """Segmentation intelligente des performances"""
        patterns = {}
        
        # Identifier une métrique de performance principale
        performance_col = None
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['revenue', 'package ir', 'performance', 'total']):
                # Vérifier si c'est numérique
                try:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    if not numeric_series.isna().all():
                        performance_col = col
                        break
                except:
                    continue
        
        if performance_col:
            try:
                # Nettoyer et convertir la colonne de performance
                cleaned_series = df[performance_col].astype(str).str.replace(',', '').str.replace('"', '')
                numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                df_filtered = df[numeric_series > 0].copy()
                perf_values = numeric_series[numeric_series > 0]
                
                if len(df_filtered) > 0 and len(perf_values) > 3:
                    quartiles = perf_values.quantile([0.25, 0.5, 0.75])
                    
                    high_mask = perf_values >= quartiles[0.75]
                    medium_mask = (perf_values >= quartiles[0.25]) & (perf_values < quartiles[0.75])
                    low_mask = perf_values < quartiles[0.25]
                    
                    patterns['performance_segments'] = {
                        'metric_used': performance_col,
                        'high_performers': {
                            'count': int(high_mask.sum()),
                            'avg_performance': float(perf_values[high_mask].mean()),
                            'min_threshold': float(quartiles[0.75])
                        },
                        'medium_performers': {
                            'count': int(medium_mask.sum()),
                            'avg_performance': float(perf_values[medium_mask].mean())
                        },
                        'low_performers': {
                            'count': int(low_mask.sum()),
                            'avg_performance': float(perf_values[low_mask].mean()),
                            'max_threshold': float(quartiles[0.25])
                        }
                    }
            except Exception as e:
                logger.warning(f"Erreur segmentation performance: {e}")
        
        return patterns
    
    def _get_top_performers(self, df: pd.DataFrame, question: str) -> Dict:
        """Identifier les top performers selon la question"""
        # Identifier la métrique à utiliser
        metric_col = None
        
        # Rechercher dans les colonnes qui correspondent aux mots de la question
        for col in df.columns:
            col_lower = col.lower().replace(' ', '')
            question_words = question.lower().split()
            if any(word in col_lower for word in question_words if len(word) > 3):
                # Vérifier si c'est numérique
                try:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    if not numeric_series.isna().all():
                        metric_col = col
                        break
                except:
                    continue
        
        if not metric_col:
            # Fallback sur une colonne financière
            for col in df.columns:
                if any(keyword in col.lower() for keyword in ['revenue', 'package', 'ir', 'total']):
                    try:
                        cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                        numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                        if not numeric_series.isna().all():
                            metric_col = col
                            break
                    except:
                        continue
        
        if metric_col:
            try:
                # Nettoyer et trier
                cleaned_series = df[metric_col].astype(str).str.replace(',', '').str.replace('"', '')
                df_copy = df.copy()
                df_copy[metric_col + '_numeric'] = pd.to_numeric(cleaned_series, errors='coerce')
                
                top_performers = df_copy.nlargest(10, metric_col + '_numeric')
                # Retirer la colonne temporaire et convertir en dict
                top_performers = top_performers.drop(columns=[metric_col + '_numeric'])
                
                return {
                    'metric': metric_col,
                    'top_10': top_performers.replace({np.nan: None}).to_dict('records')
                }
            except Exception as e:
                logger.warning(f"Erreur top performers: {e}")
        
        return {"message": "Aucune métrique de performance identifiée"}
    
    def _aggregate_by_agent(self, df: pd.DataFrame) -> Dict:
        """Agrégations par agent"""
        agent_col = None
        for col in df.columns:
            if 'agent' in col.lower():
                agent_col = col
                break
        
        if not agent_col:
            return {"message": "Aucune colonne agent identifiée"}
        
        # Identifier les colonnes numériques
        numeric_cols = []
        for col in df.columns:
            if col != agent_col:
                try:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    if not numeric_series.isna().all():
                        numeric_cols.append(col)
                except:
                    continue
        
        if len(numeric_cols) == 0:
            return {"message": "Aucune colonne numérique pour agrégation"}
        
        try:
            # Créer une copie avec les colonnes nettoyées
            df_clean = df.copy()
            for col in numeric_cols:
                cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                df_clean[col] = pd.to_numeric(cleaned_series, errors='coerce')
            
            agent_agg = df_clean.groupby(agent_col)[numeric_cols].agg(['sum', 'mean', 'count'])
            
            # Convertir en format JSON sérialisable
            result = {}
            for col in numeric_cols:
                result[col] = {}
                for stat in ['sum', 'mean', 'count']:
                    values = agent_agg[col][stat].replace({np.nan: None}).to_dict()
                    result[col][stat] = {k: (float(v) if v is not None else None) for k, v in values.items()}
            
            return {
                'by_agent': result,
                'total_agents': int(df[agent_col].nunique())
            }
        except Exception as e:
            logger.error(f"Erreur agrégation par agent: {e}")
            return {"message": f"Erreur agrégation: {str(e)}"}
    
    def _aggregate_temporal(self, df: pd.DataFrame) -> Dict:
        """Agrégations temporelles"""
        # Identifier colonne temporelle
        temporal_col = None
        for col in df.columns:
            if any(keyword in col.lower() for keyword in ['month', 'date', 'period']):
                temporal_col = col
                break
        
        if not temporal_col:
            return {"message": "Aucune colonne temporelle identifiée"}
        
        # Identifier colonnes numériques
        numeric_cols = []
        for col in df.columns:
            if col != temporal_col:
                try:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    if not numeric_series.isna().all():
                        numeric_cols.append(col)
                except:
                    continue
        
        if len(numeric_cols) > 0:
            try:
                # Nettoyer les colonnes numériques
                df_clean = df.copy()
                for col in numeric_cols:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    df_clean[col] = pd.to_numeric(cleaned_series, errors='coerce')
                
                temporal_agg = df_clean.groupby(temporal_col)[numeric_cols].sum()
                temporal_dict = temporal_agg.replace({np.nan: None}).to_dict()
                
                # Convertir les valeurs en float
                result = {}
                for col, values in temporal_dict.items():
                    result[col] = {k: (float(v) if v is not None else None) for k, v in values.items()}
                
                return {
                    'by_period': result,
                    'periods_count': int(df[temporal_col].nunique())
                }
            except Exception as e:
                logger.error(f"Erreur agrégation temporelle: {e}")
                return {"message": f"Erreur agrégation: {str(e)}"}
        
        return {"message": "Aucune donnée numérique pour agrégation temporelle"}
    
    def _compute_advanced_statistics(self, df: pd.DataFrame) -> Dict:
        """Statistiques avancées"""
        numeric_df = df.select_dtypes(include=[np.number])
        
        stats = {}
        for col in numeric_df.columns:
            series = numeric_df[col].dropna()
            if len(series) > 1:
                mean_val = series.mean()
                std_val = series.std()
                
                stats[col] = {
                    'coefficient_variation': float(std_val / mean_val) if mean_val != 0 and not pd.isna(mean_val) else None,
                    'percentile_95': float(series.quantile(0.95)),
                    'percentile_5': float(series.quantile(0.05)),
                    'range': float(series.max() - series.min())
                }
        
        return stats
    
    def _compute_business_metrics(self, df: pd.DataFrame) -> Dict:
        """Métriques métier spécialisées"""
        metrics = {}
        
        # Identifier colonnes clés pour métriques métier
        for col in df.columns:
            col_lower = col.lower()
            
            # Métriques de conversion (pourcentages)
            if 'share' in col_lower or '%' in col:
                try:
                    cleaned_series = df[col].astype(str).str.replace('%', '').str.replace(',', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce') / 100
                    
                    if not numeric_series.isna().all():
                        metrics[f'{col}_conversion'] = {
                            'avg_conversion_rate': float(numeric_series.mean()),
                            'max_conversion_rate': float(numeric_series.max()),
                            'agents_above_10_percent': int((numeric_series > 0.1).sum())
                        }
                except Exception as e:
                    logger.warning(f"Erreur métriques conversion {col}: {e}")
            
            # Métriques de volume
            if any(keyword in col_lower for keyword in ['contracts', 'rentals', 'packages']):
                try:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    
                    if not numeric_series.isna().all():
                        metrics[f'{col}_volume'] = {
                            'total_volume': float(numeric_series.sum()),
                            'avg_volume': float(numeric_series.mean()),
                            'active_agents': int((numeric_series > 0).sum())
                        }
                except Exception as e:
                    logger.warning(f"Erreur métriques volume {col}: {e}")
        
        return metrics