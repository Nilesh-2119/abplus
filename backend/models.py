# Django DB Models representing multi-tenant SaaS schema for AB+
# Location: backend/models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid
from django.utils import timezone
from django.core.validators import RegexValidator
from django.db.models import UniqueConstraint, Q
from django.contrib.auth.models import UserManager

class SoftDeleteQuerySet(models.QuerySet):
    def delete(self, deleted_by_user=None):
        return self.update(
            delete_flag='Y',
            deleted_at=timezone.now(),
            deleted_by=deleted_by_user
        )

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).filter(delete_flag='N')

class SoftDeleteModel(models.Model):
    delete_flag = models.CharField(
        max_length=1,
        choices=[('Y', 'Deleted'), ('N', 'Active')],
        default='N',
        db_index=True
    )
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        'CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='%(class)s_deleted_records'
    )

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True
        base_manager_name = 'all_objects'

    def delete(self, using=None, keep_parents=False, deleted_by_user=None):
        self.delete_flag = 'Y'
        self.deleted_at = timezone.now()
        if deleted_by_user:
            self.deleted_by = deleted_by_user
        self.save(using=using)

class CustomUserManager(UserManager):
    def get_queryset(self):
        return super().get_queryset().filter(delete_flag='N')

class Lab(SoftDeleteModel):
    """
    Primary Tenant model. Each diagnostic lab represents a separate tenant workspace.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('suspended', 'Suspended'),
    ]
    
    # Custom alphanumeric ID (e.g. LAB-7801) or UUID
    id = models.CharField(max_length=20, primary_key=True, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    address = models.TextField()
    phone = models.CharField(max_length=20)
    admin_name = models.CharField(max_length=255, blank=True, default='')
    admin_email = models.EmailField(blank=True, default='')
    lab_code = models.CharField(max_length=50, unique=True, null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.id})"

    def save(self, *args, **kwargs):
        # Auto-generate lab ID prefix if empty
        if not self.id:
            self.id = f"LAB-{uuid.uuid4().hex[:6].upper()}"
        
        # Auto-generate lab code from name if empty
        if not self.lab_code:
            import re
            cleaned_name = re.sub(r'[^a-zA-Z0-9]', '', self.name).upper()
            base_code = cleaned_name[:30] if cleaned_name else "LAB"
            code = base_code
            counter = 1
            while self.__class__.all_objects.filter(lab_code=code).exclude(id=self.id).exists():
                code = f"{base_code}{counter}"
                counter += 1
            self.lab_code = code
        else:
            self.lab_code = self.lab_code.strip().upper()

        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False, deleted_by_user=None):
        from django.utils import timezone
        now = timezone.now()
        
        # 1. Soft-delete the lab itself
        self.delete_flag = 'Y'
        self.deleted_at = now
        if deleted_by_user:
            self.deleted_by = deleted_by_user
        self.save(using=using)
        
        # 2. Cascade soft-delete to related active tenant models
        self.users.all().update(delete_flag='Y', deleted_at=now, deleted_by=deleted_by_user)
        self.patients.all().update(delete_flag='Y', deleted_at=now, deleted_by=deleted_by_user)
        self.expenses.all().update(delete_flag='Y', deleted_at=now, deleted_by=deleted_by_user)
        self.tests.all().update(delete_flag='Y', deleted_at=now, deleted_by=deleted_by_user)
        self.referred_doctors.all().update(delete_flag='Y', deleted_at=now, deleted_by=deleted_by_user)



class CustomUser(AbstractUser, SoftDeleteModel):
    """
    Custom user model representing Super Admins and Lab Tenants (Admins, Techs, Cashiers, Collection Boys).
    """
    ROLE_CHOICES = [
        ('SUPER_ADMIN', 'Super Admin'),
        ('LAB_ADMIN', 'Lab Admin'),
        ('TECHNICIAN', 'Technician'),
        ('CASHIER', 'Cashier'),
        ('COLLECTION_BOY', 'Collection Boy'),
    ]
    
    username_validator = RegexValidator(
        r'^[a-zA-Z0-9_]+$',
        'Username must contain only letters, numbers, and underscores.'
    )
    
    phone_validator = RegexValidator(
        r'^\d{10}$',
        'Phone number must be exactly 10 digits.'
    )
    
    username = models.CharField(
        max_length=150,
        validators=[username_validator],
        error_messages={
            'unique': "A user with that username already exists in this lab.",
        }
    )
    email = models.EmailField(blank=True, null=True, db_index=True)
    phone_number = models.CharField(
        max_length=10,
        blank=True,
        default='',
        validators=[phone_validator]
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='LAB_ADMIN', db_index=True)
    
    # Multi-tenant scoping: null is allowed for global Super Admins
    lab = models.ForeignKey(
        Lab, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='users',
        db_index=True
    )
    
    status = models.CharField(max_length=20, default='active', db_index=True)
    requires_password_change = models.BooleanField(default=False)
    raw_password = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
 
    objects = CustomUserManager()

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lab', 'role']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['lab', 'username', 'delete_flag'],
                name='unique_lab_username_delete_flag'
            ),
            models.UniqueConstraint(
                fields=['username', 'delete_flag'],
                condition=models.Q(lab__isnull=True),
                name='unique_global_username_delete_flag_when_no_lab'
            )
        ]

    def __str__(self):
        return f"{self.username} - {self.role} ({self.lab.name if self.lab else 'Global'})"


class ActivityLog(SoftDeleteModel):
    """
    Global auditable logs tracking platform-wide changes, especially Super Admin actions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=255)
    user_email = models.EmailField(db_index=True)
    
    # Track the lab where the action occurred
    lab_name = models.CharField(max_length=255, null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} by {self.user_email} at {self.timestamp}"


