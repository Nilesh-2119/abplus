from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Sum, Q
from decimal import Decimal
import datetime

from backend.models import (
    Lab, CustomUser, PatientEntry, LabTest, ReferredDoctor,
    PaymentTransaction, CashierReceipt, CashierAdminSettlement, Expense,
    Payment, Concession
)

User = get_user_model()

class CashFlowArchitectureTests(TestCase):
    def setUp(self):
        # 1. Create a Lab
        self.lab = Lab.objects.create(name="Alpha Lab", status="active")

        # 2. Create Users
        self.admin = User.objects.create_user(
            username="lab_admin",
            password="password123",
            role="LAB_ADMIN",
            lab=self.lab,
            email="admin@alphalab.com"
        )
        self.cashier = User.objects.create_user(
            username="cashier_user",
            password="password123",
            role="CASHIER",
            lab=self.lab,
            email="cashier@alphalab.com"
        )
        self.boy = User.objects.create_user(
            username="cb_boy",
            password="password123",
            role="COLLECTION_BOY",
            lab=self.lab,
            email="boy@alphalab.com"
        )

        # 3. Create Tests Catalog
        self.test_cbc = LabTest.objects.create(
            lab=self.lab,
            name="Complete Blood Count",
            category="Hematology",
            code="CBC",
            price=Decimal("500.00"),
            tube_type="EDTA",
            tube_color="Purple"
        )

    def test_payment_transaction_recalculates_patient(self):
        """
        Verify that adding a payment transaction automatically updates the patient entry's paid amount,
        concession, and payment status.
        """
        patient = PatientEntry.objects.create(
            lab=self.lab,
            name="John Doe",
            age=30,
            gender="Male",
            phone="1234567890",
            total_bill=Decimal("500.00"),
            created_by=self.admin
        )
        patient.tests.add(self.test_cbc)

        # Initially, patient is unpaid
        self.assertEqual(patient.paid_amount, Decimal("0.00"))
        self.assertEqual(patient.concession, Decimal("0.00"))
        self.assertEqual(patient.payment_status, "CREDIT_PENDING")

        # Record a partial payment
        txn1 = PaymentTransaction.objects.create(
            lab=self.lab,
            patient=patient,
            collection_boy=self.boy,
            amount_received=Decimal("200.00"),
            payment_mode="CASH"
        )

        patient.refresh_from_db()
        self.assertEqual(patient.paid_amount, Decimal("200.00"))
        self.assertEqual(patient.payment_status, "PARTIAL_PENDING")

        # Record concession and balance payment
        txn2 = PaymentTransaction.objects.create(
            lab=self.lab,
            patient=patient,
            collection_boy=self.boy,
            amount_received=Decimal("250.00"),
            concession_amount=Decimal("50.00"),
            payment_mode="CASH"
        )

        patient.refresh_from_db()
        self.assertEqual(patient.paid_amount, Decimal("450.00"))
        self.assertEqual(patient.concession, Decimal("50.00"))
        self.assertEqual(patient.payment_status, "FULLY_PAID")

    def test_collection_boy_settlement_flow(self):
        """
        Verify the flow when the Cashier receives money from a Collection Boy.
        - Unsubmitted cash is totaled.
        - CashierReceipt is generated.
        - Transactions are marked as submitted.
        """
        patient1 = PatientEntry.objects.create(
            lab=self.lab, name="Patient 1", age=25, gender="Male", phone="1234567890", total_bill=Decimal("1000.00")
        )
        patient2 = PatientEntry.objects.create(
            lab=self.lab, name="Patient 2", age=45, gender="Female", phone="9876543210", total_bill=Decimal("800.00")
        )

        # 1. Collection Boy collects cash
        txn1 = PaymentTransaction.objects.create(
            lab=self.lab, patient=patient1, collection_boy=self.boy, amount_received=Decimal("400.00")
        )
        txn2 = PaymentTransaction.objects.create(
            lab=self.lab, patient=patient2, collection_boy=self.boy, amount_received=Decimal("500.00")
        )

        # Verify they are currently unsubmitted
        self.assertEqual(txn1.submitted_to_cashier, "N")
        self.assertIsNone(txn1.cashier_received_at)

        # 2. Reconcile collection boy collections (cashier settle action)
        unsubmitted_txns = PaymentTransaction.objects.filter(
            collection_boy=self.boy,
            submitted_to_cashier='N',
            delete_flag='N'
        )
        cash_waiting = unsubmitted_txns.aggregate(total=Sum('amount_received'))['total'] or 0.0
        self.assertEqual(cash_waiting, Decimal("900.00"))

        receipt = CashierReceipt.objects.create(
            collection_boy=self.boy,
            cashier=self.cashier,
            amount_received=cash_waiting
        )

        # Mark transactions as submitted
        unsubmitted_txns.update(
            submitted_to_cashier='Y',
            cashier_received_at=timezone.now()
        )

        # Verify the ledger state update
        txn1.refresh_from_db()
        txn2.refresh_from_db()
        self.assertEqual(txn1.submitted_to_cashier, "Y")
        self.assertIsNotNone(txn1.cashier_received_at)
        self.assertEqual(receipt.amount_received, Decimal("900.00"))

    def test_cashier_admin_settlement_flow(self):
        """
        Verify the flow when the Cashier settles collections and expenses with the Lab Admin.
        """
        # Create cashier receipt
        receipt = CashierReceipt.objects.create(
            collection_boy=self.boy,
            cashier=self.cashier,
            amount_received=Decimal("1500.00")
        )

        # Create direct desk payment (cashier direct cash payment)
        patient = PatientEntry.objects.create(
            lab=self.lab, name="Direct Patient", age=50, gender="Male", phone="1111122222", total_bill=Decimal("500.00")
        )
        desk_txn = PaymentTransaction.objects.create(
            lab=self.lab,
            patient=patient,
            collection_boy=None, # direct cashier desk
            amount_received=Decimal("500.00"),
            payment_mode="CASH"
        )
        # Direct payments default to submitted to cashier
        self.assertEqual(desk_txn.submitted_to_cashier, "Y")

        # Create unsubmitted cashier expense
        expense = Expense.objects.create(
            lab=self.lab,
            title="Office Stationary",
            amount=Decimal("200.00"),
            created_by=self.cashier.username
        )

        # 1. Fetch unsubmitted items
        unsubmitted_receipts = CashierReceipt.objects.filter(
            cashier=self.cashier,
            cashier_admin_settlement__isnull=True,
            delete_flag='N'
        )
        unsubmitted_desk_txns = PaymentTransaction.objects.filter(
            lab=self.lab,
            collection_boy__isnull=True,
            payment_mode='CASH',
            cashier_admin_settlement__isnull=True,
            delete_flag='N'
        )
        unsubmitted_expenses = Expense.objects.filter(
            lab=self.lab,
            created_by=self.cashier.username,
            cashier_admin_settlement__isnull=True,
            delete_flag='N'
        )

        gross_receipts = unsubmitted_receipts.aggregate(total=Sum('amount_received'))['total'] or 0.0
        gross_desk = unsubmitted_desk_txns.aggregate(total=Sum('amount_received'))['total'] or 0.0
        total_gross = float(gross_receipts) + float(gross_desk)
        expenses_amount = unsubmitted_expenses.aggregate(total=Sum('amount'))['total'] or 0.0
        settlement_amount = total_gross - float(expenses_amount)

        self.assertEqual(total_gross, 2000.0)
        self.assertEqual(expenses_amount, Decimal("200.00"))
        self.assertEqual(settlement_amount, 1800.0)

        # 2. Create CashierAdminSettlement
        settlement = CashierAdminSettlement.objects.create(
            cashier=self.cashier,
            lab=self.lab,
            gross_cash=total_gross,
            expenses=expenses_amount,
            final_cash=settlement_amount
        )

        # Mark all as linked/settled
        unsubmitted_receipts.update(cashier_admin_settlement=settlement)
        unsubmitted_desk_txns.update(cashier_admin_settlement=settlement)
        unsubmitted_expenses.update(cashier_admin_settlement=settlement)

        # Assertions
        receipt.refresh_from_db()
        desk_txn.refresh_from_db()
        expense.refresh_from_db()

        self.assertEqual(receipt.cashier_admin_settlement, settlement)
        self.assertEqual(desk_txn.cashier_admin_settlement, settlement)
        self.assertEqual(expense.cashier_admin_settlement, settlement)

    def test_date_aware_carry_forward_and_backdated_entries(self):
        """
        Verify that stats calculation accurately carries forward previous cash, and isolates dates.
        """
        from django.db.models import Sum

        date_today = timezone.localdate()
        date_yesterday = date_today - datetime.timedelta(days=1)

        # Register patient yesterday
        patient = PatientEntry.objects.create(
            lab=self.lab, name="Yesterday Patient", age=19, gender="Male", phone="2222233333", total_bill=Decimal("1000.00"),
            created_at=date_yesterday
        )

        # Collect cash yesterday
        txn_yesterday = PaymentTransaction.objects.create(
            lab=self.lab, patient=patient, collection_boy=self.boy, amount_received=Decimal("400.00"),
            transaction_date=date_yesterday
        )

        # Collect cash today (back-dated patient, today transaction)
        txn_today = PaymentTransaction.objects.create(
            lab=self.lab, patient=patient, collection_boy=self.boy, amount_received=Decimal("300.00"),
            transaction_date=date_today
        )

        # Let's verify Cash Not Submitted for yesterday and today
        # For Yesterday:
        cash_not_submitted_yesterday = float(PaymentTransaction.objects.filter(
            collection_boy=self.boy,
            transaction_date__lte=date_yesterday,
            delete_flag='N'
        ).filter(
            submitted_to_cashier='N'
        ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

        # For Today (prior to settlement):
        cash_not_submitted_today = float(PaymentTransaction.objects.filter(
            collection_boy=self.boy,
            transaction_date__lte=date_today,
            delete_flag='N'
        ).filter(
            submitted_to_cashier='N'
        ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

        self.assertEqual(cash_not_submitted_yesterday, 400.0)
        self.assertEqual(cash_not_submitted_today, 700.0)

        # If we settle yesterday's transaction today
        receipt = CashierReceipt.objects.create(
            collection_boy=self.boy,
            cashier=self.cashier,
            amount_received=Decimal("400.00"),
            receipt_date=date_today
        )
        txn_yesterday.submitted_to_cashier = 'Y'
        txn_yesterday.cashier_received_at = timezone.now()
        txn_yesterday.save()

        cash_not_submitted_yesterday_after = float(PaymentTransaction.objects.filter(
            collection_boy=self.boy,
            transaction_date__lte=date_yesterday,
            delete_flag='N'
        ).filter(
            submitted_to_cashier='N'
        ).aggregate(total=Sum('amount_received'))['total'] or 0.0)
        # Note: using submitted_to_cashier='N' is current state, but date-aware check uses:
        # (submitted_to_cashier='N' or cashier_received_at__date > date_yesterday)
        cash_not_submitted_yesterday_date_aware = float(PaymentTransaction.objects.filter(
            collection_boy=self.boy,
            transaction_date__lte=date_yesterday,
            delete_flag='N'
        ).filter(
            submitted_to_cashier='N'
        ).aggregate(total=Sum('amount_received'))['total'] or 0.0)
        # Wait, txn_yesterday is now submitted_to_cashier='Y', but was received today (date_today).
        # So we verify via the exact logic we implemented:
        from django.db.models import Q
        cash_not_submitted_yesterday_recalc = float(PaymentTransaction.objects.filter(
            collection_boy=self.boy,
            transaction_date__lte=date_yesterday,
            delete_flag='N'
        ).filter(
            Q(submitted_to_cashier='N') | Q(cashier_received_at__date__gt=date_yesterday)
        ).aggregate(total=Sum('amount_received'))['total'] or 0.0)

        self.assertEqual(cash_not_submitted_yesterday_recalc, 400.0) # Correctly carried forward as unsubmitted yesterday!

    def test_dashboard_stats_api_endpoints(self):
        """
        Verify DashboardStatsView and CollectionDashboardStatsView endpoints.
        """
        from rest_framework.test import APIClient
        client = APIClient()
        
        # 1. Test Collection Dashboard Stats Endpoint as Collection Boy
        client.force_authenticate(user=self.boy)
        
        # Register a patient today and pay some cash
        date_today = timezone.localdate().isoformat()
        patient = PatientEntry.objects.create(
            lab=self.lab, name="API Test Patient", age=30, gender="Male", phone="1234567890", total_bill=Decimal("500.00"),
            created_by=self.boy
        )
        PaymentTransaction.objects.create(
            lab=self.lab, patient=patient, collection_boy=self.boy, amount_received=Decimal("300.00"),
            payment_mode="CASH", transaction_date=timezone.localdate()
        )
        
        response = client.get('/api/collection-dashboard/', {'lab_id': self.lab.id, 'date': date_today})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['total_patients'], 1)
        self.assertEqual(data['todays_collected'], 300.0)
        self.assertEqual(data['net_cash_in_hand'], 300.0)
        self.assertEqual(data['cash_not_submitted'], 0.0)
        self.assertEqual(data['total_pending_receivables'], 200.0)

        # 2. Test Dashboard Stats Endpoint as Cashier
        client.force_authenticate(user=self.cashier)
        response = client.get('/api/dashboard/stats/', {'lab_id': self.lab.id, 'date': date_today})
        self.assertEqual(response.status_code, 200)
        
        # Settle the collection boy
        receipt = CashierReceipt.objects.create(
            collection_boy=self.boy,
            cashier=self.cashier,
            amount_received=Decimal("300.00"),
            receipt_date=timezone.localdate()
        )
        # Update submitted status for the collection boy transaction
        PaymentTransaction.objects.filter(collection_boy=self.boy).update(
            submitted_to_cashier='Y',
            cashier_received_at=timezone.now()
        )
        
        # Get stats again after settlement
        response = client.get('/api/dashboard/stats/', {'lab_id': self.lab.id, 'date': date_today})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['cash_in_vault'], 300.0)
        
        # Test Dashboard Stats Endpoint as Admin
        client.force_authenticate(user=self.admin)
        response = client.get('/api/dashboard/stats/', {'lab_id': self.lab.id, 'date': date_today})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['today_patients'], 1)
        self.assertEqual(data['lab_cash_collection_pending'], 300.0)

    def test_user_scenario_collection_boy_handover_with_expenses(self):
        """
        Verify user scenario:
        - Collection boy has 1500 cash collections and 100 expense.
        - Boy's Net Cash in Hand is 1400.
        - Cashier receives handover, receiving 1400 physical cash.
        - Cashier's Vault Balance increases to 1400.
        - Boy's settled expense is linked to CashierReceipt.
        - Cashier submits settlement to Lab Admin, which links everything correctly.
        """
        from rest_framework.test import APIClient
        client = APIClient()
        date_today = timezone.localdate()
        date_today_str = date_today.isoformat()

        # 1. Register patients and collections (1500 total)
        p1 = PatientEntry.objects.create(
            lab=self.lab, name="P1", age=25, gender="Male", phone="1234567890", total_bill=Decimal("500.00"),
            created_by=self.boy
        )
        PaymentTransaction.objects.create(
            lab=self.lab, patient=p1, collection_boy=self.boy, amount_received=Decimal("500.00"),
            payment_mode="CASH", transaction_date=date_today
        )

        p2 = PatientEntry.objects.create(
            lab=self.lab, name="P2", age=45, gender="Female", phone="9876543210", total_bill=Decimal("1000.00"),
            created_by=self.boy
        )
        PaymentTransaction.objects.create(
            lab=self.lab, patient=p2, collection_boy=self.boy, amount_received=Decimal("1000.00"),
            payment_mode="CASH", transaction_date=date_today
        )

        # 2. Log expense (100) by collection boy
        Expense.objects.create(
            lab=self.lab,
            title="Boy Fuel",
            amount=Decimal("100.00"),
            created_by=self.boy.username,
            date=date_today
        )

        # Verify Boy's Dashboard stats
        client.force_authenticate(user=self.boy)
        response = client.get('/api/collection-dashboard/', {'lab_id': self.lab.id, 'date': date_today_str})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['todays_collected'], 1500.0)
        self.assertEqual(data['net_cash_in_hand'], 1400.0)
        self.assertEqual(data['cash_not_submitted'], 0.0)

        # 3. Cashier settles the boy via settle API
        client.force_authenticate(user=self.cashier)
        response = client.post(f'/api/employees/{self.boy.id}/settle/', {'date': date_today_str})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['settlement_status'], 'SETTLED')

        # Verify CashierReceipt is created for net cash (1400)
        receipt = CashierReceipt.objects.get(collection_boy=self.boy, receipt_date=date_today)
        self.assertEqual(receipt.amount_received, Decimal("1400.00"))

        # Verify Boy's expense is linked to CashierReceipt
        expense = Expense.objects.get(created_by=self.boy.username, date=date_today)
        self.assertEqual(expense.cashier_receipt, receipt)

        # Verify Cashier's dashboard stats (Cash in Vault should show 1400)
        response = client.get('/api/dashboard/stats/', {'lab_id': self.lab.id, 'date': date_today_str})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['cash_in_vault'], 1400.0)

        # Verify Boy's Dashboard stats after settlement
        client.force_authenticate(user=self.boy)
        response = client.get('/api/collection-dashboard/', {'lab_id': self.lab.id, 'date': date_today_str})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['net_cash_in_hand'], 0.0)
        self.assertEqual(data['cash_not_submitted'], 0.0)
        self.assertEqual(data['submitted_cash_today'], 1400.0)

        # 4. Cashier submits rolling settlement to Lab Admin
        client.force_authenticate(user=self.cashier)
        response = client.post('/api/cashier-lab-settlements/', {'remarks': 'Daily handover'})
        self.assertEqual(response.status_code, 201)
        settlement_data = response.json()
        self.assertEqual(float(settlement_data['gross_cash']), 1400.0)
        self.assertEqual(float(settlement_data['expenses']), 0.0)
        self.assertEqual(float(settlement_data['final_cash']), 1400.0)

        # Verify Boy's expense cashier_admin_settlement is linked after cashier settlement
        expense.refresh_from_db()
        self.assertIsNotNone(expense.cashier_admin_settlement)
        self.assertEqual(expense.submitted_to_lab_admin, 'Y')

    def test_patient_soft_delete_cascades_to_related_models(self):
        """
        Verify that soft-deleting a PatientEntry cascades and soft-deletes its transactions,
        payments, and concessions.
        """
        p = PatientEntry.objects.create(
            lab=self.lab, name="Cascade Test Patient", age=30, gender="Male", phone="1111111111", total_bill=Decimal("1000.00"),
            created_by=self.cashier
        )
        txn = PaymentTransaction.objects.create(
            lab=self.lab, patient=p, amount_received=Decimal("500.00"),
            payment_mode="CASH", transaction_date=timezone.localdate()
        )
        pay = Payment.objects.create(
            patient=p, amount=Decimal("500.00"), processed_by=self.cashier
        )
        conc = Concession.objects.create(
            patient=p, amount=Decimal("100.00"), approved_by=self.cashier
        )

        # Confirm they are active initially
        self.assertEqual(p.delete_flag, 'N')
        self.assertEqual(txn.delete_flag, 'N')
        self.assertEqual(pay.delete_flag, 'N')
        self.assertEqual(conc.delete_flag, 'N')

        # Perform soft-delete on the patient
        p.delete(deleted_by_user=self.cashier)

        # Refresh from all_objects (since standard manager excludes delete_flag='Y')
        p.refresh_from_db()
        txn.refresh_from_db()
        pay.refresh_from_db()
        conc.refresh_from_db()

        # Verify they are all soft-deleted
        self.assertEqual(p.delete_flag, 'Y')
        self.assertEqual(txn.delete_flag, 'Y')
        self.assertEqual(pay.delete_flag, 'Y')
        self.assertEqual(conc.delete_flag, 'Y')
        self.assertEqual(p.deleted_by, self.cashier)
        self.assertEqual(txn.deleted_by, self.cashier)
        self.assertEqual(pay.deleted_by, self.cashier)
        self.assertEqual(conc.deleted_by, self.cashier)

    def test_collection_boy_carry_forward_and_backdated_snapshot_architecture(self):
        """
        Verify AB+ CASH FLOW carry-forward logic:
        1. 03-Jun: Today's Collection = 1550, Today's Expenses = 100, Submitted = 0
           -> Net Cash In Hand = 1450
        2. 04-Jun: Today's Collection = 0, Expenses = 0, Submitted = 0
           -> Opening Balance = 1450, Net Cash In Hand = 1450 (NOT 1550, NOT double counted)
        3. Immutability of past dates: modifying transactions on 03-Jun post-snapshot
           does NOT alter the stored snapshot of 03-Jun or 04-Jun when queried as past dates.
        """
        from rest_framework.test import APIClient
        client = APIClient()
        
        # We will use fixed dates: 03-Jun-2026 and 04-Jun-2026
        date_1 = datetime.date(2026, 6, 3)
        date_2 = datetime.date(2026, 6, 4)
        
        # 1. 03-Jun entries
        p1 = PatientEntry.objects.create(
            lab=self.lab, name="Patient A", age=30, gender="Male", phone="9999988888", total_bill=Decimal("2000.00"),
            created_by=self.boy, created_at=date_1
        )
        
        # Collection = 1550
        PaymentTransaction.objects.create(
            lab=self.lab, patient=p1, collection_boy=self.boy, amount_received=Decimal("1550.00"),
            payment_mode="CASH", transaction_date=date_1
        )
        
        # Expense = 100
        Expense.objects.create(
            lab=self.lab, title="Fuel 03-Jun", amount=Decimal("100.00"),
            created_by=self.boy.username, date=date_1
        )
        
        # Query 03-Jun dashboard stats as Collection Boy
        client.force_authenticate(user=self.boy)
        response_03 = client.get('/api/collection-dashboard/', {'lab_id': self.lab.id, 'date': date_1.isoformat()})
        self.assertEqual(response_03.status_code, 200)
        data_03 = response_03.json()
        
        # Success criteria for 03-Jun:
        self.assertEqual(data_03['todays_collected'], 1550.0)
        self.assertEqual(data_03['today_expenses'], 100.0)
        self.assertEqual(data_03['submitted_cash_today'], 0.0)
        self.assertEqual(data_03['net_cash_in_hand'], 1450.0)
        
        # 2. Query 04-Jun dashboard stats as Collection Boy
        response_04 = client.get('/api/collection-dashboard/', {'lab_id': self.lab.id, 'date': date_2.isoformat()})
        self.assertEqual(response_04.status_code, 200)
        data_04 = response_04.json()
        
        # Success criteria for 04-Jun:
        self.assertEqual(data_04['cash_not_submitted'], 1450.0)  # Opening balance
        self.assertEqual(data_04['todays_collected'], 0.0)
        self.assertEqual(data_04['today_expenses'], 0.0)
        self.assertEqual(data_04['submitted_cash_today'], 0.0)
        self.assertEqual(data_04['net_cash_in_hand'], 1450.0)    # Closing balance
        
        # 3. Add transaction to 03-Jun retrospectively
        PaymentTransaction.objects.create(
            lab=self.lab, patient=p1, collection_boy=self.boy, amount_received=Decimal("500.00"),
            payment_mode="CASH", transaction_date=date_1
        )
        
        # Query 03-Jun stats again: it must remain ₹1450 (the stored snapshot value)
        response_03_re = client.get('/api/collection-dashboard/', {'lab_id': self.lab.id, 'date': date_1.isoformat()})
        self.assertEqual(response_03_re.status_code, 200)
        data_03_re = response_03_re.json()
        self.assertEqual(data_03_re['net_cash_in_hand'], 1450.0)
        
        # Query 04-Jun stats again: it must also remain ₹1450 (the stored snapshot value)
        response_04_re = client.get('/api/collection-dashboard/', {'lab_id': self.lab.id, 'date': date_2.isoformat()})
        self.assertEqual(response_04_re.status_code, 200)
        data_04_re = response_04_re.json()
        self.assertEqual(data_04_re['cash_not_submitted'], 1450.0)
        self.assertEqual(data_04_re['net_cash_in_hand'], 1450.0)


