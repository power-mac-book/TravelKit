"""
Configuration for the interest clustering algorithm
"""

# Clustering Algorithm Configuration
CLUSTERING_CONFIG = {
    # Minimum group sizes
    "min_group_size": 4,
    "max_group_size": 20,
    "optimal_group_size": 8,
    
    # Compatibility scoring weights
    "compatibility_weights": {
        "date_overlap": 0.40,      # 40% - Most important factor
        "group_size": 0.25,        # 25% - Second most important
        "budget": 0.20,           # 20% - Budget compatibility
        "lead_time": 0.15         # 15% - Planning horizon similarity
    },
    
    # Compatibility thresholds
    "compatibility_thresholds": {
        "high": 0.8,              # High compatibility (automatic grouping)
        "medium": 0.6,            # Medium compatibility (consider grouping)
        "low": 0.4,               # Low compatibility (avoid grouping)
        "minimum": 0.3            # Minimum viable compatibility
    },
    
    # Date overlap parameters
    "date_overlap": {
        "perfect_overlap_threshold": 0.8,   # 80%+ overlap considered perfect
        "good_overlap_threshold": 0.5,      # 50%+ overlap considered good
        "acceptable_overlap_threshold": 0.2  # 20%+ overlap considered acceptable
    },
    
    # Group size compatibility
    "group_size": {
        "perfect_match_bonus": 1.0,         # Same size = perfect match
        "similar_size_threshold": 0.7,      # Size ratio > 70% = similar
        "acceptable_size_threshold": 0.5,   # Size ratio > 50% = acceptable
        "large_group_penalty": 0.1          # Penalty for very large groups
    },
    
    # Budget compatibility
    "budget": {
        "no_budget_default_score": 0.8,     # Default score when budget unknown
        "perfect_overlap_threshold": 0.9,    # 90%+ budget overlap = perfect
        "good_overlap_threshold": 0.5,       # 50%+ budget overlap = good
        "budget_flexibility": 0.2            # 20% flexibility in budget ranges
    },
    
    # Lead time compatibility
    "lead_time": {
        "same_week_threshold": 7,           # Within 7 days = same planning horizon
        "same_month_threshold": 30,         # Within 30 days = similar planning
        "max_lead_time_diff": 90           # Maximum acceptable difference (days)
    },
    
    # ML Clustering parameters
    "ml_clustering": {
        "min_samples_for_ml": 10,           # Minimum interests needed for ML
        "max_clusters": 8,                  # Maximum number of clusters
        "silhouette_score_threshold": 0.3,  # Minimum acceptable silhouette score
        "feature_scaling": "robust",        # "standard" or "robust"
        "algorithms": {
            "agglomerative": {
                "enabled": True,
                "linkage": "ward",
                "distance_threshold": None
            },
            "kmeans": {
                "enabled": True,
                "n_init": 10,
                "random_state": 42
            },
            "dbscan": {
                "enabled": True,
                "eps_values": [0.3, 0.5, 0.8, 1.0],
                "min_samples": 2
            }
        }
    },
    
    # Pricing configuration
    "pricing": {
        "discount_tiers": [
            {"min_size": 4, "discount": 0.05},   # 5% for 4-6 people
            {"min_size": 7, "discount": 0.10},   # 10% for 7-9 people
            {"min_size": 10, "discount": 0.15},  # 15% for 10-12 people
            {"min_size": 13, "discount": 0.20},  # 20% for 13-15 people
            {"min_size": 16, "discount": 0.25}   # 25% for 16+ people
        ],
        "max_discount": 0.25,                    # Maximum possible discount
        "peak_season_modifier": 0.9,             # Reduce discounts in peak season
        "budget_alignment_bonus": 0.02           # Extra discount for well-aligned budgets
    },
    
    # Group optimization parameters
    "optimization": {
        "merge_compatibility_threshold": 0.7,    # Minimum compatibility for merging groups
        "max_merge_size": 20,                    # Maximum size after merging
        "optimization_frequency_hours": 4,       # How often to run optimization
        "small_group_threshold": 6,             # Groups below this size considered for merging
        "add_member_compatibility_threshold": 0.75,  # Threshold for adding new members
        "group_quality_threshold": 0.6          # Minimum group quality to keep
    },
    
    # Notification settings
    "notifications": {
        "immediate_notification": True,          # Send notification when group formed
        "reminder_delay_hours": 24,             # Hours before sending reminder
        "confirmation_deadline_days": 7,        # Days to confirm group participation
        "templates": {
            "group_formation": "group_formation_template",
            "group_reminder": "group_reminder_template",
            "group_merge": "group_merge_template"
        }
    },
    
    # Analytics and monitoring
    "analytics": {
        "track_algorithm_performance": True,
        "log_compatibility_scores": True,
        "save_clustering_decisions": True,
        "performance_metrics": [
            "clustering_efficiency",
            "average_group_size", 
            "average_compatibility",
            "groups_per_hour",
            "conversion_rate"
        ]
    },
    
    # Feature engineering for ML
    "feature_engineering": {
        "seasonal_features": True,              # Include month/season features
        "budget_features": True,               # Include budget-related features  
        "duration_features": True,            # Include trip duration features
        "group_category_features": True,      # Include group size categories
        "lead_time_categories": True,         # Categorize lead times
        "normalization_method": "robust"     # Feature normalization method
    },
    
    # Performance and scaling
    "performance": {
        "max_interests_per_batch": 1000,     # Maximum interests to process at once
        "parallel_processing": True,          # Enable parallel processing
        "cache_compatibility_scores": True,   # Cache frequent compatibility calculations
        "lazy_loading": True,                 # Load data only when needed
        "timeout_seconds": 300               # Maximum processing time per batch
    }
}


# Helper functions to access configuration
def get_clustering_config(key: str = None):
    """Get clustering configuration value"""
    if key is None:
        return CLUSTERING_CONFIG
    
    keys = key.split('.')
    value = CLUSTERING_CONFIG
    
    for k in keys:
        if isinstance(value, dict) and k in value:
            value = value[k]
        else:
            return None
    
    return value


def get_compatibility_threshold(level: str = "medium"):
    """Get compatibility threshold for given level"""
    return get_clustering_config(f"compatibility_thresholds.{level}")


def get_pricing_config():
    """Get pricing configuration"""
    return get_clustering_config("pricing")


def get_ml_config():
    """Get ML clustering configuration"""
    return get_clustering_config("ml_clustering")


def is_feature_enabled(feature: str):
    """Check if a feature is enabled"""
    return get_clustering_config(f"feature_engineering.{feature}") or False