class MasterTest(SoftDeleteModel):
    """
    Global system-level pathology test template.
    """
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, db_index=True)
    code = models.CharField(max_length=50, blank=True, default="")
    tube_type = models.CharField(max_length=100)
    tube_color = models.CharField(max_length=100)
    default_price = models.DecimalField(max_digits=10, decimal_places=2, default=150.00)
    is_active = models.BooleanField(default=True, db_index=True)
    commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'master_tests'
        ordering = ['category', 'name']

    def __str__(self):
        return f"Master: {self.name} ({self.category})"

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"MTEST-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class MasterTestParameter(SoftDeleteModel):
    """
    Global system-level parameter template for a master test.
    """
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    master_test = models.ForeignKey(
        MasterTest,
        on_delete=models.CASCADE,
        related_name='parameters',
        db_column='master_test_id'
    )
    parameter_name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    default_min = models.FloatField()
    default_max = models.FloatField()

    class Meta:
        db_table = 'master_test_parameters'

    def __str__(self):
        return f"Master Param: {self.parameter_name} ({self.unit}) for {self.master_test.name}"

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"MPARAM-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class LabTest(SoftDeleteModel):
    """
    Tenant/Lab-level pathology test. Copies or custom overrides of MasterTest.
    """
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    lab = models.ForeignKey(
        Lab,
        on_delete=models.CASCADE,
        related_name='tests',
        db_column='lab_id',
        db_index=True
    )
    master_test = models.ForeignKey(
        MasterTest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='lab_tests',
        db_column='master_test_id'
    )
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=100, db_index=True)
    code = models.CharField(max_length=50, blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    tube_type = models.CharField(max_length=100)
    tube_color = models.CharField(max_length=100)
    is_enabled = models.BooleanField(default=True, db_index=True)
    is_custom = models.BooleanField(default=False)
    commission_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=50.00)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'lab_tests'
        ordering = ['category', 'name']
        unique_together = ('lab', 'code')

    def __str__(self):
        return f"{self.name} ({self.code}) - Lab: {self.lab.name if self.lab else 'N/A'}"

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"LTEST-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class LabTestParameter(SoftDeleteModel):
    """
    Tenant/Lab-level parameter. Copies or custom overrides of MasterTestParameter.
    """
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    lab_test = models.ForeignKey(
        LabTest,
        on_delete=models.CASCADE,
        related_name='parameters',
        db_column='lab_test_id'
    )
    parameter_name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50)
    default_min = models.FloatField()
    default_max = models.FloatField()

    class Meta:
        db_table = 'lab_test_parameters'

    def __str__(self):
        return f"Lab Param: {self.parameter_name} ({self.unit}) for {self.lab_test.name}"

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"LPARAM-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)



