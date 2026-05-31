import os
import json
from pathlib import Path
import sys
from django.db import transaction

def seed_master_tests():
    from backend.models import MasterTest, MasterTestParameter
    
    fixture_path = Path(__file__).resolve().parent / 'fixtures' / 'master_tests.json'
    if not fixture_path.exists():
        print(f"Fixture file not found at {fixture_path}", file=sys.stderr)
        return
        
    try:
        with open(fixture_path, 'r', encoding='utf-8') as f:
            master_tests_data = json.load(f)
    except Exception as e:
        print(f"Failed to read master tests fixture: {e}", file=sys.stderr)
        return
        
    print(f"Found {len(master_tests_data)} master tests in fixture. Checking database...")
    
    try:
        with transaction.atomic():
            seeded_count = 0
            param_count = 0
            for test_data in master_tests_data:
                test_id = test_data.get('id')
                name = test_data.get('name')
                category = test_data.get('category')
                code = test_data.get('code', '')
                tube_type = test_data.get('tube_type', '')
                tube_color = test_data.get('tube_color', '')
                default_price = test_data.get('default_price', 150.0)
                is_active = test_data.get('is_active', True)
                
                master_test, created = MasterTest.objects.get_or_create(
                    id=test_id,
                    defaults={
                        'name': name,
                        'category': category,
                        'code': code,
                        'tube_type': tube_type,
                        'tube_color': tube_color,
                        'default_price': default_price,
                        'is_active': is_active
                    }
                )
                
                if created:
                    seeded_count += 1
                    
                # Seed parameters
                parameters = test_data.get('parameters', [])
                for param_data in parameters:
                    param_id = param_data.get('id')
                    param_name = param_data.get('name')
                    unit = param_data.get('unit', '')
                    min_val = param_data.get('min_val', 0.0)
                    max_val = param_data.get('max_val', 0.0)
                    
                    _, p_created = MasterTestParameter.objects.get_or_create(
                        id=param_id,
                        defaults={
                            'master_test': master_test,
                            'parameter_name': param_name,
                            'unit': unit,
                            'default_min': min_val,
                            'default_max': max_val
                        }
                    )
                    if p_created:
                        param_count += 1
                        
            print(f"Seeding completed. Created {seeded_count} new master tests and {param_count} new parameters.")
    except Exception as e:
        print(f"Error seeding master tests: {e}", file=sys.stderr)
