# Django REST Framework Serializers for AB+ Super Admin and Tenant Dashboards
# Location: backend/serializers.py

from rest_framework import serializers
from django.db import transaction
from django.contrib.auth import get_user_model
from .models import Lab, ActivityLog, MasterTest, MasterTestParameter, LabTest, LabTestParameter, PatientEntry, Expense, LabSettings, ReferredDoctor, CashierReceipt, DailyCloseout, PaymentTransaction, CashierAdminSettlement, DoctorCommissionEntry

User = get_user_model()


def recalculate_doctor_commission_entries(patient):
    from django.utils import timezone
    from .models import DoctorCommissionEntry
    
    # If the patient has no referred doctor or is soft-deleted,
    # we should soft-delete any existing commission entries.
    if not patient.referred_doctor or patient.delete_flag == 'Y':
        patient.commission_entries.all().update(
            delete_flag='Y',
            deleted_at=timezone.now()
        )
        return

    # Enforce timezone-aware now
    now = timezone.now()
    active_tests = list(patient.tests.all())
    active_test_ids = [t.id for t in active_tests]

    # Get all existing non-deleted commission entries for this patient
    existing_entries = {e.test_id: e for e in patient.commission_entries.filter(delete_flag='N')}

    # Soft-delete entries for tests that are no longer part of this patient registration
    for test_id, entry in existing_entries.items():
        if test_id not in active_test_ids:
            entry.delete_flag = 'Y'
            entry.deleted_at = now
            entry.save()

    # Create entries for new tests or update doctor for existing ones
    for test in active_tests:
        # Get current test commission percentage
        commission_percentage = getattr(test, 'commission_percentage', 50.00)
        if commission_percentage is None:
            commission_percentage = 50.00
            
        test_price = test.price
        commission_amount = (test_price * commission_percentage) / 100

        if test.id in existing_entries:
            entry = existing_entries[test.id]
            # If referred doctor has changed, update it on the existing entry
            if entry.doctor != patient.referred_doctor:
                entry.doctor = patient.referred_doctor
                entry.save()
        else:
            # Create a brand new snapshot entry
            DoctorCommissionEntry.objects.create(
                lab=patient.lab,
                patient=patient,
                doctor=patient.referred_doctor,
                test=test,
                test_price=test_price,
                commission_percentage=commission_percentage,
                commission_amount=commission_amount,
                entry_date=patient.created_at
            )


class LabSerializer(serializers.ModelSerializer):
    """
    Standard serializer containing all details of a lab tenant.
    """
    users_count = serializers.IntegerField(read_only=True)
    patient_count = serializers.IntegerField(read_only=True)
    admin_username = serializers.SerializerMethodField()

    class Meta:
        model = Lab
        fields = [
            'id', 'name', 'status', 'address', 'phone', 'lab_code',
            'created_at', 'admin_name', 'admin_email', 
            'users_count', 'patient_count', 'admin_username'
        ]

    def get_admin_username(self, obj):
        admin = obj.users.filter(role='LAB_ADMIN').first()
        return admin.username if admin else ''


class LabSummarySerializer(serializers.ModelSerializer):
    """
    Lightweight, performance-optimized serializer for dashboard modals.
    `users_count` and `patient_count` can be annotated in the queryset.
    """
    users_count = serializers.IntegerField(read_only=True)
    patient_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Lab
        fields = ['id', 'name', 'status', 'users_count', 'patient_count']


