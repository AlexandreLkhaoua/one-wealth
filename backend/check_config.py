#!/usr/bin/env python3
"""
OneWealth - Configuration Checker

This script verifies that the backend is correctly configured and can connect to Supabase.
Run this before starting the server to catch configuration issues early.

Usage:
    python check_config.py
"""

import sys
import os
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

def check_env_file():
    """Check if .env file exists"""
    env_path = Path(__file__).parent / '.env'
    if not env_path.exists():
        print("❌ ERROR: .env file not found")
        print("   → Copy .env.example to .env and fill in your values")
        return False
    print("✅ .env file exists")
    return True


def check_required_env_vars():
    """Check if required environment variables are set"""
    try:
        from config import settings
        
        required_vars = [
            ('SUPABASE_URL', settings.SUPABASE_URL),
            ('SUPABASE_KEY', settings.SUPABASE_KEY),
            ('SUPABASE_SERVICE_ROLE_KEY', settings.SUPABASE_SERVICE_ROLE_KEY),
        ]
        
        all_set = True
        for var_name, var_value in required_vars:
            if not var_value or var_value == 'your-project.supabase.co' or 'your-' in var_value:
                print(f"❌ ERROR: {var_name} not properly set")
                all_set = False
            else:
                print(f"✅ {var_name} is set")
        
        return all_set
        
    except Exception as e:
        print(f"❌ ERROR loading config: {e}")
        return False


def check_supabase_connection():
    """Check if Supabase connection works"""
    try:
        from utils.supabase_client import check_supabase_connection
        
        print("\n🔄 Testing Supabase connection...")
        if check_supabase_connection():
            print("✅ Supabase connection successful")
            return True
        else:
            print("❌ Supabase connection failed")
            return False
            
    except Exception as e:
        print(f"❌ ERROR testing Supabase: {e}")
        return False


def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'supabase',
        'pydantic',
        'yfinance',
        'pandas'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package} installed")
        except ImportError:
            print(f"❌ {package} NOT installed")
            missing.append(package)
    
    if missing:
        print(f"\n❌ Missing packages: {', '.join(missing)}")
        print("   → Run: pip install -r requirements.txt")
        return False
    
    return True


def check_database_tables():
    """Check if required database tables exist"""
    try:
        from utils.supabase_client import get_supabase
        
        supabase = get_supabase()
        
        # Check for assets table
        print("\n🔄 Checking database tables...")
        
        result = supabase.table('assets').select('id').limit(1).execute()
        print("✅ Table 'assets' exists")
        
        result = supabase.table('positions').select('id').limit(1).execute()
        print("✅ Table 'positions' exists")
        
        result = supabase.table('portfolios').select('id').limit(1).execute()
        print("✅ Table 'portfolios' exists")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR checking tables: {e}")
        print("   → Did you run supabase-schema.sql and supabase-schema-assets.sql?")
        return False


def main():
    """Run all checks"""
    print("=" * 60)
    print("OneWealth Backend - Configuration Checker")
    print("=" * 60)
    
    checks = [
        ("Environment file", check_env_file),
        ("Environment variables", check_required_env_vars),
        ("Python dependencies", check_dependencies),
        ("Supabase connection", check_supabase_connection),
        ("Database tables", check_database_tables),
    ]
    
    results = []
    for check_name, check_func in checks:
        print(f"\n📋 Checking: {check_name}")
        print("-" * 60)
        result = check_func()
        results.append((check_name, result))
    
    # Summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    
    all_passed = True
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {check_name}")
        if not result:
            all_passed = False
    
    print("=" * 60)
    
    if all_passed:
        print("\n🎉 All checks passed! You're ready to start the server.")
        print("\n▶️  Run: uvicorn main:app --reload")
        return 0
    else:
        print("\n❌ Some checks failed. Please fix the issues above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
