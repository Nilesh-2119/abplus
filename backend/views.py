# Django REST Framework ViewSets for AB+ Super Admin and Tenant Dashboards
# Location: backend/views.py

from rest_framework import viewsets, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.db.models import Count, Value, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import (
    Lab, ActivityLog, MasterTest, MasterTestParameter, 
    LabTest, LabTestParameter, PatientEntry, Expense, LabSettings, ReferredDoctor,
    Payment, Concession, Report, CashierReceipt, DailyCloseout, PaymentTransaction, CashierAdminSettlement
)
from .serializers import (
    LabSerializer,
    LabSummarySerializer,
    LabCreateSerializer,
    CustomUserSerializer,
    EmployeeSerializer,
    ActivityLogSerializer,
    MasterTestSerializer,
    MasterTestParameterSerializer,
    LabTestSerializer,
    LabTestParameterSerializer,
    PatientEntrySerializer,
    ExpenseSerializer,
    LabSettingsSerializer,
    ReferredDoctorSerializer,
    DailyCloseoutSerializer,
    CashierAdminSettlementSerializer
)

User = get_user_model()

class SoftDeleteViewSetMixin:
    def perform_destroy(self, instance):
        user = self.request.user if self.request.user.is_authenticated else None
        instance.delete(deleted_by_user=user)
        
        # Log action in ActivityLog
        user_display = "Operator"
        if user:
            user_display = f"{user.first_name} {user.last_name}".strip()
            if not user_display:
                user_display = user.username
                
        model_name = instance._meta.model_name.lower()
        
        if model_name == 'patiententry':
            log_action = f"{user_display} soft deleted patient {instance.id}"
        elif model_name == 'expense':
            log_action = f"{user_display} soft deleted expense {instance.title} (₹{instance.amount:.2f})"
        elif model_name == 'referreddoctor':
            log_action = f"{user_display} soft deleted doctor {instance.doctor_name}"
        elif model_name == 'labtest':
            log_action = f"{user_display} soft deleted test {instance.name} ({instance.code})"
        elif model_name == 'customuser':
            staff_name = f"{instance.first_name} {instance.last_name}".strip() or instance.username
            log_action = f"{user_display} soft deleted staff {staff_name}"
        elif model_name == 'lab':
            log_action = f"{user_display} soft deleted lab {instance.name}"
        else:
            record_desc = getattr(instance, 'name', getattr(instance, 'title', getattr(instance, 'doctor_name', getattr(instance, 'username', ''))))
            log_action = f"{user_display} soft deleted {model_name} {record_desc}".strip()
            
        lab_name_val = None
        if hasattr(instance, 'lab') and getattr(instance, 'lab'):
            lab_name_val = instance.lab.name
        elif hasattr(instance, 'lab_name') and getattr(instance, 'lab_name'):
            lab_name_val = instance.lab_name
        elif model_name == 'lab':
            lab_name_val = instance.name

        ActivityLog.objects.create(
            action=log_action,
            user_email=user.email if (user and user.email) else "operator@abplus.in",
            lab_name=lab_name_val
        )

class LabViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet to manage pathology lab tenants.
    """
    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated:
            if request.user.role != 'SUPER_ADMIN' and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only Super Admins can access lab tenant records.")

    def get_queryset(self):
        # Optimize queryset by annotating count statistics to avoid heavy subqueries
        queryset = Lab.objects.annotate(
            users_count=Count('users', distinct=True),
            patient_count=Count('patients', distinct=True)
        )

        # Apply Filters
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)

        search_param = self.request.query_params.get('search')
        if search_param:
            queryset = queryset.filter(
                name__icontains=search_param
            ) | queryset.filter(
                admin_name__icontains=search_param
            ) | queryset.filter(
                admin_email__icontains=search_param
            )

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return LabCreateSerializer
        return LabSerializer

    @action(detail=True, methods=['patch'], url_path='status')
    def status_patch(self, request, pk=None):
        """
        PATCH /api/labs/:id/status/
        Suspends or Activates a tenant lab workspace and its related administrator.
        """
        lab = get_object_or_404(Lab, pk=pk)
        new_status = request.data.get('status')

        if new_status not in ['active', 'suspended']:
            return Response(
                {"error": "Invalid status value. Choose 'active' or 'suspended'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Enforce state change atomically
        with transaction.atomic():
            lab.status = new_status
            lab.save()

            # Deactivate/Activate the Lab Admin user to lock out access
            admin_email = lab.admin_email
            User.objects.filter(email=admin_email).update(
                status=new_status,
                is_active=(new_status == 'active')
            )

            # Record system log
            ActivityLog.objects.create(
                action=f"Super Admin {'Suspended' if new_status == 'suspended' else 'Activated'} {lab.name}",
                user_email="superadmin@abplus.in",
                lab_name=lab.name
            )

        # Return updated lab serialization
        annotated_lab = self.get_queryset().get(pk=lab.pk)
        return Response(LabSerializer(annotated_lab).data)

    @action(detail=True, methods=['get'], url_path='summary')
    def summary(self, request, pk=None):
        """
        GET /api/labs/:id/summary/
        Performance-optimized lightweight details endpoint for modal cards.
        """
        lab = Lab.objects.filter(pk=pk).annotate(
            users_count=Count('users', distinct=True),
            patient_count=Count('patients', distinct=True)
        ).only('id', 'name', 'status').first()

        if not lab:
            return Response({"error": "Lab not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = LabSummarySerializer(lab)
        return Response(serializer.data)


class DashboardStatsView(views.APIView):
    """
    GET /api/dashboard/stats/
    Aggregates statistical highlights for Super Admin dashboard OR specific tenant dashboards.
    """
    def get(self, request):
        lab_id = request.query_params.get('lab_id')
        from django.db.models import Q, F, OuterRef, Subquery, DecimalField, Value, Sum
        from django.db.models.functions import Coalesce
        import datetime
        
        # 1. Tenant-Specific Dashboard Stats
        if lab_id:
            date_str = request.query_params.get('date')
            if not date_str:
                from django.utils import timezone
                date_str = timezone.now().date().isoformat()
            
            try:
                selected_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                from django.utils import timezone
                selected_date = timezone.now().date()
            
            # If Cashier, return cashier-specific metrics
            role = request.user.role if request.user.is_authenticated else request.query_params.get('role')
            if role == 'CASHIER':
                # 1. Today's Net Cash Received (all CashierReceipt amount received today)
                # Receipts today:
                receipts_today = CashierReceipt.objects.filter(
                    cashier__lab_id=lab_id,
                    receipt_date=selected_date,
                    delete_flag='N'
                ).aggregate(total=Sum('amount_received'))['total'] or 0.0
                
                # Direct desk payments today:
                desk_cash_today = PaymentTransaction.objects.filter(
                    lab_id=lab_id,
                    collection_boy__isnull=True,
                    payment_mode='CASH',
                    transaction_date=selected_date,
                    delete_flag='N'
                ).aggregate(total=Sum('amount_received'))['total'] or 0.0
                
                net_cash_received = float(receipts_today) + float(desk_cash_today)
                
                # 2. Total Samples Received Today
                samples_received = PatientEntry.objects.filter(
                    lab_id=lab_id,
                    created_at=selected_date,
                    status__in=['LAB_RECEIVED', 'COMPLETED', 'DELIVERED']
                ).count()
                
                # 3. Pending Collection Boys Count (active boys who have any unsubmitted cash collections)
                active_boys = User.objects.filter(
                    lab_id=lab_id,
                    role='COLLECTION_BOY',
                    delete_flag='N',
                    status='active'
                )
                unsubmitted_boy_ids = PaymentTransaction.objects.filter(
                    lab_id=lab_id,
                    submitted_to_cashier='N',
                    delete_flag='N'
                ).values_list('collection_boy_id', flat=True).distinct()
                pending_boys_count = active_boys.filter(id__in=unsubmitted_boy_ids).count()

                # 4. Cash In Vault (up to selected_date D)
                receipts_till_date = CashierReceipt.objects.filter(
                    cashier__lab_id=lab_id,
                    receipt_date__lte=selected_date,
                    delete_flag='N'
                ).aggregate(total=Sum('amount_received'))['total'] or 0.0
                
                desk_cash_till_date = PaymentTransaction.objects.filter(
                    lab_id=lab_id,
                    collection_boy__isnull=True,
                    payment_mode='CASH',
                    transaction_date__lte=selected_date,
                    delete_flag='N'
                ).aggregate(total=Sum('amount_received'))['total'] or 0.0
                
                # Exclude collection boy expenses from the cashier's unsubmitted expenses
                active_boys_usernames = User.objects.filter(
                    lab_id=lab_id,
                    role='COLLECTION_BOY',
                    delete_flag='N'
                ).values_list('username', flat=True)

                settled_gross_till_date = CashierAdminSettlement.objects.filter(
                    lab_id=lab_id,
                    submitted_at__date__lte=selected_date,
                    delete_flag='N'
                ).aggregate(total=Sum('gross_cash'))['total'] or 0.0
                
                unsubmitted_expenses_till_date = Expense.objects.filter(
                    lab_id=lab_id,
                    date__lte=selected_date,
                    cashier_receipt__isnull=True,
                    cashier_admin_settlement__isnull=True,
                    delete_flag='N'
                ).exclude(
                    created_by__in=active_boys_usernames
                ).aggregate(total=Sum('amount'))['total'] or 0.0
                
                cash_in_vault = float(receipts_till_date) + float(desk_cash_till_date) - float(settled_gross_till_date) - float(unsubmitted_expenses_till_date)
                cash_in_vault = max(0.0, cash_in_vault)

                # 5. Cashier Total Submitted Today to Lab Admin
                cash_submitted_today = CashierAdminSettlement.objects.filter(
                    lab_id=lab_id,
                    submitted_at__date=selected_date,
                    delete_flag='N'
                ).aggregate(total=Sum('final_cash'))['total'] or 0.0
                
                # 6. Previous Cash Submission Pending (cash in vault as of D-1)
                yesterday = selected_date - datetime.timedelta(days=1)
                receipts_yesterday = CashierReceipt.objects.filter(
                    cashier__lab_id=lab_id,
                    receipt_date__lte=yesterday,
                    delete_flag='N'
                ).aggregate(total=Sum('amount_received'))['total'] or 0.0
                
                desk_cash_yesterday = PaymentTransaction.objects.filter(
                    lab_id=lab_id,
                    collection_boy__isnull=True,
                    payment_mode='CASH',
                    transaction_date__lte=yesterday,
                    delete_flag='N'
                ).aggregate(total=Sum('amount_received'))['total'] or 0.0
                
                settled_gross_yesterday = CashierAdminSettlement.objects.filter(
                    lab_id=lab_id,
                    submitted_at__date__lte=yesterday,
                    delete_flag='N'
                ).aggregate(total=Sum('gross_cash'))['total'] or 0.0
                
                unsubmitted_expenses_yesterday = Expense.objects.filter(
                    lab_id=lab_id,
                    date__lte=yesterday,
                    cashier_receipt__isnull=True,
                    cashier_admin_settlement__isnull=True,
                    delete_flag='N'
                ).exclude(
                    created_by__in=active_boys_usernames
                ).aggregate(total=Sum('amount'))['total'] or 0.0
                
                previous_cash_pending = float(receipts_yesterday) + float(desk_cash_yesterday) - float(settled_gross_yesterday) - float(unsubmitted_expenses_yesterday)
                previous_cash_pending = max(0.0, previous_cash_pending)

                return Response({
                    "cashier_mode": True,
                    "net_cash_received": float(net_cash_received),
                    "samples_received": samples_received,
                    "pending_boys_count": pending_boys_count,
                    "cashier_pending": float(cash_in_vault), # Backward compatibility
                    "cash_in_vault": float(cash_in_vault),
                    "cash_submitted_today": float(cash_submitted_today),
                    "total_submitted_today": float(cash_submitted_today), # Backward compatibility
                    "previous_cash_pending": float(previous_cash_pending),
                    "cash_not_submitted_to_admin": float(cash_in_vault)
                })

            # For ADMIN/General dashboard
            daily_patients = PatientEntry.objects.filter(lab_id=lab_id, created_at=selected_date)
            
            today_patients = daily_patients.count()
            pending_reports = daily_patients.exclude(status__in=['COMPLETED', 'DELIVERED']).count()
            completed_reports = daily_patients.filter(status__in=['COMPLETED', 'DELIVERED']).count()
            
            # Date-aware pending balance (receivables) for all patients up to D
            patients_till_date = PatientEntry.objects.filter(lab_id=lab_id, created_at__lte=selected_date, delete_flag='N')
            
            pay_subquery = PaymentTransaction.objects.filter(
                patient=OuterRef('pk'),
                transaction_date__lte=selected_date,
                delete_flag='N'
            ).values('patient').annotate(
                total=Sum('amount_received')
            ).values('total')
            
            conc_subquery = PaymentTransaction.objects.filter(
                patient=OuterRef('pk'),
                transaction_date__lte=selected_date,
                delete_flag='N'
            ).values('patient').annotate(
                total=Sum('concession_amount')
            ).values('total')
            
            patients_annotated = patients_till_date.annotate(
                paid_till_date=Coalesce(
                    Subquery(pay_subquery, output_field=DecimalField(max_digits=10, decimal_places=2)),
                    Value(0.0, output_field=DecimalField(max_digits=10, decimal_places=2))
                ),
                conc_till_date=Coalesce(
                    Subquery(conc_subquery, output_field=DecimalField(max_digits=10, decimal_places=2)),
                    Value(0.0, output_field=DecimalField(max_digits=10, decimal_places=2))
                )
            )
            
            pending_balance = 0.0
            for p in patients_annotated:
                rem = float(p.total_bill) - float(p.paid_till_date) - float(p.conc_till_date)
                if rem > 0.01:
                    pending_balance += rem
            
            daily_expenses = Expense.objects.filter(lab_id=lab_id, date=selected_date, delete_flag='N').aggregate(total=Sum('amount'))['total'] or 0.0
            
            # Cumulative total revenue from ledger
            total_revenue = PaymentTransaction.objects.filter(
                lab_id=lab_id,
                transaction_date__lte=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0
            
            # Cumulative expenses
            total_expenses_till_date = Expense.objects.filter(
                lab_id=lab_id,
                date__lte=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount'))['total'] or 0.0
            net_revenue = float(total_revenue) - float(total_expenses_till_date)
            
            # ── LAB ADMIN SPECIFIC METRICS ──
            # Total cash received by cashier from collection boys (all time up to selected date)
            receipts_till_date = CashierReceipt.objects.filter(
                cashier__lab_id=lab_id,
                receipt_date__lte=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0

            # Direct desk payments received at cashier desk (no collection boy)
            desk_cash_till_date = PaymentTransaction.objects.filter(
                lab_id=lab_id,
                collection_boy__isnull=True,
                payment_mode='CASH',
                transaction_date__lte=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0

            # Total cash already handed over from cashier to lab admin (all time up to selected date)
            settled_gross_till_date = CashierAdminSettlement.objects.filter(
                lab_id=lab_id,
                submitted_at__date__lte=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('gross_cash'))['total'] or 0.0

            # Cash Available in Vault = total received by cashier - already handed over to admin
            # This is the live vault balance sitting with the cashier that admin hasn't received yet
            cash_available_in_vault = float(receipts_till_date) + float(desk_cash_till_date) - float(settled_gross_till_date)
            cash_available_in_vault = max(0.0, cash_available_in_vault)

            # Received from Cashier Today = total amount cashier handed over to lab admin on selected date
            received_from_cashier_today = CashierAdminSettlement.objects.filter(
                lab_id=lab_id,
                submitted_at__date=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('final_cash'))['total'] or 0.0


            return Response({
                "today_patients": today_patients,
                "pending_reports": pending_reports,
                "completed_reports": completed_reports,
                "total_revenue": float(total_revenue),
                "pending_balance": float(pending_balance),
                "daily_expenses": float(daily_expenses),
                "net_revenue": float(net_revenue),
                # New admin vault metrics
                "cash_available_in_vault": float(cash_available_in_vault),
                "received_from_cashier_today": float(received_from_cashier_today),
                # Kept for backward compatibility
                "lab_cash_collection_pending": float(cash_available_in_vault),
            })
            
        # 2. Super Admin Dashboard Stats
        total_labs = Lab.objects.count()
        active_labs = Lab.objects.filter(status='active').count()
        suspended_labs = total_labs - active_labs
        total_users = User.objects.filter(is_superuser=False).count()
        total_patient_entries = PatientEntry.objects.count()

        return Response({
            "total_labs": total_labs,
            "active_labs": active_labs,
            "inactive_labs": suspended_labs,
            "total_users": total_users,
            "total_patient_entries": total_patient_entries,
            "labs_trend": "+2 this month",
            "users_trend": "+4 this week",
            "patients_trend": "+142 today",
        })


class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet to monitor platform users in a read-only list.
    """
    serializer_class = CustomUserSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated:
            if request.user.role != 'SUPER_ADMIN' and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only Super Admins can browse system users.")

    def get_queryset(self):
        queryset = User.objects.filter(is_superuser=False).select_related('lab')
        
        role_param = self.request.query_params.get('role')
        if role_param and role_param != 'all':
            queryset = queryset.filter(role=role_param)

        search_param = self.request.query_params.get('search')
        if search_param:
            queryset = queryset.filter(
                first_name__icontains=search_param
            ) | queryset.filter(
                email__icontains=search_param
            ) | queryset.filter(
                lab__name__icontains=search_param
            )

        return queryset


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet to browse chronological platform actions.
    """
    queryset = ActivityLog.objects.all()
    serializer_class = ActivityLogSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated:
            if request.user.role != 'SUPER_ADMIN' and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only Super Admins can access platform audit logs.")


class EmployeeViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing tenant employees.
    """
    serializer_class = EmployeeSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN'] and not request.user.is_superuser:
                # Cashiers are allowed to view (GET) employees to see Collection Boys cash summary
                # and call settle (POST /api/employees/<pk>/settle/)
                if request.user.role == 'CASHIER' and (request.method in ['GET', 'HEAD', 'OPTIONS'] or request.path.rstrip('/').endswith('/settle')):
                    pass
                else:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("You do not have permission to manage staff profiles.")

    def get_queryset(self):
        queryset = User.objects.filter(is_superuser=False).select_related('lab')
        if self.request.user.is_authenticated:
            if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
                queryset = queryset.filter(lab=self.request.user.lab)
            else:
                lab_id = self.request.query_params.get('lab_id')
                if lab_id:
                    queryset = queryset.filter(lab_id=lab_id)
        else:
            lab_id = self.request.query_params.get('lab_id')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)
        return queryset

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        employee = self.get_object()
        import random
        temp_pass = f"AB-{random.randint(100000, 999999)}"
        employee.set_password(temp_pass)
        employee.raw_password = temp_pass
        employee.requires_password_change = True
        employee.save()

        # Log action
        ActivityLog.objects.create(
            action=f"Reset password of {employee.first_name}",
            user_email=request.data.get('operator_email', 'doctor@abplus.in'),
            lab_name=employee.lab.name if employee.lab else 'Global'
        )

        return Response({"success": True, "temp_pass": temp_pass})

    @action(detail=True, methods=['post'], url_path='settle')
    def settle(self, request, pk=None):
        collection_boy = self.get_object()
        if collection_boy.role != 'COLLECTION_BOY':
            return Response({"error": "Only collection boys can be settled."}, status=status.HTTP_400_BAD_REQUEST)
            
        lab_id = request.data.get('lab_id') or collection_boy.lab_id
        date_str = request.data.get('date')

        if not date_str:
            return Response({"error": "date parameter is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Parse date
        import datetime
        try:
            settlement_date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({"error": "Invalid date format. Expected YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            from django.utils import timezone
            # 1. Fetch unsubmitted payment transactions of this collection boy
            unsubmitted_txns = PaymentTransaction.objects.filter(
                collection_boy=collection_boy,
                submitted_to_cashier='N',
                delete_flag='N'
            )
            cash_waiting = unsubmitted_txns.aggregate(total=Sum('amount_received'))['total'] or 0.0

            if cash_waiting <= 0.01:
                return Response({"error": "No pending cash collections to receive for this collection boy."}, status=status.HTTP_400_BAD_REQUEST)

            # 2. Fetch unsubmitted expenses of this collection boy up to the settlement date
            unsubmitted_expenses = Expense.objects.filter(
                lab_id=lab_id,
                created_by__iexact=collection_boy.username,
                date__lte=settlement_date,
                cashier_receipt__isnull=True,
                cashier_admin_settlement__isnull=True,
                delete_flag='N'
            )
            expenses_amount = unsubmitted_expenses.aggregate(total=Sum('amount'))['total'] or 0.0

            net_cash_received = float(cash_waiting) - float(expenses_amount)
            net_cash_received = max(0.0, net_cash_received)

            # 3. Create CashierReceipt record with the net cash received
            cashier_user = request.user if (request.user and request.user.is_authenticated) else collection_boy
            receipt = CashierReceipt.objects.create(
                collection_boy=collection_boy,
                cashier=cashier_user,
                amount_received=net_cash_received,
                receipt_date=timezone.localdate(),
                receipt_time=timezone.localtime().time()
            )

            # 4. Link expenses to CashierReceipt
            unsubmitted_expenses.update(
                cashier_receipt=receipt
            )

            # 5. Update payment transactions
            now = timezone.now()
            unsubmitted_txns.update(
                submitted_to_cashier='Y',
                cashier_received_at=now
            )

            # 6. Log system action
            cashier_name = f"{cashier_user.first_name} {cashier_user.last_name}".strip() or cashier_user.username
            ActivityLog.objects.create(
                action=f"Cashier {cashier_name} received ₹{net_cash_received:.2f} (Gross: ₹{cash_waiting:.2f}, Expenses: ₹{expenses_amount:.2f}) from collection boy {collection_boy.username}.",
                user_email=cashier_user.email or "noemail@abplus.in",
                lab_name=collection_boy.lab.name if collection_boy.lab else 'Global'
            )

        return Response({
            "success": True,
            "settlement_status": "SETTLED",
            "settled_by_name": cashier_name,
            "settlement_time": now.isoformat()
        })


class MasterTestViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for system-level Master pathology tests library.
    """
    serializer_class = MasterTestSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated and request.method not in ['GET', 'HEAD', 'OPTIONS']:
            if request.user.role != 'SUPER_ADMIN' and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only Super Admins can modify the global master library.")

    def get_queryset(self):
        queryset = MasterTest.objects.all().prefetch_related('parameters')
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)
        status_param = self.request.query_params.get('status')
        if status_param == 'active':
            queryset = queryset.filter(is_active=True)
        elif status_param == 'inactive':
            queryset = queryset.filter(is_active=False)
        return queryset


class TestViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for diagnostic tests catalog management (LabTest).
    """
    serializer_class = LabTestSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated and request.method not in ['GET', 'HEAD', 'OPTIONS']:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN', 'TECHNICIAN'] and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have permission to modify the test catalog.")

    def get_queryset(self):
        category = self.request.query_params.get('category')
        queryset = LabTest.objects.all().prefetch_related('parameters')
        
        if self.request.user.is_authenticated:
            if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
                queryset = queryset.filter(lab=self.request.user.lab)
            else:
                lab_id = self.request.query_params.get('lab_id')
                if lab_id:
                    queryset = queryset.filter(lab_id=lab_id)
        else:
            lab_id = self.request.query_params.get('lab_id')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)
                
        if category:
            queryset = queryset.filter(category=category)
            
        return queryset

    @action(detail=True, methods=['patch'], url_path='toggle')
    def toggle(self, request, pk=None):
        test = self.get_object()
        is_enabled = request.data.get('is_enabled', True)
        test.is_enabled = is_enabled
        test.save()

        # Log action
        ActivityLog.objects.create(
            action=f"{'Enabled' if is_enabled else 'Disabled'} test catalog item: {test.name}",
            user_email=request.data.get('operator_email', 'doctor@abplus.in'),
            lab_name=test.lab.name if test.lab else 'Global'
        )

        return Response(LabTestSerializer(test).data)


class PatientViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for patient workflow management (role-based views, sample collecting, results entry).
    """
    serializer_class = PatientEntrySerializer

    def get_queryset(self):
        search = self.request.query_params.get('search')
        status = self.request.query_params.get('status')
        date_param = self.request.query_params.get('date')

        queryset = PatientEntry.objects.all().prefetch_related('tests__parameters')
        
        # Enforce strict backend-driven scoping
        if self.request.user.is_authenticated:
            # 1. Scope to user's lab context
            if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
                queryset = queryset.filter(lab=self.request.user.lab)
            else:
                lab_id = self.request.query_params.get('lab_id')
                if lab_id:
                    queryset = queryset.filter(lab_id=lab_id)
            
            # 2. Scope view permissions by role
            role = self.request.user.role
            if role == 'COLLECTION_BOY':
                from django.db.models import Q
                queryset = queryset.filter(status__in=['CREATED', 'COLLECTED']).filter(
                    Q(created_by=self.request.user) | 
                    Q(collected_by__iexact=self.request.user.username) | 
                    Q(collected_by__iexact=f"{self.request.user.first_name} {self.request.user.last_name}".strip())
                )
        else:
            # Fallback for unauthenticated/mock testing
            lab_id = self.request.query_params.get('lab_id')
            role = self.request.query_params.get('role')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)
            if role == 'COLLECTION_BOY':
                queryset = queryset.filter(status__in=['CREATED', 'COLLECTED'])

        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(phone__icontains=search) |
                Q(id__icontains=search)
            )
        elif date_param:
            queryset = queryset.filter(created_at=date_param)

        if status and status != 'ALL':
            queryset = queryset.filter(status=status)

        return queryset

    def perform_create(self, serializer):
        extra_data = {}
        if self.request.user.is_authenticated:
            extra_data['created_by'] = self.request.user
            if self.request.user.role == 'COLLECTION_BOY':
                user_display = f"{self.request.user.first_name} {self.request.user.last_name}".strip()
                extra_data['collected_by'] = user_display if user_display else self.request.user.username
            if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
                extra_data['lab'] = self.request.user.lab
        serializer.save(**extra_data)

    def destroy(self, request, *args, **kwargs):
        patient = self.get_object()
        if request.user.is_authenticated:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN', 'COLLECTION_BOY'] and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have permission to delete patient records.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='payment')
    def payment(self, request, pk=None):
        if request.user.is_authenticated:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN', 'CASHIER', 'COLLECTION_BOY'] and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only authorized roles can process payments or concessions.")

        patient_obj = self.get_object()
        paid_amount = float(request.data.get('paid_amount', 0))
        concession_amount = float(request.data.get('concession', 0))
        payment_mode = request.data.get('payment_mode', 'CASH')
        notes = request.data.get('notes', '')
        client_txn_id = request.data.get('client_txn_id')

        if paid_amount < 0 or concession_amount < 0:
            return Response({"error": "Payment and concession amounts must be non-negative."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Lock the patient record to prevent concurrent updates
            patient = PatientEntry.objects.select_for_update().get(pk=patient_obj.pk)

            # Idempotency check: if client_txn_id already processed, return success immediately
            if client_txn_id:
                existing_txn = PaymentTransaction.objects.filter(id=client_txn_id).first()
                if existing_txn:
                    return Response(PatientEntrySerializer(patient).data)

            # Recalculate latest pending balance directly from database transactions under lock
            from django.db.models import Sum
            active_txns = patient.transactions.filter(delete_flag='N')
            total_paid = active_txns.aggregate(total=Sum('amount_received'))['total'] or 0.0
            total_conc = active_txns.aggregate(total=Sum('concession_amount'))['total'] or 0.0

            remaining = float(patient.total_bill) - float(total_paid) - float(total_conc)
            if (paid_amount + concession_amount) > remaining + 0.01:
                return Response({"error": f"The sum of payment (₹{paid_amount:.2f}) and concession (₹{concession_amount:.2f}) exceeds the remaining pending balance of ₹{remaining:.2f}."}, status=status.HTTP_400_BAD_REQUEST)

            user_obj = request.user if request.user.is_authenticated else None
            
            # Create payment transaction
            txn = PaymentTransaction(
                patient=patient,
                amount_received=paid_amount,
                concession_amount=concession_amount,
                collection_boy=user_obj if (user_obj and user_obj.role == 'COLLECTION_BOY') else None,
                payment_mode=payment_mode,
                notes=notes
            )
            if client_txn_id:
                txn.id = client_txn_id
                txn.save(force_insert=True)
            else:
                txn.save()

        operator_role = request.user.role if request.user.is_authenticated else "CASHIER"
        operator_email = (request.user.email if (request.user.is_authenticated and request.user.email) else None) or "operator@abplus.in"
        action_msg = f"{operator_role.replace('_', ' ').title()} processed: Received ₹{paid_amount:.2f}, Concession ₹{concession_amount:.2f} (Mode: {payment_mode}) for patient {patient.name}"

        ActivityLog.objects.create(
            action=action_msg,
            user_email=operator_email,
            lab_name=patient.lab.name
        )

        return Response(PatientEntrySerializer(patient).data)

    @action(detail=True, methods=['patch'], url_path='status')
    def status_patch(self, request, pk=None):
        if request.user.is_authenticated:
            role = request.user.role
            new_status = request.data.get('status')
            if role == 'COLLECTION_BOY' and new_status not in ['COLLECTED', 'DELIVERED'] and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Collection boys are restricted to marking status as 'COLLECTED' or 'DELIVERED'.")
            if role == 'TECHNICIAN' and new_status != 'COMPLETED' and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Technicians are restricted to marking status as 'COMPLETED'.")
            if role == 'CASHIER' and new_status != 'LAB_RECEIVED' and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Cashiers are restricted to marking status as 'LAB_RECEIVED'.")

        patient = self.get_object()
        old_status = patient.status
        new_status = request.data.get('status')
        collected_by = request.data.get('collected_by')

        if new_status:
            patient.status = new_status
        if collected_by:
            patient.collected_by = collected_by
        patient.save()

        if new_status in ['COMPLETED', 'DELIVERED']:
            Report.objects.update_or_create(
                patient=patient,
                defaults={
                    'status': new_status,
                    'signed_by': 'Verified'
                }
            )

        user_email = request.user.email if (request.user.is_authenticated and request.user.email) else "doctor@abplus.in"
        if not (request.user.is_authenticated and request.user.email):
            if new_status == 'COLLECTED':
                user_email = "cashier@abplus.in"
            elif new_status == 'COMPLETED':
                user_email = "tech@abplus.in"

        ActivityLog.objects.create(
            action=f"Moved status of {patient.name} from {old_status} to {new_status}",
            user_email=user_email,
            lab_name=patient.lab.name
        )

        return Response(PatientEntrySerializer(patient).data)

    @action(detail=True, methods=['patch'], url_path='results')
    def results(self, request, pk=None):
        if request.user.is_authenticated:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN', 'TECHNICIAN'] and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("Only technicians and administrators can enter test results.")

        patient = self.get_object()
        new_results = request.data.get('results', {})
        
        if not patient.results:
            patient.results = {}
        patient.results.update(new_results)
        patient.status = 'COMPLETED'
        patient.save()

        # Update/Create Report
        Report.objects.update_or_create(
            patient=patient,
            defaults={
                'status': 'COMPLETED',
                'signed_by': 'Verified'
            }
        )

        ActivityLog.objects.create(
            action=f"Technician entered test results for {patient.name}",
            user_email=(request.user.email or f"{request.user.username}@abplus.in") if request.user.is_authenticated else "tech@abplus.in",
            lab_name=patient.lab.name
        )

        return Response(PatientEntrySerializer(patient).data)


class ExpenseViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for logging daily lab expenses.
    """
    serializer_class = ExpenseSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN', 'CASHIER', 'COLLECTION_BOY'] and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have permission to view or manage lab expenses.")

    def get_queryset(self):
        queryset = Expense.objects.all()
        if self.request.user.is_authenticated:
            if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
                queryset = queryset.filter(lab=self.request.user.lab)
                if self.request.user.role == 'COLLECTION_BOY':
                    queryset = queryset.filter(created_by__iexact=self.request.user.username)
            else:
                lab_id = self.request.query_params.get('lab_id')
                if lab_id:
                    queryset = queryset.filter(lab_id=lab_id)
        else:
            lab_id = self.request.query_params.get('lab_id')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)
        
        # If user is authenticated but not a COLLECTION_BOY, allow filtering by optional created_by param
        if self.request.user.is_authenticated and self.request.user.role != 'COLLECTION_BOY':
            created_by = self.request.query_params.get('created_by')
            if created_by:
                queryset = queryset.filter(created_by__iexact=created_by)
        elif not self.request.user.is_authenticated:
            created_by = self.request.query_params.get('created_by')
            if created_by:
                queryset = queryset.filter(created_by__iexact=created_by)
        
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        return queryset

    def perform_create(self, serializer):
        created_by_val = self.request.user.username if self.request.user.is_authenticated else "operator@abplus.in"
        if self.request.user.is_authenticated and self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
            serializer.save(lab=self.request.user.lab, created_by=created_by_val)
        else:
            serializer.save(created_by=created_by_val)




class LabSettingsView(views.APIView):
    """
    APIView for fetching/updating letterhead and branding configs.
    """
    def get(self, request):
        lab_id = request.query_params.get('lab_id')
        if request.user.is_authenticated:
            if request.user.role != 'SUPER_ADMIN' and not request.user.is_superuser:
                lab_id = str(request.user.lab.id)
        if not lab_id:
            return Response({"error": "lab_id is required"}, status=status.HTTP_400_BAD_REQUEST)
        lab = get_object_or_404(Lab, id=lab_id)
        serializer = LabSettingsSerializer(lab)
        return Response(serializer.data)

    def put(self, request):
        lab_id = request.data.get('lab_id')
        if request.user.is_authenticated:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN'] and not request.user.is_superuser:
                return Response({"error": "Administrative permissions required."}, status=status.HTTP_403_FORBIDDEN)
            if request.user.role == 'LAB_ADMIN':
                lab_id = str(request.user.lab.id)
        if not lab_id:
            return Response({"error": "lab_id is required in payload"}, status=status.HTTP_400_BAD_REQUEST)
        lab = get_object_or_404(Lab, id=lab_id)
        serializer = LabSettingsSerializer(lab, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        ActivityLog.objects.create(
            action="Updated diagnostic lab settings and letterhead branding",
            user_email=(request.user.email or f"{request.user.username}@abplus.in") if request.user.is_authenticated else "doctor@abplus.in",
            lab_name=lab.name
        )
        
        return Response(serializer.data)


class LabActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet to fetch tenant lab specific logs.
    """
    serializer_class = ActivityLogSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated:
            if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN'] and not request.user.is_superuser:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not have permission to view activity logs.")

    def get_queryset(self):
        if self.request.user.is_authenticated:
            if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
                lab = self.request.user.lab
            else:
                lab_id = self.request.query_params.get('lab_id')
                if not lab_id:
                    return ActivityLog.objects.all()
                lab = get_object_or_404(Lab, id=lab_id)
        else:
            lab_id = self.request.query_params.get('lab_id')
            if not lab_id:
                return ActivityLog.objects.all()
            lab = get_object_or_404(Lab, id=lab_id)

        return ActivityLog.objects.filter(lab_name=lab.name)


class ReferredDoctorViewSet(SoftDeleteViewSetMixin, viewsets.ModelViewSet):
    """
    ViewSet for managing referred doctors catalog per tenant lab.
    Accessible by Lab Admin and Doctor roles for writes, and all authenticated roles for reads.
    """
    serializer_class = ReferredDoctorSerializer

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.user.is_authenticated:
            if request.method not in ['GET', 'OPTIONS', 'HEAD']:
                if request.user.role not in ['SUPER_ADMIN', 'LAB_ADMIN'] and not request.user.is_superuser:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("Only Lab Admins can manage referred doctors.")

    def get_queryset(self):
        queryset = ReferredDoctor.objects.all()
        if self.request.user.is_authenticated:
            if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
                queryset = queryset.filter(lab=self.request.user.lab)
            else:
                lab_id = self.request.query_params.get('lab_id')
                if lab_id:
                    queryset = queryset.filter(lab_id=lab_id)
        else:
            lab_id = self.request.query_params.get('lab_id')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)

        # Search filter
        search = self.request.query_params.get('search')
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(doctor_name__icontains=search) |
                Q(hospital_name__icontains=search) |
                Q(phone__icontains=search) |
                Q(id__icontains=search)
            )

        # Status filter
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            queryset = queryset.filter(status=status_param)

        return queryset

    @action(detail=False, methods=['get'], url_path='search')
    def search(self, request):
        queryset = ReferredDoctor.objects.all().select_related('lab')
        
        # Enforce lab context filtering
        if request.user.is_authenticated:
            if request.user.role != 'SUPER_ADMIN' and not request.user.is_superuser:
                queryset = queryset.filter(lab=request.user.lab)
            else:
                lab_id = request.query_params.get('lab_id')
                if lab_id:
                    queryset = queryset.filter(lab_id=lab_id)
        else:
            lab_id = request.query_params.get('lab_id')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)

        # Suggest only active referring doctors
        queryset = queryset.filter(status='Active')

        # Filter by search string (ONLY search by doctor name)
        q = request.query_params.get('q', '')
        if q:
            queryset = queryset.filter(doctor_name__icontains=q)

        # Support pagination
        page = request.query_params.get('page', 1)
        limit = request.query_params.get('limit', 10)
        try:
            page = int(page)
            limit = int(limit)
        except ValueError:
            page = 1
            limit = 10

        offset = (page - 1) * limit
        total = queryset.count()
        results = queryset[offset:offset + limit]

        serializer = ReferredDoctorSerializer(results, many=True)
        return Response({
            "results": serializer.data,
            "count": total,
            "page": page,
            "limit": limit
        })

    @action(detail=True, methods=['patch'], url_path='toggle-status')
    def toggle_status(self, request, pk=None):
        doctor = self.get_object()
        new_status = 'Inactive' if doctor.status == 'Active' else 'Active'
        doctor.status = new_status
        doctor.save()

        ActivityLog.objects.create(
            action=f"{'Disabled' if new_status == 'Inactive' else 'Enabled'} referred doctor: {doctor.doctor_name}",
            user_email=(request.user.email or f"{request.user.username}@abplus.in") if request.user.is_authenticated else 'doctor@abplus.in',
            lab_name=doctor.lab.name
        )

        return Response(ReferredDoctorSerializer(doctor).data)


class LoginView(views.APIView):
    """
    API endpoint for employee and superadmin login authentication.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        lab_code = request.data.get('lab_code')
        username = request.data.get('username')
        email_or_username = request.data.get('email') or request.data.get('username')
        password = request.data.get('password')

        if not password:
            return Response({"error": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)

        authenticated_user = None

        if lab_code:
            # 1. Staff / Tenant Admin Login: scope by lab_code and username
            lab_code_clean = lab_code.strip().upper()
            try:
                lab = Lab.objects.get(lab_code__iexact=lab_code_clean)
            except Lab.DoesNotExist:
                return Response({"error": "Invalid Lab Code, username, or password."}, status=status.HTTP_400_BAD_REQUEST)

            if not username:
                return Response({"error": "Username is required."}, status=status.HTTP_400_BAD_REQUEST)

            matching_users = User.objects.filter(lab=lab, username=username)
            for user in matching_users:
                if user.check_password(password):
                    authenticated_user = user
                    break
        else:
            # 2. Direct login (using Email or Username): matches any user where email or username matches
            if not email_or_username:
                return Response({"error": "Email/Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

            from django.db.models import Q
            matching_users = User.objects.filter(Q(email=email_or_username) | Q(username=email_or_username))
            for user in matching_users:
                if user.check_password(password):
                    authenticated_user = user
                    break

        if not authenticated_user:
            return Response({"error": "Invalid login credentials."}, status=status.HTTP_400_BAD_REQUEST)

        if authenticated_user.status != 'active':
            return Response({"error": "This account has been suspended."}, status=status.HTTP_403_FORBIDDEN)
        
        # Log login action
        ActivityLog.objects.create(
            action=f"User {authenticated_user.username} logged in successfully.",
            user_email=authenticated_user.email or "noemail@abplus.in",
            lab_name=authenticated_user.lab.name if authenticated_user.lab else 'Global'
        )

        # Generate simplejwt tokens with custom claims (role, lab_id, lab_code)
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = RefreshToken.for_user(authenticated_user)
        refresh['role'] = authenticated_user.role
        refresh['lab_id'] = authenticated_user.lab.id if authenticated_user.lab else None
        refresh['lab_code'] = authenticated_user.lab.lab_code if authenticated_user.lab else None
        
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)

        # Return serialized user details with JWT tokens
        serializer = CustomUserSerializer(authenticated_user)
        return Response({
            "success": True,
            "access": access_token,
            "refresh": refresh_token,
            "user": serializer.data
        })


class ProfileView(views.APIView):
    """
    GET /api/me/
    Returns details of the currently logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = CustomUserSerializer(request.user)
        return Response(serializer.data)

class ChangePasswordView(views.APIView):
    """
    POST /api/me/change-password/
    Allows an authenticated user to change their password and resets requires_password_change.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 6:
            return Response({"error": "Password must be at least 6 characters."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        user.set_password(new_password)
        user.raw_password = new_password
        user.requires_password_change = False
        user.save()

        ActivityLog.objects.create(
            action=f"User {user.username} changed their password.",
            user_email=user.email or "noemail@abplus.in",
            lab_name=user.lab.name if user.lab else 'Global'
        )

        return Response({"success": True})



class CollectionDashboardStatsView(views.APIView):
    """
    GET /api/collection-dashboard/
    Calculates statistics for a Collection Boy for a specific date.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lab_id = request.query_params.get('lab_id')
        date_str = request.query_params.get('date')
        created_by = request.query_params.get('created_by')

        if request.user.role == 'COLLECTION_BOY':
            if not lab_id or not date_str:
                return Response(
                    {"error": "lab_id and date parameters are required."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            if not lab_id or not date_str or not created_by:
                return Response(
                    {"error": "lab_id, date, and created_by parameters are required."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Filter patients
        if request.user.role == 'COLLECTION_BOY':
            from django.db.models import Q
            patients = PatientEntry.objects.filter(
                lab_id=lab_id,
                created_at=date_str
            ).filter(
                Q(created_by=request.user) | 
                Q(collected_by__iexact=request.user.username) | 
                Q(collected_by__iexact=f"{request.user.first_name} {request.user.last_name}".strip())
            )
        else:
            from django.db.models import Q
            from django.contrib.auth import get_user_model
            User = get_user_model()
            boy_user = None
            try:
                boy_user = User.objects.get(
                    lab_id=lab_id,
                    role='COLLECTION_BOY',
                    username__iexact=created_by
                )
            except User.DoesNotExist:
                from django.db.models import Value
                from django.db.models.functions import Concat
                boy_user = User.objects.annotate(
                    full_name=Concat('first_name', Value(' '), 'last_name')
                ).filter(
                    lab_id=lab_id,
                    role='COLLECTION_BOY'
                ).filter(
                    Q(first_name__iexact=created_by) |
                    Q(full_name__iexact=created_by) |
                    Q(username__iexact=created_by)
                ).first()

            if boy_user:
                patients = PatientEntry.objects.filter(
                    lab_id=lab_id,
                    created_at=date_str
                ).filter(
                    Q(created_by=boy_user) | 
                    Q(collected_by__iexact=boy_user.username) | 
                    Q(collected_by__iexact=f"{boy_user.first_name} {boy_user.last_name}".strip())
                )
            else:
                patients = PatientEntry.objects.filter(
                    lab_id=lab_id,
                    created_at=date_str,
                    collected_by__iexact=created_by
                )

        total_patients = patients.count()
        
        settled_patients = 0
        pending_patients = 0
        pending_amount = 0.0

        for p in patients:
            bill = float(p.total_bill)
            paid = float(p.paid_amount)
            conc = float(p.concession)
            rem = bill - paid - conc
            
            if rem <= 0.01:
                settled_patients += 1
            else:
                pending_patients += 1
                pending_amount += rem

        # ── DATE-AWARE FINANCIAL METRICS ──
        # All calculations are scoped to the selected date with proper carry-forward logic
        concession_totals = 0.0
        todays_collected = 0.0
        cash_not_submitted = 0.0
        resolved_boy = request.user if request.user.role == 'COLLECTION_BOY' else (boy_user if 'boy_user' in locals() and boy_user else None)

        if resolved_boy:
            import datetime as _dt
            try:
                selected_date = _dt.date.fromisoformat(date_str)
            except ValueError:
                from django.utils import timezone
                selected_date = timezone.now().date()

            from django.db.models import Q, OuterRef, Subquery, DecimalField, Value
            from django.db.models.functions import Coalesce

            # 1. Today's concessions (date-specific)
            concession_totals = float(PaymentTransaction.objects.filter(
                collection_boy=resolved_boy,
                transaction_date=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('concession_amount'))['total'] or 0.0)

            # 2. Today's collected cash (date-specific — cash collected on selected date only)
            todays_collected = float(PaymentTransaction.objects.filter(
                collection_boy=resolved_boy,
                transaction_date=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

            # 3. Cash Not Submitted (cumulative BEFORE selected date D — excludes today's collection)
            #    = cash collected STRICTLY BEFORE selected date D that was NOT submitted on or before selected date D
            #    This way: Net Cash In Hand = cash_not_submitted (pending from past days) + todays_collected (new today)
            cash_not_submitted = float(PaymentTransaction.objects.filter(
                collection_boy=resolved_boy,
                transaction_date__lt=selected_date,   # strictly BEFORE today — excludes today's collection
                delete_flag='N'
            ).filter(
                Q(submitted_to_cashier='N') | Q(cashier_received_at__date__gt=selected_date)
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

            # 4. Submitted Cash on selected date (reconciled by CashierReceipt where receipt_date == selected_date)
            submitted_cash_today = float(CashierReceipt.objects.filter(
                collection_boy=resolved_boy,
                receipt_date=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

            # 5. Expenses up to selected date (cumulative unsubmitted expenses)
            unsubmitted_expenses = float(Expense.objects.filter(
                lab_id=lab_id,
                created_by__iexact=resolved_boy.username,
                date__lte=selected_date,
                cashier_receipt__isnull=True,
                cashier_admin_settlement__isnull=True,
                delete_flag='N'
            ).aggregate(total=Sum('amount'))['total'] or 0.0)

            # 5b. Today's expenses (date-specific)
            today_expenses = float(Expense.objects.filter(
                lab_id=lab_id,
                created_by__iexact=resolved_boy.username,
                date=selected_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount'))['total'] or 0.0)

            # 6. Net Cash In Hand = pending cash from past days + today's collection - submitted today - today's expenses
            #    Formula: cash_not_submitted (before today) + todays_collected - submitted_cash_today - today_expenses
            #    We use today_expenses (not unsubmitted_expenses) because the boy physically spent that cash regardless
            #    of whether it was linked to a receipt — money spent is money gone from hand.
            #    Example on May 29: ₹0 (no prior pending) + ₹2200 (collected) - ₹1500 (submitted) - ₹100 (expenses) = ₹600 carry-forward
            #    Example on May 30: ₹600 (pending from 29th) + ₹500 (today) - ₹0 (not yet submitted) - ₹0 (expenses) = ₹1100 in hand
            net_cash_in_hand = max(0.0, cash_not_submitted + todays_collected - submitted_cash_today - today_expenses)

            # 7. Total Pending Receivables & Patients (cumulative up to selected date D)
            boy_patients_cumulative = PatientEntry.objects.filter(
                lab_id=lab_id,
                created_at__lte=selected_date,
                delete_flag='N'
            ).filter(
                Q(created_by=resolved_boy) |
                Q(collected_by__iexact=resolved_boy.username) |
                Q(collected_by__iexact=f"{resolved_boy.first_name} {resolved_boy.last_name}".strip())
            )

            # Subquery to sum amount_received for this patient up to selected_date
            pay_subquery = PaymentTransaction.objects.filter(
                patient=OuterRef('pk'),
                transaction_date__lte=selected_date,
                delete_flag='N'
            ).values('patient').annotate(
                total=Sum('amount_received')
            ).values('total')
            
            # Subquery to sum concession_amount for this patient up to selected_date
            conc_subquery = PaymentTransaction.objects.filter(
                patient=OuterRef('pk'),
                transaction_date__lte=selected_date,
                delete_flag='N'
            ).values('patient').annotate(
                total=Sum('concession_amount')
            ).values('total')
            
            patients_annotated = boy_patients_cumulative.annotate(
                paid_till_date=Coalesce(
                    Subquery(pay_subquery, output_field=DecimalField(max_digits=10, decimal_places=2)),
                    Value(0.0, output_field=DecimalField(max_digits=10, decimal_places=2))
                ),
                conc_till_date=Coalesce(
                    Subquery(conc_subquery, output_field=DecimalField(max_digits=10, decimal_places=2)),
                    Value(0.0, output_field=DecimalField(max_digits=10, decimal_places=2))
                )
            )
            
            total_pending_receivables = 0.0
            total_pending_patients = 0
            for p in patients_annotated:
                rem = float(p.total_bill) - float(p.paid_till_date) - float(p.conc_till_date)
                if rem > 0.01:
                    total_pending_receivables += rem
                    total_pending_patients += 1

        else:
            todays_collected = 0.0
            cash_not_submitted = 0.0
            submitted_cash_today = 0.0
            unsubmitted_expenses = 0.0
            today_expenses = 0.0
            net_cash_in_hand = 0.0
            total_pending_receivables = 0.0
            total_pending_patients = 0

            # Fallback calculations if boy user is not found
            from django.utils.dateparse import parse_date
            parsed_date = parse_date(date_str)
            if parsed_date:
                txns = PaymentTransaction.objects.filter(
                    patient__in=patients,
                    transaction_date=parsed_date,
                    delete_flag='N'
                )
                concession_totals = float(txns.aggregate(total=Sum('concession_amount'))['total'] or 0.0)
                todays_collected = float(txns.aggregate(total=Sum('amount_received'))['total'] or 0.0)

        # ── SETTLEMENT STATUS (date-aware) ──
        settlement_status = 'PENDING'
        settlement_time = None
        settled_by_name = None

        if resolved_boy:
            # SETTLED    = cash was submitted on this date AND no unsubmitted cash remains as of this date
            # PENDING CASH = there is unsubmitted cash as of this date
            # PENDING    = no activity at all for this date
            if cash_not_submitted > 0.01:
                settlement_status = 'PENDING CASH'
            elif submitted_cash_today > 0.01:
                settlement_status = 'SETTLED'
            else:
                settlement_status = 'PENDING'

            import datetime as _dt2
            try:
                settlement_date = _dt2.date.fromisoformat(date_str)
                settled_record = CashierReceipt.objects.filter(
                    collection_boy=resolved_boy,
                    receipt_date=settlement_date,
                    delete_flag='N'
                ).order_by('-created_at').first()
                if settled_record:
                    settlement_time = settled_record.created_at.isoformat()
                    settled_by_name = f"{settled_record.cashier.first_name} {settled_record.cashier.last_name}".strip() or settled_record.cashier.username
            except ValueError:
                pass

        return Response({
            "total_patients": total_patients,
            "settled_patients": settled_patients,
            "pending_patients": pending_patients,
            "total_collected": float(todays_collected),        # date-specific: cash collected on selected date
            "total_expenses": float(unsubmitted_expenses),     # cumulative unsubmitted expenses up to date
            "today_expenses": float(today_expenses),           # date-specific expenses
            "net_cash": float(net_cash_in_hand),               # cumulative carry-forward
            "pending_amount": pending_amount,                  # today's pending from patients
            "concession_totals": concession_totals,            # date-specific concessions
            "settlement_status": settlement_status,
            "settlement_time": settlement_time,
            "settled_by_name": settled_by_name,

            # Date-aware ledger fields
            "net_cash_in_hand": float(net_cash_in_hand),             # cumulative carry-forward (yesterday pending + today collection - submitted - expenses)
            "submitted_cash_today": float(submitted_cash_today),     # date-specific
            "todays_collected": float(todays_collected),             # date-specific
            "cash_not_submitted": float(cash_not_submitted),         # pending unsubmitted cash from BEFORE selected date (excludes today)
            "total_pending_receivables": float(total_pending_receivables),  # cumulative up to selected date
            "total_pending_patients": int(total_pending_patients)           # cumulative up to selected date
        })


class DailyCloseoutViewSet(viewsets.ModelViewSet):
    serializer_class = DailyCloseoutSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = DailyCloseout.objects.all().select_related('cashier', 'lab')
        if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
            queryset = queryset.filter(lab=self.request.user.lab)
        else:
            lab_id = self.request.query_params.get('lab_id')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)
        
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        return queryset

    def perform_create(self, serializer):
        lab = self.request.user.lab
        date_str = self.request.data.get('date')
        import datetime
        if date_str:
            try:
                closeout_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                closeout_date = datetime.date.today()
        else:
            closeout_date = datetime.date.today()

        with transaction.atomic():
            DailyCloseout.objects.filter(lab=lab, date=closeout_date).delete()
            serializer.save(
                lab=lab,
                cashier=self.request.user,
                date=closeout_date
            )

        cashier_name = f"{self.request.user.first_name} {self.request.user.last_name}".strip() or self.request.user.username
        ActivityLog.objects.create(
            action=f"Cashier {cashier_name} submitted Daily EOD accounts closeout for {closeout_date}. Final Net Revenue: {serializer.validated_data.get('net_revenue')}",
            user_email=self.request.user.email or "noemail@abplus.in",
            lab_name=lab.name
        )


class CashierAdminSettlementViewSet(viewsets.ModelViewSet):
    serializer_class = CashierAdminSettlementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = CashierAdminSettlement.objects.all().select_related('cashier', 'lab')
        if self.request.user.role != 'SUPER_ADMIN' and not self.request.user.is_superuser:
            queryset = queryset.filter(lab=self.request.user.lab)
        else:
            lab_id = self.request.query_params.get('lab_id')
            if lab_id:
                queryset = queryset.filter(lab_id=lab_id)
        
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(submitted_at__date=date)
        return queryset

    def create(self, request, *args, **kwargs):
        lab = request.user.lab
        cashier = request.user
        remarks = request.data.get('remarks', '')

        with transaction.atomic():
            # 1. Fetch unsubmitted cashier receipts
            unsubmitted_receipts = CashierReceipt.objects.filter(
                cashier=cashier,
                cashier_admin_settlement__isnull=True,
                delete_flag='N'
            )
            gross_receipts = unsubmitted_receipts.aggregate(total=Sum('amount_received'))['total'] or 0.0

            # 2. Fetch unsubmitted desk cash transactions collected directly by this cashier
            unsubmitted_desk_txns = PaymentTransaction.objects.filter(
                lab=lab,
                collection_boy__isnull=True,
                payment_mode='CASH',
                cashier_admin_settlement__isnull=True,
                delete_flag='N'
            )
            gross_desk = unsubmitted_desk_txns.aggregate(total=Sum('amount_received'))['total'] or 0.0

            total_gross = float(gross_receipts) + float(gross_desk)

            # 3. Fetch unsubmitted expenses logged by this cashier
            unsubmitted_expenses = Expense.objects.filter(
                lab=lab,
                created_by=cashier.username,
                cashier_admin_settlement__isnull=True,
                delete_flag='N'
            )
            expenses_amount = unsubmitted_expenses.aggregate(total=Sum('amount'))['total'] or 0.0

            settlement_amount = total_gross - float(expenses_amount)

            if total_gross <= 0.01:
                return Response({"error": "No pending cash collections to submit to Lab Admin."}, status=status.HTTP_400_BAD_REQUEST)

            # 4. Create CashierAdminSettlement record
            settlement = CashierAdminSettlement.objects.create(
                cashier=cashier,
                lab=lab,
                gross_cash=total_gross,
                expenses=expenses_amount,
                final_cash=settlement_amount,
                remarks=remarks
            )

            # 5. Mark associated records as submitted and link them
            unsubmitted_receipt_ids = list(unsubmitted_receipts.values_list('id', flat=True))
            CashierReceipt.objects.filter(id__in=unsubmitted_receipt_ids).update(
                cashier_admin_settlement=settlement
            )
            unsubmitted_desk_txns.update(
                cashier_admin_settlement=settlement
            )
            unsubmitted_expenses.update(
                cashier_admin_settlement=settlement,
                submitted_to_lab_admin='Y',
                submitted_to_lab_admin_at=timezone.now()
            )
            # Find and link boy's settled expenses to the cashier admin settlement
            Expense.objects.filter(
                cashier_receipt_id__in=unsubmitted_receipt_ids
            ).update(
                cashier_admin_settlement=settlement,
                submitted_to_lab_admin='Y',
                submitted_to_lab_admin_at=timezone.now()
            )

            # 6. Log system action
            cashier_name = f"{cashier.first_name} {cashier.last_name}".strip() or cashier.username
            ActivityLog.objects.create(
                action=f"Cashier {cashier_name} submitted rolling settlement to Lab Admin. Amount: ₹{settlement_amount:.2f}, Expenses: ₹{expenses_amount:.2f}",
                user_email=cashier.email or "noemail@abplus.in",
                lab_name=lab.name
            )

        serializer = self.get_serializer(settlement)
        return Response(serializer.data, status=status.HTTP_201_CREATED)



