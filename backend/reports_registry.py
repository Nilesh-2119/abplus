import datetime
from django.db.models import Sum, Count, Q, Value, DecimalField, OuterRef, Subquery, Max
from django.db.models.functions import Coalesce
from .models import PatientEntry, ReferredDoctor, LabTest, CustomUser, PaymentTransaction, CashierReceipt, Expense, DoctorCommissionEntry

# Report definition registry detailing metadata, filters, and display columns.
REPORTS_REGISTRY = {
    'patients_by_doctor': {
        'id': 'patients_by_doctor',
        'name': 'Patients by Doctor Report',
        'description': 'Generate patient reports for selected doctors.',
        'filters': ['date_range', 'doctor_ids'],
        'columns': [
            {'key': 'doctor_name', 'label': 'Doctor Name', 'format': 'text'},
            {'key': 'patient_id', 'label': 'Patient ID', 'format': 'text'},
            {'key': 'patient_name', 'label': 'Patient Name', 'format': 'text'},
            {'key': 'age', 'label': 'Age', 'format': 'number'},
            {'key': 'gender', 'label': 'Gender', 'format': 'text'},
            {'key': 'phone_number', 'label': 'Phone Number', 'format': 'text'},
            {'key': 'registration_date', 'label': 'Registration Date', 'format': 'date'},
            {'key': 'tests_ordered', 'label': 'Tests Ordered', 'format': 'text'},
            {'key': 'billing_amount', 'label': 'Billing Amount (₹)', 'format': 'currency'},
        ]
    },
    'consolidated_patient': {
        'id': 'consolidated_patient',
        'name': 'Consolidated Patient Report',
        'description': 'Show all patients registered during the selected period.',
        'filters': ['date_range'],
        'columns': [
            {'key': 'patient_id', 'label': 'Patient ID', 'format': 'text'},
            {'key': 'patient_name', 'label': 'Patient Name', 'format': 'text'},
            {'key': 'age', 'label': 'Age', 'format': 'number'},
            {'key': 'gender', 'label': 'Gender', 'format': 'text'},
            {'key': 'phone', 'label': 'Phone', 'format': 'text'},
            {'key': 'doctor', 'label': 'Doctor', 'format': 'text'},
            {'key': 'tests_ordered', 'label': 'Tests Ordered', 'format': 'text'},
            {'key': 'bill_amount', 'label': 'Bill Amount (₹)', 'format': 'currency'},
            {'key': 'paid_amount', 'label': 'Paid Amount (₹)', 'format': 'currency'},
            {'key': 'pending_amount', 'label': 'Pending Amount (₹)', 'format': 'currency'},
            {'key': 'collection_boy', 'label': 'Collection Boy', 'format': 'text'},
            {'key': 'registration_date', 'label': 'Registration Date', 'format': 'date'},
            {'key': 'report_status', 'label': 'Report Status', 'format': 'text'},
        ]
    },
    'test_wise_patient': {
        'id': 'test_wise_patient',
        'name': 'Test Wise Patient Report',
        'description': 'Find all patients who performed specific tests.',
        'filters': ['date_range', 'test_ids'],
        'columns': [
            {'key': 'patient_id', 'label': 'Patient ID', 'format': 'text'},
            {'key': 'patient_name', 'label': 'Patient Name', 'format': 'text'},
            {'key': 'phone_number', 'label': 'Phone Number', 'format': 'text'},
            {'key': 'doctor', 'label': 'Doctor', 'format': 'text'},
            {'key': 'test_name', 'label': 'Test Name', 'format': 'text'},
            {'key': 'bill_amount', 'label': 'Bill Amount (₹)', 'format': 'currency'},
            {'key': 'registration_date', 'label': 'Registration Date', 'format': 'date'},
        ]
    },
    'doctor_referral_summary': {
        'id': 'doctor_referral_summary',
        'name': 'Doctor Referral Summary Report',
        'description': 'Doctor performance and referral analysis.',
        'filters': ['date_range', 'doctor_id'],
        'columns': [
            {'key': 'doctor_name', 'label': 'Doctor Name', 'format': 'text'},
            {'key': 'hospital', 'label': 'Hospital', 'format': 'text'},
            {'key': 'patients_referred', 'label': 'Patients Referred', 'format': 'number'},
            {'key': 'referral_billing', 'label': 'Referral Billing (₹)', 'format': 'currency'},
            {'key': 'commission_earned', 'label': 'Commission Earned (₹)', 'format': 'currency'},
        ]
    },
    'collection_boy_performance': {
        'id': 'collection_boy_performance',
        'name': 'Collection Boy Performance Report',
        'description': 'Track collection boy collections, submissions, and cash in hand.',
        'filters': ['date_range', 'collection_boy_id'],
        'columns': [
            {'key': 'collection_boy', 'label': 'Collection Boy', 'format': 'text'},
            {'key': 'patients_registered', 'label': 'Patients Registered', 'format': 'number'},
            {'key': 'cash_collected', 'label': 'Cash Collected (₹)', 'format': 'currency'},
            {'key': 'pending_receivables', 'label': 'Pending Receivables (₹)', 'format': 'currency'},
            {'key': 'concessions_given', 'label': 'Concessions Given (₹)', 'format': 'currency'},
            {'key': 'submitted_to_cashier', 'label': 'Submitted To Cashier (₹)', 'format': 'currency'},
            {'key': 'outstanding_cash', 'label': 'Outstanding Cash (₹)', 'format': 'currency'},
        ]
    },
    'pending_payment': {
        'id': 'pending_payment',
        'name': 'Pending Payment Report',
        'description': 'Track outstanding patient dues and aging receivables.',
        'filters': ['aging_buckets'],
        'columns': [
            {'key': 'patient_name', 'label': 'Patient Name', 'format': 'text'},
            {'key': 'phone', 'label': 'Phone', 'format': 'text'},
            {'key': 'doctor', 'label': 'Doctor', 'format': 'text'},
            {'key': 'bill_amount', 'label': 'Bill Amount (₹)', 'format': 'currency'},
            {'key': 'paid_amount', 'label': 'Paid Amount (₹)', 'format': 'currency'},
            {'key': 'pending_amount', 'label': 'Pending Amount (₹)', 'format': 'currency'},
            {'key': 'last_payment_date', 'label': 'Last Payment Date', 'format': 'date'},
            {'key': 'collection_boy', 'label': 'Collection Boy', 'format': 'text'},
        ]
    },
    'concession': {
        'id': 'concession',
        'name': 'Concession Report',
        'description': 'Track discounts given by doctors or collection boys.',
        'filters': ['date_range', 'collection_boy_id', 'doctor_id'],
        'columns': [
            {'key': 'patient', 'label': 'Patient', 'format': 'text'},
            {'key': 'doctor', 'label': 'Doctor', 'format': 'text'},
            {'key': 'bill_amount', 'label': 'Bill Amount (₹)', 'format': 'currency'},
            {'key': 'concession_amount', 'label': 'Concession Amount (₹)', 'format': 'currency'},
            {'key': 'collection_boy', 'label': 'Collection Boy', 'format': 'text'},
            {'key': 'date', 'label': 'Date', 'format': 'date'},
        ]
    },
    'daily_business_summary': {
        'id': 'daily_business_summary',
        'name': 'Daily Business Summary',
        'description': 'Single day operational and financial snapshot.',
        'filters': ['single_date'],
        'columns': [
            {'key': 'label', 'label': 'Metric', 'format': 'text'},
            {'key': 'value', 'label': 'Value', 'format': 'text'},
        ]
    },
    'monthly_lab_summary': {
        'id': 'monthly_lab_summary',
        'name': 'Monthly Lab Summary Report',
        'description': 'Monthly operational and financial summary report.',
        'filters': ['month_year'],
        'columns': [
            {'key': 'label', 'label': 'Metric', 'format': 'text'},
            {'key': 'value', 'label': 'Value', 'format': 'text'},
        ]
    }
}