class LabCreateSerializer(serializers.Serializer):
    """
    Transactional onboarding serializer. Provisions Lab tenant workspace,
    registers the initial LAB_ADMIN user, and logs the event atomically.
    """
    # Lab details
    name = serializers.CharField(max_length=255)
    address = serializers.CharField()
    phone = serializers.CharField(max_length=20)
    lab_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    
    # Admin User details
    admin_name = serializers.CharField(max_length=255)
    admin_email = serializers.EmailField(required=False, allow_blank=True, default='')
    admin_password = serializers.CharField(write_only=True, min_length=6)

    def validate_lab_code(self, value):
        if value:
            val = value.strip().upper()
            import re
            if not re.match(r'^[A-Z0-9]+$', val):
                raise serializers.ValidationError("Lab Code must contain only alphanumeric characters (no spaces or special characters).")
            if Lab.all_objects.filter(lab_code=val).exists():
                raise serializers.ValidationError("This Lab Code is already taken.")
            return val
        return value

    def validate_admin_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email address already exists.")
        return value

    def create(self, validated_data):
        admin_password = validated_data.pop('admin_password')
        
        # Enforce atomic transaction for safety
        with transaction.atomic():
            # 1. Create the Lab Tenant
            lab = Lab.objects.create(
                name=validated_data['name'],
                address=validated_data['address'],
                phone=validated_data['phone'],
                admin_name=validated_data['admin_name'],
                admin_email=validated_data.get('admin_email', ''),
                lab_code=validated_data.get('lab_code', '')
            )

            # Derive valid username (only letters, numbers, and underscores, no spaces)
            import re
            base_username = re.sub(r'[^a-zA-Z0-9_]', '', validated_data['admin_name'].lower().replace(' ', '_'))
            if not base_username:
                base_username = "admin"
            
            # Ensure unique inside this lab (guaranteed since it's the first user)
            username = base_username

            # 2. Provision the initial LAB_ADMIN User
            user = User.objects.create(
                username=username,
                email=validated_data.get('admin_email', ''),
                first_name=validated_data['admin_name'],
                role='LAB_ADMIN',
                lab=lab,
                status='active'
            )
            user.set_password(admin_password)
            user.raw_password = admin_password
            user.save()

            # 2.5 Auto-import all active Master tests and parameters into this lab's isolated catalog
            active_masters = MasterTest.objects.filter(is_active=True).prefetch_related('parameters')
            for m_test in active_masters:
                lab_test = LabTest.objects.create(
                    lab=lab,
                    master_test=m_test,
                    name=m_test.name,
                    category=m_test.category,
                    code=m_test.code,
                    price=m_test.default_price,
                    tube_type=m_test.tube_type,
                    tube_color=m_test.tube_color,
                    is_enabled=True,
                    is_custom=False
                )
                for m_param in m_test.parameters.all():
                    LabTestParameter.objects.create(
                        lab_test=lab_test,
                        parameter_name=m_param.parameter_name,
                        unit=m_param.unit,
                        default_min=m_param.default_min,
                        default_max=m_param.default_max
                    )

            # 3. Log System Action
            ActivityLog.objects.create(
                action=f"Super Admin Onboarded {lab.name}",
                user_email="superadmin@abplus.in", # Simulating operator context
                lab_name=lab.name
            )

            return lab

    def to_representation(self, instance):
        # Return standard serialized Lab representation after creation
        return LabSerializer(instance).data


class CustomUserSerializer(serializers.ModelSerializer):
    """
    Serializer for platform users list. Map first_name to name to match frontend TS Interface.
    """
    name = serializers.CharField(source='first_name', required=False)
    lab_name = serializers.CharField(source='lab.name', read_only=True)
    lab_id = serializers.CharField(source='lab.id', read_only=True)
    lab_code = serializers.CharField(source='lab.lab_code', read_only=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'username', 'email', 'phone_number', 'role', 'lab_name', 'lab_id', 'lab_code', 'status', 'requires_password_change', 'created_at']


class EmployeeSerializer(serializers.ModelSerializer):
    """
    Serializer for employee/staff management within a tenant lab.
    """
    name = serializers.CharField(source='first_name')
    lab_name = serializers.CharField(source='lab.name', read_only=True)
    lab_code = serializers.CharField(source='lab.lab_code', read_only=True)
    lab_id = serializers.CharField(write_only=True, required=False)
    password = serializers.CharField(source='raw_password', required=False, min_length=6)
    phone_number = serializers.CharField(required=True)
    email = serializers.EmailField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'username', 'email', 'phone_number', 'role', 'lab_name', 'lab_id', 'lab_code', 'status', 'requires_password_change', 'created_at', 'password']

    def validate_username(self, value):
        import re
        if not re.match(r'^[a-zA-Z0-9_]+$', value):
            raise serializers.ValidationError("Username must contain only letters, numbers, and underscores (no spaces).")
        return value

    def validate_phone_number(self, value):
        if not value.isdigit() or len(value) != 10:
            raise serializers.ValidationError("Phone number must be exactly 10 digits and numbers only.")
        return value

    def validate(self, attrs):
        username = attrs.get('username')
        lab_id = attrs.get('lab_id')
        
        lab = None
        if lab_id:
            try:
                lab = Lab.objects.get(id=lab_id)
            except Lab.DoesNotExist:
                raise serializers.ValidationError({"lab_id": "Lab with this ID does not exist."})
        elif self.instance:
            lab = self.instance.lab

        # Enforce unique username per lab workspace
        if username:
            qs = User.objects.filter(username=username, lab=lab)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"username": "This username is already taken in this laboratory."})

        return attrs

    def create(self, validated_data):
        password = validated_data.pop('raw_password', None)
        if not password:
            raise serializers.ValidationError({"password": "Password is required for staff registration."})
            
        lab_id = validated_data.pop('lab_id', None)
        if lab_id:
            try:
                validated_data['lab'] = Lab.objects.get(id=lab_id)
            except Lab.DoesNotExist:
                raise serializers.ValidationError({"lab_id": "Lab with this ID does not exist."})

        validated_data['raw_password'] = password
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('raw_password', None)
        lab_id = validated_data.pop('lab_id', None)
        if lab_id:
            try:
                instance.lab = Lab.objects.get(id=lab_id)
            except Lab.DoesNotExist:
                raise serializers.ValidationError({"lab_id": "Lab with this ID does not exist."})
        
        if password:
            validated_data['raw_password'] = password

        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save()
        return user
