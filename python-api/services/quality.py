"""
Service de vérification de la qualité des données
Analyse de complétude, cohérence et fiabilité des datasets
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from loguru import logger

class QualityChecker:
    """Vérificateur de qualité des données"""
    
    def __init__(self):
        self.ready = True
        self.quality_thresholds = {
            'completeness': 0.8,  # 80% de données complètes
            'consistency': 0.9,   # 90% de cohérence
            'validity': 0.85,     # 85% de validité
            'accuracy': 0.8       # 80% de précision estimée
        }
    
    def is_ready(self) -> bool:
        return self.ready
    
    def _get_dataframe(self, df_input: Any) -> pd.DataFrame:
        """Reconstituer le DataFrame depuis différents formats"""
        if isinstance(df_input, dict):
            if 'data' in df_input and 'columns' in df_input:
                return pd.DataFrame(df_input['data'])
            elif 'data' in df_input:
                return pd.DataFrame(df_input['data'])
            else:
                return pd.DataFrame(df_input)
        elif isinstance(df_input, pd.DataFrame):
            return df_input
        else:
            logger.warning(f"Format DataFrame inconnu pour quality check: {type(df_input)}")
            return pd.DataFrame()
    
    async def check_quality(self, df_input: Any, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Vérification complète de la qualité des données
        
        Returns:
            Dict contenant tous les indicateurs de qualité
        """
        try:
            df = self._get_dataframe(df_input)
            
            if df.empty:
                return self._get_empty_quality_report()
            
            quality_report = {
                'overall_score': 0.0,
                'completeness': self._check_completeness(df),
                'consistency': self._check_consistency(df),
                'validity': self._check_validity(df),
                'accuracy': self._check_accuracy(df),
                'uniqueness': self._check_uniqueness(df),
                'timeliness': self._check_timeliness(df, metadata),
                'integrity': self._check_integrity(df),
                'anomalies': self._detect_anomalies(df),
                'recommendations': []
            }
            
            # Calculer le score global
            quality_report['overall_score'] = self._calculate_overall_score(quality_report)
            
            # Générer des recommandations
            quality_report['recommendations'] = self._generate_quality_recommendations(quality_report)
            
            logger.info(f"Quality check terminé - Score: {quality_report['overall_score']:.1f}%")
            return quality_report
            
        except Exception as e:
            logger.error(f"Erreur quality check: {str(e)}")
            return self._get_error_quality_report(str(e))
    
    def _get_empty_quality_report(self) -> Dict[str, Any]:
        """Rapport de qualité pour un DataFrame vide"""
        return {
            'overall_score': 0.0,
            'completeness': {'score': 0.0, 'issues': ['Dataset vide']},
            'consistency': {'score': 0.0, 'issues': ['Dataset vide']},
            'validity': {'score': 0.0, 'issues': ['Dataset vide']},
            'accuracy': {'score': 0.0, 'issues': ['Dataset vide']},
            'uniqueness': {'score': 0.0, 'issues': ['Dataset vide']},
            'timeliness': {'score': 0.0, 'issues': ['Dataset vide']},
            'integrity': {'score': 0.0, 'issues': ['Dataset vide']},
            'anomalies': [],
            'recommendations': ['Vérifier la source des données']
        }
    
    def _get_error_quality_report(self, error_msg: str) -> Dict[str, Any]:
        """Rapport de qualité en cas d'erreur"""
        return {
            'overall_score': 0.0,
            'completeness': {'score': 0.0, 'issues': [f'Erreur: {error_msg}']},
            'consistency': {'score': 0.0, 'issues': []},
            'validity': {'score': 0.0, 'issues': []},
            'accuracy': {'score': 0.0, 'issues': []},
            'uniqueness': {'score': 0.0, 'issues': []},
            'timeliness': {'score': 0.0, 'issues': []},
            'integrity': {'score': 0.0, 'issues': []},
            'anomalies': [],
            'recommendations': ['Vérifier le format des données']
        }
    
    def _check_completeness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Vérification de la complétude des données"""
        total_cells = df.shape[0] * df.shape[1]
        missing_cells = df.isnull().sum().sum()
        completeness_ratio = (total_cells - missing_cells) / total_cells if total_cells > 0 else 0
        
        issues = []
        column_completeness = {}
        
        for col in df.columns:
            col_completeness = 1 - (df[col].isnull().sum() / len(df))
            column_completeness[col] = float(col_completeness)
            
            if col_completeness < 0.8:
                issues.append(f"Colonne '{col}': {(1-col_completeness)*100:.1f}% de valeurs manquantes")
        
        if completeness_ratio < self.quality_thresholds['completeness']:
            issues.append(f"Complétude globale faible: {completeness_ratio*100:.1f}%")
        
        return {
            'score': float(completeness_ratio * 100),
            'missing_cells': int(missing_cells),
            'total_cells': int(total_cells),
            'column_completeness': column_completeness,
            'issues': issues
        }
    
    def _check_consistency(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Vérification de la cohérence des données"""
        issues = []
        consistency_score = 1.0
        
        # 1. Vérifier la cohérence des types par colonne
        type_inconsistencies = 0
        for col in df.columns:
            if df[col].dtype == 'object':
                # Vérifier si certaines valeurs ressemblent à des nombres
                sample_values = df[col].dropna().head(100)
                numeric_like = 0
                for val in sample_values:
                    try:
                        float(str(val).replace(',', '').replace('"', ''))
                        numeric_like += 1
                    except:
                        pass
                
                if 0.3 < numeric_like / len(sample_values) < 0.9:
                    issues.append(f"Colonne '{col}': Types mixtes détectés")
                    type_inconsistencies += 1
        
        # 2. Vérifier les formats de données
        for col in df.columns:
            col_lower = col.lower()
            
            # Vérifier les formats de pourcentage
            if '%' in col_lower or 'rate' in col_lower:
                sample_values = df[col].astype(str).head(50)
                has_percent_symbol = sample_values.str.contains('%').sum()
                if 0 < has_percent_symbol < len(sample_values) * 0.8:
                    issues.append(f"Colonne '{col}': Format pourcentage incohérent")
            
            # Vérifier les formats monétaires
            if any(keyword in col_lower for keyword in ['revenue', 'price', 'cost', 'package']):
                sample_values = df[col].astype(str).head(50)
                has_comma = sample_values.str.contains(',').sum()
                has_quotes = sample_values.str.contains('"').sum()
                if has_comma > 0 and has_quotes != has_comma:
                    issues.append(f"Colonne '{col}': Format monétaire incohérent")
        
        # 3. Vérifier les patterns d'agents SIXT
        agent_cols = [col for col in df.columns if 'agent' in col.lower()]
        if agent_cols:
            agent_col = agent_cols[0]
            agent_values = df[agent_col].astype(str)
            
            # Pattern attendu: ID - Nom ou Exit Employee
            valid_pattern_count = 0
            for val in agent_values.head(100):
                if ' - ' in val or 'exit employee' in val.lower():
                    valid_pattern_count += 1
            
            pattern_ratio = valid_pattern_count / min(100, len(agent_values))
            if pattern_ratio < 0.9:
                issues.append(f"Colonne '{agent_col}': Pattern agent incohérent")
        
        # Calculer le score de cohérence
        if type_inconsistencies > 0:
            consistency_score -= (type_inconsistencies / len(df.columns)) * 0.3
        
        consistency_score = max(0, consistency_score)
        
        return {
            'score': float(consistency_score * 100),
            'type_inconsistencies': type_inconsistencies,
            'issues': issues
        }
    
    def _check_validity(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Vérification de la validité des données"""
        issues = []
        validity_score = 1.0
        invalid_values_count = 0
        
        for col in df.columns:
            col_lower = col.lower()
            
            # Vérifier les valeurs numériques négatives inappropriées
            if any(keyword in col_lower for keyword in ['count', 'number', '#', 'contracts']):
                try:
                    # Nettoyer et convertir en numérique
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    negative_count = (numeric_series < 0).sum()
                    
                    if negative_count > 0:
                        issues.append(f"Colonne '{col}': {negative_count} valeurs négatives inappropriées")
                        invalid_values_count += negative_count
                except:
                    pass
            
            # Vérifier les pourcentages hors limites
            if '%' in col or 'rate' in col_lower or 'share' in col_lower:
                try:
                    # Nettoyer les pourcentages
                    cleaned_series = df[col].astype(str).str.replace('%', '').str.replace(',', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    
                    # Vérifier si les valeurs sont dans une plage raisonnable
                    if not numeric_series.isna().all():
                        out_of_range = ((numeric_series < 0) | (numeric_series > 100)).sum()
                        if out_of_range > 0:
                            issues.append(f"Colonne '{col}': {out_of_range} pourcentages hors limites")
                            invalid_values_count += out_of_range
                except:
                    pass
            
            # Vérifier les valeurs aberrantes pour les colonnes financières
            if any(keyword in col_lower for keyword in ['revenue', 'package', 'ir']):
                try:
                    cleaned_series = df[col].astype(str).str.replace(',', '').str.replace('"', '')
                    numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                    
                    if not numeric_series.isna().all():
                        # Valeurs excessivement grandes (plus de 1M)
                        excessive_values = (numeric_series > 1000000).sum()
                        if excessive_values > 0:
                            issues.append(f"Colonne '{col}': {excessive_values} valeurs potentiellement aberrantes")
                except:
                    pass
        
        # Calculer le score de validité
        total_data_points = df.shape[0] * df.shape[1]
        if total_data_points > 0:
            validity_ratio = 1 - (invalid_values_count / total_data_points)
            validity_score = max(0, validity_ratio)
        
        return {
            'score': float(validity_score * 100),
            'invalid_values_count': int(invalid_values_count),
            'issues': issues
        }
    
    def _check_accuracy(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Estimation de la précision des données"""
        issues = []
        accuracy_indicators = []
        
        # 1. Vérifier la cohérence des calculs (si possible)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        # 2. Vérifier les totaux ou sous-totaux
        for col in df.columns:
            col_lower = col.lower()
            if 'total' in col_lower or 'sum' in col_lower:
                # Chercher une ligne de total
                last_rows = df.tail(3)
                for idx, row in last_rows.iterrows():
                    if any(keyword in str(row.iloc[0]).lower() for keyword in ['total', 'sum', ',']):
                        accuracy_indicators.append("Ligne de total détectée")
                        break
        
        # 3. Vérifier la cohérence des agents Exit Employee
        agent_cols = [col for col in df.columns if 'agent' in col.lower()]
        if agent_cols and len(numeric_cols) > 0:
            agent_col = agent_cols[0]
            exit_mask = df[agent_col].astype(str).str.contains('Exit Employee', na=False, case=False)
            
            if exit_mask.sum() > 0:
                # Vérifier si les Exit Employees ont des données cohérentes (souvent des zéros)
                exit_data = df[exit_mask]
                for num_col in numeric_cols[:3]:  # Vérifier les 3 premières colonnes numériques
                    try:
                        cleaned_series = exit_data[num_col].astype(str).str.replace(',', '').str.replace('"', '')
                        numeric_series = pd.to_numeric(cleaned_series, errors='coerce')
                        zero_ratio = (numeric_series == 0).sum() / len(numeric_series) if len(numeric_series) > 0 else 0
                        
                        if zero_ratio > 0.8:
                            accuracy_indicators.append(f"Exit Employees avec données cohérentes (mostly zeros) in {num_col}")
                    except:
                        pass
        
        # 4. Vérifier les patterns de données
        # Rechercher des patterns répétitifs suspects
        for col in df.columns:
            if df[col].dtype in ['object']:
                value_counts = df[col].value_counts()
                if len(value_counts) > 0:
                    most_common_ratio = value_counts.iloc[0] / len(df)
                    if most_common_ratio > 0.5 and len(value_counts) > 1:
                        issues.append(f"Colonne '{col}': {most_common_ratio*100:.1f}% de valeurs identiques")
        
        # Score basé sur les indicateurs trouvés
        base_accuracy = 80.0  # Score de base
        
        # Bonus pour chaque indicateur positif
        accuracy_bonus = len(accuracy_indicators) * 5
        
        # Malus pour chaque problème
        accuracy_malus = len(issues) * 10
        
        final_accuracy = max(0, min(100, base_accuracy + accuracy_bonus - accuracy_malus))
        
        return {
            'score': float(final_accuracy),
            'indicators': accuracy_indicators,
            'issues': issues
        }
    
    def _check_uniqueness(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Vérification de l'unicité des données"""
        issues = []
        
        # Vérifier les doublons de lignes
        duplicate_rows = df.duplicated().sum()
        
        # Vérifier l'unicité des identifiants
        id_columns = []
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['id', 'agent', 'employee']):
                id_columns.append(col)
        
        duplicate_ids = 0
        for col in id_columns:
            col_duplicates = df[col].duplicated().sum()
            duplicate_ids += col_duplicates
            if col_duplicates > 0:
                issues.append(f"Colonne '{col}': {col_duplicates} valeurs dupliquées")
        
        # Calculer le score d'unicité
        total_expected_unique = len(df) * len(id_columns) if id_columns else len(df)
        total_duplicates = duplicate_rows + duplicate_ids
        
        uniqueness_score = 1 - (total_duplicates / max(1, total_expected_unique))
        uniqueness_score = max(0, uniqueness_score)
        
        if duplicate_rows > 0:
            issues.append(f"{duplicate_rows} lignes entièrement dupliquées")
        
        return {
            'score': float(uniqueness_score * 100),
            'duplicate_rows': int(duplicate_rows),
            'duplicate_ids': int(duplicate_ids),
            'issues': issues
        }
    
    def _check_timeliness(self, df: pd.DataFrame, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Vérification de la fraîcheur des données"""
        issues = []
        timeliness_score = 85.0  # Score par défaut
        
        # Chercher des colonnes de dates
        date_columns = []
        for col in df.columns:
            col_lower = col.lower()
            if any(keyword in col_lower for keyword in ['date', 'month', 'year', 'time']):
                date_columns.append(col)
        
        if date_columns:
            for col in date_columns:
                try:
                    # Tenter de parser les dates
                    date_series = pd.to_datetime(df[col], errors='coerce')
                    valid_dates = date_series.dropna()
                    
                    if len(valid_dates) > 0:
                        latest_date = valid_dates.max()
                        oldest_date = valid_dates.min()
                        
                        # Vérifier si les données sont récentes (dernière année)
                        import datetime
                        now = datetime.datetime.now()
                        days_since_latest = (now - latest_date).days if pd.notna(latest_date) else 9999
                        
                        if days_since_latest > 365:
                            issues.append(f"Colonne '{col}': Données datent de plus d'un an")
                            timeliness_score -= 20
                        elif days_since_latest > 30:
                            issues.append(f"Colonne '{col}': Données datent de plus d'un mois")
                            timeliness_score -= 10
                        
                        # Vérifier la plage de dates
                        date_range = (latest_date - oldest_date).days if pd.notna(latest_date) and pd.notna(oldest_date) else 0
                        if date_range > 365 * 2:  # Plus de 2 ans
                            issues.append(f"Colonne '{col}': Très large plage temporelle ({date_range} jours)")
                        
                except Exception as e:
                    logger.debug(f"Erreur parsing dates pour {col}: {e}")
        else:
            # Pas de colonnes de dates détectées
            issues.append("Aucune colonne de date détectée - impossible de vérifier la fraîcheur")
            timeliness_score = 60.0
        
        return {
            'score': float(max(0, timeliness_score)),
            'date_columns_found': len(date_columns),
            'issues': issues
        }
    
    def _check_integrity(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Vérification de l'intégrité structurelle"""
        issues = []
        integrity_score = 100.0
        
        # 1. Vérifier la cohérence des en-têtes
        empty_headers = [col for col in df.columns if col.strip() == '' or pd.isna(col)]
        if empty_headers:
            issues.append(f"{len(empty_headers)} colonnes sans nom")
            integrity_score -= 20
        
        # 2. Vérifier les colonnes entièrement vides
        empty_columns = [col for col in df.columns if df[col].isna().all()]
        if empty_columns:
            issues.append(f"{len(empty_columns)} colonnes entièrement vides: {empty_columns}")
            integrity_score -= 10 * len(empty_columns)
        
        # 3. Vérifier les lignes entièrement vides
        empty_rows = df.isna().all(axis=1).sum()
        if empty_rows > 0:
            issues.append(f"{empty_rows} lignes entièrement vides")
            integrity_score -= min(20, empty_rows * 2)
        
        # 4. Vérifier la cohérence du nombre de colonnes
        if len(df.columns) < 2:
            issues.append("Très peu de colonnes détectées")
            integrity_score -= 30
        
        # 5. Vérifier les caractères spéciaux problématiques
        special_char_issues = 0
        for col in df.columns:
            if any(char in col for char in ['\n', '\r', '\t']):
                special_char_issues += 1
        
        if special_char_issues > 0:
            issues.append(f"{special_char_issues} colonnes avec caractères de contrôle")
            integrity_score -= special_char_issues * 5
        
        integrity_score = max(0, integrity_score)
        
        return {
            'score': float(integrity_score),
            'empty_columns': len(empty_columns),
            'empty_rows': int(empty_rows),
            'special_char_issues': special_char_issues,
            'issues': issues
        }
    
    def _detect_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Détection d'anomalies dans les données"""
        anomalies = []
        
        # 1. Anomalies numériques (outliers extrêmes)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            series = df[col].dropna()
            if len(series) > 4:
                Q1 = series.quantile(0.25)
                Q3 = series.quantile(0.75)
                IQR = Q3 - Q1
                extreme_outliers = series[(series < Q1 - 3*IQR) | (series > Q3 + 3*IQR)]
                
                if len(extreme_outliers) > 0:
                    anomalies.append({
                        'type': 'extreme_outlier',
                        'column': col,
                        'count': int(len(extreme_outliers)),
                        'description': f"{len(extreme_outliers)} valeurs extrêmement aberrantes"
                    })
        
        # 2. Anomalies de format
        for col in df.columns:
            if df[col].dtype == 'object':
                # Détecter des formats mixtes inhabituels
                sample_values = df[col].dropna().astype(str).head(100)
                lengths = sample_values.str.len()
                
                if len(lengths) > 10:
                    length_std = lengths.std()
                    length_mean = lengths.mean()
                    
                    # Si très grande variation de longueur
                    if length_std > length_mean * 0.5:
                        anomalies.append({
                            'type': 'format_inconsistency',
                            'column': col,
                            'count': 1,
                            'description': f"Grandes variations de longueur (std: {length_std:.1f})"
                        })
        
        # 3. Anomalies métier (spécifiques SIXT)
        agent_cols = [col for col in df.columns if 'agent' in col.lower()]
        if agent_cols:
            agent_col = agent_cols[0]
            
            # Vérifier si des agents ont des noms suspects
            agent_values = df[agent_col].astype(str)
            suspicious_agents = agent_values[agent_values.str.contains(r'[0-9]{10,}', na=False)]
            
            if len(suspicious_agents) > 0:
                anomalies.append({
                    'type': 'data_quality',
                    'column': agent_col,
                    'count': int(len(suspicious_agents)),
                    'description': "Agents avec noms suspects (IDs très longs)"
                })
        
        return anomalies
    
    def _calculate_overall_score(self, quality_report: Dict[str, Any]) -> float:
        """Calcul du score global de qualité"""
        weights = {
            'completeness': 0.25,
            'consistency': 0.20,
            'validity': 0.20,
            'accuracy': 0.15,
            'uniqueness': 0.10,
            'timeliness': 0.05,
            'integrity': 0.05
        }
        
        weighted_score = 0.0
        total_weight = 0.0
        
        for dimension, weight in weights.items():
            if dimension in quality_report and 'score' in quality_report[dimension]:
                weighted_score += quality_report[dimension]['score'] * weight
                total_weight += weight
        
        return weighted_score / total_weight if total_weight > 0 else 0.0
    
    def _generate_quality_recommendations(self, quality_report: Dict[str, Any]) -> List[str]:
        """Génération de recommandations basées sur l'analyse qualité"""
        recommendations = []
        overall_score = quality_report.get('overall_score', 0)
        
        # Recommandations générales basées sur le score
        if overall_score >= 90:
            recommendations.append("🎉 Excellente qualité de données - dataset prêt pour l'analyse")
        elif overall_score >= 80:
            recommendations.append("✅ Bonne qualité de données - quelques améliorations mineures possibles")
        elif overall_score >= 70:
            recommendations.append("⚠️ Qualité acceptable - attention aux points de vigilance")
        elif overall_score >= 60:
            recommendations.append("❌ Qualité problématique - nettoyage recommandé")
        else:
            recommendations.append("🚨 Qualité critique - révision complète nécessaire")
        
        # Recommandations spécifiques par dimension
        if quality_report.get('completeness', {}).get('score', 100) < 80:
            recommendations.append("📊 Traiter les valeurs manquantes avant analyse")
        
        if quality_report.get('consistency', {}).get('score', 100) < 80:
            recommendations.append("🔧 Standardiser les formats de données")
        
        if quality_report.get('validity', {}).get('score', 100) < 80:
            recommendations.append("✂️ Nettoyer les valeurs aberrantes")
        
        if quality_report.get('uniqueness', {}).get('score', 100) < 90:
            recommendations.append("🗑️ Éliminer les doublons détectés")
        
        if quality_report.get('timeliness', {}).get('score', 100) < 70:
            recommendations.append("📅 Vérifier la fraîcheur des données")
        
        # Recommandations basées sur les anomalies
        anomalies = quality_report.get('anomalies', [])
        if anomalies:
            recommendations.append(f"🔍 Investiguer {len(anomalies)} anomalie(s) détectée(s)")
        
        return recommendations