class ReferredDoctor(SoftDeleteModel):
    """
    Catalog of referring doctors/hospitals maintained per tenant lab.
    Used during patient registration to link referrals.
    """
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]

    id = models.CharField(max_length=50, primary_key=True, blank=True)
    lab = models.ForeignKey(
        Lab,
        on_delete=models.CASCADE,
        related_name='referred_doctors',
        db_index=True
    )
    doctor_name = models.CharField(max_length=255, db_index=True)
    hospital_name = models.CharField(max_length=255, blank=True, default='')
    phone = models.CharField(max_length=20, blank=True, default='')
    address = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['doctor_name']
        db_table = 'referred_doctors'
        constraints = [
            models.UniqueConstraint(fields=['lab', 'doctor_name', 'hospital_name'], name='unique_lab_doctor_hospital')
        ]

    def __str__(self):
        return f"{self.doctor_name} - {self.hospital_name} ({self.lab.name})"

    def save(self, *args, **kwargs):
        if not self.id:
            lab_prefix = f"REF-{self.lab.id}-"
            # Try to get the last doctor in this lab matching the new prefix format
            last = ReferredDoctor.all_objects.filter(lab=self.lab, id__startswith=lab_prefix).order_by('-id').first()
            if last:
                try:
                    num = int(last.id.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    num = 1
            else:
                # If no records matching the new prefix, check if any old format "REFxxx" records exist for this lab
                last_old = ReferredDoctor.all_objects.filter(lab=self.lab, id__regex=r'^REF\d+$').order_by('-id').first()
                if last_old:
                    try:
                        num = int(last_old.id.replace('REF', '')) + 1
                    except ValueError:
                        num = 1
                else:
                    num = 1
            self.id = f"{lab_prefix}{num:03d}"
        super().save(*args, **kwargs)


class PatientEntry(SoftDeleteModel):
    STATUS_CHOICES = [
        ('CREATED', 'Created'),
        ('COLLECTED', 'Collected'),
        ('LAB_RECEIVED', 'Received at Lab'),
        ('COMPLETED', 'Completed'),
        ('DELIVERED', 'Delivered'),
    ]
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    id = models.CharField(max_length=50, primary_key=True, blank=True)
    name = models.CharField(max_length=255, db_index=True)
    age = models.IntegerField()
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CREATED', db_index=True)
    tests = models.ManyToManyField(LabTest, related_name='patients')
    results = models.JSONField(default=dict, blank=True) # Maps parameter_id -> entered_value
    collected_by = models.CharField(max_length=255, blank=True, null=True)
    referred_doctor = models.ForeignKey(
        ReferredDoctor,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='patients'
    )
    created_by = models.ForeignKey(
        'CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_patients',
        db_column='created_by_user_id',
        db_index=True
    )
    total_bill = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    concession = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    
    PAYMENT_STATUS_CHOICES = [
        ('FULLY_PAID', 'Fully Paid'),
        ('PARTIAL_PENDING', 'Partial Pending'),
        ('FULL_CONCESSION', 'Full Concession'),
        ('CREDIT_PENDING', 'Credit Pending'),
    ]
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default='CREDIT_PENDING',
        db_index=True
    )
    created_at = models.DateField(default=timezone.localdate, db_index=True)
    lab = models.ForeignKey(
        Lab,
        on_delete=models.CASCADE,
        related_name='patients',
        db_index=True
    )

    class Meta:
        ordering = ['-created_at', '-id']

    def __str__(self):
        return f"{self.name} - {self.id} ({self.lab.name})"

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"PAT-{uuid.uuid4().hex[:6].upper()}"
            
        # Recalculate payment status on save
        bill = float(self.total_bill) if self.total_bill else 0.0
        paid = float(self.paid_amount) if self.paid_amount else 0.0
        conc = float(self.concession) if self.concession else 0.0
        pending = bill - paid - conc

        if pending <= 0.01:
            if conc >= bill - 0.01 and bill > 0:
                self.payment_status = 'FULL_CONCESSION'
            else:
                self.payment_status = 'FULLY_PAID'
        elif paid > 0.01 or conc > 0.01:
            self.payment_status = 'PARTIAL_PENDING'
        else:
            self.payment_status = 'CREDIT_PENDING'

        super().save(*args, **kwargs)

    def delete(self, using=None, keep_parents=False, deleted_by_user=None):
        from django.db import transaction
        with transaction.atomic():
            super().delete(using=using, keep_parents=keep_parents, deleted_by_user=deleted_by_user)
            # Soft-delete related payment transactions
            self.transactions.all().update(
                delete_flag='Y',
                deleted_at=timezone.now(),
                deleted_by=deleted_by_user
            )
            # Soft-delete related payments
            self.payments_list.all().update(
                delete_flag='Y',
                deleted_at=timezone.now(),
                deleted_by=deleted_by_user
            )
            # Soft-delete related concessions
            self.concessions_list.all().update(
                delete_flag='Y',
                deleted_at=timezone.now(),
                deleted_by=deleted_by_user
            )
            # Soft-delete report details if it exists
            if hasattr(self, 'report_details') and self.report_details:
                self.report_details.delete(deleted_by_user=deleted_by_user)


