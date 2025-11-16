"""
Service d'analyse de données universel
Analyse intelligente de tous types de datasets CSV avec détection automatique des patterns business
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple, Union
from loguru import logger
import re
from collections import Counter
from datetime import datetime
import json

class DataAnalyzer:
    """Analyseur de données universel - compatible tous domaines business"""
    
    def __init__(self):
        self.ready = True
        
        # Domaines business détectables
        self.business_domains = {
            'rental_car': {
                'keywords': ['branch', 'upsell', 'upgrade', 'proposal', 'downgrade', 'rental', 'car', 'vehicle', 'fleet'],
                'metrics': ['price', 'revenue', 'up', 'down', 'proposal'],
                'entities': ['branch', 'location', 'station']
            },
            'sales': {
                'keywords': ['revenue', 'profit', 'commission', 'target', 'achievement', 'sales', 'deal', 'conversion'],
                'metrics': ['amount', 'total', 'commission', 'target', 'achievement'],
                'entities': ['salesperson', 'agent', 'territory', 'region']
            },
            'hr': {
                'keywords': ['employee', 'department', 'salary', 'performance', 'evaluation', 'hr', 'staff'],
                'metrics': ['salary', 'rating', 'score', 'bonus'],
                'entities': ['employee', 'department', 'manager', 'team']
            },
            'finance': {
                'keywords': ['amount', 'cost', 'price', 'budget', 'expense', 'financial', 'accounting'],
                'metrics': ['amount', 'cost', 'expense', 'budget', 'profit', 'loss'],
                'entities': ['account', 'center', 'department']
            },
            'marketing': {
                'keywords': ['campaign', 'conversion', 'click', 'impression', 'ctr', 'marketing', 'advertising'],
                'metrics': ['clicks', 'impressions', 'conversions', 'ctr', 'cpc', 'cpm'],
                'entities': ['campaign', 'channel', 'source']
            },
            'ecommerce': {
                'keywords': ['product', 'order', 'customer', 'purchase', 'cart', 'checkout', 'shipping'],
                'metrics': ['price', 'quantity', 'total', 'shipping'],
                'entities': ['customer', 'product', 'order', 'category']
            },
            'logistics': {
                'keywords': ['delivery', 'shipping', 'transport', 'warehouse', 'inventory', 'stock'],
                'metrics': ['quantity', 'weight', 'volume', 'time', 'cost'],
                'entities': ['warehouse', 'route', 'vehicle', 'driver']
            }
        }
        
        # Patterns de performance universels
        self.performance_keywords = [
            'revenue', 'profit', 'sales', 'income', 'earnings', 'total', 'amount',
            'price', 'cost', 'value', 'score', 'rating', 'performance', 'efficiency',
            'target', 'goal', 'achievement', 'kpi', 'metric', 'volume', 'quantity'
        ]
        
        # Patterns d'entités universels
        self.entity_keywords = [
            'id', 'name', 'code', 'ref', 'reference', 'number', 'num',
            'branch', 'office', 'store', 'location', 'region', 'territory',
            'agent', 'employee', 'user', 'customer', 'client', 'account',
            'product', 'item', 'service', 'category', 'type', 'group'
        ]
    
    def is_ready(self) -> bool:
        return self.ready
    
    async def analyze_dataframe(self, dataframe_data: Dict[str, Any], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyse universelle d'un DataFrame
        
        Args:
            dataframe_data: Données du DataFrame
            metadata: Métadonnées d'extraction
            
        Returns:
            Dict avec analyse complète
        """
        
        try:
            logger.info("🧠 Début analyse universelle du DataFrame")
            
            # Reconstituer le DataFrame
            df = self._reconstruct_dataframe(dataframe_data)
            logger.info(f"📊 DataFrame reconstitué: {df.shape}")
            
            # 1. Analyse universelle des colonnes
            column_analysis = self._analyze_all_columns_universal(df)
            logger.info(f"🔍 Analyse colonnes: {len(column_analysis)} colonnes analysées")
            
            # 2. Détection automatique du domaine business
            domain_detection = self._detect_business_domain(df, metadata)
            logger.info(f"🎯 Domaine détecté: {domain_detection.get('primary_domain', 'unknown')}")
            
            # 3. Analyse des relations entre colonnes
            column_relationships = self._analyze_column_relationships(df)
            logger.info(f"🔗 Relations analysées: {len(column_relationships)} relations")
            
            # 4. Statistiques descriptives universelles
            descriptive_stats = self._generate_descriptive_statistics(df)
            logger.info("📈 Statistiques descriptives générées")
            
            # 5. Détection des patterns de données
            data_patterns = self._detect_universal_data_patterns(df)
            logger.info(f"🔍 Patterns détectés: {len(data_patterns)} types")
            
            # 6. Analyse de la distribution des données
            distribution_analysis = self._analyze_data_distributions(df)
            logger.info("📊 Distribution des données analysée")
            
            # 7. Détection des outliers et anomalies
            anomaly_detection = self._detect_anomalies_universal(df)
            logger.info(f"⚠️ Anomalies: {len(anomaly_detection.get('outliers', []))} détectées")
            
            logger.info("✅ Analyse universelle terminée avec succès")
            
            return {
                'success': True,
                'column_analysis': column_analysis,
                'domain_detection': domain_detection,
                'column_relationships': column_relationships,
                'descriptive_stats': descriptive_stats,
                'data_patterns': data_patterns,
                'distribution_analysis': distribution_analysis,
                'anomaly_detection': anomaly_detection,
                'analysis_summary': self._generate_analysis_summary(df, domain_detection)
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse universelle: {str(e)}")
            return {
                'success': False,
                'error': f"Erreur analyse: {str(e)}"
            }
    
    async def detect_business_patterns(self, dataframe_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Détection spécialisée des patterns business
        
        Args:
            dataframe_data: Données du DataFrame
            
        Returns:
            Dict avec patterns business détectés
        """
        
        try:
            logger.info("🎯 Début détection patterns business")
            
            df = self._reconstruct_dataframe(dataframe_data)
            
            # 1. Détection automatique du domaine
            domain_info = self._detect_business_domain(df, {})
            primary_domain = domain_info.get('primary_domain', 'unknown')
            
            logger.info(f"🏢 Domaine principal: {primary_domain}")
            
            # 2. Analyse des métriques business universelles
            business_metrics = self._analyze_business_metrics_universal(df)
            
            # 3. Analyse des entités business
            entity_analysis = self._analyze_business_entities(df)
            
            # 4. Détection des KPIs automatiquement
            kpi_detection = self._detect_kpis_automatic(df)
            
            # 5. Analyse des patterns spécifiques au domaine
            domain_specific_patterns = self._analyze_domain_specific_patterns(df, primary_domain)
            
            # 6. Détection des tendances et corrélations
            trend_analysis = self._analyze_business_trends(df)
            
            # 7. Identification des top/bottom performers
            performance_ranking = self._rank_performance_universal(df)
            
            logger.info("✅ Détection patterns business terminée")
            
            return {
                'domain_info': domain_info,
                'business_metrics': business_metrics,
                'entity_analysis': entity_analysis,
                'kpi_detection': kpi_detection,
                'domain_specific_patterns': domain_specific_patterns,
                'trend_analysis': trend_analysis,
                'performance_ranking': performance_ranking,
                'insights': self._generate_business_insights(df, domain_info)
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur détection patterns business: {str(e)}")
            return {
                'success': False,
                'error': f"Erreur patterns business: {str(e)}"
            }
    
    async def generate_recommendations(self, dataframe_data: Dict[str, Any], analysis_result: Dict[str, Any]) -> List[str]:
        """
        Génère des recommandations basées sur l'analyse - MÉTHODE LEGACY POUR COMPATIBILITÉ
        
        Args:
            dataframe_data: Données du DataFrame
            analysis_result: Résultat de l'analyse précédente
            
        Returns:
            List des recommandations
        """
        
        try:
            df = self._reconstruct_dataframe(dataframe_data)
            
            recommendations = []
            
            # 1. Recommandations basées sur la qualité des données
            missing_ratio = df.isnull().sum().sum() / (len(df) * len(df.columns))
            if missing_ratio > 0.1:
                recommendations.append(f"Améliorer la qualité des données - {missing_ratio:.1%} de valeurs manquantes détectées")
            
            # 2. Recommandations basées sur l'analyse
            if 'domain_detection' in analysis_result:
                domain = analysis_result['domain_detection'].get('primary_domain', 'unknown')
                
                if domain == 'rental_car':
                    recommendations.append("Optimiser les stratégies d'upselling en analysant les branches les plus performantes")
                    recommendations.append("Analyser les facteurs influençant les taux de downgrade pour les réduire")
                elif domain == 'sales':
                    recommendations.append("Identifier les meilleures pratiques des top performers pour la formation")
                    recommendations.append("Optimiser l'allocation des territoires basée sur les performances")
                elif domain == 'hr':
                    recommendations.append("Analyser les patterns de rétention des employés haute performance")
                    recommendations.append("Développer des programmes de formation ciblés par département")
                elif domain == 'finance':
                    recommendations.append("Optimiser l'allocation budgétaire basée sur l'analyse des coûts")
                    recommendations.append("Identifier les centres de coûts nécessitant plus d'attention")
            
            # 3. Recommandations basées sur les patterns détectés
            if 'business_metrics' in analysis_result:
                metrics = analysis_result['business_metrics'].get('identified_metrics', [])
                if len(metrics) > 3:
                    recommendations.append("Créer un dashboard de suivi pour les métriques clés identifiées")
                
                # Analyser les métriques de pourcentage
                percentage_metrics = [m for m in metrics if '%' in m.lower() or 'percent' in m.lower()]
                if percentage_metrics:
                    recommendations.append("Établir des benchmarks pour les métriques en pourcentage afin de suivre l'évolution")
            
            # 4. Recommandations basées sur la structure des données
            numeric_cols = len(df.select_dtypes(include=[np.number]).columns)
            if numeric_cols > 5:
                recommendations.append("Effectuer une analyse de corrélation approfondie entre les variables numériques")
            
            if len(df) > 1000:
                recommendations.append("Considérer une segmentation des données pour des insights plus granulaires")
            
            # 5. Recommandations spécifiques aux outliers
            for col in df.select_dtypes(include=[np.number]).columns:
                outliers_count = self._count_outliers(df[col])
                if outliers_count > len(df) * 0.05:  # Plus de 5% d'outliers
                    recommendations.append(f"Investiguer les valeurs aberrantes dans '{col}' ({outliers_count} détectées)")
                    break  # Une recommandation suffit pour les outliers
            
            # 6. Recommandations pour l'amélioration continue
            if len(df.columns) > 10:
                recommendations.append("Prioriser les variables les plus importantes pour simplifier l'analyse")
            
            # S'assurer qu'on a des recommandations
            if not recommendations:
                recommendations = [
                    "Données de bonne qualité détectées - continuer le monitoring régulier",
                    "Mettre en place des alertes automatiques pour détecter les changements de patterns",
                    "Documenter les insights découverts pour référence future"
                ]
            
            # Limiter à 10 recommandations maximum pour éviter la surcharge
            return recommendations[:10]
            
        except Exception as e:
            logger.error(f"Erreur génération recommandations: {str(e)}")
            return [
                "Erreur lors de la génération des recommandations",
                "Vérifier la qualité des données d'entrée",
                "Consulter les logs pour plus de détails"
            ]

    # ... Le reste du code reste exactement identique ...
    # (Je continue avec toutes les autres méthodes sans changement)
    
    def _reconstruct_dataframe(self, dataframe_data: Dict[str, Any]) -> pd.DataFrame:
        """Reconstitue un DataFrame depuis les données JSON"""
        
        if 'data' in dataframe_data and 'columns' in dataframe_data:
            df = pd.DataFrame(dataframe_data['data'])
            if dataframe_data['columns']:
                df.columns = dataframe_data['columns']
        elif 'data' in dataframe_data:
            df = pd.DataFrame(dataframe_data['data'])
        else:
            df = pd.DataFrame(dataframe_data)
        
        return df
    
    def _analyze_all_columns_universal(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse universelle et approfondie de toutes les colonnes"""
        
        analysis = {}
        
        for col in df.columns:
            col_analysis = {
                'basic_stats': self._get_basic_column_stats(df, col),
                'data_type_analysis': self._analyze_column_data_type(df, col),
                'business_relevance': self._assess_business_relevance(col),
                'quality_assessment': self._assess_column_quality(df, col),
                'pattern_detection': self._detect_column_patterns(df, col)
            }
            
            # Analyse spécialisée selon le type détecté
            if col_analysis['data_type_analysis']['is_numeric']:
                col_analysis['numeric_analysis'] = self._analyze_numeric_column(df, col)
            
            if col_analysis['data_type_analysis']['is_categorical']:
                col_analysis['categorical_analysis'] = self._analyze_categorical_column(df, col)
            
            if col_analysis['data_type_analysis']['is_percentage']:
                col_analysis['percentage_analysis'] = self._analyze_percentage_column(df, col)
            
            analysis[col] = col_analysis
        
        return analysis
    
    def _get_basic_column_stats(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Statistiques de base pour une colonne"""
        
        return {
            'count': int(df[col].count()),
            'null_count': int(df[col].isnull().sum()),
            'unique_count': int(df[col].nunique()),
            'duplicate_count': int(df[col].duplicated().sum()),
            'null_percentage': round(df[col].isnull().sum() / len(df) * 100, 2),
            'unique_percentage': round(df[col].nunique() / len(df) * 100, 2)
        }
    
    def _analyze_column_data_type(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse approfondie du type de données d'une colonne"""
        
        sample = df[col].dropna()
        if len(sample) == 0:
            return {'is_empty': True}
        
        sample_str = sample.astype(str)
        
        analysis = {
            'pandas_dtype': str(df[col].dtype),
            'is_numeric': False,
            'is_categorical': False,
            'is_datetime': False,
            'is_percentage': False,
            'is_currency': False,
            'is_identifier': False,
            'special_patterns': []
        }
        
        # Détection numérique
        try:
            pd.to_numeric(sample, errors='coerce')
            numeric_ratio = pd.to_numeric(sample, errors='coerce').notna().sum() / len(sample)
            if numeric_ratio > 0.8:
                analysis['is_numeric'] = True
        except:
            pass
        
        # Détection pourcentages
        if sample_str.str.contains('%').sum() / len(sample) > 0.5:
            analysis['is_percentage'] = True
            analysis['special_patterns'].append('percentage')
        
        # Détection monnaie
        currency_pattern = r'[$€£¥]|USD|EUR|CHF|GBP'
        if sample_str.str.contains(currency_pattern, case=False).sum() / len(sample) > 0.3:
            analysis['is_currency'] = True
            analysis['special_patterns'].append('currency')
        
        # Détection catégorique
        unique_ratio = sample.nunique() / len(sample)
        if unique_ratio < 0.5 and sample.nunique() < 50:
            analysis['is_categorical'] = True
        
        # Détection identifiant
        if unique_ratio > 0.9:
            analysis['is_identifier'] = True
            analysis['special_patterns'].append('identifier')
        
        # Détection codes/références
        if sample_str.str.contains(r'\d{3,}|\w+\d+|\d+\w+').sum() / len(sample) > 0.7:
            analysis['special_patterns'].append('code_reference')
        
        return analysis
    
    def _assess_business_relevance(self, column_name: str) -> Dict[str, Any]:
        """Évalue la pertinence business d'une colonne"""
        
        col_lower = column_name.lower()
        
        relevance = {
            'is_performance_metric': False,
            'is_entity_identifier': False,
            'is_temporal': False,
            'business_category': 'other',
            'importance_score': 0
        }
        
        # Performance metrics
        for keyword in self.performance_keywords:
            if keyword in col_lower:
                relevance['is_performance_metric'] = True
                relevance['business_category'] = 'performance'
                relevance['importance_score'] += 3
                break
        
        # Entity identifiers
        for keyword in self.entity_keywords:
            if keyword in col_lower:
                relevance['is_entity_identifier'] = True
                relevance['business_category'] = 'entity'
                relevance['importance_score'] += 2
                break
        
        # Temporal indicators
        temporal_keywords = ['date', 'time', 'year', 'month', 'day', 'period']
        for keyword in temporal_keywords:
            if keyword in col_lower:
                relevance['is_temporal'] = True
                relevance['business_category'] = 'temporal'
                relevance['importance_score'] += 2
                break
        
        # Pourcentages et ratios
        if any(keyword in col_lower for keyword in ['%', 'percent', 'ratio', 'rate']):
            relevance['importance_score'] += 2
        
        return relevance
    
    def _assess_column_quality(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Évaluation de la qualité d'une colonne"""
        
        total_rows = len(df)
        null_count = df[col].isnull().sum()
        completeness = 1 - (null_count / total_rows)
        
        # Détection des valeurs aberrantes dans les strings
        if df[col].dtype == 'object':
            sample = df[col].dropna().astype(str)
            if len(sample) > 0:
                avg_length = sample.str.len().mean()
                length_std = sample.str.len().std()
                unusual_lengths = ((sample.str.len() - avg_length).abs() > 3 * length_std).sum()
            else:
                unusual_lengths = 0
        else:
            unusual_lengths = 0
        
        quality_score = completeness * 100
        if unusual_lengths / total_rows > 0.1:  # Plus de 10% de valeurs inhabituelles
            quality_score -= 10
        
        return {
            'completeness': round(completeness * 100, 2),
            'quality_score': round(quality_score, 2),
            'issues': self._identify_column_issues(df, col),
            'recommendations': self._generate_column_recommendations(df, col)
        }
    
    def _identify_column_issues(self, df: pd.DataFrame, col: str) -> List[str]:
        """Identifie les problèmes spécifiques d'une colonne"""
        
        issues = []
        null_percentage = df[col].isnull().sum() / len(df) * 100
        
        if null_percentage > 50:
            issues.append(f"Trop de valeurs manquantes ({null_percentage:.1f}%)")
        elif null_percentage > 20:
            issues.append(f"Valeurs manquantes significatives ({null_percentage:.1f}%)")
        
        if df[col].dtype == 'object':
            sample = df[col].dropna().astype(str)
            if len(sample) > 0:
                # Détection de formats inconsistants
                length_variance = sample.str.len().var()
                if length_variance > 100:  # Grande variance dans les longueurs
                    issues.append("Formats de données inconsistants détectés")
                
                # Détection de caractères spéciaux problématiques
                special_chars = sample.str.contains(r'[^\w\s\-\.\%\$\€\£]', regex=True).sum()
                if special_chars / len(sample) > 0.1:
                    issues.append("Caractères spéciaux inhabituels détectés")
        
        return issues
    
    def _generate_column_recommendations(self, df: pd.DataFrame, col: str) -> List[str]:
        """Génère des recommandations pour améliorer une colonne"""
        
        recommendations = []
        null_percentage = df[col].isnull().sum() / len(df) * 100
        
        if null_percentage > 20:
            recommendations.append(f"Investiguer les causes des valeurs manquantes dans '{col}'")
        
        if df[col].dtype == 'object':
            sample = df[col].dropna().astype(str)
            if len(sample) > 0:
                # Vérifier si peut être converti en numérique
                numeric_convertible = 0
                for val in sample.head(20):
                    try:
                        float(str(val).replace('%', '').replace(',', '').replace('€', '').replace('$', ''))
                        numeric_convertible += 1
                    except:
                        pass
                
                if numeric_convertible / min(20, len(sample)) > 0.8:
                    recommendations.append(f"Colonne '{col}' pourrait être convertie en numérique")
        
        if not recommendations:
            recommendations.append("Aucune amélioration immédiate suggérée")
        
        return recommendations
    
    def _detect_column_patterns(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Détecte les patterns spécifiques dans une colonne"""
        
        patterns = {
            'has_patterns': False,
            'detected_patterns': []
        }
        
        if df[col].dtype == 'object':
            sample = df[col].dropna().astype(str)
            if len(sample) == 0:
                return patterns
            
            # Pattern codes (ex: 8139, ABC123)
            if sample.str.contains(r'^\d{3,6}$').sum() / len(sample) > 0.7:
                patterns['detected_patterns'].append('numeric_codes')
                patterns['has_patterns'] = True
            
            # Pattern codes alphanumériques
            if sample.str.contains(r'^[A-Z0-9]{3,}$').sum() / len(sample) > 0.5:
                patterns['detected_patterns'].append('alphanumeric_codes')
                patterns['has_patterns'] = True
            
            # Pattern pourcentages
            if sample.str.contains(r'\d+\.?\d*%').sum() / len(sample) > 0.5:
                patterns['detected_patterns'].append('percentages')
                patterns['has_patterns'] = True
            
            # Pattern noms de lieux (contient des parenthèses, tirets)
            if sample.str.contains(r'[A-Za-z]+\s*[\(\-]').sum() / len(sample) > 0.5:
                patterns['detected_patterns'].append('location_names')
                patterns['has_patterns'] = True
        
        return patterns
    
    # Toutes les autres méthodes restent identiques... (continuité du code original)
    # Note: Pour économiser l'espace, je référence le fait que toutes les autres méthodes 
    # du analyzer_PARFAIT.py restent exactement les mêmes
    
    def _analyze_numeric_column(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse approfondie d'une colonne numérique"""
        
        numeric_data = pd.to_numeric(df[col], errors='coerce')
        
        if numeric_data.count() == 0:
            return {'error': 'Pas de données numériques valides'}
        
        return {
            'mean': float(numeric_data.mean()),
            'median': float(numeric_data.median()),
            'std': float(numeric_data.std()),
            'min': float(numeric_data.min()),
            'max': float(numeric_data.max()),
            'q25': float(numeric_data.quantile(0.25)),
            'q75': float(numeric_data.quantile(0.75)),
            'skewness': float(numeric_data.skew()),
            'kurtosis': float(numeric_data.kurtosis()),
            'outliers_count': self._count_outliers(numeric_data),
            'distribution_type': self._classify_distribution(numeric_data)
        }
    
    def _analyze_categorical_column(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse approfondie d'une colonne catégorielle"""
        
        value_counts = df[col].value_counts()
        
        return {
            'unique_values': int(df[col].nunique()),
            'most_frequent': value_counts.index[0] if len(value_counts) > 0 else None,
            'most_frequent_count': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
            'least_frequent': value_counts.index[-1] if len(value_counts) > 0 else None,
            'least_frequent_count': int(value_counts.iloc[-1]) if len(value_counts) > 0 else 0,
            'value_distribution': value_counts.head(10).to_dict(),
            'entropy': self._calculate_entropy(value_counts),
            'concentration_ratio': self._calculate_concentration_ratio(value_counts)
        }
    
    def _analyze_percentage_column(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse spécialisée pour les colonnes de pourcentages"""
        
        # Extraire les valeurs numériques des pourcentages
        sample = df[col].dropna().astype(str)
        numeric_values = []
        
        for val in sample:
            try:
                # Nettoyer et convertir
                cleaned = val.replace('%', '').replace(',', '').replace(' ', '')
                numeric_values.append(float(cleaned))
            except:
                pass
        
        if not numeric_values:
            return {'error': 'Impossible d\'extraire les valeurs numériques'}
        
        numeric_series = pd.Series(numeric_values)
        
        return {
            'average_percentage': round(numeric_series.mean(), 2),
            'median_percentage': round(numeric_series.median(), 2),
            'min_percentage': round(numeric_series.min(), 2),
            'max_percentage': round(numeric_series.max(), 2),
            'std_percentage': round(numeric_series.std(), 2),
            'negative_count': int((numeric_series < 0).sum()),
            'zero_count': int((numeric_series == 0).sum()),
            'above_100_count': int((numeric_series > 100).sum()),
            'quartiles': {
                'q25': round(numeric_series.quantile(0.25), 2),
                'q50': round(numeric_series.quantile(0.50), 2),
                'q75': round(numeric_series.quantile(0.75), 2)
            }
        }
    
    def _detect_business_domain(self, df: pd.DataFrame, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Détection automatique du domaine business"""
        
        # Analyser les noms de colonnes
        all_columns_text = ' '.join(df.columns).lower()
        
        domain_scores = {}
        
        for domain, config in self.business_domains.items():
            score = 0
            matched_keywords = []
            
            # Compter les correspondances de keywords
            for keyword in config['keywords']:
                if keyword in all_columns_text:
                    score += 2
                    matched_keywords.append(keyword)
            
            # Compter les correspondances de métriques
            for metric in config['metrics']:
                if metric in all_columns_text:
                    score += 3  # Poids plus élevé pour les métriques
                    matched_keywords.append(metric)
            
            # Compter les correspondances d'entités
            for entity in config['entities']:
                if entity in all_columns_text:
                    score += 2
                    matched_keywords.append(entity)
            
            if score > 0:
                domain_scores[domain] = {
                    'score': score,
                    'matched_keywords': matched_keywords,
                    'confidence': min(score / 10, 1.0)  # Normaliser à 1.0 max
                }
        
        # Déterminer le domaine principal
        if domain_scores:
            primary_domain = max(domain_scores.items(), key=lambda x: x[1]['score'])
            primary_domain_name = primary_domain[0]
            primary_domain_info = primary_domain[1]
        else:
            primary_domain_name = 'unknown'
            primary_domain_info = {'score': 0, 'matched_keywords': [], 'confidence': 0}
        
        return {
            'primary_domain': primary_domain_name,
            'confidence': primary_domain_info['confidence'],
            'matched_keywords': primary_domain_info['matched_keywords'],
            'all_domain_scores': domain_scores,
            'domain_explanation': self._explain_domain_detection(primary_domain_name, primary_domain_info)
        }
    
    def _explain_domain_detection(self, domain: str, info: Dict[str, Any]) -> str:
        """Explique pourquoi ce domaine a été détecté"""
        
        if domain == 'unknown':
            return "Aucun domaine business spécifique détecté dans les colonnes"
        
        keywords = ', '.join(info['matched_keywords'][:5])  # Limiter à 5 mots-clés
        confidence_pct = int(info['confidence'] * 100)
        
        return f"Domaine '{domain}' détecté avec {confidence_pct}% de confiance basé sur: {keywords}"
    
    def _analyze_business_metrics_universal(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse universelle des métriques business"""
        
        metrics = {}
        
        # Identifier les colonnes de performance potentielles
        for col in df.columns:
            col_lower = col.lower()
            
            # Vérifier si c'est une métrique de performance
            is_performance_metric = any(keyword in col_lower for keyword in self.performance_keywords)
            
            if is_performance_metric:
                # Analyser selon le type de données
                if df[col].dtype in ['float64', 'int64']:
                    metrics[col] = self._analyze_numeric_performance_metric(df, col)
                elif df[col].dtype == 'object':
                    # Vérifier si ce sont des pourcentages ou montants
                    sample = df[col].dropna().astype(str)
                    if len(sample) > 0:
                        if sample.str.contains('%').any():
                            metrics[col] = self._analyze_percentage_metric(df, col)
                        elif sample.str.contains(r'[\$€£¥]').any():
                            metrics[col] = self._analyze_currency_metric(df, col)
        
        return {
            'identified_metrics': list(metrics.keys()),
            'metrics_analysis': metrics,
            'summary': self._summarize_metrics_analysis(metrics)
        }
    
    def _analyze_numeric_performance_metric(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse d'une métrique de performance numérique"""
        
        data = df[col].dropna()
        if len(data) == 0:
            return {'error': 'Pas de données'}
        
        return {
            'total': float(data.sum()),
            'average': float(data.mean()),
            'median': float(data.median()),
            'min': float(data.min()),
            'max': float(data.max()),
            'std': float(data.std()),
            'best_performer_index': int(data.idxmax()),
            'worst_performer_index': int(data.idxmin()),
            'top_10_percent_threshold': float(data.quantile(0.9)),
            'bottom_10_percent_threshold': float(data.quantile(0.1))
        }
    
    def _analyze_percentage_metric(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse d'une métrique sous forme de pourcentage"""
        
        # Extraire les valeurs numériques
        sample = df[col].dropna().astype(str)
        numeric_values = []
        
        for val in sample:
            try:
                cleaned = val.replace('%', '').replace(',', '').replace(' ', '')
                numeric_values.append(float(cleaned))
            except:
                pass
        
        if not numeric_values:
            return {'error': 'Impossible d\'extraire les pourcentages'}
        
        data = pd.Series(numeric_values)
        
        return {
            'average_percentage': round(data.mean(), 2),
            'median_percentage': round(data.median(), 2),
            'best_percentage': round(data.max(), 2),
            'worst_percentage': round(data.min(), 2),
            'std_percentage': round(data.std(), 2),
            'above_average_count': int((data > data.mean()).sum()),
            'negative_values_count': int((data < 0).sum()),
            'excellent_threshold': round(data.quantile(0.9), 2),
            'poor_threshold': round(data.quantile(0.1), 2)
        }
    
    def _analyze_currency_metric(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse d'une métrique monétaire"""
        
        sample = df[col].dropna().astype(str)
        numeric_values = []
        
        for val in sample:
            try:
                # Nettoyer les symboles monétaires et convertir
                cleaned = re.sub(r'[$€£¥,]', '', val).replace(' ', '')
                numeric_values.append(float(cleaned))
            except:
                pass
        
        if not numeric_values:
            return {'error': 'Impossible d\'extraire les montants'}
        
        data = pd.Series(numeric_values)
        
        return {
            'total_amount': round(data.sum(), 2),
            'average_amount': round(data.mean(), 2),
            'median_amount': round(data.median(), 2),
            'highest_amount': round(data.max(), 2),
            'lowest_amount': round(data.min(), 2),
            'high_value_threshold': round(data.quantile(0.8), 2),
            'low_value_threshold': round(data.quantile(0.2), 2)
        }
    
    def _analyze_business_entities(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse des entités business (branches, agents, etc.)"""
        
        entities = {}
        
        for col in df.columns:
            col_lower = col.lower()
            
            # Vérifier si c'est une colonne d'entité
            is_entity = any(keyword in col_lower for keyword in self.entity_keywords)
            
            if is_entity or df[col].nunique() / len(df) < 0.8:  # Critère de cardinalité
                entity_analysis = {
                    'unique_count': int(df[col].nunique()),
                    'total_count': int(df[col].count()),
                    'null_count': int(df[col].isnull().sum()),
                    'top_entities': df[col].value_counts().head(10).to_dict(),
                    'entity_distribution': self._analyze_entity_distribution(df[col])
                }
                
                entities[col] = entity_analysis
        
        return entities
    
    def _analyze_entity_distribution(self, series: pd.Series) -> Dict[str, Any]:
        """Analyse la distribution d'une colonne d'entités"""
        
        value_counts = series.value_counts()
        
        return {
            'most_frequent_entity': value_counts.index[0] if len(value_counts) > 0 else None,
            'most_frequent_count': int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
            'single_occurrence_entities': int((value_counts == 1).sum()),
            'distribution_evenness': self._calculate_distribution_evenness(value_counts)
        }
    
    def _calculate_distribution_evenness(self, value_counts: pd.Series) -> float:
        """Calcule l'uniformité de la distribution (0 = très inégale, 1 = parfaitement égale)"""
        if len(value_counts) <= 1:
            return 1.0
        
        # Utiliser l'entropie normalisée
        total = value_counts.sum()
        probabilities = value_counts / total
        entropy = -sum(p * np.log2(p) for p in probabilities if p > 0)
        max_entropy = np.log2(len(value_counts))
        
        return entropy / max_entropy if max_entropy > 0 else 0
    
    def _detect_kpis_automatic(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Détection automatique des KPIs dans le dataset"""
        
        potential_kpis = {}
        
        for col in df.columns:
            col_lower = col.lower()
            
            # Score d'importance pour déterminer si c'est un KPI
            kpi_score = 0
            kpi_indicators = []
            
            # Mots-clés KPI
            kpi_keywords = ['target', 'goal', 'objective', 'kpi', 'metric', 'performance', 'achievement']
            for keyword in kpi_keywords:
                if keyword in col_lower:
                    kpi_score += 3
                    kpi_indicators.append(f"KPI keyword: {keyword}")
            
            # Mots-clés performance
            for keyword in self.performance_keywords:
                if keyword in col_lower:
                    kpi_score += 2
                    kpi_indicators.append(f"Performance keyword: {keyword}")
            
            # Pourcentages (souvent des KPIs)
            if '%' in col or 'percent' in col_lower or 'ratio' in col_lower:
                kpi_score += 2
                kpi_indicators.append("Percentage/ratio indicator")
            
            # Données numériques avec variance significative
            if df[col].dtype in ['float64', 'int64']:
                if df[col].std() > 0 and df[col].count() > 0:
                    cv = df[col].std() / df[col].mean()  # Coefficient de variation
                    if cv > 0.1:  # Variance significative
                        kpi_score += 1
                        kpi_indicators.append("Significant variance in numeric data")
            
            if kpi_score >= 2:  # Seuil pour considérer comme KPI potentiel
                potential_kpis[col] = {
                    'kpi_score': kpi_score,
                    'indicators': kpi_indicators,
                    'confidence': min(kpi_score / 6, 1.0),
                    'analysis': self._analyze_kpi_performance(df, col)
                }
        
        return {
            'detected_kpis': list(potential_kpis.keys()),
            'kpi_analysis': potential_kpis,
            'summary': f"{len(potential_kpis)} KPIs potentiels détectés"
        }
    
    def _analyze_kpi_performance(self, df: pd.DataFrame, col: str) -> Dict[str, Any]:
        """Analyse la performance d'un KPI"""
        
        if df[col].dtype in ['float64', 'int64']:
            data = df[col].dropna()
            if len(data) == 0:
                return {'error': 'Pas de données'}
            
            return {
                'current_avg': round(data.mean(), 2),
                'target_benchmark': round(data.quantile(0.75), 2),  # 75e percentile comme benchmark
                'performance_spread': round(data.max() - data.min(), 2),
                'improvement_potential': round(data.quantile(0.9) - data.mean(), 2)
            }
        
        # Pour les données textuelles (pourcentages, etc.)
        elif df[col].dtype == 'object':
            sample = df[col].dropna().astype(str)
            if sample.str.contains('%').any():
                # Traiter comme pourcentage
                numeric_values = []
                for val in sample:
                    try:
                        cleaned = val.replace('%', '').replace(',', '')
                        numeric_values.append(float(cleaned))
                    except:
                        pass
                
                if numeric_values:
                    data = pd.Series(numeric_values)
                    return {
                        'current_avg': round(data.mean(), 2),
                        'target_benchmark': round(data.quantile(0.75), 2),
                        'best_performance': round(data.max(), 2),
                        'worst_performance': round(data.min(), 2)
                    }
        
        return {'error': 'Type de données non supporté pour l\'analyse KPI'}
    
    def _analyze_domain_specific_patterns(self, df: pd.DataFrame, domain: str) -> Dict[str, Any]:
        """Analyse des patterns spécifiques au domaine détecté"""
        
        if domain == 'unknown':
            return {'message': 'Aucun pattern spécifique - domaine non identifié'}
        
        domain_patterns = {}
        
        if domain == 'rental_car':
            domain_patterns = self._analyze_rental_car_patterns(df)
        elif domain == 'sales':
            domain_patterns = self._analyze_sales_patterns(df)
        elif domain == 'hr':
            domain_patterns = self._analyze_hr_patterns(df)
        elif domain == 'finance':
            domain_patterns = self._analyze_finance_patterns(df)
        elif domain == 'marketing':
            domain_patterns = self._analyze_marketing_patterns(df)
        
        return domain_patterns
    
    def _analyze_rental_car_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Patterns spécifiques au secteur location de voitures"""
        
        patterns = {}
        
        # Chercher les colonnes spécifiques au rental car
        branch_col = self._find_column_containing(df, ['branch', 'location', 'station'])
        upsell_cols = self._find_columns_containing(df, ['upsell', 'upgrade', 'up'])
        price_cols = self._find_columns_containing(df, ['price', 'cost', 'amount'])
        
        if branch_col:
            patterns['branch_analysis'] = {
                'total_branches': int(df[branch_col].nunique()),
                'top_performing_branches': df[branch_col].value_counts().head(5).to_dict()
            }
        
        if upsell_cols:
            patterns['upsell_analysis'] = {}
            for col in upsell_cols:
                if df[col].dtype == 'object' and df[col].astype(str).str.contains('%').any():
                    patterns['upsell_analysis'][col] = self._analyze_percentage_metric(df, col)
        
        if price_cols:
            patterns['pricing_analysis'] = {}
            for col in price_cols:
                if df[col].dtype in ['float64', 'int64']:
                    patterns['pricing_analysis'][col] = self._analyze_numeric_performance_metric(df, col)
        
        return patterns
    
    def _analyze_sales_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Patterns spécifiques au secteur ventes"""
        
        patterns = {}
        
        revenue_cols = self._find_columns_containing(df, ['revenue', 'sales', 'amount'])
        agent_col = self._find_column_containing(df, ['agent', 'salesperson', 'rep'])
        
        if revenue_cols:
            patterns['revenue_analysis'] = {}
            for col in revenue_cols:
                if df[col].dtype in ['float64', 'int64']:
                    patterns['revenue_analysis'][col] = self._analyze_numeric_performance_metric(df, col)
        
        if agent_col:
            patterns['agent_performance'] = self._analyze_agent_performance(df, agent_col, revenue_cols)
        
        return patterns
    
    def _analyze_hr_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Patterns spécifiques aux RH"""
        
        patterns = {}
        
        employee_col = self._find_column_containing(df, ['employee', 'staff', 'worker'])
        dept_col = self._find_column_containing(df, ['department', 'dept', 'division'])
        salary_cols = self._find_columns_containing(df, ['salary', 'pay', 'compensation'])
        
        if employee_col:
            patterns['workforce_analysis'] = {
                'total_employees': int(df[employee_col].nunique())
            }
        
        if dept_col:
            patterns['department_analysis'] = {
                'departments': df[dept_col].value_counts().to_dict()
            }
        
        return patterns
    
    def _analyze_finance_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Patterns spécifiques à la finance"""
        
        patterns = {}
        
        amount_cols = self._find_columns_containing(df, ['amount', 'cost', 'expense', 'budget'])
        account_col = self._find_column_containing(df, ['account', 'center', 'department'])
        
        if amount_cols:
            patterns['financial_metrics'] = {}
            for col in amount_cols:
                if df[col].dtype in ['float64', 'int64']:
                    patterns['financial_metrics'][col] = self._analyze_numeric_performance_metric(df, col)
        
        return patterns
    
    def _analyze_marketing_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Patterns spécifiques au marketing"""
        
        patterns = {}
        
        campaign_col = self._find_column_containing(df, ['campaign', 'channel', 'source'])
        metric_cols = self._find_columns_containing(df, ['clicks', 'impressions', 'conversions', 'ctr'])
        
        if campaign_col:
            patterns['campaign_analysis'] = {
                'total_campaigns': int(df[campaign_col].nunique())
            }
        
        if metric_cols:
            patterns['marketing_metrics'] = {}
            for col in metric_cols:
                if df[col].dtype in ['float64', 'int64']:
                    patterns['marketing_metrics'][col] = self._analyze_numeric_performance_metric(df, col)
        
        return patterns
    
    def _find_column_containing(self, df: pd.DataFrame, keywords: List[str]) -> Optional[str]:
        """Trouve la première colonne contenant un des mots-clés"""
        
        for col in df.columns:
            col_lower = col.lower()
            for keyword in keywords:
                if keyword in col_lower:
                    return col
        return None
    
    def _find_columns_containing(self, df: pd.DataFrame, keywords: List[str]) -> List[str]:
        """Trouve toutes les colonnes contenant un des mots-clés"""
        
        matching_cols = []
        for col in df.columns:
            col_lower = col.lower()
            for keyword in keywords:
                if keyword in col_lower:
                    matching_cols.append(col)
                    break
        return matching_cols
    
    def _analyze_agent_performance(self, df: pd.DataFrame, agent_col: str, metric_cols: List[str]) -> Dict[str, Any]:
        """Analyse la performance des agents/vendeurs"""
        
        if not metric_cols:
            return {'error': 'Aucune métrique de performance trouvée'}
        
        # Utiliser la première métrique numérique trouvée
        performance_col = None
        for col in metric_cols:
            if df[col].dtype in ['float64', 'int64']:
                performance_col = col
                break
        
        if not performance_col:
            return {'error': 'Aucune métrique numérique trouvée'}
        
        agent_performance = df.groupby(agent_col)[performance_col].agg(['sum', 'mean', 'count']).reset_index()
        agent_performance = agent_performance.sort_values('sum', ascending=False)
        
        return {
            'performance_metric': performance_col,
            'top_performers': agent_performance.head(5).to_dict('records'),
            'bottom_performers': agent_performance.tail(5).to_dict('records'),
            'total_agents': int(len(agent_performance))
        }
    
    def _analyze_business_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse des tendances business"""
        
        trends = {}
        
        # Chercher des colonnes temporelles
        date_cols = []
        for col in df.columns:
            if df[col].dtype == 'datetime64[ns]' or 'date' in col.lower() or 'time' in col.lower():
                date_cols.append(col)
        
        if date_cols:
            trends['temporal_analysis'] = 'Colonnes temporelles détectées - analyse chronologique possible'
        
        # Analyser les corrélations entre métriques numériques
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if len(numeric_cols) >= 2:
            correlation_matrix = df[numeric_cols].corr()
            # Trouver les corrélations les plus fortes
            correlations = []
            for i, col1 in enumerate(numeric_cols):
                for j, col2 in enumerate(numeric_cols[i+1:], i+1):
                    corr_value = correlation_matrix.loc[col1, col2]
                    if abs(corr_value) > 0.5:  # Corrélation significative
                        correlations.append({
                            'column1': col1,
                            'column2': col2,
                            'correlation': round(corr_value, 3),
                            'strength': 'Strong' if abs(corr_value) > 0.7 else 'Moderate'
                        })
            
            trends['correlations'] = sorted(correlations, key=lambda x: abs(x['correlation']), reverse=True)
        
        return trends
    
    def _rank_performance_universal(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Classement de performance universel"""
        
        rankings = {}
        
        # Identifier la première colonne d'entité
        entity_col = None
        for col in df.columns:
            if df[col].nunique() / len(df) < 0.8 and df[col].nunique() > 1:
                entity_col = col
                break
        
        if not entity_col:
            return {'error': 'Aucune colonne d\'entité appropriée trouvée'}
        
        # Identifier les métriques de performance
        performance_cols = []
        for col in df.columns:
            if col != entity_col and df[col].dtype in ['float64', 'int64']:
                performance_cols.append(col)
        
        if not performance_cols:
            return {'error': 'Aucune métrique de performance numérique trouvée'}
        
        # Créer les rankings pour chaque métrique
        for metric_col in performance_cols[:3]:  # Limiter à 3 métriques pour éviter la surcharge
            try:
                grouped = df.groupby(entity_col)[metric_col].agg(['sum', 'mean', 'count']).reset_index()
                grouped = grouped.sort_values('sum', ascending=False)
                
                rankings[f'{metric_col}_ranking'] = {
                    'top_5': grouped.head(5).to_dict('records'),
                    'bottom_5': grouped.tail(5).to_dict('records'),
                    'metric_column': metric_col,
                    'entity_column': entity_col
                }
            except Exception as e:
                logger.warning(f"Erreur ranking pour {metric_col}: {e}")
        
        return rankings
    
    def _analyze_column_relationships(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse des relations entre colonnes"""
        
        relationships = {}
        
        # Analyser les relations entre colonnes numériques
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) >= 2:
            correlation_analysis = self._detailed_correlation_analysis(df[numeric_cols])
            relationships['numeric_correlations'] = correlation_analysis
        
        # Analyser les relations entre colonnes catégorielles et numériques
        categorical_cols = df.select_dtypes(include=['object']).columns.tolist()
        
        if categorical_cols and numeric_cols:
            categorical_numeric_relations = self._analyze_categorical_numeric_relations(df, categorical_cols, numeric_cols)
            relationships['categorical_numeric_relations'] = categorical_numeric_relations
        
        return relationships
    
    def _detailed_correlation_analysis(self, numeric_df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse détaillée des corrélations"""
        
        correlation_matrix = numeric_df.corr()
        
        strong_correlations = []
        moderate_correlations = []
        
        cols = correlation_matrix.columns
        for i, col1 in enumerate(cols):
            for j, col2 in enumerate(cols[i+1:], i+1):
                corr_value = correlation_matrix.loc[col1, col2]
                
                if not np.isnan(corr_value):
                    if abs(corr_value) > 0.7:
                        strong_correlations.append({
                            'column1': col1,
                            'column2': col2,
                            'correlation': round(corr_value, 3),
                            'interpretation': 'Very strong positive' if corr_value > 0.7 else 'Very strong negative'
                        })
                    elif abs(corr_value) > 0.5:
                        moderate_correlations.append({
                            'column1': col1,
                            'column2': col2,
                            'correlation': round(corr_value, 3),
                            'interpretation': 'Moderate positive' if corr_value > 0.5 else 'Moderate negative'
                        })
        
        return {
            'strong_correlations': strong_correlations,
            'moderate_correlations': moderate_correlations,
            'correlation_matrix_summary': {
                'highest_correlation': float(correlation_matrix.abs().max().max()),
                'average_correlation': float(correlation_matrix.abs().mean().mean())
            }
        }
    
    def _analyze_categorical_numeric_relations(self, df: pd.DataFrame, cat_cols: List[str], num_cols: List[str]) -> Dict[str, Any]:
        """Analyse relations entre colonnes catégorielles et numériques"""
        
        relations = []
        
        for cat_col in cat_cols[:3]:  # Limiter pour performance
            if df[cat_col].nunique() < 20:  # Éviter les colonnes avec trop de catégories
                for num_col in num_cols[:3]:  # Limiter pour performance
                    try:
                        grouped = df.groupby(cat_col)[num_col].agg(['mean', 'std', 'count'])
                        variance_between = grouped['mean'].var()
                        variance_within = grouped['std'].mean()
                        
                        if variance_between > 0:
                            relations.append({
                                'categorical_column': cat_col,
                                'numeric_column': num_col,
                                'variance_ratio': round(variance_between / variance_within, 3) if variance_within > 0 else 0,
                                'categories_count': int(df[cat_col].nunique()),
                                'relationship_strength': 'Strong' if variance_between / variance_within > 2 else 'Weak' if variance_within > 0 else 'Unknown'
                            })
                    except Exception:
                        continue
        
        return sorted(relations, key=lambda x: x.get('variance_ratio', 0), reverse=True)
    
    def _generate_descriptive_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Génération de statistiques descriptives universelles"""
        
        stats = {
            'dataset_overview': {
                'total_rows': int(len(df)),
                'total_columns': int(len(df.columns)),
                'memory_usage_mb': round(df.memory_usage(deep=True).sum() / 1024 / 1024, 2)
            },
            'data_types': {
                'numeric_columns': int(len(df.select_dtypes(include=[np.number]).columns)),
                'text_columns': int(len(df.select_dtypes(include=['object']).columns)),
                'datetime_columns': int(len(df.select_dtypes(include=['datetime64']).columns))
            },
            'missing_data': {
                'total_missing_cells': int(df.isnull().sum().sum()),
                'columns_with_missing': int((df.isnull().sum() > 0).sum()),
                'worst_column': df.isnull().sum().idxmax() if df.isnull().sum().sum() > 0 else None,
                'worst_column_missing_pct': round(df.isnull().sum().max() / len(df) * 100, 2) if df.isnull().sum().sum() > 0 else 0
            }
        }
        
        # Statistiques pour colonnes numériques
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            numeric_stats = df[numeric_cols].describe()
            stats['numeric_summary'] = {
                'columns': list(numeric_cols),
                'summary_stats': numeric_stats.round(2).to_dict()
            }
        
        return stats
    
    def _detect_universal_data_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Détection de patterns universels dans les données"""
        
        patterns = {
            'detected_patterns': [],
            'pattern_details': {}
        }
        
        # Pattern 1: Colonnes avec beaucoup de valeurs uniques (identifiants)
        for col in df.columns:
            uniqueness = df[col].nunique() / len(df)
            if uniqueness > 0.95:
                patterns['detected_patterns'].append(f'{col}: Likely identifier column')
                patterns['pattern_details'][f'{col}_identifier'] = {
                    'uniqueness_ratio': round(uniqueness, 3),
                    'pattern_type': 'identifier'
                }
        
        # Pattern 2: Colonnes avec peu de valeurs uniques (catégories)
        for col in df.columns:
            if df[col].nunique() < 10 and len(df) > 20:
                patterns['detected_patterns'].append(f'{col}: Categorical/grouping column')
                patterns['pattern_details'][f'{col}_categorical'] = {
                    'unique_values': int(df[col].nunique()),
                    'pattern_type': 'categorical',
                    'top_values': df[col].value_counts().head(3).to_dict()
                }
        
        # Pattern 3: Colonnes numériques avec faible variance (constantes)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if df[col].std() / df[col].mean() < 0.1 and df[col].mean() != 0:  # Coefficient de variation faible
                patterns['detected_patterns'].append(f'{col}: Low variance (nearly constant)')
                patterns['pattern_details'][f'{col}_low_variance'] = {
                    'coefficient_of_variation': round(df[col].std() / df[col].mean(), 4),
                    'pattern_type': 'low_variance'
                }
        
        # Pattern 4: Colonnes avec distribution bimodale
        for col in numeric_cols:
            if len(df[col].dropna()) > 10:
                # Détection simple de bimodalité basée sur l'histogramme
                hist, _ = np.histogram(df[col].dropna(), bins=10)
                peaks = np.where((hist[1:-1] > hist[:-2]) & (hist[1:-1] > hist[2:]))[0] + 1
                if len(peaks) >= 2:
                    patterns['detected_patterns'].append(f'{col}: Potential bimodal distribution')
                    patterns['pattern_details'][f'{col}_bimodal'] = {
                        'peaks_detected': int(len(peaks)),
                        'pattern_type': 'bimodal_distribution'
                    }
        
        return patterns
    
    def _analyze_data_distributions(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyse de la distribution des données"""
        
        distributions = {}
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            data = df[col].dropna()
            if len(data) > 5:
                distributions[col] = {
                    'distribution_type': self._classify_distribution(data),
                    'skewness': round(data.skew(), 3),
                    'kurtosis': round(data.kurtosis(), 3),
                    'normality_test': self._test_normality_simple(data),
                    'outliers_info': self._analyze_outliers_detailed(data)
                }
        
        return distributions
    
    def _classify_distribution(self, data: pd.Series) -> str:
        """Classification simple du type de distribution"""
        
        skewness = data.skew()
        kurtosis = data.kurtosis()
        
        if abs(skewness) < 0.5 and abs(kurtosis) < 3:
            return 'approximately_normal'
        elif skewness > 1:
            return 'right_skewed'
        elif skewness < -1:
            return 'left_skewed'
        elif kurtosis > 3:
            return 'heavy_tailed'
        elif kurtosis < -1:
            return 'light_tailed'
        else:
            return 'unknown'
    
    def _test_normality_simple(self, data: pd.Series) -> str:
        """Test de normalité simple basé sur les statistiques"""
        
        if len(data) < 8:
            return 'insufficient_data'
        
        skewness = abs(data.skew())
        kurtosis = abs(data.kurtosis())
        
        if skewness < 0.5 and kurtosis < 1:
            return 'likely_normal'
        elif skewness > 2 or kurtosis > 4:
            return 'clearly_non_normal'
        else:
            return 'possibly_normal'
    
    def _detect_anomalies_universal(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Détection universelle d'anomalies"""
        
        anomalies = {
            'outliers': [],
            'data_quality_issues': [],
            'anomaly_summary': {}
        }
        
        # Détection d'outliers pour colonnes numériques
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        total_outliers = 0
        
        for col in numeric_cols:
            outliers = self._detect_outliers_iqr(df[col])
            if len(outliers) > 0:
                total_outliers += len(outliers)
                anomalies['outliers'].append({
                    'column': col,
                    'outlier_count': len(outliers),
                    'outlier_indices': outliers.tolist()[:10],  # Limiter à 10 pour éviter surcharge
                    'outlier_percentage': round(len(outliers) / len(df) * 100, 2)
                })
        
        # Détection de problèmes de qualité
        for col in df.columns:
            # Valeurs aberrantes dans les strings (longueurs inhabituelles)
            if df[col].dtype == 'object':
                sample = df[col].dropna().astype(str)
                if len(sample) > 0:
                    avg_length = sample.str.len().mean()
                    std_length = sample.str.len().std()
                    
                    unusual_lengths = sample[sample.str.len() > avg_length + 3 * std_length]
                    if len(unusual_lengths) > 0:
                        anomalies['data_quality_issues'].append({
                            'column': col,
                            'issue': 'unusual_string_lengths',
                            'count': len(unusual_lengths),
                            'examples': unusual_lengths.head(3).tolist()
                        })
            
            # Valeurs dupliquées suspectes
            if df[col].dtype != 'object':  # Pour colonnes numériques
                if df[col].duplicated().sum() > len(df) * 0.5:  # Plus de 50% de doublons
                    anomalies['data_quality_issues'].append({
                        'column': col,
                        'issue': 'excessive_duplicates',
                        'duplicate_percentage': round(df[col].duplicated().sum() / len(df) * 100, 2)
                    })
        
        anomalies['anomaly_summary'] = {
            'total_outliers': total_outliers,
            'columns_with_outliers': len([x for x in anomalies['outliers']]),
            'data_quality_issues_count': len(anomalies['data_quality_issues'])
        }
        
        return anomalies
    
    def _detect_outliers_iqr(self, series: pd.Series) -> pd.Index:
        """Détection d'outliers avec méthode IQR"""
        
        data = series.dropna()
        if len(data) < 4:
            return pd.Index([])
        
        Q1 = data.quantile(0.25)
        Q3 = data.quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        
        outlier_mask = (data < lower_bound) | (data > upper_bound)
        return data[outlier_mask].index
    
    def _count_outliers(self, data: pd.Series) -> int:
        """Compte les outliers dans une série"""
        return len(self._detect_outliers_iqr(data))
    
    def _analyze_outliers_detailed(self, data: pd.Series) -> Dict[str, Any]:
        """Analyse détaillée des outliers"""
        
        outliers_indices = self._detect_outliers_iqr(data)
        
        if len(outliers_indices) == 0:
            return {
                'outliers_count': 0,
                'outliers_percentage': 0,
                'has_outliers': False
            }
        
        outliers_values = data[outliers_indices]
        
        return {
            'outliers_count': len(outliers_indices),
            'outliers_percentage': round(len(outliers_indices) / len(data) * 100, 2),
            'has_outliers': True,
            'outliers_range': {
                'min': float(outliers_values.min()),
                'max': float(outliers_values.max())
            },
            'main_data_range': {
                'min': float(data.quantile(0.25) - 1.5 * (data.quantile(0.75) - data.quantile(0.25))),
                'max': float(data.quantile(0.75) + 1.5 * (data.quantile(0.75) - data.quantile(0.25)))
            }
        }
    
    def _summarize_metrics_analysis(self, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Résumé de l'analyse des métriques"""
        
        if not metrics:
            return {'message': 'Aucune métrique de performance identifiée'}
        
        summary = {
            'total_metrics': len(metrics),
            'metric_types': {},
            'key_insights': []
        }
        
        # Classifier les types de métriques
        for metric_name, metric_data in metrics.items():
            if 'percentage' in metric_name.lower() or '%' in metric_name:
                summary['metric_types']['percentage'] = summary['metric_types'].get('percentage', 0) + 1
            elif any(keyword in metric_name.lower() for keyword in ['price', 'cost', 'amount', 'revenue']):
                summary['metric_types']['financial'] = summary['metric_types'].get('financial', 0) + 1
            else:
                summary['metric_types']['other'] = summary['metric_types'].get('other', 0) + 1
        
        # Générer des insights clés
        if summary['metric_types'].get('percentage', 0) > 0:
            summary['key_insights'].append(f"{summary['metric_types']['percentage']} métriques en pourcentage détectées")
        
        if summary['metric_types'].get('financial', 0) > 0:
            summary['key_insights'].append(f"{summary['metric_types']['financial']} métriques financières identifiées")
        
        return summary
    
    def _generate_analysis_summary(self, df: pd.DataFrame, domain_detection: Dict[str, Any]) -> Dict[str, Any]:
        """Génère un résumé complet de l'analyse"""
        
        return {
            'dataset_characteristics': {
                'rows': len(df),
                'columns': len(df.columns),
                'estimated_domain': domain_detection.get('primary_domain', 'unknown'),
                'domain_confidence': domain_detection.get('confidence', 0)
            },
            'data_quality_overview': {
                'completeness': round((1 - df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100, 2),
                'columns_with_missing_data': int((df.isnull().sum() > 0).sum()),
                'duplicate_rows': int(df.duplicated().sum())
            },
            'column_type_breakdown': {
                'numeric': int(len(df.select_dtypes(include=[np.number]).columns)),
                'text': int(len(df.select_dtypes(include=['object']).columns)),
                'datetime': int(len(df.select_dtypes(include=['datetime64']).columns))
            },
            'analysis_recommendations': self._generate_analysis_recommendations(df, domain_detection)
        }
    
    def _generate_analysis_recommendations(self, df: pd.DataFrame, domain_detection: Dict[str, Any]) -> List[str]:
        """Génère des recommandations basées sur l'analyse"""
        
        recommendations = []
        
        # Recommandations basées sur la qualité des données
        missing_data_ratio = df.isnull().sum().sum() / (len(df) * len(df.columns))
        if missing_data_ratio > 0.1:
            recommendations.append(f"Améliorer la qualité des données - {missing_data_ratio:.1%} de valeurs manquantes")
        
        # Recommandations basées sur le domaine
        domain = domain_detection.get('primary_domain', 'unknown')
        if domain == 'rental_car':
            recommendations.append("Analyser les patterns d'upselling par branche pour optimiser les revenus")
            recommendations.append("Identifier les facteurs de succès des branches les plus performantes")
        elif domain == 'sales':
            recommendations.append("Analyser la performance des vendeurs pour identifier les meilleures pratiques")
            recommendations.append("Optimiser la répartition territoriale basée sur les résultats")
        elif domain == 'hr':
            recommendations.append("Analyser les patterns de rétention et de performance des employés")
            recommendations.append("Identifier les départements nécessitant plus d'attention")
        elif domain == 'unknown':
            recommendations.append("Analyser plus en détail pour identifier le domaine métier spécifique")
        
        # Recommandations basées sur la structure des données
        numeric_cols = len(df.select_dtypes(include=[np.number]).columns)
        if numeric_cols > 3:
            recommendations.append("Effectuer une analyse de corrélation approfondie entre les métriques numériques")
        
        if len(df) > 1000:
            recommendations.append("Considérer une segmentation des données pour une analyse plus granulaire")
        
        return recommendations[:5]  # Limiter à 5 recommandations principales
    
    def _generate_business_insights(self, df: pd.DataFrame, domain_info: Dict[str, Any]) -> List[str]:
        """Génère des insights business automatiques"""
        
        insights = []
        domain = domain_info.get('primary_domain', 'unknown')
        
        # Insights généraux sur la taille du dataset
        insights.append(f"Dataset de {len(df)} enregistrements analysés avec {len(df.columns)} variables")
        
        # Insights spécifiques au domaine
        if domain == 'rental_car':
            # Chercher des patterns spécifiques au rental car
            branch_col = self._find_column_containing(df, ['branch', 'location'])
            if branch_col:
                unique_branches = df[branch_col].nunique()
                insights.append(f"Analyse de {unique_branches} branches/locations différentes")
                
                # Top performer
                performance_cols = self._find_columns_containing(df, ['price', 'revenue', 'amount'])
                if performance_cols:
                    perf_col = performance_cols[0]
                    if df[perf_col].dtype in ['float64', 'int64']:
                        top_branch = df.groupby(branch_col)[perf_col].mean().idxmax()
                        insights.append(f"Branche la plus performante: {top_branch}")
            
            # Analyser les patterns d'upselling
            upsell_cols = self._find_columns_containing(df, ['upsell', 'upgrade', 'up'])
            if upsell_cols:
                insights.append(f"Données d'upselling disponibles pour {len(upsell_cols)} métriques")
        
        elif domain == 'sales':
            # Insights ventes
            revenue_cols = self._find_columns_containing(df, ['revenue', 'sales', 'amount'])
            if revenue_cols:
                total_revenue = df[revenue_cols[0]].sum() if df[revenue_cols[0]].dtype in ['float64', 'int64'] else 0
                insights.append(f"Revenus total analysé: {total_revenue:,.2f}" if total_revenue > 0 else "Données de revenus détectées")
        
        elif domain == 'hr':
            # Insights RH
            employee_col = self._find_column_containing(df, ['employee', 'staff'])
            if employee_col:
                total_employees = df[employee_col].nunique()
                insights.append(f"Données de {total_employees} employés analysées")
        
        # Insights sur la qualité des données
        missing_ratio = df.isnull().sum().sum() / (len(df) * len(df.columns))
        if missing_ratio < 0.05:
            insights.append("Excellente qualité des données (< 5% de valeurs manquantes)")
        elif missing_ratio > 0.2:
            insights.append(f"Qualité des données à améliorer ({missing_ratio:.1%} de valeurs manquantes)")
        
        # Insights sur la diversité des données
        numeric_cols = len(df.select_dtypes(include=[np.number]).columns)
        if numeric_cols > len(df.columns) / 2:
            insights.append("Dataset riche en métriques quantitatives - excellente base pour l'analyse")
        
        return insights[:7]  # Limiter à 7 insights pour la lisibilité
    
    def _calculate_entropy(self, value_counts: pd.Series) -> float:
        """Calcule l'entropie d'une distribution"""
        
        if len(value_counts) == 0:
            return 0
        
        total = value_counts.sum()
        probabilities = value_counts / total
        entropy = -sum(p * np.log2(p) for p in probabilities if p > 0)
        
        return round(entropy, 3)
    
    def _calculate_concentration_ratio(self, value_counts: pd.Series) -> float:
        """Calcule le ratio de concentration (part des top valeurs)"""
        
        if len(value_counts) == 0:
            return 0
        
        total = value_counts.sum()
        top_values_sum = value_counts.head(min(3, len(value_counts))).sum()
        
        return round(top_values_sum / total, 3)