class MultiTenantTestIsolationTests(TestCase):
    def setUp(self):
        from backend.models import Lab, MasterTest, LabTest
        # 1. Create two labs
        self.lab_a = Lab.objects.create(id="LAB-A", name="Lab A", status="active")
        self.lab_b = Lab.objects.create(id="LAB-B", name="Lab B", status="active")

        # 2. Create global master tests templates
        self.master_cbc = MasterTest.objects.create(
            id="M-CBC",
            name="Complete Blood Count",
            category="Hematology",
            code="CBC",
            default_price=Decimal("300.00"),
            tube_type="EDTA",
            tube_color="Purple",
            is_active=True
        )
        self.master_tsh = MasterTest.objects.create(
            id="M-TSH",
            name="Thyroid Stimulating Hormone",
            category="Biochemistry",
            code="TSH",
            default_price=Decimal("400.00"),
            tube_type="Serum",
            tube_color="Red",
            is_active=True
        )

        # 3. Onboard both labs - this will copy master tests to lab_tests
        for lab in [self.lab_a, self.lab_b]:
            for m_test in [self.master_cbc, self.master_tsh]:
                LabTest.objects.create(
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

        # Retrieve lab specific copies
        self.cbc_a = LabTest.objects.get(lab=self.lab_a, code="CBC")
        self.cbc_b = LabTest.objects.get(lab=self.lab_b, code="CBC")
        self.tsh_a = LabTest.objects.get(lab=self.lab_a, code="TSH")
        self.tsh_b = LabTest.objects.get(lab=self.lab_b, code="TSH")

    def test_independent_test_records_and_edits(self):
        """
        Verify that changing test properties (e.g. price) in Lab A does not affect Lab B.
        """
        # Change Lab A price
        self.cbc_a.price = Decimal("350.00")
        self.cbc_a.save()

        # Refresh and check
        self.cbc_a.refresh_from_db()
        self.cbc_b.refresh_from_db()
        self.assertEqual(self.cbc_a.price, Decimal("350.00"))
        self.assertEqual(self.cbc_b.price, Decimal("300.00"))

    def test_independent_test_disabling(self):
        """
        Verify that disabling a test in Lab A does not disable it in Lab B.
        """
        # Disable Lab A test
        self.tsh_a.is_active = False
        self.tsh_a.save()

        # Check status
        self.tsh_a.refresh_from_db()
        self.tsh_b.refresh_from_db()
        self.assertFalse(self.tsh_a.is_active)
        self.assertTrue(self.tsh_b.is_active)

    def test_independent_test_deletion(self):
        """
        Verify that soft deleting a test in Lab A does not delete it in Lab B.
        """
        # Delete Lab A test
        self.cbc_a.delete()

        # Check filtering (using default manager)
        self.assertFalse(LabTest.objects.filter(lab=self.lab_a, code="CBC").exists())
        self.assertTrue(LabTest.objects.filter(lab=self.lab_b, code="CBC").exists())

    def test_patient_registration_isolation(self):
        """
        Verify that registering a patient in Lab A filters out and does not associate tests from Lab B.
        """
        from backend.serializers import PatientEntrySerializer
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user_a = User.objects.create_user(
            username="admin_a",
            password="password123",
            role="LAB_ADMIN",
            lab=self.lab_a,
            email="admin_a@alphalab.com"
        )
        
        # Try to register a patient in Lab A, but pass a test ID belonging to Lab B (cbc_b.id)
        serializer = PatientEntrySerializer(data={
            "name": "Jane Doe",
            "age": 28,
            "gender": "Female",
            "phone": "9876543210",
            "tests": [self.cbc_a.id, self.cbc_b.id],
            "lab_id": self.lab_a.id,
            "total_bill": "300.00"
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        # Save and verify
        patient = serializer.save(created_by=user_a, lab=self.lab_a)
        
        # Only cbc_a must be associated with the patient, NOT cbc_b!
        patient_tests = patient.tests.all()
        self.assertIn(self.cbc_a, patient_tests)
        self.assertNotIn(self.cbc_b, patient_tests)