class DoctorCommissionEntry(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    lab = models.ForeignKey(
        Lab,
        on_delete=models.CASCADE,
        related_name='commission_entries',
        db_index=True
    )
    patient = models.ForeignKey(
        PatientEntry,
        on_delete=models.CASCADE,
        related_name='commission_entries',
        db_index=True
    )
    doctor = models.ForeignKey(
        ReferredDoctor,
        on_delete=models.CASCADE,
        related_name='commission_entries',
        db_index=True
    )
    test = models.ForeignKey(
        LabTest,
        on_delete=models.CASCADE,
        related_name='commission_entries',
        db_index=True
    )
    test_price = models.DecimalField(max_digits=10, decimal_places=2)
    commission_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2)
    entry_date = models.DateField(default=timezone.localdate, db_index=True)
    is_paid = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'doctor_commission_entries'
        ordering = ['-entry_date', '-created_at']

    def __str__(self):
        return f"Comm: {self.doctor.doctor_name} - {self.test.name} on {self.entry_date}"

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"COM-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class Expense(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    note = models.TextField(blank=True, default='')
    date = models.DateField(default=timezone.localdate, db_index=True)
    created_by = models.CharField(max_length=255, blank=True, default='')
    lab = models.ForeignKey(
        Lab,
        on_delete=models.CASCADE,
        related_name='expenses',
        db_index=True
    )
    submitted_to_lab_admin = models.CharField(
        max_length=1,
        choices=[('Y', 'Yes'), ('N', 'No')],
        default='N',
        db_index=True
    )
    submitted_to_lab_admin_at = models.DateTimeField(null=True, blank=True)
    cashier_admin_settlement = models.ForeignKey(
        'CashierAdminSettlement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settled_expenses',
        db_column='cashier_admin_settlement_id'
    )
    cashier_receipt = models.ForeignKey(
        'CashierReceipt',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='settled_expenses',
        db_column='cashier_receipt_id'
    )

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f"{self.title} (₹{self.amount}) for {self.lab.name}"

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"EXP-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class LabSettings(models.Model):
    lab = models.OneToOneField(
        Lab,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='settings'
    )
    logo_base64 = models.TextField(blank=True, null=True)
    letterhead_base64 = models.TextField(
        blank=True, null=True,
        help_text="Base64-encoded scanned letterhead image. Used as print background for each report page."
    )

    class Meta:
        verbose_name_plural = "Lab settings"

    def __str__(self):
        return f"Branding Settings for {self.lab.name}"


class Payment(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    patient = models.ForeignKey(PatientEntry, on_delete=models.CASCADE, related_name='payments_list')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    processed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"PAY-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class Concession(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    patient = models.ForeignKey(PatientEntry, on_delete=models.CASCADE, related_name='concessions_list')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"CON-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class Report(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    patient = models.OneToOneField(PatientEntry, on_delete=models.CASCADE, related_name='report_details')
    pdf_url = models.CharField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=20, default='PENDING')
    signed_by = models.CharField(max_length=255, blank=True, default='')
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"REP-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class CashierAdminSettlement(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    cashier = models.ForeignKey(CustomUser, on_delete=models.CASCADE, db_column='cashier_id', related_name='admin_settlements')
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, db_column='lab_id', related_name='admin_settlements')
    gross_cash = models.DecimalField(max_digits=10, decimal_places=2)
    expenses = models.DecimalField(max_digits=10, decimal_places=2)
    final_cash = models.DecimalField(max_digits=10, decimal_places=2)
    remarks = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cashier_admin_settlements'
        ordering = ['-submitted_at']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"CAS-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class CashierReceipt(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    collection_boy = models.ForeignKey(CustomUser, on_delete=models.CASCADE, db_column='collection_boy_id', related_name='cashier_receipts_received')
    cashier = models.ForeignKey(CustomUser, on_delete=models.CASCADE, db_column='cashier_id', related_name='cashier_receipts_handled')
    amount_received = models.DecimalField(max_digits=10, decimal_places=2)
    receipt_date = models.DateField(default=timezone.localdate, db_index=True)
    receipt_time = models.TimeField(null=True, blank=True)
    cashier_admin_settlement = models.ForeignKey(
        'CashierAdminSettlement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='cashier_admin_settlement_id',
        related_name='receipts'
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cashier_receipts'
        ordering = ['-receipt_date', '-receipt_time']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"RCP-{uuid.uuid4().hex[:6].upper()}"
        if not self.receipt_date:
            self.receipt_date = timezone.localdate()
        if not self.receipt_time:
            self.receipt_time = timezone.localtime().time()
        super().save(*args, **kwargs)


class DailyCloseout(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, related_name='closeouts', db_index=True)
    cashier = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='cashier_closeouts', db_index=True)
    date = models.DateField(default=timezone.localdate, db_index=True)
    total_settlements = models.DecimalField(max_digits=10, decimal_places=2)
    total_expenses = models.DecimalField(max_digits=10, decimal_places=2)
    net_revenue = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-submitted_at']
        unique_together = ('lab', 'date')

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"CLO-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)


