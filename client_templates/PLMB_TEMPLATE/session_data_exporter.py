#!/usr/bin/env python3
"""
SESSION DATA EXPORTER MODULE
Exports collected customer session data to CSV/Excel files for client reporting
"""

import os
import csv
import json
from datetime import datetime
from config import Config

class SessionDataExporter:
    """Handles exporting session data to CSV files for client reporting"""
    
    def __init__(self):
        self.export_folder = "customer_data"
        self.csv_file = "customer_sessions.csv"
        self.ensure_export_directory()
        self.ensure_csv_headers()
    
    def ensure_export_directory(self):
        """Create export directory if it doesn't exist"""
        if not os.path.exists(self.export_folder):
            os.makedirs(self.export_folder, exist_ok=True)
            print(f"📁 Created customer data folder: {self.export_folder}")
    
    def ensure_csv_headers(self):
        """Ensure CSV file exists with proper headers"""
        csv_path = os.path.join(self.export_folder, self.csv_file)
        
        # Define CSV headers based on Klariqo sales session variables
        headers = [
            "call_sid",
            "call_date",
            "call_time", 
            "call_direction",
            "prospect_name",
            "prospect_phone",
            "business_name",
            "business_size",
            "current_systems",
            "pain_points",
            "interest_level",
            "budget_range",
            "decision_maker",
            "preferred_demo_time",
            "preferred_demo_type",
            "demo_scheduled",
            "recording_permission",
            "recording_status",
            "call_duration_seconds",
            "conversation_summary",
            "demo_status",
            "follow_up_required"
        ]
        
        # Create CSV with headers if it doesn't exist
        if not os.path.exists(csv_path):
            with open(csv_path, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(headers)
            print(f"📊 Created customer data CSV: {csv_path}")
    
    def export_session_data(self, session, call_duration=None):
        """Export session data to CSV file"""
        try:
            csv_path = os.path.join(self.export_folder, self.csv_file)
            
            # Extract session variables
            variables = session.session_variables
            
            # Calculate call duration if not provided
            if call_duration is None:
                call_duration = self._calculate_call_duration(session)
            
            # Generate conversation summary
            conversation_summary = self._generate_conversation_summary(session)
            
            # Determine demo status
            demo_status = self._determine_demo_status(session)
            
            # Check if follow-up is required
            follow_up_required = self._needs_follow_up(session)
            
            # Prepare row data
            row_data = [
                session.call_sid,
                datetime.now().strftime("%Y-%m-%d"),  # call_date
                datetime.now().strftime("%H:%M:%S"),  # call_time
                session.call_direction,  # inbound/outbound
                variables.get("prospect_name", ""),
                variables.get("prospect_phone", ""),
                variables.get("business_name", ""),
                variables.get("business_size", ""),
                variables.get("current_systems", ""),
                variables.get("pain_points", ""),
                variables.get("interest_level", ""),
                variables.get("budget_range", ""),
                variables.get("decision_maker", ""),
                variables.get("preferred_demo_time", ""),
                variables.get("preferred_demo_type", ""),
                variables.get("demo_scheduled", ""),
                variables.get("recording_permission", ""),
                "Started" if session.session_memory.get("recording_started", False) else "Not Started",
                call_duration,
                conversation_summary,
                demo_status,
                follow_up_required
            ]
            
            # Append to CSV file
            with open(csv_path, 'a', newline='', encoding='utf-8') as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(row_data)
            
            # Log successful export
            prospect_info = variables.get("prospect_name", "Unknown")
            interest_info = variables.get("interest_level", "general inquiry")
            print(f"📊 Exported session data: {prospect_info} - {interest_info}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error exporting session data: {e}")
            return False
    
    def _calculate_call_duration(self, session):
        """Calculate call duration from conversation history"""
        try:
            # Simple estimation based on conversation length
            # In a real implementation, you'd track start time
            conversation_length = len(session.conversation_history)
            estimated_duration = conversation_length * 10  # ~10 seconds per exchange
            return max(estimated_duration, 30)  # Minimum 30 seconds
        except:
            return 60  # Default 1 minute
    
    def _generate_conversation_summary(self, session):
        """Generate a brief summary of the conversation"""
        try:
            if not hasattr(session, 'conversation_history') or not session.conversation_history:
                return "No conversation recorded"
            
            # Get key conversation elements
            history = session.conversation_history
            summary_parts = []
            
            # Check what was discussed
            variables = session.session_variables
            if variables.get("business_size"):
                summary_parts.append(f"Business: {variables['business_size']}")
            if variables.get("interest_level"):
                summary_parts.append(f"Interest: {variables['interest_level']}")
            if variables.get("demo_scheduled"):
                summary_parts.append(f"Demo: {variables['demo_scheduled']}")
            
            # Add conversation length info
            summary_parts.append(f"Exchanges: {len(history)}")
            
            return " | ".join(summary_parts) if summary_parts else "Brief conversation"
            
        except Exception as e:
            return f"Summary error: {str(e)[:50]}"
    
    def _determine_demo_status(self, session):
        """Determine if a demo was scheduled"""
        try:
            variables = session.session_variables
            
            if variables.get("demo_scheduled"):
                if variables.get("prospect_name") and variables.get("prospect_phone"):
                    return "Demo - Confirmed"
                else:
                    return "Demo - Pending Details"
            elif variables.get("preferred_demo_time") or variables.get("preferred_demo_type"):
                return "Interested - No Demo"
            elif variables.get("interest_level") == "high":
                return "High Interest - Immediate Demo"
            else:
                return "Inquiry Only"
                
        except:
            return "Unknown"
    
    def _needs_follow_up(self, session):
        """Determine if follow-up is required"""
        try:
            variables = session.session_variables
            
            # Follow-up needed if:
            # 1. Demo started but not completed
            # 2. High interest without immediate demo
            # 3. Prospect provided partial contact info
            
            if variables.get("demo_scheduled") and not variables.get("prospect_phone"):
                return "Yes - Missing Contact Info"
            elif variables.get("interest_level") == "high":
                return "Yes - High Interest"
            elif variables.get("business_size") and not variables.get("demo_scheduled"):
                return "Yes - Sales Interest"
            else:
                return "No"
                
        except:
            return "Unknown"
    
    def get_export_stats(self):
        """Get statistics about exported data"""
        try:
            csv_path = os.path.join(self.export_folder, self.csv_file)
            
            if not os.path.exists(csv_path):
                return {"total_sessions": 0, "file_size": 0}
            
            # Count rows (minus header)
            with open(csv_path, 'r', encoding='utf-8') as csvfile:
                row_count = sum(1 for row in csv.reader(csvfile)) - 1  # Subtract header
            
            # Get file size
            file_size = os.path.getsize(csv_path)
            
            return {
                "total_sessions": max(0, row_count),
                "file_size_kb": round(file_size / 1024, 2),
                "csv_file": csv_path
            }
            
        except Exception as e:
            print(f"❌ Error getting export stats: {e}")
            return {"total_sessions": 0, "file_size": 0, "error": str(e)}

# Global session data exporter instance
session_exporter = SessionDataExporter()