class ActivityLogSerializer(serializers.ModelSerializer):
    """
    Serializer for audit logs representation.
    """
    class Meta:
        model = ActivityLog
        fields = ['id', 'action', 'user_email', 'lab_name', 'timestamp']


class MasterTestParameterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='parameter_name')
    min_val = serializers.FloatField(source='default_min')
    max_val = serializers.FloatField(source='default_max')

    class Meta:
        model = MasterTestParameter
        fields = ['id', 'name', 'unit', 'min_val', 'max_val']


class MasterTestSerializer(serializers.ModelSerializer):
    parameters = MasterTestParameterSerializer(many=True, read_only=True)

    class Meta:
        model = MasterTest
        fields = ['id', 'name', 'category', 'code', 'tube_type', 'tube_color', 'default_price', 'is_active', 'commission_percentage', 'created_at', 'parameters']


class LabTestParameterSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='parameter_name')
    min_val = serializers.FloatField(source='default_min')
    max_val = serializers.FloatField(source='default_max')

    class Meta:
        model = LabTestParameter
        fields = ['id', 'name', 'unit', 'min_val', 'max_val']


class LabTestSerializer(serializers.ModelSerializer):
    parameters = LabTestParameterSerializer(many=True, required=False)
    lab_id = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = LabTest
        fields = ['id', 'name', 'category', 'code', 'price', 'tube_type', 'tube_color', 'is_enabled', 'is_custom', 'commission_percentage', 'parameters', 'lab_id', 'master_test_id']

    def validate_commission_percentage(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Commission percentage must be between 0 and 100.")
        return value

    def create(self, validated_data):
        parameters_data = validated_data.pop('parameters', [])
        lab_id = validated_data.pop('lab_id', None)
        if lab_id:
            validated_data['lab'] = Lab.objects.get(id=lab_id)
        
        test = LabTest.objects.create(**validated_data)
        for param_data in parameters_data:
            LabTestParameter.objects.create(lab_test=test, **param_data)
        return test

    def update(self, instance, validated_data):
        parameters_data = validated_data.pop('parameters', None)
        lab_id = validated_data.pop('lab_id', None)
        if lab_id:
            instance.lab = Lab.objects.get(id=lab_id)
            
        instance.name = validated_data.get('name', instance.name)
        instance.category = validated_data.get('category', instance.category)
        instance.code = validated_data.get('code', instance.code)
        instance.price = validated_data.get('price', instance.price)
        instance.tube_type = validated_data.get('tube_type', instance.tube_type)
        instance.tube_color = validated_data.get('tube_color', instance.tube_color)
        instance.is_enabled = validated_data.get('is_enabled', instance.is_enabled)
        instance.is_custom = validated_data.get('is_custom', instance.is_custom)
        instance.commission_percentage = validated_data.get('commission_percentage', instance.commission_percentage)
        instance.save()

        if parameters_data is not None:
            existing_params = {p.id: p for p in instance.parameters.all()}
            keep_ids = []
            for param_data in parameters_data:
                param_id = param_data.get('id', None)
                p_name = param_data.get('parameter_name')
                p_unit = param_data.get('unit')
                p_min = param_data.get('default_min')
                p_max = param_data.get('default_max')
                
                if param_id and param_id in existing_params:
                    p = existing_params[param_id]
                    p.parameter_name = p_name if p_name is not None else p.parameter_name
                    p.unit = p_unit if p_unit is not None else p.unit
                    p.default_min = p_min if p_min is not None else p.default_min
                    p.default_max = p_max if p_max is not None else p.default_max
                    p.save()
                    keep_ids.append(p.id)
                else:
                    new_p = LabTestParameter.objects.create(
                        lab_test=instance,
                        parameter_name=p_name,
                        unit=p_unit,
                        default_min=p_min,
                        default_max=p_max
                    )
                    keep_ids.append(new_p.id)
            
            instance.parameters.exclude(id__in=keep_ids).delete()

        return instance



class ReferredDoctorSerializer(serializers.ModelSerializer):
    lab_id = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = ReferredDoctor
        fields = ['id', 'doctor_name', 'hospital_name', 'phone', 'address', 'status', 'created_at', 'lab_id']

    def validate(self, attrs):
        doctor_name = attrs.get('doctor_name', self.instance.doctor_name if self.instance else None)
        hospital_name = attrs.get('hospital_name', self.instance.hospital_name if self.instance else '')
        
        # Determine lab
        lab_id = attrs.get('lab_id')
        if self.instance:
            lab = self.instance.lab
        elif lab_id:
            from .models import Lab
            lab = Lab.objects.get(id=lab_id)
        else:
            request = self.context.get('request')
            if request and request.user.is_authenticated and request.user.lab:
                lab = request.user.lab
            else:
                raise serializers.ValidationError("Lab context is required.")

        if doctor_name:
            queryset = ReferredDoctor.objects.filter(
                lab=lab,
                doctor_name__iexact=doctor_name,
                hospital_name__iexact=hospital_name
            )
            if self.instance:
                queryset = queryset.exclude(id=self.instance.id)
            if queryset.exists():
                raise serializers.ValidationError("A doctor with this name and hospital clinic already exists in this lab.")
        return attrs

    def create(self, validated_data):
        lab_id = validated_data.pop('lab_id', None)
        if lab_id:
            validated_data['lab'] = Lab.objects.get(id=lab_id)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('lab_id', None)  # Lab cannot be changed after creation
        return super().update(instance, validated_data)


class PaymentTransactionSerializer(serializers.ModelSerializer):
    received_by_name = serializers.SerializerMethodField()
    payment_date = serializers.DateField(source='transaction_date', read_only=True)
    received_by_user = serializers.PrimaryKeyRelatedField(source='collection_boy', read_only=True)

    class Meta:
        model = PaymentTransaction
        fields = [
            'id', 'amount_received', 'concession_amount', 'payment_date',
            'received_by_user', 'received_by_name', 'payment_mode', 'notes'
        ]

    def get_received_by_name(self, obj):
        if obj.collection_boy:
            return f"{obj.collection_boy.first_name} {obj.collection_boy.last_name}".strip() or obj.collection_boy.username
        return "Desk"


class PatientEntrySerializer(serializers.ModelSerializer):
    tests = LabTestSerializer(many=True, read_only=True)
    referred_doctor_name = serializers.CharField(source='referred_doctor.doctor_name', read_only=True, default='')
    referred_doctor_id = serializers.CharField(write_only=True, required=False, allow_null=True)
    lab_id = serializers.CharField(write_only=True, required=False)
    created_by_user_id = serializers.PrimaryKeyRelatedField(source='created_by', read_only=True)
    pending_balance = serializers.SerializerMethodField()
    transactions = PaymentTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = PatientEntry
        fields = [
            'id', 'name', 'age', 'gender', 'phone', 
            'status', 'payment_status', 'pending_balance', 'tests', 'results', 
            'collected_by', 'total_bill', 'paid_amount', 'concession', 'created_at', 'lab_id',
            'referred_doctor_name', 'referred_doctor_id', 'created_by_user_id', 'transactions'
        ]

    def get_pending_balance(self, obj):
        return float(obj.total_bill) - float(obj.paid_amount) - float(obj.concession)

    def validate_phone(self, value):
        import re
        if not re.match(r'^\d{10}$', value):
            raise serializers.ValidationError("Contact phone number must be exactly 10 digits and contain only numbers.")
        return value

    def create(self, validated_data):
        lab_id = validated_data.pop('lab_id', None)
        lab = None
        if lab_id:
            lab = Lab.objects.get(id=lab_id)
            validated_data['lab'] = lab
        else:
            lab = validated_data.get('lab')

        referred_doctor_id = validated_data.pop('referred_doctor_id', None)
        referred_doctor_name = self.initial_data.get('referred_doctor_name')

        if referred_doctor_id:
            try:
                validated_data['referred_doctor'] = ReferredDoctor.objects.get(id=referred_doctor_id)
            except ReferredDoctor.DoesNotExist:
                pass
        elif referred_doctor_name and referred_doctor_name.strip():
            doc_name = referred_doctor_name.strip()
            if lab:
                doc = ReferredDoctor.objects.filter(lab=lab, doctor_name__iexact=doc_name).first()
                if not doc:
                    doc = ReferredDoctor.objects.create(
                        lab=lab,
                        doctor_name=doc_name,
                        hospital_name="Direct Referral",
                        status="Active"
                    )
                validated_data['referred_doctor'] = doc
        else:
            validated_data['referred_doctor'] = None

        tests_data = self.initial_data.get('tests', [])
        test_ids = []
        for test in tests_data:
            if isinstance(test, dict):
                test_ids.append(test.get('id'))
            else:
                test_ids.append(test)

        # Enforce that paid_amount and concession start at 0, and record initial payment via transaction
        paid_amount_val = validated_data.pop('paid_amount', 0.0)
        concession_val = validated_data.pop('concession', 0.0)

        patient = PatientEntry.objects.create(**validated_data)
        if test_ids:
            patient.tests.set(LabTest.objects.filter(id__in=test_ids))

        # If there is initial payment or concession, create a PaymentTransaction record
        if float(paid_amount_val) > 0.0 or float(concession_val) > 0.0:
            request = self.context.get('request')
            user = request.user if request and request.user.is_authenticated else None
            
            # Extract payment mode from request data or default to CASH
            payment_mode = 'CASH'
            if request and hasattr(request, 'data'):
                payment_mode = request.data.get('payment_mode', 'CASH')
                if payment_mode not in ['CASH', 'CARD', 'UPI', 'CREDIT']:
                    payment_mode = 'CASH'
            
            PaymentTransaction.objects.create(
                patient=patient,
                amount_received=paid_amount_val,
                concession_amount=concession_val,
                collection_boy=user if (user and user.role == 'COLLECTION_BOY') else None,
                payment_mode=payment_mode,
                notes='Initial payment during registration'
            )

        recalculate_doctor_commission_entries(patient)
        return patient

    def update(self, instance, validated_data):
        lab_id = validated_data.pop('lab_id', None)
        if lab_id:
            instance.lab = Lab.objects.get(id=lab_id)
        
        lab = instance.lab

        referred_doctor_id = validated_data.pop('referred_doctor_id', None)
        if 'referred_doctor_name' in self.initial_data:
            referred_doctor_name = self.initial_data.get('referred_doctor_name')
            if referred_doctor_id:
                try:
                    instance.referred_doctor = ReferredDoctor.objects.get(id=referred_doctor_id)
                except ReferredDoctor.DoesNotExist:
                    pass
            elif referred_doctor_name and referred_doctor_name.strip():
                doc_name = referred_doctor_name.strip()
                if lab:
                    doc = ReferredDoctor.objects.filter(lab=lab, doctor_name__iexact=doc_name).first()
                    if not doc:
                        doc = ReferredDoctor.objects.create(
                            lab=lab,
                            doctor_name=doc_name,
                            hospital_name="Direct Referral",
                            status="Active"
                        )
                    instance.referred_doctor = doc
            else:
                instance.referred_doctor = None
        elif referred_doctor_id:
            try:
                instance.referred_doctor = ReferredDoctor.objects.get(id=referred_doctor_id)
            except ReferredDoctor.DoesNotExist:
                pass

        tests_data = self.initial_data.get('tests', None)

        # Intercept and pop paid_amount and concession in update as well
        new_paid = validated_data.pop('paid_amount', None)
        new_conc = validated_data.pop('concession', None)
        
        diff_paid = 0.0
        diff_conc = 0.0
        
        if new_paid is not None:
            diff_paid = float(new_paid) - float(instance.paid_amount)
        if new_conc is not None:
            diff_conc = float(new_conc) - float(instance.concession)

        instance = super().update(instance, validated_data)
        
        if tests_data is not None:
            test_ids = []
            for test in tests_data:
                if isinstance(test, dict):
                    test_ids.append(test.get('id'))
                else:
                    test_ids.append(test)
            instance.tests.set(LabTest.objects.filter(id__in=test_ids))

        # If a difference exists, record the change as a new PaymentTransaction
        if abs(diff_paid) > 0.009 or abs(diff_conc) > 0.009:
            request = self.context.get('request')
            user = request.user if request and request.user.is_authenticated else None
            
            # Extract payment mode from request data or default to CASH
            payment_mode = 'CASH'
            if request and hasattr(request, 'data'):
                payment_mode = request.data.get('payment_mode', 'CASH')
                if payment_mode not in ['CASH', 'CARD', 'UPI', 'CREDIT']:
                    payment_mode = 'CASH'
            
            PaymentTransaction.objects.create(
                patient=instance,
                amount_received=diff_paid,
                concession_amount=diff_conc,
                collection_boy=user if (user and user.role == 'COLLECTION_BOY') else None,
                payment_mode=payment_mode,
                notes='Adjusted via patient update'
            )

        recalculate_doctor_commission_entries(instance)
        return instance


class ExpenseSerializer(serializers.ModelSerializer):
    lab_id = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Expense
        fields = ['id', 'title', 'amount', 'note', 'date', 'created_by', 'lab_id']

    def create(self, validated_data):
        lab_id = validated_data.pop('lab_id', None)
        if lab_id:
            validated_data['lab'] = Lab.objects.get(id=lab_id)
        return super().create(validated_data)


class LabSettingsSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    address = serializers.CharField()
    phone = serializers.CharField(max_length=20)
    logo_base64 = serializers.CharField(allow_blank=True, required=False)
    letterhead_base64 = serializers.CharField(allow_blank=True, required=False)

    def update(self, instance, validated_data):
        lab = instance
        lab.name = validated_data.get('name', lab.name)
        lab.address = validated_data.get('address', lab.address)
        lab.phone = validated_data.get('phone', lab.phone)
        lab.save()

        logo_base64 = validated_data.get('logo_base64', '')
        letterhead_base64 = validated_data.get('letterhead_base64', None)
        settings, created = LabSettings.objects.get_or_create(lab=lab)
        settings.logo_base64 = logo_base64
        if letterhead_base64 is not None:
            settings.letterhead_base64 = letterhead_base64
        settings.save()

        return lab

    def to_representation(self, instance):
        lab = instance
        try:
            logo_base64 = lab.settings.logo_base64
            letterhead_base64 = lab.settings.letterhead_base64
        except LabSettings.DoesNotExist:
            logo_base64 = ""
            letterhead_base64 = ""

        return {
            'name': lab.name,
            'address': lab.address,
            'phone': lab.phone,
            'logo_base64': logo_base64 or "",
            'letterhead_base64': letterhead_base64 or "",
        }


class DailyCloseoutSerializer(serializers.ModelSerializer):
    cashier_name = serializers.SerializerMethodField()

    class Meta:
        model = DailyCloseout
        fields = [
            'id', 'lab_id', 'cashier_id', 'cashier_name', 'date',
            'total_settlements', 'total_expenses', 'net_revenue',
            'notes', 'submitted_at'
        ]

    def get_cashier_name(self, obj):
        return f"{obj.cashier.first_name} {obj.cashier.last_name}".strip() or obj.cashier.username


class CashierReceiptSerializer(serializers.ModelSerializer):
    collection_boy_name = serializers.SerializerMethodField()
    cashier_name = serializers.SerializerMethodField()

    class Meta:
        model = CashierReceipt
        fields = [
            'id', 'collection_boy_id', 'collection_boy_name', 'cashier_id', 'cashier_name',
            'amount_received', 'receipt_date', 'receipt_time', 'created_at'
        ]

    def get_collection_boy_name(self, obj):
        return f"{obj.collection_boy.first_name} {obj.collection_boy.last_name}".strip() or obj.collection_boy.username

    def get_cashier_name(self, obj):
        return f"{obj.cashier.first_name} {obj.cashier.last_name}".strip() or obj.cashier.username


class CashierAdminSettlementSerializer(serializers.ModelSerializer):
    cashier_name = serializers.SerializerMethodField()
    settlement_amount = serializers.DecimalField(source='final_cash', max_digits=10, decimal_places=2, read_only=True)
    expenses_amount = serializers.DecimalField(source='expenses', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CashierAdminSettlement
        fields = [
            'id', 'lab_id', 'cashier_id', 'cashier_name',
            'gross_cash', 'expenses', 'final_cash',
            'settlement_amount', 'expenses_amount', 'remarks', 'submitted_at'
        ]

    def get_cashier_name(self, obj):
        return f"{obj.cashier.first_name} {obj.cashier.last_name}".strip() or obj.cashier.username