class PaymentTransaction(SoftDeleteModel):
    id = models.CharField(max_length=50, primary_key=True, blank=True)
    lab = models.ForeignKey(Lab, on_delete=models.CASCADE, db_column='lab_id', related_name='transactions', db_index=True)
    patient = models.ForeignKey(PatientEntry, on_delete=models.CASCADE, db_column='patient_id', related_name='transactions', db_index=True)
    collection_boy = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='collection_boy_id',
        related_name='collected_transactions'
    )
    amount_received = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    concession_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    transaction_date = models.DateField(default=timezone.localdate, db_index=True)
    transaction_time = models.TimeField(null=True, blank=True)
    submitted_to_cashier = models.CharField(
        max_length=1,
        choices=[('Y', 'Yes'), ('N', 'No')],
        default='N',
        db_index=True
    )
    cashier_received_at = models.DateTimeField(null=True, blank=True)
    cashier_admin_settlement = models.ForeignKey(
        'CashierAdminSettlement',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        db_column='cashier_admin_settlement_id',
        related_name='payment_transactions'
    )
    payment_mode = models.CharField(
        max_length=20,
        choices=[('CASH', 'Cash'), ('CARD', 'Card'), ('UPI', 'UPI'), ('CREDIT', 'Credit')],
        default='CASH'
    )
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-transaction_date', '-transaction_time']

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"TXN-{uuid.uuid4().hex[:6].upper()}"
        if not self.lab_id and self.patient:
            self.lab = self.patient.lab
        if not self.transaction_date:
            self.transaction_date = timezone.localdate()
        if not self.transaction_time:
            self.transaction_time = timezone.localtime().time()
            
        if not self.collection_boy:
            self.submitted_to_cashier = 'Y'
            if not self.cashier_received_at:
                self.cashier_received_at = timezone.now()

        super().save(*args, **kwargs)
        self.recalculate_patient()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self.recalculate_patient()

    def recalculate_patient(self):
        from django.db.models import Sum
        patient = self.patient
        active_txns = patient.transactions.filter(delete_flag='N')
        total_paid = active_txns.aggregate(total=Sum('amount_received'))['total'] or 0.0
        total_conc = active_txns.aggregate(total=Sum('concession_amount'))['total'] or 0.0

        patient.paid_amount = total_paid
        patient.concession = total_conc

        bill = float(patient.total_bill)
        paid = float(total_paid)
        conc = float(total_conc)
        pending = bill - paid - conc

        if pending <= 0.01:
            if conc >= bill - 0.01:
                patient.payment_status = 'FULL_CONCESSION'
            else:
                patient.payment_status = 'FULLY_PAID'
        elif paid > 0.01 or conc > 0.01:
            patient.payment_status = 'PARTIAL_PENDING'
        else:
            patient.payment_status = 'CREDIT_PENDING'

        patient.save(update_fields=['paid_amount', 'concession', 'payment_status'])


class DailyCashSnapshot(SoftDeleteModel):
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        db_column='user_id',
        related_name='daily_cash_snapshots'
    )
    snapshot_date = models.DateField(db_index=True)
    opening_cash_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cash_collected_today = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    expenses_today = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    cash_submitted_today = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    closing_cash_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_cash_snapshot'
        unique_together = ('user', 'snapshot_date')
        ordering = ['snapshot_date']
