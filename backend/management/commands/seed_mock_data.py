# Custom management command to seed mock lab, users, referred doctors and lab tests.
# Location: backend/management/commands/seed_mock_data.py

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from backend.models import Lab, ReferredDoctor, MasterTest, LabTest, LabTestParameter

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds default labs, users, referred doctors, and copies master tests into lab tests'

    def handle(self, *args, **options):
        self.stdout.write("Starting database seeding...")

        with transaction.atomic():
            # 1. Clean existing records (keep master tests)
            self.stdout.write("Clearing existing tenants, users, and transactions...")
            User.objects.all().delete()
            Lab.objects.all().delete()
            ReferredDoctor.objects.all().delete()
            # LabTest and LabTestParameter are cascade deleted with Lab

            # 2. Create Default Lab
            self.stdout.write("Creating default Lab 'LAB-DEFAULT'...")
            lab = Lab.objects.create(
                id='LAB-DEFAULT',
                name='AB+ Diagnostic Laboratory',
                status='active',
                address='123 Pune Health Hub, Shivaji Nagar, Pune - 411005',
                phone='9876543210',
                admin_name='Lucky',
                admin_email='admin@abplus.in'
            )

            # 3. Create Users
            self.stdout.write("Creating default users (Super Admin, Lab Admin, Collection Boy, etc.)...")
            
            # Super Admin (Global, no lab)
            super_admin = User(
                username='superadmin',
                first_name='Super',
                last_name='Admin',
                email='superadmin@abplus.in',
                role='SUPER_ADMIN',
                is_staff=True,
                is_superuser=True,
                status='active'
            )
            super_admin.set_password('Password123')
            super_admin.save()

            # Lab Admin
            lab_admin = User(
                username='lucky_admin',
                first_name='Lucky',
                last_name='Admin',
                email='admin@abplus.in',
                role='LAB_ADMIN',
                lab=lab,
                status='active'
            )
            lab_admin.set_password('Password123')
            lab_admin.save()

            # Collection Boy (username: lucky, role: COLLECTION_BOY)
            collection_boy = User(
                username='lucky',
                first_name='Lucky',
                last_name='Collection Boy',
                email='lucky@abplus.in',
                phone_number='9876543210',
                role='COLLECTION_BOY',
                lab=lab,
                status='active'
            )
            collection_boy.set_password('Password123')
            collection_boy.save()

            # Technician
            technician = User(
                username='technician',
                first_name='Rohan',
                last_name='Technician',
                email='tech@abplus.in',
                role='TECHNICIAN',
                lab=lab,
                status='active'
            )
            technician.set_password('Password123')
            technician.save()

            # Cashier
            cashier = User(
                username='cashier',
                first_name='Sneha',
                last_name='Cashier',
                email='cashier@abplus.in',
                role='CASHIER',
                lab=lab,
                status='active'
            )
            cashier.set_password('Password123')
            cashier.save()

            # 4. Create Referred Doctors
            self.stdout.write("Seeding referred doctors...")
            ReferredDoctor.objects.create(
                id='REF001',
                doctor_name='Dr. Ramesh Patil',
                hospital_name='Hardikar Hospital',
                phone='9123456789',
                address='Shivaji Nagar, Pune',
                status='Active',
                lab=lab
            )
            ReferredDoctor.objects.create(
                id='REF002',
                doctor_name='Dr. Sunita Deshmukh',
                hospital_name='Ruby Hall Clinic',
                phone='9876543211',
                address='Dhole Patil Road, Pune',
                status='Active',
                lab=lab
            )

            # 5. Populate Lab Tests from Master Tests
            self.stdout.write("Cloning master tests to Lab tests for LAB-DEFAULT...")
            master_tests = MasterTest.objects.prefetch_related('parameters').filter(is_active=True)
            for m_test in master_tests:
                l_test = LabTest.objects.create(
                    lab=lab,
                    master_test=m_test,
                    test_name=m_test.name,
                    category=m_test.category,
                    code=m_test.code,
                    price=m_test.default_price,
                    tube_type=m_test.tube_type,
                    tube_color=m_test.tube_color,
                    is_active=True,
                    is_custom=False
                )
                for m_param in m_test.parameters.all():
                    LabTestParameter.objects.create(
                        lab_test=l_test,
                        parameter_name=m_param.parameter_name,
                        unit=m_param.unit,
                        default_min=m_param.default_min,
                        default_max=m_param.default_max
                    )

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
