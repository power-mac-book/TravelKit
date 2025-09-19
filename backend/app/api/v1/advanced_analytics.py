"""
Advanced Analytics API Endpoints
Provides comprehensive business intelligence and analytics data
"""

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.advanced_analytics_service import AdvancedAnalyticsService

router = APIRouter()


@router.get("/conversion-funnel")
async def get_conversion_funnel(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    destination_id: Optional[int] = Query(None, description="Filter by destination ID"),
    db: Session = Depends(get_db)
):
    """
    Get detailed conversion funnel analysis showing how users move through
    the journey from interest expression to payment completion.
    """
    try:
        # Parse dates if provided
        parsed_start = None
        parsed_end = None
        
        if start_date:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
        
        analytics = AdvancedAnalyticsService(db)
        
        funnel_data = analytics.get_conversion_funnel(
            start_date=parsed_start,
            end_date=parsed_end,
            destination_id=destination_id
        )
        
        if not funnel_data:
            return {
                "error": "Unable to generate conversion funnel data",
                "funnel_stages": {},
                "summary": {}
            }
        
        return {
            "success": True,
            "data": funnel_data,
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "data_points": sum(
                    stage["count"] for stage in funnel_data.get("funnel_stages", {}).values()
                    if isinstance(stage, dict) and "count" in stage
                )
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating conversion funnel: {str(e)}")


@router.get("/revenue-analytics")
async def get_revenue_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    group_by: str = Query("month", description="Group by: day, week, month"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive revenue analytics including time series data,
    destination breakdown, and growth metrics.
    """
    try:
        # Validate group_by parameter
        if group_by not in ["day", "week", "month"]:
            raise HTTPException(status_code=400, detail="group_by must be one of: day, week, month")
        
        # Parse dates if provided
        parsed_start = None
        parsed_end = None
        
        if start_date:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
        
        analytics = AdvancedAnalyticsService(db)
        
        revenue_data = analytics.get_revenue_analytics(
            start_date=parsed_start,
            end_date=parsed_end,
            group_by=group_by
        )
        
        if not revenue_data:
            return {
                "error": "Unable to generate revenue analytics",
                "summary": {},
                "time_series": []
            }
        
        return {
            "success": True,
            "data": revenue_data,
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "time_periods": len(revenue_data.get("time_series", [])),
                "destinations_analyzed": len(revenue_data.get("revenue_by_destination", {}))
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating revenue analytics: {str(e)}")


@router.get("/destination-performance")
async def get_destination_performance(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(20, description="Maximum number of destinations to return"),
    sort_by: str = Query("interests", description="Sort by: interests, revenue, conversion"),
    db: Session = Depends(get_db)
):
    """
    Get detailed performance metrics for destinations including
    interest counts, conversion rates, and revenue generation.
    """
    try:
        # Validate sort_by parameter
        if sort_by not in ["interests", "revenue", "conversion"]:
            raise HTTPException(status_code=400, detail="sort_by must be one of: interests, revenue, conversion")
        
        # Parse dates if provided
        parsed_start = None
        parsed_end = None
        
        if start_date:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
        
        analytics = AdvancedAnalyticsService(db)
        
        performance_data = analytics.get_destination_performance(
            start_date=parsed_start,
            end_date=parsed_end,
            limit=limit
        )
        
        if not performance_data:
            return {
                "error": "Unable to generate destination performance data",
                "destinations": [],
                "summary": {}
            }
        
        # Apply sorting based on sort_by parameter
        destinations = performance_data.get("destinations", [])
        if sort_by == "revenue":
            destinations.sort(key=lambda x: x["metrics"]["revenue_generated"], reverse=True)
        elif sort_by == "conversion":
            destinations.sort(key=lambda x: x["metrics"]["conversion_rate"], reverse=True)
        # Default is already sorted by interests
        
        # Update rankings after sorting
        for i, dest in enumerate(destinations):
            dest["ranking"] = i + 1
        
        performance_data["destinations"] = destinations
        
        return {
            "success": True,
            "data": performance_data,
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "sorted_by": sort_by,
                "destinations_returned": len(destinations)
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating destination performance: {str(e)}")


@router.get("/user-behavior")
async def get_user_behavior_analytics(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive user behavior analytics including engagement patterns,
    user segments, and journey insights.
    """
    try:
        # Parse dates if provided
        parsed_start = None
        parsed_end = None
        
        if start_date:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
        
        analytics = AdvancedAnalyticsService(db)
        
        behavior_data = analytics.get_user_behavior_analytics(
            start_date=parsed_start,
            end_date=parsed_end
        )
        
        if not behavior_data:
            return {
                "error": "Unable to generate user behavior analytics",
                "user_metrics": {},
                "user_segments": {}
            }
        
        return {
            "success": True,
            "data": behavior_data,
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "users_analyzed": behavior_data.get("user_metrics", {}).get("total_users", 0)
            }
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating user behavior analytics: {str(e)}")


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    period: str = Query("30d", description="Time period: 7d, 30d, 90d"),
    db: Session = Depends(get_db)
):
    """
    Get a comprehensive dashboard summary with key metrics across all analytics areas.
    Perfect for executive dashboards and quick overview screens.
    """
    try:
        # Calculate date range based on period
        period_map = {
            "7d": 7,
            "30d": 30,
            "90d": 90
        }
        
        if period not in period_map:
            raise HTTPException(status_code=400, detail="period must be one of: 7d, 30d, 90d")
        
        days = period_map[period]
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        analytics = AdvancedAnalyticsService(db)
        
        # Get data from all analytics services
        funnel_data = analytics.get_conversion_funnel(start_date, end_date)
        revenue_data = analytics.get_revenue_analytics(start_date, end_date, "week")
        performance_data = analytics.get_destination_performance(start_date, end_date, 5)
        behavior_data = analytics.get_user_behavior_analytics(start_date, end_date)
        
        # Extract key metrics for summary
        summary = {
            "period": {
                "days": days,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "key_metrics": {
                "total_interests": funnel_data.get("funnel_stages", {}).get("interests_expressed", {}).get("count", 0),
                "conversion_rate": funnel_data.get("summary", {}).get("overall_conversion_rate", 0),
                "total_revenue": revenue_data.get("summary", {}).get("total_revenue", 0),
                "total_bookings": revenue_data.get("summary", {}).get("total_bookings", 0),
                "avg_booking_value": revenue_data.get("summary", {}).get("average_booking_value", 0),
                "total_users": behavior_data.get("user_metrics", {}).get("total_users", 0),
                "repeat_rate": behavior_data.get("user_metrics", {}).get("repeat_rate", 0)
            },
            "trends": {
                "revenue_growth": revenue_data.get("growth_metrics", {}).get("growth_rate", 0),
                "revenue_trend": revenue_data.get("growth_metrics", {}).get("trend", "stable"),
                "drop_off_points": funnel_data.get("summary", {}).get("drop_off_points", [])
            },
            "top_destinations": performance_data.get("destinations", [])[:3],
            "alerts": []
        }
        
        # Generate alerts based on key metrics
        alerts = []
        if summary["key_metrics"]["conversion_rate"] < 5:
            alerts.append({
                "type": "warning",
                "message": "Conversion rate is below 5%. Consider optimizing the user journey.",
                "metric": "conversion_rate",
                "value": summary["key_metrics"]["conversion_rate"]
            })
        
        if summary["trends"]["revenue_growth"] < -10:
            alerts.append({
                "type": "critical",
                "message": "Revenue is declining significantly. Immediate attention required.",
                "metric": "revenue_growth",
                "value": summary["trends"]["revenue_growth"]
            })
        
        if behavior_data.get("user_metrics", {}).get("repeat_rate", 0) < 20:
            alerts.append({
                "type": "info",
                "message": "Low repeat user rate. Consider implementing retention strategies.",
                "metric": "repeat_rate",
                "value": behavior_data.get("user_metrics", {}).get("repeat_rate", 0)
            })
        
        summary["alerts"] = alerts
        
        return {
            "success": True,
            "data": summary,
            "meta": {
                "generated_at": datetime.now().isoformat(),
                "data_freshness": "real_time",
                "alert_count": len(alerts)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating dashboard summary: {str(e)}")


@router.get("/export")
async def export_analytics_data(
    report_type: str = Query(..., description="Type of report: funnel, revenue, performance, behavior"),
    format: str = Query("json", description="Export format: json, csv"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Export analytics data in various formats for external analysis or reporting.
    """
    try:
        if report_type not in ["funnel", "revenue", "performance", "behavior"]:
            raise HTTPException(status_code=400, detail="Invalid report_type")
        
        if format not in ["json", "csv"]:
            raise HTTPException(status_code=400, detail="Invalid format")
        
        # Parse dates if provided
        parsed_start = None
        parsed_end = None
        
        if start_date:
            parsed_start = datetime.strptime(start_date, "%Y-%m-%d")
        if end_date:
            parsed_end = datetime.strptime(end_date, "%Y-%m-%d")
        
        analytics = AdvancedAnalyticsService(db)
        
        # Get the appropriate data based on report type
        if report_type == "funnel":
            data = analytics.get_conversion_funnel(parsed_start, parsed_end)
        elif report_type == "revenue":
            data = analytics.get_revenue_analytics(parsed_start, parsed_end)
        elif report_type == "performance":
            data = analytics.get_destination_performance(parsed_start, parsed_end)
        else:  # behavior
            data = analytics.get_user_behavior_analytics(parsed_start, parsed_end)
        
        if format == "json":
            return {
                "success": True,
                "report_type": report_type,
                "format": format,
                "data": data,
                "exported_at": datetime.now().isoformat()
            }
        else:
            # For CSV format, we would normally return a CSV response
            # For now, return a note about CSV implementation
            return {
                "success": True,
                "report_type": report_type,
                "format": format,
                "note": "CSV export functionality would be implemented here",
                "data_available": True,
                "exported_at": datetime.now().isoformat()
            }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting analytics data: {str(e)}")