def run_informative_report(report_id, lab, params):
    """Executes the specific query logic for the given report ID and formats the records."""
    if report_id not in REPORTS_REGISTRY:
        raise ValueError("Report not found in registry.")

    # 1. Date Range Resolutions
    from_date = None
    to_date = None
    from_date_str = params.get('from_date')
    to_date_str = params.get('to_date')

    if from_date_str and to_date_str:
        from_date = datetime.date.fromisoformat(from_date_str)
        to_date = datetime.date.fromisoformat(to_date_str)

    # Scoped QuerySet for safety
    lab_id = lab.id

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 1: PATIENTS BY DOCTOR REPORT
    # ──────────────────────────────────────────────────────────────────────────
    if report_id == 'patients_by_doctor':
        doctor_ids = params.get('doctor_ids', [])
        if isinstance(doctor_ids, str):
            doctor_ids = [d.strip() for d in doctor_ids.split(',') if d.strip()]

        qs = PatientEntry.objects.filter(
            lab_id=lab_id,
            delete_flag='N',
            referred_doctor_id__in=doctor_ids
        ).select_related('referred_doctor').prefetch_related('tests')

        if from_date and to_date:
            qs = qs.filter(created_at__gte=from_date, created_at__lte=to_date)

        records = []
        for p in qs:
            tests_ordered = ", ".join(t.name for t in p.tests.all())
            records.append({
                'doctor_name': p.referred_doctor.doctor_name if p.referred_doctor else 'Self',
                'patient_id': p.id,
                'patient_name': p.name,
                'age': p.age,
                'gender': p.gender,
                'phone_number': p.phone,
                'registration_date': p.created_at.strftime('%Y-%m-%d'),
                'tests_ordered': tests_ordered,
                'billing_amount': float(p.total_bill),
            })
        # Sort by doctor name then registration date
        records.sort(key=lambda x: (x['doctor_name'], x['registration_date']))
        
        summary = {
            'total_patients': len(records),
            'total_billing': sum(r['billing_amount'] for r in records),
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 2: CONSOLIDATED PATIENT REPORT
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'consolidated_patient':
        qs = PatientEntry.objects.filter(
            lab_id=lab_id,
            delete_flag='N'
        ).select_related('referred_doctor').prefetch_related('tests')

        if from_date and to_date:
            qs = qs.filter(created_at__gte=from_date, created_at__lte=to_date)

        records = []
        for p in qs:
            tests_ordered = ", ".join(t.name for t in p.tests.all())
            bill = float(p.total_bill)
            paid = float(p.paid_amount)
            conc = float(p.concession)
            pending = max(0.0, bill - paid - conc)
            
            records.append({
                'patient_id': p.id,
                'patient_name': p.name,
                'age': p.age,
                'gender': p.gender,
                'phone': p.phone,
                'doctor': p.referred_doctor.doctor_name if p.referred_doctor else 'Self',
                'tests_ordered': tests_ordered,
                'bill_amount': bill,
                'paid_amount': paid,
                'pending_amount': pending,
                'collection_boy': p.collected_by or 'Direct Desk',
                'registration_date': p.created_at.strftime('%Y-%m-%d'),
                'report_status': p.get_status_display(),
            })
        records.sort(key=lambda x: x['registration_date'])
        
        summary = {
            'total_patients': len(records),
            'total_billing': sum(r['bill_amount'] for r in records),
            'total_paid': sum(r['paid_amount'] for r in records),
            'total_pending': sum(r['pending_amount'] for r in records),
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 3: TEST WISE PATIENT REPORT
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'test_wise_patient':
        test_ids = params.get('test_ids', [])
        if isinstance(test_ids, str):
            test_ids = [t.strip() for t in test_ids.split(',') if t.strip()]

        qs = PatientEntry.objects.filter(
            lab_id=lab_id,
            delete_flag='N',
            tests__id__in=test_ids
        ).select_related('referred_doctor').prefetch_related('tests').distinct()

        if from_date and to_date:
            qs = qs.filter(created_at__gte=from_date, created_at__lte=to_date)

        records = []
        for p in qs:
            for t in p.tests.all():
                if t.id in test_ids or str(t.id) in test_ids:
                    records.append({
                        'patient_id': p.id,
                        'patient_name': p.name,
                        'phone_number': p.phone,
                        'doctor': p.referred_doctor.doctor_name if p.referred_doctor else 'Self',
                        'test_name': t.name,
                        'bill_amount': float(p.total_bill),
                        'registration_date': p.created_at.strftime('%Y-%m-%d'),
                    })
        records.sort(key=lambda x: (x['test_name'], x['registration_date']))
        
        summary = {
            'total_patients': len(set(r['patient_id'] for r in records)),
            'total_test_rows': len(records),
            'total_billing': sum(r['bill_amount'] for r in records),
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 4: DOCTOR REFERRAL SUMMARY REPORT
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'doctor_referral_summary':
        doctor_id = params.get('doctor_id')
        
        doctors_qs = ReferredDoctor.objects.filter(lab_id=lab_id, delete_flag='N')
        if doctor_id:
            doctors_qs = doctors_qs.filter(id=doctor_id)

        records = []
        for doc in doctors_qs:
            patients = PatientEntry.objects.filter(
                lab_id=lab_id,
                delete_flag='N',
                referred_doctor=doc
            )
            if from_date and to_date:
                patients = patients.filter(created_at__gte=from_date, created_at__lte=to_date)

            p_count = patients.count()
            p_billing = float(patients.aggregate(total=Sum('total_bill'))['total'] or 0.0)

            comm_qs = DoctorCommissionEntry.objects.filter(
                lab_id=lab_id,
                delete_flag='N',
                doctor=doc
            )
            if from_date and to_date:
                comm_qs = comm_qs.filter(entry_date__gte=from_date, entry_date__lte=to_date)
            p_commission = float(comm_qs.aggregate(total=Sum('commission_amount'))['total'] or 0.0)

            if p_count > 0 or p_commission > 0:
                records.append({
                    'doctor_name': doc.doctor_name,
                    'hospital': doc.hospital_name,
                    'patients_referred': p_count,
                    'referral_billing': p_billing,
                    'commission_earned': p_commission,
                })
        
        records.sort(key=lambda x: x['referral_billing'], reverse=True)
        
        summary = {
            'total_doctors': len(records),
            'total_patients': sum(r['patients_referred'] for r in records),
            'total_billing': sum(r['referral_billing'] for r in records),
            'total_commission': sum(r['commission_earned'] for r in records),
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 5: COLLECTION BOY PERFORMANCE REPORT
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'collection_boy_performance':
        boy_id = params.get('collection_boy_id')
        boys_qs = CustomUser.objects.filter(lab_id=lab_id, role='COLLECTION_BOY', delete_flag='N')
        if boy_id:
            boys_qs = boys_qs.filter(id=boy_id)

        records = []
        for boy in boys_qs:
            # 1. Registered Patients in date range
            p_qs = PatientEntry.objects.filter(
                lab_id=lab_id,
                delete_flag='N'
            ).filter(
                Q(created_by=boy) |
                Q(collected_by__iexact=boy.username) |
                Q(collected_by__iexact=f"{boy.first_name} {boy.last_name}".strip())
            )
            if from_date and to_date:
                p_qs = p_qs.filter(created_at__gte=from_date, created_at__lte=to_date)
            p_registered = p_qs.count()

            # 2. Cash Collected (transaction mode CASH) in date range
            tx_qs = PaymentTransaction.objects.filter(
                collection_boy=boy,
                delete_flag='N',
                payment_mode='CASH'
            )
            if from_date and to_date:
                tx_qs = tx_qs.filter(transaction_date__gte=from_date, transaction_date__lte=to_date)
            cash_collected = float(tx_qs.aggregate(total=Sum('amount_received'))['total'] or 0.0)

            # 3. Concessions given in date range
            conc_qs = PaymentTransaction.objects.filter(
                collection_boy=boy,
                delete_flag='N'
            )
            if from_date and to_date:
                conc_qs = conc_qs.filter(transaction_date__gte=from_date, transaction_date__lte=to_date)
            concessions = float(conc_qs.aggregate(total=Sum('concession_amount'))['total'] or 0.0)

            # 4. Submitted cash to Cashier in date range
            receipt_qs = CashierReceipt.objects.filter(
                collection_boy=boy,
                delete_flag='N'
            )
            if from_date and to_date:
                receipt_qs = receipt_qs.filter(receipt_date__gte=from_date, receipt_date__lte=to_date)
            submitted = float(receipt_qs.aggregate(total=Sum('amount_received'))['total'] or 0.0)

            # 5. Pending Receivables on patients registered in range
            pending_receivables = 0.0
            for p in p_qs:
                rem = float(p.total_bill) - float(p.paid_amount) - float(p.concession)
                if rem > 0.01:
                    pending_receivables += rem

            # 6. Outstanding cash in hand of this boy (all time unsubmitted cash up to to_date)
            # Net Cash In Hand up to to_date
            limit_date = to_date if to_date else datetime.date.today()
            all_collected_cash = float(PaymentTransaction.objects.filter(
                collection_boy=boy,
                transaction_date__lte=limit_date,
                payment_mode='CASH',
                delete_flag='N'
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

            all_submitted_cash = float(CashierReceipt.objects.filter(
                collection_boy=boy,
                receipt_date__lte=limit_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

            all_expenses = float(Expense.objects.filter(
                lab_id=lab_id,
                created_by__iexact=boy.username,
                date__lte=limit_date,
                delete_flag='N'
            ).aggregate(total=Sum('amount'))['total'] or 0.0)

            outstanding_cash = max(0.0, all_collected_cash - all_submitted_cash - all_expenses)

            if p_registered > 0 or cash_collected > 0 or outstanding_cash > 0:
                records.append({
                    'collection_boy': f"{boy.first_name} {boy.last_name}".strip() or boy.username,
                    'patients_registered': p_registered,
                    'cash_collected': cash_collected,
                    'pending_receivables': pending_receivables,
                    'concessions_given': concessions,
                    'submitted_to_cashier': submitted,
                    'outstanding_cash': outstanding_cash,
                })
        
        summary = {
            'total_boys': len(records),
            'total_patients': sum(r['patients_registered'] for r in records),
            'total_collected': sum(r['cash_collected'] for r in records),
            'total_pending': sum(r['pending_receivables'] for r in records),
            'total_concessions': sum(r['concessions_given'] for r in records),
            'total_submitted': sum(r['submitted_to_cashier'] for r in records),
            'total_outstanding': sum(r['outstanding_cash'] for r in records),
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 6: PENDING PAYMENT REPORT
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'pending_payment':
        bucket = params.get('aging') or 'Current'
        today = datetime.date.today()
        
        qs = PatientEntry.objects.filter(
            lab_id=lab_id,
            delete_flag='N',
            payment_status__in=['PARTIAL_PENDING', 'CREDIT_PENDING']
        ).select_related('referred_doctor')

        if bucket == 'Current':
            # 0 to 30 days old
            limit_date = today - datetime.timedelta(days=30)
            qs = qs.filter(created_at__gte=limit_date, created_at__lte=today)
        elif bucket == '30 Days':
            # 30 to 60 days old
            start_date = today - datetime.timedelta(days=60)
            end_date = today - datetime.timedelta(days=30)
            qs = qs.filter(created_at__gte=start_date, created_at__lt=end_date)
        elif bucket == '60 Days':
            # 60 to 90 days old
            start_date = today - datetime.timedelta(days=90)
            end_date = today - datetime.timedelta(days=60)
            qs = qs.filter(created_at__gte=start_date, created_at__lt=end_date)
        elif bucket == '90 Days':
            # > 90 days old
            limit_date = today - datetime.timedelta(days=90)
            qs = qs.filter(created_at__lt=limit_date)
        elif bucket == 'Custom':
            if from_date and to_date:
                qs = qs.filter(created_at__gte=from_date, created_at__lte=to_date)

        records = []
        for p in qs:
            bill = float(p.total_bill)
            paid = float(p.paid_amount)
            conc = float(p.concession)
            pending = max(0.0, bill - paid - conc)
            
            if pending > 0.01:
                # Resolve last payment date
                last_pay = PaymentTransaction.objects.filter(
                    patient=p, delete_flag='N'
                ).aggregate(last_date=Max('transaction_date'))['last_date']
                
                records.append({
                    'patient_name': p.name,
                    'phone': p.phone,
                    'doctor': p.referred_doctor.doctor_name if p.referred_doctor else 'Self',
                    'bill_amount': bill,
                    'paid_amount': paid,
                    'pending_amount': pending,
                    'last_payment_date': last_pay.strftime('%Y-%m-%d') if last_pay else '-',
                    'collection_boy': p.collected_by or 'Direct Desk',
                })
        
        records.sort(key=lambda x: x['pending_amount'], reverse=True)

        summary = {
            'total_patients': len(records),
            'total_billing': sum(r['bill_amount'] for r in records),
            'total_paid': sum(r['paid_amount'] for r in records),
            'total_pending': sum(r['pending_amount'] for r in records),
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 7: CONCESSION REPORT
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'concession':
        boy_id = params.get('collection_boy_id')
        doctor_id = params.get('doctor_id')

        qs = PatientEntry.objects.filter(
            lab_id=lab_id,
            delete_flag='N',
            concession__gt=0.0
        ).select_related('referred_doctor')

        if from_date and to_date:
            qs = qs.filter(created_at__gte=from_date, created_at__lte=to_date)

        if doctor_id:
            qs = qs.filter(referred_doctor_id=doctor_id)

        if boy_id:
            try:
                boy = CustomUser.objects.get(id=boy_id, role='COLLECTION_BOY')
                qs = qs.filter(
                    Q(created_by=boy) |
                    Q(collected_by__iexact=boy.username) |
                    Q(collected_by__iexact=f"{boy.first_name} {boy.last_name}".strip())
                )
            except CustomUser.DoesNotExist:
                pass

        records = []
        for p in qs:
            records.append({
                'patient': f"{p.name} ({p.id})",
                'doctor': p.referred_doctor.doctor_name if p.referred_doctor else 'Self',
                'bill_amount': float(p.total_bill),
                'concession_amount': float(p.concession),
                'collection_boy': p.collected_by or 'Direct Desk',
                'date': p.created_at.strftime('%Y-%m-%d'),
            })
        records.sort(key=lambda x: x['date'])

        summary = {
            'total_patients': len(records),
            'total_billing': sum(r['bill_amount'] for r in records),
            'total_concessions': sum(r['concession_amount'] for r in records),
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 9: DAILY BUSINESS SUMMARY
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'daily_business_summary':
        target_date_str = params.get('single_date')
        if target_date_str:
            target_date = datetime.date.fromisoformat(target_date_str)
        else:
            target_date = datetime.date.today()

        # Operational metrics on the day
        patients_qs = PatientEntry.objects.filter(lab_id=lab_id, created_at=target_date, delete_flag='N')
        total_patients = patients_qs.count()
        total_revenue = float(patients_qs.aggregate(total=Sum('total_bill'))['total'] or 0.0)
        pending_amount = float(patients_qs.aggregate(total=Sum('total_bill', filter=Q(payment_status__in=['PARTIAL_PENDING', 'CREDIT_PENDING'])))['total'] or 0.0)

        # Financial transactions on the day (all collections on this date)
        tx_qs = PaymentTransaction.objects.filter(lab_id=lab_id, transaction_date=target_date, delete_flag='N')
        collected_cash = float(tx_qs.filter(payment_mode='CASH').aggregate(total=Sum('amount_received'))['total'] or 0.0)
        collected_other = float(tx_qs.exclude(payment_mode='CASH').aggregate(total=Sum('amount_received'))['total'] or 0.0)
        concessions = float(tx_qs.aggregate(total=Sum('concession_amount'))['total'] or 0.0)

        # Expenses recorded on the day
        expenses = float(Expense.objects.filter(lab_id=lab_id, date=target_date, delete_flag='N').aggregate(total=Sum('amount'))['total'] or 0.0)

        # Reports status counts
        pending_reports = patients_qs.exclude(status__in=['COMPLETED', 'DELIVERED']).count()
        completed_reports = patients_qs.filter(status__in=['COMPLETED', 'DELIVERED']).count()

        net_revenue = total_revenue - concessions - expenses

        records = [
            {'label': 'Total Patients Registered', 'value': f"{total_patients}"},
            {'label': 'Total Revenue Generated', 'value': f"₹{total_revenue:,.2f}"},
            {'label': 'Collected Cash Collections', 'value': f"₹{collected_cash:,.2f}"},
            {'label': 'Collected Digital Collections (UPI/Card)', 'value': f"₹{collected_other:,.2f}"},
            {'label': 'Total Collected Amount', 'value': f"₹{(collected_cash + collected_other):,.2f}"},
            {'label': 'Outstanding Patient Dues', 'value': f"₹{pending_amount:,.2f}"},
            {'label': 'Concessions/Discounts Approved', 'value': f"₹{concessions:,.2f}"},
            {'label': 'Total Recorded Expenses', 'value': f"₹{expenses:,.2f}"},
            {'label': 'Net Revenue (Rev - Conc - Exp)', 'value': f"₹{net_revenue:,.2f}"},
            {'label': 'Pending Patient Reports', 'value': f"{pending_reports}"},
            {'label': 'Completed & Delivered Reports', 'value': f"{completed_reports}"},
        ]
        
        summary = {
            'total_patients': total_patients,
            'total_revenue': total_revenue,
            'net_revenue': net_revenue,
        }
        return records, summary

    # ──────────────────────────────────────────────────────────────────────────
    # REPORT 10: MONTHLY LAB SUMMARY REPORT
    # ──────────────────────────────────────────────────────────────────────────
    elif report_id == 'monthly_lab_summary':
        month = int(params.get('month') or datetime.date.today().month)
        year = int(params.get('year') or datetime.date.today().year)

        # Patients
        patients_qs = PatientEntry.objects.filter(
            lab_id=lab_id, delete_flag='N',
            created_at__month=month, created_at__year=year
        )
        total_patients = patients_qs.count()
        
        # Revenue
        total_revenue = float(patients_qs.aggregate(total=Sum('total_bill'))['total'] or 0.0)

        # Collections
        collections = float(PaymentTransaction.objects.filter(
            lab_id=lab_id, delete_flag='N',
            transaction_date__month=month, transaction_date__year=year
        ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

        # Pending Bills
        pending_bills = float(patients_qs.aggregate(
            total=Sum('total_bill')
        )['total'] or 0.0) - float(patients_qs.aggregate(
            paid=Sum('paid_amount')
        )['paid'] or 0.0) - float(patients_qs.aggregate(
            conc=Sum('concession')
        )['conc'] or 0.0)
        pending_bills = max(0.0, pending_bills)

        # Expenses
        expenses = float(Expense.objects.filter(
            lab_id=lab_id, delete_flag='N',
            date__month=month, date__year=year
        ).aggregate(total=Sum('amount'))['total'] or 0.0)

        # Doctor Commissions
        commissions = float(DoctorCommissionEntry.objects.filter(
            lab_id=lab_id, delete_flag='N',
            entry_date__month=month, entry_date__year=year
        ).aggregate(total=Sum('commission_amount'))['total'] or 0.0)

        # Net Profit Approximation
        net_profit = collections - expenses - commissions

        records = [
            {'label': 'Total Patients Registered', 'value': f"{total_patients}"},
            {'label': 'Total Revenue Generated (Billed)', 'value': f"₹{total_revenue:,.2f}"},
            {'label': 'Total Payment Collections Received', 'value': f"₹{collections:,.2f}"},
            {'label': 'Outstanding Bills Pending', 'value': f"₹{pending_bills:,.2f}"},
            {'label': 'Total Operating Expenses', 'value': f"₹{expenses:,.2f}"},
            {'label': 'Total Doctor Referral Commission', 'value': f"₹{commissions:,.2f}"},
            {'label': 'Net Cash Profit (Coll - Exp - Comm)', 'value': f"₹{net_profit:,.2f}"},
        ]
        
        summary = {
            'total_patients': total_patients,
            'total_collections': collections,
            'net_profit': net_profit,
        }
        return records, summary

    return [], {}
